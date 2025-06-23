import { pool } from '../config/db.js';

// Get a merge request by IID (!###)
export const getByIid = async (iid) => {
  const [rows] = await pool.query(
    'SELECT * FROM merge_requests WHERE iid = ?',
    [iid]
  );
  return rows[0];
};

// Batch insert multiple merge requests
export const batchInsert = async (mergeRequests) => {
  if (!mergeRequests || mergeRequests.length === 0) return 0;

  const placeholders = mergeRequests
    .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .join(', ');

  const values = mergeRequests.flatMap((mr) => [
    mr.iid,
    mr.title,
    mr.description,
    mr.created_at,
    mr.merged_at,
    mr.user_notes_count,
    mr.author_id,
    mr.author_username,
    mr.author_name,
    mr.author_avatar_url,
  ]);

  const [result] = await pool.query(
    `INSERT INTO merge_requests (
      iid, title, description, created_at, merged_at,
      user_notes_count, author_id, author_username, author_name,
      author_avatar_url
    ) VALUES ${placeholders}`,
    values
  );

  return result.affectedRows;
};

// Get all merge requests
export const getAll = async (limit = 1000, offset = 0) => {
  const [rows] = await pool.query(
    'SELECT * FROM merge_requests ORDER BY merged_at DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );
  return rows;
};

// Get the most recent merge request
export const getMostRecent = async () => {
  const [rows] = await pool.query(
    'SELECT * FROM merge_requests ORDER BY merged_at DESC LIMIT 1'
  );
  return rows[0];
};

// Count merge requests
export const getCount = async () => {
  const [result] = await pool.query(
    'SELECT COUNT(*) as count FROM merge_requests'
  );
  return result[0].count;
};
