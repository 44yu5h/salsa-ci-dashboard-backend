import * as statsModel from '../models/statsModel.js';
import * as defaults from '../constants/defaults.js';
import { isValidDuration, getPeriodForDuration } from '../models/utils.js';

const processHourlyJobTypeStats = async () => {
  try {
    const now = new Date();
    const allStats = [];

    // Start with the current hour and go 24h back
    for (let i = 0; i < defaults.DEFAULT_MAX_DURATION_JOBS; i++) {
      const periodStart = new Date(now);
      periodStart.setMinutes(0, 0, 0);
      periodStart.setHours(now.getHours() - i - 1);

      const jobTypeStats =
        await statsModel.calculateHourlyJobTypeStats(periodStart);

      for (const stat of jobTypeStats) {
        allStats.push({
          period_start: periodStart,
          job_type_id: stat.job_type_id,
          total_jobs: stat.total_jobs,
          passed_jobs: stat.passed_jobs,
          failed_jobs: stat.failed_jobs,
          avg_duration_seconds: Math.round(stat.avg_duration_seconds || 0),
        });
      }
    }

    if (allStats.length === 0) {
      console.log(
        `No job activity found for the past ${defaults.DEFAULT_MAX_DURATION_JOBS} hours`
      );
      return;
    }

    // Insert all collected stats
    const insertCount = await statsModel.bulkInsertHourlyJobTypeStats(allStats);
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
    yesterday.setDate(yesterday.getDate() - 1);
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

      const pipelineStats =
        await statsModel.calculateHourlyPipelineStats(periodStart);

      if (pipelineStats.total_pipelines) {
        stats.push({
          period_start: new Date(periodStart),
          total_pipelines: pipelineStats.total_pipelines || 0,
          passed_pipelines: pipelineStats.passed_pipelines || 0,
          failed_pipelines: pipelineStats.failed_pipelines || 0,
          avg_duration_seconds: Math.round(
            pipelineStats.avg_duration_seconds || 0
          ),
        });
      }
    }

    if (stats.length === 0) {
      console.log(
        `No pipeline activity found for the past ${defaults.DEFAULT_MAX_DURATION_PIPELINES} hours`
      );
      return;
    }

    // Insert all collected stats
    const insertCount = await statsModel.bulkInsertHourlyPipelineStats(stats);
    console.log(
      `Inserted/updated pipeline hourly stats for ${insertCount} hours`
    );

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

    if (!isValidDuration(duration)) {
      return res.status(400).json({ message: 'Invalid duration parameter' });
    }

    const { startDate, endDate, isHourly } = getPeriodForDuration(duration);

    const stats = isHourly
      ? await statsModel.getHourlyPipelineStatsForPeriod(startDate, endDate)
      : await statsModel.getDailyPipelineStatsForPeriod(startDate, endDate);

    const formattedStats = stats.map((stat) => ({
      date: isHourly ? stat.period_start : stat.date,
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

    if (!isValidDuration(duration)) {
      return res.status(400).json({ message: 'Invalid duration parameter' });
    }

    const { startDate, endDate, isHourly } = getPeriodForDuration(duration);

    const stats = isHourly
      ? await statsModel.getHourlyJobTypeStatsForPeriod(
          jobTypeId,
          startDate,
          endDate
        )
      : await statsModel.getDailyJobTypeStatsForPeriod(
          jobTypeId,
          startDate,
          endDate
        );

    const formattedStats = stats.map((stat) => ({
      date: isHourly ? stat.period_start : stat.date,
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

const getProjectStats = async (req, res) => {
  try {
    const { projectIds } = req.query;
    const ids = (projectIds || '')
      .toString()
      .split(',')
      .map((s) => Number(s.trim()));

    if (!ids.length) {
      return res
        .status(400)
        .json({ message: 'No projectIds query param found' });
    }

    const statsMap = await statsModel.getProjectStats(ids);
    return res.status(200).json(statsMap);
  } catch (err) {
    console.error('Error fetching project stats:', err);
    res.status(500).json({ message: 'Internal server error' });
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
  getProjectStats,
};
