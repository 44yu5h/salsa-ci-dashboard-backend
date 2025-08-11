import Joi from 'joi';
import { pool } from '../config/db.js';

// Job Type validation schema
export const jobTypeSchema = Joi.object({
  name: Joi.string().required(),
  origin: Joi.string().valid('external', 'salsaci').default('external'),
  stage: Joi.string().allow(null),
  description: Joi.string().allow(null),
  is_critical: Joi.boolean().default(false),
});

// Get job type by ID
export const getById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM job_types WHERE id = ?', [id]);
  return rows[0];
};

// Get job type by name
export const getByName = async (name) => {
  const [rows] = await pool.query('SELECT * FROM job_types WHERE name = ?', [
    name,
  ]);
  return rows[0];
};

// Create a new job type
export const create = async (jobTypeData) => {
  const {
    name,
    origin = 'external',
    stage = null,
    description = null,
    is_critical = false,
  } = jobTypeData;

  const [result] = await pool.query(
    'INSERT INTO job_types (name, origin, stage, description, is_critical) VALUES (?, ?, ?, ?, ?)',
    [name, origin, stage, description, is_critical]
  );
  return result.insertId;
};

// Update a job type by name
export const updateByName = async (name, jobTypeData) => {
  const { origin, stage, description, is_critical } = jobTypeData;

  const [result] = await pool.query(
    'UPDATE job_types SET origin = ?, stage = ?, description = ?, is_critical = ? WHERE name = ?',
    [origin, stage, description, is_critical, name]
  );
  return result.affectedRows;
};

// Get or create job type by name
export const getOrCreate = async (name, stage = null) => {
  const jobType = await getByName(name);

  if (jobType) {
    // If stage is provided and different, update it
    if (stage && stage !== jobType.stage) {
      await update(jobType.id, { ...jobType, stage });
      jobType.stage = stage;
    }
    return jobType;
  } else {
    const id = await create({ name, stage });
    return {
      id,
      name,
      origin: 'external',
      stage,
      description: null,
      is_critical: false,
    };
  }
};

// Get all job types
export const getAll = async () => {
  const [rows] = await pool.query('SELECT * FROM job_types ORDER BY name');
  return rows;
};

// Get job types by origin
export const getByOrigin = async (origin) => {
  const [rows] = await pool.query(
    'SELECT * FROM job_types WHERE origin = ? ORDER BY name',
    [origin]
  );
  return rows;
};

// Summary statistics for multiple job types
export const getSummaryStats = async (jobTypeIds = []) => {
  if (!Array.isArray(jobTypeIds) || jobTypeIds.length === 0) {
    return {};
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  // 30d stats grouped
  const [monthlyRows] = await pool.query(
    `SELECT
      j.job_type_id,
      COUNT(*) AS total_runs,
      SUM(CASE WHEN j.status = 'success' THEN 1 ELSE 0 END) AS successful_runs,
      SUM(j.duration) AS total_duration_seconds,
      AVG(j.duration) AS avg_duration_seconds
    FROM jobs j
    WHERE j.job_type_id IN (?)
      AND j.started_at >= ?
      AND j.status IN ('success', 'failed')
    GROUP BY j.job_type_id`,
    [jobTypeIds, thirtyDaysAgo]
  );

  const statsMap = {};

  // Map results to job type ids
  for (const r of monthlyRows) {
    const totalRuns = Number(r.total_runs) || 0;
    const successfulRuns = Number(r.successful_runs) || 0;

    statsMap[r.job_type_id] = {
      monthly_runs: totalRuns,
      monthly_ci_minutes: Math.round(
        (Number(r.total_duration_seconds) || 0) / 60
      ),
      monthly_avg_duration: Math.round(Number(r.avg_duration_seconds) || 0),
      success_rate:
        totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 100,
    };
  }

  return statsMap;
};
