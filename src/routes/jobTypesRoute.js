import express from 'express';
import jobTypesController from '../controllers/jobTypesController.js';

const router = express.Router();

// Get all job types
router.get('/', jobTypesController.getAllJobTypes);

// Get job types by origin (salsaci or external)
router.get('/origin/:origin', jobTypesController.getJobTypesByOrigin);

// Summary statistics for multiple job types
router.get('/summary-stats', jobTypesController.getJobTypesSummaryStats);

// Get job type by name
router.get('/:name', jobTypesController.getJobTypeByName);

// Update a job type by name
router.patch('/:name', jobTypesController.updateJobType);

export default router;
