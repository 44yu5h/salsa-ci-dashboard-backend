import { pool } from '../config/db.js';
import { buildFilterableQuery } from '../utils/filterUtils.js';

// Get a pipeline by ID
export const getByPipelineId = async (pipelineId) => {
  const [rows] = await pool.query(
    'SELECT * FROM pipelines WHERE pipeline_id = ?',
    [pipelineId]
  );
  return rows[0];
};

// Get pipelines by multiple statuses
export const getByStatuses = async (statuses) => {
  const placeholders = statuses.map(() => '?').join(',');
  const [rows] = await pool.query(
    `SELECT * FROM pipelines WHERE status IN (${placeholders})`,
    statuses
  );
  return rows;
};

// Register/create a new pipeline
export const create = async (pipelineData) => {
  const {
    id: pipelineId,
    project_id: projectId,
    status,
    created_at,
    started_at,
    finished_at,
    duration,
    web_url,
    ref,
    sha,
    user,
  } = pipelineData;

  const [result] = await pool.query(
    `INSERT INTO pipelines
     (pipeline_id, project_id, status, created_at, started_at, finished_at,
      duration, web_url, ref, sha, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      pipelineId,
      projectId,
      status,
      created_at,
      started_at,
      finished_at,
      duration,
      web_url,
      ref,
      sha,
      user?.id || null,
    ]
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
  const {
    status,
    started_at,
    finished_at,
    duration,
    web_url,
    ref,
    sha,
    user_id,
  } = pipelineData;
  const [result] = await pool.query(
    `UPDATE pipelines
     SET status = ?, started_at = ?, finished_at = ?, duration = ?,
         web_url = ?, ref = ?, sha = ?, user_id = ?
     WHERE id = ?`,
    [
      status,
      started_at,
      finished_at,
      duration,
      web_url,
      ref,
      sha,
      user_id,
      pipelineId,
    ]
  );
  return result.affectedRows;
};

// Get pipelines by project ID
export const getByProjectId = async (projectId) => {
  const [rows] = await pool.query(
    'SELECT * FROM pipelines WHERE project_id = ? ORDER BY created_at DESC',
    [projectId]
  );
  return rows;
};

// Get all pipelines with filters, if any
export const getAllPipelines = async ({
  sortBy = 'created_at',
  sortOrder = 'DESC',
  statusFilter = [],
  minDuration,
  maxDuration,
  startDate,
  endDate,
  page = 1,
  limit = 100,
} = {}) => {
  // Define base queries
  const baseQuery = `SELECT * FROM pipelines`;
  const countQuery = `SELECT COUNT(*) as total FROM pipelines`;

  // Handle table prefix in the model
  const tablePrefix = '';

  // Use the buildFilterableQuery utility
  const {
    query,
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
    [],
    {
      validSortColumns: [
        'created_at',
        'started_at',
        'finished_at',
        'duration',
        'status',
      ],
      defaultSortColumn: 'created_at',
      prefix: tablePrefix,
    }
  );

  // Execute queries
  const [rows] = await pool.query(query, params);
  const [countRows] = await pool.query(finalCountQuery, countParams);

  return {
    pipelines: rows,
    total: countRows[0].total,
    page,
    limit,
  };
};
