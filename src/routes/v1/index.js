import express from 'express';
import ciConfigRoute from './ciConfigRoute.js';
import mergeRequestRoute from './mergeRequestRoute.js';
import pipelinesRoute from './pipelinesRoute.js';
import packagesRoute from './packagesRoute.js';
import jobTypesRoute from './jobTypesRoute.js';
import statsRoute from './statsRoute.js';
import jobsRoute from './jobsRoute.js';

const router = express.Router();

// All v1 routes
router.use('/ci-config', ciConfigRoute);
router.use('/merge-requests', mergeRequestRoute);
router.use('/pipelines', pipelinesRoute);
router.use('/packages', packagesRoute);
router.use('/job-types', jobTypesRoute);
router.use('/stats', statsRoute);
router.use('/jobs', jobsRoute);

router.use('/', (req, res) => {
  res.status(200).send('Welcome to Salsa Status API v1!');
});

export default router;
