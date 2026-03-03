import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { sendMockSMS } from '../lib/sms.js';


const JWT_SECRET = process.env.JWT_SECRET || 'super_secret';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone_number, password } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { phone_number } });
    if (existingUser) {
      res.status(400).json({ error: 'Phone number already registered' });
      return;
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { phone_number, password_hash }
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1d' });
    res.status(201).json({ message: 'User created', token });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone_number, password } = req.body;

    const user = await prisma.user.findUnique({ where: { phone_number } });
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1d' });
    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone_number } = req.body;
    const user = await prisma.user.findUnique({ where: { phone_number } });
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes from now

    // Save to DB (overwrite existing OTP if any)
    await prisma.otp.deleteMany({ where: { phone_number } });
    await prisma.otp.create({
      data: { phone_number, code: otpCode, expires_at: expiresAt }
    });

    // Send the fake SMS (It will log to your terminal)
    await sendMockSMS(phone_number, `Your Game Platform OTP is: ${otpCode}`);

    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone_number, otp, new_password } = req.body;

    const otpRecord = await prisma.otp.findFirst({
      where: { phone_number, code: otp }
    });

    if (!otpRecord || otpRecord.expires_at < new Date()) {
      res.status(400).json({ error: 'Invalid or expired OTP' });
      return;
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await prisma.user.update({
      where: { phone_number },
      data: { password_hash }
    });

    // Clean up used OTP
    await prisma.otp.delete({ where: { id: otpRecord.id } });

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};