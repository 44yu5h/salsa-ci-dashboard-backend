import express from 'express';
const router = express.Router();
import statsController from '../controllers/statsController.js';

// Get dashboard statistics
router.get('/dashboard', statsController.getDashboardStats);

export default router;
