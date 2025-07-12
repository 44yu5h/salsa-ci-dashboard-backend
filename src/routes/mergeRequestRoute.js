import express from 'express';
const router = express.Router();
import mergeRequestController from '../controllers/mergeRequestController.js';

// Get all merge requests as JSON
router.get('/json', mergeRequestController.getMergeRequestsJson);

// Get merge requests filtered by duration
router.get('/', mergeRequestController.getMergeRequestsByDuration);

/* Manual trigger for updating merge requests
We may look into using GitLab webhooks in the future to
auto-trigger this whenever there's activity related to MRs */
router.post('/update', mergeRequestController.manuallyFetchMergeRequests);

export default router;
