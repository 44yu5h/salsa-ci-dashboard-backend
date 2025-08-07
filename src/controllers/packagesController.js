import * as packageModel from '../models/packageModel.js';
import { parseFilterParams } from '../utils/filterUtils.js';

// Get package by ID (package ID = project ID)
const getPackage = async (req, res) => {
  try {
    const { packageId } = req.params;
    const packageData = await packageModel.getByProjectId(packageId);

    if (!packageData) {
      return res.status(404).json({ message: 'Package not found' });
    }

    res.status(200).json(packageData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get list of all packages' (that ran Salsa CI)
const getPackagesList = async (req, res) => {
  try {
    const packages = await packageModel.getList();
    res.status(200).json(packages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all packages with pagination
const getAllPackages = async (req, res) => {
  try {
    const filters = parseFilterParams(req.query, {
      defaultSortBy: 'last_activity_at',
      defaultSortOrder: 'DESC',
      defaultLimit: 24,
    });

    const result = await packageModel.getAllPackages(filters);
    res.status(200).json(result);
  } catch (err) {
    console.error('Error fetching packages:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export default {
  getPackage,
  getPackagesList,
  getAllPackages,
};
