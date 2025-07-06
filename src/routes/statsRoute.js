import express from 'express';
const router = express.Router();
import statsController from '../controllers/statsController.js';

// Get dashboard statistics
router.get('/dashboard', statsController.getDashboardStats);

// Get pipeline statistics for the chart
router.get('/pipelines', statsController.getPipelineStats);

// Get job type statistics
router.get('/job-types/:jobTypeId', statsController.getJobTypeStats);

export default router;
