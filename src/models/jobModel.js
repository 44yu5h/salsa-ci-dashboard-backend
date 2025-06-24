import Joi from 'joi';
import { pool } from '../config/db.js';
import * as jobTypesModel from './jobTypesModel.js';

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
