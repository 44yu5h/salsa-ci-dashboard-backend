import Joi from 'joi';
import * as pipelineModel from '../models/pipelineModel.js';
import * as packageModel from '../models/packageModel.js';
import jobsController from '../controllers/jobsController.js';
import salsaApi from '../config/salsa.js';
import { parseFilterParams } from '../utils/filterUtils.js';

// Register a new pipeline with minimal information
const registerPipeline = async (req, res) => {
  const pipelineSchema = Joi.object({
    id: Joi.number().required(),
    project_id: Joi.number().required(),
    created_at: Joi.date().iso().required(),
    // Other fields..
  }).unknown(true);

  const { error } = pipelineSchema.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: 'Invalid request data', details: error.details });

  try {
    // Extract fields from req body
    const pipelineId = req.body.id;
    const projectId = req.body.project_id;
    const created_at = req.body.created_at;

    // Fetch and store package details
    try {
      await packageModel.fetchAndStorePackageDetails(projectId);
      console.log(`Package for project ID ${projectId} created or updated`);
    } catch (err) {
      console.error(
        `Failed to create package for project ID ${projectId}:`,
        err
      );
      return res.status(400).json({
        message: `Failed to create or retrieve package for project ID ${projectId}`,
        details: err.message,
      });
    }

    // Insert with minimal data, status is always "created" initially
    const pipelineData = {
      pipelineId,
      projectId,
      created_at,
    };

    // Check if pipeline already exists - retries of the same pipeline
    const existingPipeline = await pipelineModel.getByPipelineId(pipelineId);
    if (existingPipeline) {
      return res.status(409).json({
        message: `Pipeline #${pipelineId} already registered`,
        pipelineId: existingPipeline.id,
      });
    }

    await pipelineModel.create(pipelineData);
    console.log(
      `New pipeline registered: ${pipelineId}, will fetch details later via cron`
    );

    res.status(201).json({
      message: `Pipeline #${pipelineId} registered successfully!`,
      pipelineId,
      projectId,
      created_at,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get pipeline details by ID
const getPipeline = async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const pipeline = await pipelineModel.getByPipelineId(pipelineId);

    if (!pipeline) {
      return res.status(404).json({ message: 'Pipeline not found' });
    }

    res.status(200).json(pipeline);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update pipeline status // currently not in use
const updatePipelineStatus = async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const { status, finished_at } = req.body;

    const pipeline = await pipelineModel.getByPipelineId(pipelineId);
    if (!pipeline) {
      return res.status(404).json({ message: 'Pipeline not found' });
    }

    // Update pipeline status in the database
    await pipelineModel.updateStatus(pipelineId, status, finished_at);

    res
      .status(200)
      .json({ message: `Pipeline #${pipelineId} status updated to ${status}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Check pending pipelines // this is called by the cron job
const checkPendingPipelines = async () => {
  try {
    console.log('Starting pipeline status check at ', new Date().toISOString());
    // Get all pipelines with 'created' status only
    const pendingPipelines = await pipelineModel.getByStatus('created');
    console.log(`Found ${pendingPipelines.length} pending pipelines to check`);

    for (const pipeline of pendingPipelines) {
      try {
        // Use project_id and pipeline_id to fetch details
        console.log(
          `Fetching pipeline data for project: ${pipeline.project_id}, pipeline: ${pipeline.pipeline_id}`
        );
        const response = await salsaApi.get(
          `/projects/${pipeline.project_id}/pipelines/${pipeline.pipeline_id}`
        );
        const pipelineData = response.data;

        // If the pipeline has finished with a final status, fetch and process jobs
        if (
          ['success', 'failed', 'canceled', 'skipped', 'manual'].includes(
            pipelineData.status
          )
        ) {
          if (
            (await packageModel.getByProjectId(pipeline.project_id)) === null
          ) {
            console.log(
              `Project #${pipeline.project_id} not found, fetching details...`
            );
            await packageModel.fetchAndStorePackageDetails(pipeline.project_id);
          } else {
            // TODO update package details
          }

          // Update pipeline with details
          await pipelineModel.updatePipeline(pipeline.id, {
            status: pipelineData.status,
            started_at: pipelineData.started_at,
            finished_at: pipelineData.finished_at,
            duration: pipelineData.duration,
            web_url: pipelineData.web_url,
            ref: pipelineData.ref,
            sha: pipelineData.sha,
            user_id: pipelineData.user?.id || null,
          });
          console.log(
            `Updated pipeline #${pipeline.pipeline_id}, status: ${pipelineData.status}`
          );

          // Use the updateJobsForPipeline function from jobsController
          await jobsController.updateJobsForPipeline(
            pipeline.project_id,
            pipeline.pipeline_id
          );
          // = true
        }
      } catch (err) {
        if (err.response && err.response.status === 404) {
          console.warn(
            `Pipeline #${pipeline.pipeline_id} not found on Salsa, marking as deleted`
          );
          // Mark pipeline as deleted if it doesn't exist in GitLab
          await pipelineModel.updateStatus(pipeline.id, 'deleted');
        } else {
          console.error(
            `Error updating pipeline ${pipeline.pipeline_id}:`,
            err
          );
        }
      }
    }

    console.log('Pipeline status check completed');
  } catch (err) {
    console.error('Error in pipeline status check cron job:', err);
  }
};

// Manually trigger pending pipelines check
const triggerPendingPipelinesCheck = async (req, res) => {
  try {
    await checkPendingPipelines();
    res.status(200).json({ message: 'Finished checking pending pipelines' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get pipelines by project ID
const getPipelinesByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const pipelines = await pipelineModel.getByProjectId(projectId);
    res.status(200).json(pipelines);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all pipelines with filters, if any
const getAllPipelines = async (req, res) => {
  try {
    // Handle and validate query params
    const filterParams = parseFilterParams(req.query, {
      defaultSortBy: 'created_at',
      defaultLimit: 100,
    });

    const result = await pipelineModel.getAllPipelines(filterParams);

    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export default {
  registerPipeline,
  getPipeline,
  updatePipelineStatus,
  checkPendingPipelines,
  triggerPendingPipelinesCheck,
  getPipelinesByProject,
  getAllPipelines,
};
