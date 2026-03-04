const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const prisma = require("../../config/prisma");
const config = require("../../config");
const smsService = require("../sms/sms.service");

const SALT_ROUNDS = 10;

// ── Helpers ──────────────────────────────────────────────────────────────────
function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

// ── Service methods ───────────────────────────────────────────────────────────
async function register({ username, phone, password }) {
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { id: uuidv4(), username, phone, password: hashed },
  });
  return { token: signToken(user), user: { id: user.id, username: user.username, phone: user.phone } };
}

async function login({ username, password }) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw Object.assign(new Error("Invalid credentials"), { status: 401 });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw Object.assign(new Error("Invalid credentials"), { status: 401 });

  return { token: signToken(user), user: { id: user.id, username: user.username, phone: user.phone } };
}

async function forgotPassword({ phone }) {
  const user = await prisma.user.findUnique({ where: { phone } });
  // Always respond the same way to avoid phone enumeration
  if (!user) return { message: "If that number is registered, an OTP was sent." };

  // Invalidate previous OTPs
  await prisma.otp.updateMany({
    where: { userId: user.id, used: false },
    data: { used: true },
  });

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + config.otp.expiresMinutes * 60 * 1000);

  await prisma.otp.create({
    data: { id: uuidv4(), userId: user.id, code, expiresAt },
  });

  await smsService.enqueue({
    userId: user.id,
    phone,
    message: `Your verification code is ${code}. It expires in ${config.otp.expiresMinutes} minutes.`,
  });

  return { message: "If that number is registered, an OTP was sent." };
}

async function verifyOtp({ phone, code }) {
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) throw Object.assign(new Error("Invalid OTP"), { status: 400 });

  const otp = await prisma.otp.findFirst({
    where: { userId: user.id, code, used: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) throw Object.assign(new Error("Invalid or expired OTP"), { status: 400 });

  await prisma.otp.update({ where: { id: otp.id }, data: { used: true } });

  // Return a short-lived reset token
  const resetToken = jwt.sign(
    { id: user.id, purpose: "reset" },
    config.jwt.secret,
    { expiresIn: "15m" }
  );

  return { resetToken };
}

async function resetPassword({ resetToken, newPassword }) {
  let payload;
  try {
    payload = jwt.verify(resetToken, config.jwt.secret);
  } catch {
    throw Object.assign(new Error("Invalid or expired reset token"), { status: 400 });
  }

  if (payload.purpose !== "reset") {
    throw Object.assign(new Error("Invalid token purpose"), { status: 400 });
  }

  const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({ where: { id: payload.id }, data: { password: hashed } });

  return { message: "Password updated successfully." };
}

async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, phone: true, coins: true, createdAt: true },
  });
  if (!user) throw Object.assign(new Error("User not found"), { status: 404 });
  return user;
}

module.exports = { register, login, forgotPassword, verifyOtp, resetPassword, getMe };