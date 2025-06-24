import express from 'express';
const router = express.Router();
import jobsController from '../controllers/jobsController.js';

// Get jobs by pipeline ID
router.get('/pipeline/:pipelineId', jobsController.getJobsByPipeline);

// Get jobs by project ID (renamed from package)
router.get('/project/:projectId', jobsController.getJobsByProject);

// Update job status
router.patch('/:jobId/status', jobsController.updateJobStatus);

// Get packages by job name
router.get('/name/:jobName/packages', jobsController.getPackagesByJobName);

// Get all jobs
router.get('/all', jobsController.getAllJobs);

// Get a job by ID
router.get('/:jobId', jobsController.getByJobId);

export default router;
