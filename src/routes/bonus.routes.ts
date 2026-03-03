import { Router } from 'express';
import multer from 'multer';
import { uploadBonusFile } from '../controllers/bonus.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();
const upload = multer({ dest: 'uploads/' }); // Temp storage for CSV files

// Only authenticated users (admins) can upload bonuses
router.post('/upload', authenticateToken, upload.single('file'), uploadBonusFile);

export default router;