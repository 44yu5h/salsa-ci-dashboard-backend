import express from 'express';
import cors from 'cors';

import apiRoutes from './routes/api.js';
import startPipelineUpdateCron from './cron/pipelineUpdater.js';
import startMergeRequestUpdateCron from './cron/mergeRequestUpdater.js';
import startAllStatsCron from './cron/statsUpdater.js';
import startPackageUpdateCron from './cron/packageUpdater.js';

const app = express();

const PORT = process.env.PORT || 8080;

// Ensure server runs in UTC for consistent timestamps
process.env.TZ = 'UTC';
console.log(`Server time is: ${new Date()}`);

const corsOption = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};

app.use(cors(corsOption));
app.use(express.json());

// Use versioned API routes
app.use('/api', apiRoutes);

// Start the cron job(s)
startPipelineUpdateCron();
startMergeRequestUpdateCron();
startAllStatsCron();
startPackageUpdateCron();

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
