import * as statsModel from '../models/statsModel.js';

const processHourlyJobTypeStats = async () => {
  try {
    // Start with the previous complete hour
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setMinutes(0, 0, 0);
    periodStart.setHours(periodStart.getHours() - 1);

    const jobTypeStats =
      await statsModel.calculateHourlyJobTypeStats(periodStart);

    if (jobTypeStats.length === 0) {
      console.log('No job activity found for this hour');
      return;
    }

    let insertCount = 0;
    for (const stat of jobTypeStats) {
      await statsModel.insertHourlyJobTypeStats({
        period_start: periodStart,
        job_type_id: stat.job_type_id,
        total_jobs: stat.total_jobs,
        passed_jobs: stat.passed_jobs,
        failed_jobs: stat.failed_jobs,
        avg_duration_seconds: Math.round(stat.avg_duration_seconds || 0),
      });
      insertCount++;
    }

    console.log(`Inserted/updated ${insertCount} hourly job type stats`);
    return true;
  } catch (err) {
    console.error('Error processing hourly job type stats:', err);
    return false;
  }
};

const processDailyJobTypeStats = async () => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate());
    yesterday.setHours(0, 0, 0, 0);

    const jobTypeStats = await statsModel.calculateDailyJobTypeStats(yesterday);

    if (jobTypeStats.length === 0) {
      console.log('No job activity found for yesterday');
      return;
    }

    console.log(
      `Processing ${jobTypeStats.length} job type stats for yesterday`
    );

    let insertCount = 0;
    for (const stat of jobTypeStats) {
      await statsModel.insertDailyJobTypeStats({
        date: yesterday,
        job_type_id: stat.job_type_id,
        total_jobs: stat.total_jobs,
        passed_jobs: stat.passed_jobs,
        failed_jobs: stat.failed_jobs,
        avg_duration_seconds: Math.round(stat.avg_duration_seconds || 0),
      });
      insertCount++;
    }

    console.log(`Inserted/updated ${insertCount} daily job type stats`);
    return true;
  } catch (err) {
    console.error('Error processing daily job type stats:', err);
    return false;
  }
};

const processHourlyPipelineStats = async () => {
  try {
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setMinutes(0, 0, 0);
    periodStart.setHours(periodStart.getHours() - 1);

    const pipelineStats =
      await statsModel.calculateHourlyPipelineStats(periodStart);

    if (!pipelineStats.total_pipelines) {
      console.log('No pipeline activity found for this hour');
      return;
    }

    await statsModel.insertHourlyPipelineStats({
      period_start: periodStart,
      total_pipelines: pipelineStats.total_pipelines || 0,
      passed_pipelines: pipelineStats.passed_pipelines || 0,
      failed_pipelines: pipelineStats.failed_pipelines || 0,
      avg_duration_seconds: Math.round(pipelineStats.avg_duration_seconds || 0),
    });

    console.log(`Inserted/updated hourly pipeline stats`);
    return true;
  } catch (err) {
    console.error('Error processing hourly pipeline stats:', err);
    return false;
  }
};

const processDailyPipelineStats = async () => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const pipelineStats =
      await statsModel.calculateDailyPipelineStats(yesterday);

    if (!pipelineStats.total_pipelines) {
      console.log('No pipeline activity found for yesterday');
      return;
    }

    console.log(`Processing pipeline stats at ${yesterday}`);

    await statsModel.insertDailyPipelineStats({
      date: yesterday,
      total_pipelines: pipelineStats.total_pipelines || 0,
      passed_pipelines: pipelineStats.passed_pipelines || 0,
      failed_pipelines: pipelineStats.failed_pipelines || 0,
      avg_duration_seconds: Math.round(pipelineStats.avg_duration_seconds || 0),
    });

    console.log(`Inserted/updated daily pipeline stats`);
    return true;
  } catch (err) {
    console.error('Error processing daily pipeline stats:', err);
    return false;
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const stats = await statsModel.getDashboardStats();
    res.status(200).json(stats);
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
  }
};

export default {
  processHourlyJobTypeStats,
  processDailyJobTypeStats,
  processHourlyPipelineStats,
  processDailyPipelineStats,
  getDashboardStats,
};
