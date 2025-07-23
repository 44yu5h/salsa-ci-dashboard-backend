import * as statsModel from '../models/statsModel.js';
import * as defaults from '../constants/defaults.js';

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
    const stats = [];

    // Start with the current hour and go 24h back
    for (let i = 0; i < defaults.DEFAULT_MAX_DURATION_PIPELINES; i++) {
      const periodStart = new Date(now);
      periodStart.setMinutes(0, 0, 0);
      periodStart.setHours(now.getHours() - i - 1);

      const pipelineStats = await statsModel.calculateHourlyPipelineStats(periodStart);

      if (pipelineStats.total_pipelines) {
        stats.push({
          period_start: new Date(periodStart),
          total_pipelines: pipelineStats.total_pipelines || 0,
          passed_pipelines: pipelineStats.passed_pipelines || 0,
          failed_pipelines: pipelineStats.failed_pipelines || 0,
          avg_duration_seconds: Math.round(pipelineStats.avg_duration_seconds || 0),
        });
      }
    }

    if (stats.length === 0) {
      console.log(`No pipeline activity found for the past ${defaults.DEFAULT_MAX_DURATION_PIPELINES} hours`);
      return;
    }

    // Insert all collected stats
    const insertCount = await statsModel.bulkInsertHourlyPipelineStats(stats);
    console.log(`Inserted/updated pipeline hourly stats for ${insertCount} hours`);

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

const getPipelineStats = async (req, res) => {
  try {
    const { duration = '7d' } = req.query;

    const validDurations = ['24h', '7d', '30d', '6m', '1y'];
    if (!validDurations.includes(duration)) {
      return res.status(400).json({ message: 'Invalid duration parameter' });
    }

    const now = new Date();
    let startDate;

    switch (duration) {
      case '24h':
        startDate = new Date(now);
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '6m':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '1y':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
    }

    let stats;
    if (duration === '24h') {
      // For 24h, use hourly stats
      stats = await statsModel.getHourlyPipelineStatsForPeriod(startDate, now);
    } else {
      // For longer periods, use daily stats table
      stats = await statsModel.getDailyPipelineStatsForPeriod(startDate, now);
    }

    // Format stats for the frontend
    const formattedStats = stats.map((stat) => ({
      date: duration === '24h' ? stat.period_start : stat.date,
      total: stat.total_pipelines,
      passed: stat.passed_pipelines,
      failed: stat.failed_pipelines,
    }));

    res.status(200).json(formattedStats);
  } catch (err) {
    console.error('Error fetching pipeline stats:', err);
    res.status(500).json({ message: 'Failed to fetch pipeline statistics' });
  }
};

const getJobTypeStats = async (req, res) => {
  try {
    const { jobTypeId } = req.params;
    const { duration = '7d' } = req.query;

    const validDurations = ['24h', '7d', '30d', '6m', '1y'];
    if (!validDurations.includes(duration)) {
      return res.status(400).json({ message: 'Invalid duration parameter' });
    }

    const now = new Date();
    let startDate;

    switch (duration) {
      case '24h':
        startDate = new Date(now);
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '6m':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '1y':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
    }

    let stats;
    if (duration === '24h') {
      stats = await statsModel.getHourlyJobTypeStatsForPeriod(
        jobTypeId,
        startDate,
        now
      );
    } else {
      stats = await statsModel.getDailyJobTypeStatsForPeriod(
        jobTypeId,
        startDate,
        now
      );
    }

    // Format stats for the frontend
    const formattedStats = stats.map((stat) => ({
      date: duration === '24h' ? stat.period_start : stat.date,
      total: stat.total_jobs,
      passed: stat.passed_jobs,
      failed: stat.failed_jobs,
      duration: stat.avg_duration_seconds,
    }));

    res.status(200).json(formattedStats);
  } catch (err) {
    console.error('Error fetching job type stats:', err);
    res.status(500).json({ message: 'Failed to fetch job type statistics' });
  }
};

export default {
  processHourlyJobTypeStats,
  processDailyJobTypeStats,
  processHourlyPipelineStats,
  processDailyPipelineStats,
  getDashboardStats,
  getPipelineStats,
  getJobTypeStats,
};
