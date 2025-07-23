import Joi from 'joi';
import { pool } from '../config/db.js';
import * as jobTypesModel from './jobTypesModel.js';
import { buildFilterableQuery } from '../utils/filterUtils.js';

// Job validation schema
export const jobSchema = Joi.object({
  pipeline_id: Joi.number().required(),
  project_id: Joi.number().allow(null),
  job_type_id: Joi.number().required(),
  status: Joi.string()
    .valid('created', 'running', 'success', 'failed', 'skipped', 'manual')
    .required(),
  started_at: Joi.date().iso().allow(null),
  finished_at: Joi.date().iso().allow(null),
  runner_info: Joi.object().allow(null),
});

// Get job by job ID
export const getByJobId = async (jobId) => {
  const [rows] = await pool.query(
    `
    SELECT j.*, jt.name as job_name, jt.stage
    FROM jobs j
    JOIN job_types jt ON j.job_type_id = jt.id
    WHERE j.job_id = ?`,
    [jobId]
  );
  return rows[0];
};

// Get jobs by pipeline ID
export const getByPipelineId = async (pipelineId) => {
  const [rows] = await pool.query(
    `
    SELECT j.*, jt.name as job_name, jt.stage
    FROM jobs j
    JOIN job_types jt ON j.job_type_id = jt.id
    WHERE j.pipeline_id = ?`,
    [pipelineId]
  );
  return rows;
};

