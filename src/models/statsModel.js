import { pool } from '../config/db.js';

export const insertHourlyJobTypeStats = async (stats) => {
  const {
    period_start,
    job_type_id,
    total_jobs,
    passed_jobs,
    failed_jobs,
    avg_duration_seconds,
  } = stats;

  const [result] = await pool.query(
    `INSERT INTO hourly_job_type_stats
    (period_start, job_type_id, total_jobs, passed_jobs, failed_jobs, avg_duration_seconds)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
    total_jobs = VALUES(total_jobs),
    passed_jobs = VALUES(passed_jobs),
    failed_jobs = VALUES(failed_jobs),
    avg_duration_seconds = VALUES(avg_duration_seconds)`,
    [
      period_start,
      job_type_id,
      total_jobs,
      passed_jobs,
      failed_jobs,
      avg_duration_seconds,
    ]
  );

  return result.insertId || result.affectedRows;
};

export const insertDailyJobTypeStats = async (stats) => {
  const {
    date,
    job_type_id,
    total_jobs,
    passed_jobs,
    failed_jobs,
    avg_duration_seconds,
  } = stats;

  const [result] = await pool.query(
    `INSERT INTO daily_job_type_stats
    (date, job_type_id, total_jobs, passed_jobs, failed_jobs, avg_duration_seconds)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
    total_jobs = VALUES(total_jobs),
    passed_jobs = VALUES(passed_jobs),
    failed_jobs = VALUES(failed_jobs),
    avg_duration_seconds = VALUES(avg_duration_seconds)`,
    [
      date,
      job_type_id,
      total_jobs,
      passed_jobs,
      failed_jobs,
      avg_duration_seconds,
    ]
  );

  return result.insertId || result.affectedRows;
};

export const insertHourlyPipelineStats = async (stats) => {
  const {
    period_start,
    total_pipelines,
    passed_pipelines,
    failed_pipelines,
    avg_duration_seconds,
  } = stats;

  const [result] = await pool.query(
    `INSERT INTO hourly_pipeline_stats
    (period_start, total_pipelines, passed_pipelines, failed_pipelines, avg_duration_seconds)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
    total_pipelines = VALUES(total_pipelines),
    passed_pipelines = VALUES(passed_pipelines),
    failed_pipelines = VALUES(failed_pipelines),
    avg_duration_seconds = VALUES(avg_duration_seconds)`,
    [
      period_start,
      total_pipelines,
      passed_pipelines,
      failed_pipelines,
      avg_duration_seconds,
    ]
  );

  return result.insertId || result.affectedRows;
};

export const insertDailyPipelineStats = async (stats) => {
  const {
    date,
    total_pipelines,
    passed_pipelines,
    failed_pipelines,
    avg_duration_seconds,
  } = stats;

  const [result] = await pool.query(
    `INSERT INTO daily_pipeline_stats
    (date, total_pipelines, passed_pipelines, failed_pipelines, avg_duration_seconds)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
    total_pipelines = VALUES(total_pipelines),
    passed_pipelines = VALUES(passed_pipelines),
    failed_pipelines = VALUES(failed_pipelines),
    avg_duration_seconds = VALUES(avg_duration_seconds)`,
    [
      date,
      total_pipelines,
      passed_pipelines,
      failed_pipelines,
      avg_duration_seconds,
    ]
  );

  return result.insertId || result.affectedRows;
};

export const calculateHourlyJobTypeStats = async (periodStart) => {
  // Calculate period end (1h after period start)
  const periodEnd = new Date(periodStart);
  periodEnd.setHours(periodEnd.getHours() + 1);

  const [rows] = await pool.query(
    `SELECT
      j.job_type_id,
      COUNT(*) AS total_jobs,
      SUM(CASE WHEN j.status = 'success' THEN 1 ELSE 0 END) AS passed_jobs,
      SUM(CASE WHEN j.status = 'failed' THEN 1 ELSE 0 END) AS failed_jobs,
      AVG(j.duration) AS avg_duration_seconds
    FROM jobs j
    JOIN job_types jt ON j.job_type_id = jt.id
    WHERE j.started_at >= ?
      AND j.started_at < ?
      AND j.status IN ('success', 'failed')
      AND jt.origin = 'salsaci'
    GROUP BY j.job_type_id`,
    [periodStart, periodEnd]
  );
  return rows;
};

export const calculateDailyJobTypeStats = async (date) => {
  // Time range for the entire day
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const nextDay = new Date(startOfDay);
  nextDay.setDate(nextDay.getDate() + 1);

  const [rows] = await pool.query(
    `SELECT
      j.job_type_id,
      COUNT(*) AS total_jobs,
      SUM(CASE WHEN j.status = 'success' THEN 1 ELSE 0 END) AS passed_jobs,
      SUM(CASE WHEN j.status = 'failed' THEN 1 ELSE 0 END) AS failed_jobs,
      AVG(j.duration) AS avg_duration_seconds
    FROM jobs j
    JOIN job_types jt ON j.job_type_id = jt.id
    WHERE j.started_at >= ?
      AND j.started_at < ?
      AND j.status IN ('success', 'failed')
      AND jt.origin = 'salsaci'
    GROUP BY j.job_type_id`,
    [startOfDay, nextDay]
  );

  return rows;
};

