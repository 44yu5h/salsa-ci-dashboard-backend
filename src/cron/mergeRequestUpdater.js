import { CronJob } from 'cron';
import mergeRequestController from '../controllers/mergeRequestController.js';

const startMergeRequestUpdateCron = () => {
  const cronExpression = process.env.MERGE_REQUEST_UPDATE_CRON || '0 */6 * * *';

  const job = new CronJob(
    cronExpression,
    async () => {
      await mergeRequestController.fetchMergeRequests();
    },
    null,
    true,
    'UTC'
  );

  console.log(
    `Merge request update cron job scheduled with expression: ${cronExpression} (UTC)`
  );
  return job;
};

export default startMergeRequestUpdateCron;
