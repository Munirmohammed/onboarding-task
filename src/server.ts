import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import rateLimit from 'express-rate-limit'; // Import this
import authRoutes from './routes/auth.routes.js';
import gameRoutes from './routes/game.routes.js';
import bonusRoutes from './routes/bonus.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import './worker.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// SECURITY: Rate Limiter
// Limit each IP to 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Apply to all routes
app.use(limiter);

app.use('/auth', authRoutes);
app.use('/game', gameRoutes);
app.use('/bonus', bonusRoutes);
app.use('/dashboard', dashboardRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Game Platform API is running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});