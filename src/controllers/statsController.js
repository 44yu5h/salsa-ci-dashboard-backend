import * as statsModel from '../models/statsModel.js';
import * as defaults from '../constants/defaults.js';
import {
  isValidDuration,
  getPeriodForDuration,
  buildTimeBuckets,
} from '../models/utils.js';
import { sendMatrixAlert } from '../services/matrixNotifier.js';

// Danger thresholds (percentage)
const DANGER_THRESHOLD_JOB_TYPES = Number(process.env.DANGER_THRESHOLD_JOB_TYPES || 85);
const DANGER_THRESHOLD_PIPELINES = Number(process.env.DANGER_THRESHOLD_PIPELINES || 85);
const ALERT_ICON = '🔴';

const processHourlyJobTypeStats = async () => {
  try {
    const now = new Date();
    const allStats = [];
    const hourlyAlerts = [];

    // Start with the current hour and go 24h back
    for (let i = 0; i < defaults.DEFAULT_MAX_DURATION_JOBS; i++) {
      const periodStart = new Date(now);
      periodStart.setMinutes(0, 0, 0);
      periodStart.setHours(now.getHours() - i - 1);

      const jobTypeStats =
        await statsModel.calculateHourlyJobTypeStats(periodStart);

      for (const stat of jobTypeStats) {
        const total = Number(stat.total_jobs) || 0;
        const passed = Number(stat.passed_jobs) || 0;
        const failed = Number(stat.failed_jobs) || 0;

        allStats.push({
          period_start: periodStart,
          job_type_id: stat.job_type_id,
          total_jobs: total,
          passed_jobs: passed,
          failed_jobs: failed,
          avg_duration_seconds: Math.round(stat.avg_duration_seconds || 0),
        });

        // Only alert for the last hour
        if (i === 0 && total > 0) {
            const passRate = Math.round((passed / total) * 100);
            if (passRate < DANGER_THRESHOLD_JOB_TYPES) {
              hourlyAlerts.push({
                id: stat.job_type_id,
                name: stat.job_type_name || `Job Type #${stat.job_type_id}`,
                time: periodStart,
                total,
                passed,
                failed,
                passRate,
              });
            }
        }
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

    // Send a single alert summarizing all failing job types for the last hour
    if (hourlyAlerts.length > 0) {
      const header = `${ALERT_ICON} Job types success rate below ${DANGER_THRESHOLD_JOB_TYPES}% in the last hour`;
      const period = hourlyAlerts[0].time.toUTCString();
      const lines = hourlyAlerts
        .sort((a, b) => a.passRate - b.passRate)
        .map((a) =>`- ${a.name}: ${a.passRate}%`)
        .join('\n');
      const message = `${header}\n${period}\n${lines}`;
      try {
        await sendMatrixAlert({ message });
      } catch (e) {
        console.error('Failed to send Matrix alert for job types:', e?.message || e);
      }
    }

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

      const total = Number(pipelineStats.total_pipelines) || 0;
      const passed = Number(pipelineStats.passed_pipelines) || 0;
      const failed = Number(pipelineStats.failed_pipelines) || 0;

      if (total) {
        stats.push({
          period_start: new Date(periodStart),
          total_pipelines: total,
          passed_pipelines: passed,
          failed_pipelines: failed,
          avg_duration_seconds: Math.round(
            pipelineStats.avg_duration_seconds || 0
          ),
        });

        // Alert for the last hour
        if (i === 0 && total > 0) {
          const passRate = Math.round((passed / total) * 100);
          if (passRate < DANGER_THRESHOLD_PIPELINES) {
            const header = `${ALERT_ICON} Pipeline success rate below ${DANGER_THRESHOLD_PIPELINES}% in the last hour`;
            const period = periodStart.toUTCString();
            const message = `${header}\n${period}\n- Pipelines: ${passRate}% (${passed}/${total} passed)`;
            try {
              await sendMatrixAlert({ message });
            } catch (e) {
              console.error('Failed to send Matrix alert for pipelines:', e);
            }
          }
        }
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

    // Build complete timeline and fill gaps
    const buckets = buildTimeBuckets(startDate, endDate, isHourly);
    const keyField = isHourly ? 'period_start' : 'date';
    const rowMap = new Map(
      stats.map((s) => [new Date(s[keyField]).getTime(), s])
    );

    const formattedStats = buckets.map((b) => {
      const row = rowMap.get(b.getTime());
      return {
        date: b,
        total: row ? row.total_pipelines : null,
        passed: row ? row.passed_pipelines : null,
        failed: row ? row.failed_pipelines : null,
      };
    });

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

    // Build complete timeline and fill gaps
    const buckets = buildTimeBuckets(startDate, endDate, isHourly);
    const keyField = isHourly ? 'period_start' : 'date';
    const rowMap = new Map(
      stats.map((s) => [new Date(s[keyField]).getTime(), s])
    );

    const formattedStats = buckets.map((b) => {
      const row = rowMap.get(b.getTime());
      return {
        date: b,
        total: row ? row.total_jobs : null,
        passed: row ? row.passed_jobs : null,
        failed: row ? row.failed_jobs : null,
        duration: row ? row.avg_duration_seconds : null,
      };
    });

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
