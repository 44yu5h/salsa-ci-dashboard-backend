import express from 'express';
import ciController from '../controllers/ciConfigController.js';

const router = express.Router();

// Fetch merged Gitlab CI yaml for a project (Gitlab's GET /projects/:id/ci/lint)
router.get('/projects/:projectId', ciController.getMergedYamlForProject);

export default router;
