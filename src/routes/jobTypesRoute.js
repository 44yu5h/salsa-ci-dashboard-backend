import express from 'express';
import jobTypesController from '../controllers/jobTypesController.js';

const router = express.Router();

// Get all job types
router.get('/', jobTypesController.getAllJobTypes);

// Get job types by origin (salsaci or external)
router.get('/origin/:origin', jobTypesController.getJobTypesByOrigin);

// Get job type by name
router.get('/:name', jobTypesController.getJobTypeByName);

// Update a job type by name
router.patch('/:name', jobTypesController.updateJobType);

export default router;
