import { CronJob } from 'cron';
import packagesController from '../controllers/packagesController.js';

const startPackageUpdateCron = () => {
  const cronExpression = process.env.PACKAGE_UPDATE_CRON || '0 2 */7 * *';

  const job = new CronJob(
    cronExpression,
    async () => {
      await packagesController.updateAllPackages();
    },
    null,
    true,
    'UTC'
  );

  console.log(
    `Package update cron job scheduled with expression: ${cronExpression} (UTC)`
  );
  return job;
};

export default startPackageUpdateCron;
