import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret';

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Access denied. No token provided.' });
    return;
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET) as { userId: string };
    // Attach the user ID to the request object so controllers can use it
    (req as any).user = verified; 
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token.' });
  }
};