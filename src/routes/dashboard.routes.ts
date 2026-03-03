import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboard.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Protect dashboard so only authenticated admins can see it
router.post('/stats', authenticateToken, getDashboardStats);

export default router;