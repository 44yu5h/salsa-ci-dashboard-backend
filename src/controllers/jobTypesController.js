import * as jobTypesModel from '../models/jobTypesModel.js';

// Get all job types
const getAllJobTypes = async (req, res) => {
  try {
    const jobTypes = await jobTypesModel.getAll();
    res.status(200).json(jobTypes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get job type by name
const getJobTypeByName = async (req, res) => {
  try {
    const { name } = req.params;
    const jobType = await jobTypesModel.getByName(name);

    if (!jobType) {
      return res.status(404).json({ message: 'Job type not found' });
    }

    res.status(200).json(jobType);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update a job type by name
const updateJobType = async (req, res) => {
  try {
    const { name } = req.params;
    const { origin, stage, description, is_critical } = req.body;

    const jobType = await jobTypesModel.getByName(name);
    if (!jobType) {
      return res.status(404).json({ message: 'Job type not found' });
    }

    await jobTypesModel.updateByName(name, {
      origin,
      stage,
      description,
      is_critical,
    });
    res.status(200).json({ message: 'Job type updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get job types by origin
const getJobTypesByOrigin = async (req, res) => {
  try {
    const { origin } = req.params;
    if (!['external', 'salsaci'].includes(origin)) {
      return res.status(400).json({ message: 'Invalid origin type' });
    }
    const jobTypes = await jobTypesModel.getByOrigin(origin);
    res.status(200).json(jobTypes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export default {
  getAllJobTypes,
  getJobTypeByName,
  updateJobType,
  getJobTypesByOrigin,
};
