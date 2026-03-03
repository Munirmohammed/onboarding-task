import { Router } from 'express';
import { startGame, submitScore } from '../controllers/game.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Protect these routes with our JWT middleware
router.post('/start', authenticateToken, startGame);
router.post('/submit', authenticateToken, submitScore);

export default router;