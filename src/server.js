import express from 'express';
import cors from 'cors';

import pipelinesRoute from './routes/pipelinesRoute.js';
import jobsRoute from './routes/jobsRoute.js';
import jobTypesRoute from './routes/jobTypesRoute.js';
import packagesRoute from './routes/packagesRoute.js';
import mergeRequestRoute from './routes/mergeRequestRoute.js';
import startPipelineUpdateCron from './cron/pipelineUpdater.js';
import startMergeRequestUpdateCron from './cron/mergeRequestUpdater.js';
import startAllStatsCron from './cron/statsUpdater.js';

const app = express();

const PORT = process.env.PORT || 8080;

const corsOption = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};

app.use(cors(corsOption));
app.use(express.json());

app.use('/pipelines', pipelinesRoute);
app.use('/jobs', jobsRoute);
app.use('/job-types', jobTypesRoute);
app.use('/packages', packagesRoute);
app.use('/merge-requests', mergeRequestRoute);

app.get('/', (_req, res) => {
  res.status(200).send('Server is functioning properly!');
});

// Start the cron job(s)
startPipelineUpdateCron();
startMergeRequestUpdateCron();
startAllStatsCron();

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
