import express from 'express';
const router = express.Router();
import pipelinesController from '../controllers/pipelinesController.js';

// register a new Salsa pipeline
router.put('/', pipelinesController.registerPipeline);

// Get all pipelines with filters, if any
router.get('/all', pipelinesController.getAllPipelines);

// Get pipelines by project ID
router.get('/project/:projectId', pipelinesController.getPipelinesByProject);

// get pipeline details by ID
router.get('/:pipelineId', pipelinesController.getPipeline);

// update pipeline status
router.patch('/:pipelineId/status', pipelinesController.updatePipelineStatus);

// Manually trigger pending pipelines check
router.post('/check-pending', pipelinesController.triggerPendingPipelinesCheck);

export default router;
