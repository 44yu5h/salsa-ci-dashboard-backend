import * as jobModel from '../models/jobModel.js';
import * as packageModel from '../models/packageModel.js';
import salsaApi from '../config/salsa.js';
import { parseFilterParams } from '../utils/filterUtils.js';

// Get a job by ID
const getByJobId = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await jobModel.getByJobId(jobId);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.status(200).json(job);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get jobs by pipeline ID
const getJobsByPipeline = async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const jobs = await jobModel.getByPipelineId(pipelineId);

    res.status(200).json(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update job status // currently not in use
const updateJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { status, finished_at } = req.body;
    const job = await jobModel.getByJobId(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    await jobModel.updateStatus(job.id, status, finished_at);
    res
      .status(200)
      .json({ message: `Job #${jobId} status updated to ${status}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get jobs by project ID
const getJobsByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const jobs = await jobModel.getByProjectId(projectId);

    res.status(200).json(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Helper function to update jobs for a pipeline
const updateJobsForPipeline = async (projectId, pipelineId) => {
  try {
    // Ensure package exists and is up to date
    await packageModel.fetchAndStorePackageDetails(projectId);

    console.log(
      `Fetching jobs for project: ${projectId}, pipeline: ${pipelineId}`
    );
    const response = await salsaApi.get(
      `/projects/${projectId}/pipelines/${pipelineId}/jobs`
    );
    const jobs = response.data;

    console.log(`Processing ${jobs.length} jobs for pipeline ${pipelineId}`);

    if (jobs.length === 0) {
      console.log(`No jobs found for pipeline ${pipelineId}`);
      return true;
    }

    const jobsData = jobs.map((job) => ({
      job_id: job.id,
      pipeline_id: pipelineId,
      project_id: projectId,
      name: job.name,
      status: job.status,
      stage: job.stage,
      started_at: job.started_at,
      finished_at: job.finished_at,
      web_url: job.web_url,
      duration: job.duration,
      runner_info: job.runner || null,
    }));

    const result = await jobModel.batchInsertOrUpdate(jobsData);
    console.log(
      `Pipeline ${pipelineId}: Created ${result.created} new jobs, updated ${result.updated} existing jobs`
    );

    console.log(`Finished processing jobs for pipeline ${pipelineId}`);
    return true;
  } catch (err) {
    console.error(`Error updating jobs for pipeline ${pipelineId}:`, err);
    return false;
  }
};

// Get packages by job name
const getPackagesByJobName = async (req, res) => {
  try {
    const { jobName } = req.params;
    const packages = await jobModel.getPackagesByJobName(jobName);

    res.status(200).json(packages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all jobs
const getAllJobs = async (req, res) => {
  try {
    const jobs = await jobModel.getAllJobs();
    res.status(200).json(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get jobs by job type name
const getJobsByJobType = async (req, res) => {
  try {
    const { jobTypeName } = req.params;

    // Handle and validate query params
    const filterParams = parseFilterParams(req.query, {
      defaultSortBy: 'started_at',
      defaultLimit: 10,
    });

    const result = await jobModel.getJobsByJobType(jobTypeName, filterParams);

    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export default {
  getByJobId,
  getJobsByPipeline,
  getJobsByProject,
  updateJobStatus,
  updateJobsForPipeline,
  getPackagesByJobName,
  getAllJobs,
  getJobsByJobType,
};
