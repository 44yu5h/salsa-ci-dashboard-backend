import pipelinesController from '../controllers/pipelinesController.js';

// Main function to check all pending pipelines
const checkPipelines = async () => {
  console.log(`Running pipeline update check at: ${new Date().toISOString()}`);
  await pipelinesController.checkPendingPipelines();
};

// TODO handling of scenarios where jobs/pipelines are retried (recheck after a few days?)

// Schedule the cron job to run every x hours
const startPipelineUpdateCron = () => {
  checkPipelines();

  const INTERVAL = process.env.PIPELINE_UPDATE_INTERVAL;
  setInterval(checkPipelines, INTERVAL);

  console.log(
    `Pipeline update cron job scheduled (every ${
      INTERVAL / (60 * 1000)
    } minutes)`
  );
};

export default {
  checkPipelines,
  startPipelineUpdateCron,
};