// Create a new job
export const create = async (jobData) => {
  const {
    job_id,
    pipeline_id,
    project_id,
    name,
    status,
    stage,
    started_at,
    finished_at,
    duration,
    web_url,
    runner_info,
  } = jobData;

  // Get or create job type
  const jobType = await jobTypesModel.getOrCreate(name, stage);

  const [result] = await pool.query(
    `INSERT INTO jobs
    (job_id, pipeline_id, project_id, job_type_id, status, started_at, finished_at,
     duration, web_url, runner_info)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      job_id,
      pipeline_id,
      project_id,
      jobType.id,
      status,
      started_at,
      finished_at,
      duration,
      web_url,
      JSON.stringify(runner_info),
    ]
  );
  return result.insertId;
};

// Update job
export const update = async (jobId, jobData) => {
  const { status, started_at, finished_at, duration, web_url } = jobData;
  const [result] = await pool.query(
    `UPDATE jobs
     SET status = ?, started_at = ?, finished_at = ?,
         duration = ?, web_url = ?
     WHERE id = ?`,
    [status, started_at, finished_at, duration, web_url, jobId]
  );
  return result.affectedRows;
};

// Update job status
export const updateStatus = async (jobId, status, finished_at = null) => {
  const [result] = await pool.query(
    'UPDATE jobs SET status = ?, finished_at = ? WHERE id = ?',
    [status, finished_at, jobId]
  );
  return result.affectedRows;
};

// Get jobs by project ID
export const getByProjectId = async (projectId) => {
  const [rows] = await pool.query(
    `
    SELECT j.*, jt.name as job_name, jt.stage
    FROM jobs j
    JOIN job_types jt ON j.job_type_id = jt.id
    WHERE j.project_id = ?
    ORDER BY j.started_at DESC`,
    [projectId]
  );
  return rows;
};

// Get all unique job types
export const getListOfUniqueJobs = async () => {
  const [rows] = await pool.query('SELECT * FROM job_types ORDER BY name');
  return rows;
};

// Get packages that have a job with the given job type
export const getPackagesByJobName = async (jobName) => {
  const [rows] = await pool.query(
    `SELECT DISTINCT p.*
     FROM packages p
     JOIN jobs j ON p.project_id = j.project_id
     JOIN job_types jt ON j.job_type_id = jt.id
     WHERE jt.name = ?
     ORDER BY p.name`,
    [jobName]
  );
  return rows;
};

// Get all jobs
export const getAllJobs = async (limit = 100, offset = 0) => {
  const [rows] = await pool.query(
    `SELECT j.*, jt.name as job_name, jt.stage, jt.origin
     FROM jobs j
     JOIN job_types jt ON j.job_type_id = jt.id
     ORDER BY j.started_at DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return rows;
};

// Get jobs by job type name with sorting, filtering and pagination
export const getJobsByJobType = async (
  jobTypeName,
  {
    sortBy = 'started_at',
    sortOrder = 'DESC',
    statusFilter = [],
    minDuration,
    maxDuration,
    startDate,
    endDate,
    page = 1,
    limit = 10,
  } = {}
) => {
  // Define initial form of queries
  const baseQuery = `
    SELECT j.*, jt.name as job_name, jt.stage, jt.origin
    FROM jobs j
    JOIN job_types jt ON j.job_type_id = jt.id`;

  const countQuery = `
    SELECT COUNT(*) as total
    FROM jobs j
    JOIN job_types jt ON j.job_type_id = jt.id`;

  // Set up initial parameters and filters
  const baseParams = [jobTypeName];
  const additionalWhereClause = 'jt.name = ?';
  const tablePrefix = 'j.';

  // Final query assembly
  const {
    query: finalQuery,
    countQuery: finalCountQuery,
    params,
    countParams,
  } = buildFilterableQuery(
    baseQuery,
    countQuery,
    {
      sortBy,
      sortOrder,
      statusFilter,
      minDuration,
      maxDuration,
      startDate,
      endDate,
      page,
      limit,
    },
    baseParams,
    {
      validSortColumns: ['started_at', 'finished_at', 'duration', 'status'],
      defaultSortColumn: 'started_at',
      prefix: tablePrefix,
      additionalWhereClause,
    }
  );

  // Execute them
  const [rows] = await pool.query(finalQuery, params);
  const [countRows] = await pool.query(finalCountQuery, countParams);

  return {
    jobs: rows,
    total: countRows[0].total,
    page,
    limit,
  };
};

// Get multiple jobs by job IDs. Used in pipeline reg
export const getByJobIds = async (jobIds) => {
  if (!jobIds || jobIds.length === 0) {
    return [];
  }

  const placeholders = jobIds.map(() => '?').join(', ');
  const [rows] = await pool.query(
    `SELECT j.*, jt.name as job_name, jt.stage
     FROM jobs j
     JOIN job_types jt ON j.job_type_id = jt.id
     WHERE j.job_id IN (${placeholders})`,
    jobIds
  );
  return rows;
};

// Batch insert or update jobs
export const batchInsertOrUpdate = async (jobsData) => {
  if (!jobsData || jobsData.length === 0) {
    return { created: 0, updated: 0 };
  }

  const jobTypePromises = jobsData.map((job) =>
    jobTypesModel.getOrCreate(job.name, job.stage)
  );
  const jobTypes = await Promise.all(jobTypePromises);

  const jobTypeMap = new Map();
  jobsData.forEach((job, index) => {
    jobTypeMap.set(job.name, jobTypes[index].id);
  });

  const values = jobsData.map((job) => [
    job.job_id,
    job.pipeline_id,
    job.project_id,
    jobTypeMap.get(job.name),
    job.status,
    job.started_at,
    job.finished_at,
    job.duration,
    job.web_url,
    JSON.stringify(job.runner_info),
  ]);

  const placeholders = values
    .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .join(', ');
  const formattedValues = values.flat();

  const [result] = await pool.query(
    `INSERT INTO jobs
    (job_id, pipeline_id, project_id, job_type_id, status, started_at, finished_at,
     duration, web_url, runner_info)
    VALUES ${placeholders}
    ON DUPLICATE KEY UPDATE
    status = VALUES(status),
    started_at = VALUES(started_at),
    finished_at = VALUES(finished_at),
    duration = VALUES(duration),
    web_url = VALUES(web_url),
    runner_info = VALUES(runner_info)`,
    formattedValues
  );

  return {
    created: result.affectedRows - result.changedRows,
    updated: result.changedRows,
  };
};
