import { CronJob } from 'cron';
import pipelinesController from '../controllers/pipelinesController.js';

// TODO handling of scenarios where jobs/pipelines are retried (recheck after a few days?)

// Schedule the cron job
const startPipelineUpdateCron = () => {
  const cronExpression = process.env.PIPELINE_UPDATE_CRON || '0 * * * *';

  const job = new CronJob(
    cronExpression,
    async () => {
      await pipelinesController.checkPendingPipelines();
    },
    null,
    true,
    'UTC'
  );

  console.log(
    `Pipeline update cron job scheduled with expression: ${cronExpression} (UTC)`
  );
  return job;
};

export default startPipelineUpdateCron;
