import { pool } from '../config/db.js';

// Get a pipeline by ID
export const getByPipelineId = async (pipelineId) => {
  const [rows] = await pool.query('SELECT * FROM pipelines WHERE pipeline_id = ?', [pipelineId]);
  return rows[0];
};

// Get pipelines by status
export const getByStatus = async (status) => {
  const [rows] = await pool.query('SELECT * FROM pipelines WHERE status = ?', [status]);
  return rows;
};

// Register/create a new pipeline
export const create = async (pipelineData) => {
  const { pipelineId, projectId, created_at } = pipelineData;
  const [result] = await pool.query(
    'INSERT INTO pipelines (pipeline_id, project_id, created_at, status) VALUES (?, ?, ?, ?)',
    [pipelineId, projectId, created_at, "created"]
  );
  return result.insertId;
};

// Update pipeline status
export const updateStatus = async (pipelineId, status, finished_at = null) => {
  const [result] = await pool.query(
    'UPDATE pipelines SET status = ?, finished_at = ? WHERE id = ?',
    [status, finished_at, pipelineId]
  );
  return result.affectedRows;
};

// Update all pipeline fields
export const updatePipeline = async (pipelineId, pipelineData) => {
  const { status, started_at, finished_at, duration, web_url, ref, sha, user_id } = pipelineData;
  const [result] = await pool.query(
    `UPDATE pipelines
     SET status = ?, started_at = ?, finished_at = ?, duration = ?,
         web_url = ?, ref = ?, sha = ?, user_id = ?
     WHERE id = ?`,
    [status, started_at, finished_at, duration, web_url, ref, sha, user_id, pipelineId]
  );
  return result.affectedRows;
};

// Get all pipelines
export const getList = async (limit = 100, offset = 0) => {
  const [rows] = await pool.query(
    'SELECT * FROM pipelines ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );
  return rows;
};

// Get pipelines by project ID
export const getByProjectId = async (projectId) => {
  const [rows] = await pool.query(
    'SELECT * FROM pipelines WHERE project_id = ? ORDER BY created_at DESC',
    [projectId]
  );
  return rows;
};
