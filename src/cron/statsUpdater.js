import { CronJob } from 'cron';
import statsController from '../controllers/statsController.js';

const startHourlyStatsCron = () => {
  // Run at minute 5 of every hour to process the previous hour's stats
  const cronExpression = process.env.HOURLY_STATS_CRON || '5 * * * *';

  const job = new CronJob(
    cronExpression,
    async () => {
      console.log(
        `-----------------------------------------------
Running hourly stats calculation at ${new Date()}`
      );
      await statsController.processHourlyJobTypeStats();
      await statsController.processHourlyPipelineStats();
    },
    null,
    true,
    'UTC'
  );

  return job;
};

const startDailyStatsCron = () => {
  // Run at 00:15 every day to process the previous day's stats
  const cronExpression = process.env.DAILY_STATS_CRON || '15 0 * * *';

  const job = new CronJob(
    cronExpression,
    async () => {
      await statsController.processDailyJobTypeStats();
      await statsController.processDailyPipelineStats();
    },
    null,
    true,
    'UTC'
  );

  return job;
};

const startAllStatsCron = () => {
  startHourlyStatsCron();
  startDailyStatsCron();
  console.log('All stats cron jobs started');
};

export default startAllStatsCron;
