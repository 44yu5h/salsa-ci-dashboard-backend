import * as mergeRequestModel from '../models/mergeRequestModel.js';
import salsaApi from '../config/salsa.js';
import fs from 'fs/promises';
import path from 'path';

const JSON_FILE_PATH = path.join(process.cwd(), 'data', 'merge_requests.json');

const ensureDirectoryExists = async () => {
  try {
    await fs.access(path.dirname(JSON_FILE_PATH));
  } catch (error) {
    await fs.mkdir(path.dirname(JSON_FILE_PATH), { recursive: true });
  }
};

// Get MRs from the API
const fetchMergeRequests = async () => {
  try {
    console.log('Starting merge request fetch at', new Date());

    const projectId = 27916; // Salsa CI pipeline project
    const perPage = 100;
    let currentPage = 1;
    let hasMorePages = true;

    // Get most recent MR in our db to know when to stop fetching
    const mostRecentMr = await mergeRequestModel.getMostRecent();
    const mostRecentMrIid = mostRecentMr ? mostRecentMr.iid : null;

    const newMergeRequests = [];

    while (hasMorePages) {
      console.log(`Fetching merge requests: page ${currentPage}`);

      const response = await salsaApi.get(
        `/projects/${projectId}/merge_requests`,
        {
          params: {
            state: 'merged',
            per_page: perPage,
            page: currentPage,
            order_by: 'merged_at',
            sort: 'desc',
          },
        }
      );

      const mergeRequests = response.data;

      if (mergeRequests.length === 0) {
        hasMorePages = false;
        continue;
      }

      for (const mr of mergeRequests) {
        // We are only concerned with MRs targeting the master branch
        if (mr.target_branch !== 'master') continue;
        if (mostRecentMrIid && mostRecentMrIid === mr.iid) {
          console.log(`Found already processed MRs, stopping at !${mr.iid}`);
          hasMorePages = false;
          break;
        }

        const mrData = {
          iid: mr.iid,
          title: mr.title,
          description: mr.description || '',
          created_at: mr.created_at,
          merged_at: mr.merged_at,
          user_notes_count: mr.user_notes_count,
          author_id: mr.author.id,
          author_username: mr.author.username,
          author_name: mr.author.name,
          author_avatar_url: mr.author.avatar_url,
        };
        newMergeRequests.push(mrData);
      }

      const totalPages = parseInt(response.headers['x-total-pages'] || '1');
      if (currentPage >= totalPages) {
        hasMorePages = false;
      }
      currentPage++;
    }

    // Batch insert all the new MRs
    if (newMergeRequests.length > 0) {
      const inserted = await mergeRequestModel.batchInsert(newMergeRequests);
      console.log(`Inserted ${inserted} new merge requests`);
    } else {
      console.log('No new merge requests found');
    }
    await refreshMergeRequestsJson();
    return true;
  } catch (error) {
    console.error('Error fetching merge requests:', error);
    return false;
  }
};

// Manual trigger for fetching merge requests
const manuallyFetchMergeRequests = async (req, res) => {
  try {
    await fetchMergeRequests();
    res.status(200).json({ message: 'Merge requests updated successfully' });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to update merge requests',
      error: error.message,
    });
  }
};

// (Re)generate the merge requests JSON file from database
const refreshMergeRequestsJson = async () => {
  try {
    await ensureDirectoryExists();
    const mergeRequests = await mergeRequestModel.getAll();
    await fs.writeFile(JSON_FILE_PATH, JSON.stringify(mergeRequests, null, 2));
    return true;
  } catch (error) {
    console.error('Error refreshing merge requests JSON:', error);
    return false;
  }
};

// Serve merge requests JSON
const getMergeRequestsJson = async (req, res) => {
  try {
    try {
      const fileContent = await fs.readFile(JSON_FILE_PATH, 'utf8');
      return res.status(200).json(JSON.parse(fileContent));
    } catch (fileError) {
      console.log('JSON file not found, fetching from database');

      // Fallback: get from database
      const mergeRequests = await mergeRequestModel.getAll();
      await refreshMergeRequestsJson();
      return res.status(200).json(mergeRequests);
    }
  } catch (error) {
    console.error('Error serving merge requests:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export default {
  fetchMergeRequests,
  manuallyFetchMergeRequests,
  refreshMergeRequestsJson,
  getMergeRequestsJson,
};