export const calculateHourlyPipelineStats = async (periodStart) => {
  // Calculate period end (1h after period start)
  const periodEnd = new Date(periodStart);
  periodEnd.setHours(periodEnd.getHours() + 1);

  const [rows] = await pool.query(
    `SELECT
      COUNT(*) AS total_pipelines,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS passed_pipelines,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_pipelines,
      AVG(duration) AS avg_duration_seconds
    FROM pipelines
    WHERE started_at >= ?
      AND started_at < ?
      AND status IN ('success', 'failed')`,
    [periodStart, periodEnd]
  );

  return rows[0];
};

export const calculateDailyPipelineStats = async (date) => {
  // Time range for the entire day
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const nextDay = new Date(startOfDay);
  nextDay.setDate(nextDay.getDate() + 1);

  const [rows] = await pool.query(
    `SELECT
      COUNT(*) AS total_pipelines,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS passed_pipelines,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_pipelines,
      AVG(duration) AS avg_duration_seconds
    FROM pipelines
    WHERE started_at >= ?
      AND started_at < ?
      AND status IN ('success', 'failed')`,
    [startOfDay, nextDay]
  );

  return rows[0];
};

export const getDashboardStats = async () => {
  const [rows] = await pool.query(`
      SELECT
        (SELECT COUNT(DISTINCT id) FROM job_types) AS jobTypesCount,
        (SELECT COUNT(*) FROM jobs) AS jobsCount,
        (SELECT COUNT(*) FROM pipelines) AS pipelinesCount,
        (SELECT COUNT(*) FROM packages) AS packagesCount,
        (SELECT COUNT(*) FROM pipelines WHERE status = 'success') AS successfulPipelines,
        (SELECT COUNT(*) FROM pipelines WHERE status IN ('success', 'failed')) AS totalCompletedPipelines
    `);

  // Success rate (only for completed pipelines)
  const stats = rows[0];
  stats.successRate =
    stats.totalCompletedPipelines > 0
      ? Math.round(
          (stats.successfulPipelines / stats.totalCompletedPipelines) * 100
        )
      : 0;

  // No need in frontend
  delete stats.totalCompletedPipelines;

  return stats;
};

// Get hourly pipeline stats for a period
export const getHourlyPipelineStatsForPeriod = async (startDate, endDate) => {
  const [rows] = await pool.query(
    `SELECT
      period_start,
      total_pipelines,
      passed_pipelines,
      failed_pipelines
    FROM hourly_pipeline_stats
    WHERE period_start >= ? AND period_start <= ?
    ORDER BY period_start ASC`,
    [startDate, endDate]
  );

  return rows;
};

// Get daily pipeline stats for a specified period
export const getDailyPipelineStatsForPeriod = async (startDate, endDate) => {
  const [rows] = await pool.query(
    `SELECT
      date,
      total_pipelines,
      passed_pipelines,
      failed_pipelines
    FROM daily_pipeline_stats
    WHERE date >= ? AND date <= ?
    ORDER BY date ASC`,
    [startDate, endDate]
  );

  return rows;
};

// Get hourly job type stats for a specified period
export const getHourlyJobTypeStatsForPeriod = async (
  jobTypeId,
  startDate,
  endDate
) => {
  const [rows] = await pool.query(
    `SELECT
      period_start,
      total_jobs,
      passed_jobs,
      failed_jobs,
      avg_duration_seconds
    FROM hourly_job_type_stats
    WHERE job_type_id = ? AND period_start >= ? AND period_start <= ?
    ORDER BY period_start ASC`,
    [jobTypeId, startDate, endDate]
  );

  return rows;
};

// Get daily job type stats for a job type
export const getDailyJobTypeStatsForPeriod = async (
  jobTypeId,
  startDate,
  endDate
) => {
  const [rows] = await pool.query(
    `SELECT
      date,
      total_jobs,
      passed_jobs,
      failed_jobs,
      avg_duration_seconds
    FROM daily_job_type_stats
    WHERE job_type_id = ? AND date >= ? AND date <= ?
    ORDER BY date ASC`,
    [jobTypeId, startDate, endDate]
  );

  return rows;
};

export const bulkInsertHourlyPipelineStats = async (statsArray) => {
  if (!statsArray.length) return 0;

  const values = statsArray.map((stats) => [
    stats.period_start,
    stats.total_pipelines,
    stats.passed_pipelines,
    stats.failed_pipelines,
    stats.avg_duration_seconds,
  ]);

  const formattedValues = values.reduce((acc, val) => acc.concat(val), []);
  const placeholders = statsArray.map(() => '(?, ?, ?, ?, ?)').join(', ');

  const [result] = await pool.query(
    `INSERT INTO hourly_pipeline_stats
    (period_start, total_pipelines, passed_pipelines, failed_pipelines, avg_duration_seconds)
    VALUES ${placeholders}
    ON DUPLICATE KEY UPDATE
    total_pipelines = VALUES(total_pipelines),
    passed_pipelines = VALUES(passed_pipelines),
    failed_pipelines = VALUES(failed_pipelines),
    avg_duration_seconds = VALUES(avg_duration_seconds)`,
    formattedValues
  );

  return result.affectedRows;
};
