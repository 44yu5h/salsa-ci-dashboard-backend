import Joi from 'joi';
import { pool } from '../config/db.js';
import salsaApi from '../config/salsa.js';

// Package validation schema
export const packageSchema = Joi.object({
  name: Joi.string().required(),
  project_id: Joi.number().required(),
  version: Joi.string().required(),
  description: Joi.string().allow(''),
  maintainer: Joi.string().allow(''),
  status: Joi.string().valid('active', 'deprecated', 'pending').required(),
  name_with_namespace: Joi.string().allow(''),
  web_url: Joi.string().allow(''),
  last_activity_at: Joi.date().allow(null),
  ci_config_path: Joi.string().allow(''),
});

// Get package by name
export const getByName = async (name) => {
  const [rows] = await pool.query('SELECT * FROM packages WHERE name = ?', [
    name,
  ]);
  return rows[0];
};

// Get package by GitLab project ID
export const getByProjectId = async (projectId) => {
  const [rows] = await pool.query(
    'SELECT * FROM packages WHERE project_id = ?',
    [projectId]
  );
  return rows[0];
};

// Create a new package
export const create = async (packageData) => {
  const {
    name,
    project_id,
    version,
    description,
    maintainer,
    status,
    name_with_namespace,
    web_url,
    last_activity_at,
    ci_config_path,
    created_at,
    updated_at,
  } = packageData;

  const [result] = await pool.query(
    `INSERT INTO packages
    (name, project_id, version, description, maintainer, status,
     name_with_namespace, web_url, last_activity_at, ci_config_path, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      project_id,
      version,
      description,
      maintainer,
      status,
      name_with_namespace,
      web_url,
      last_activity_at,
      ci_config_path,
      created_at,
      updated_at,
    ]
  );
  return result.insertId;
};

// Update a package
export const update = async (packageId, packageData) => {
  // add logic to not always update if nothing has changed
  const {
    version,
    description,
    maintainer,
    status,
    name_with_namespace,
    web_url,
    last_activity_at,
    ci_config_path,
    updated_at,
  } = packageData;

  const [result] = await pool.query(
    `UPDATE packages SET
     version = ?, description = ?, maintainer = ?, status = ?,
     name_with_namespace = ?, web_url = ?, last_activity_at = ?,
     ci_config_path = ?, updated_at = ?
     WHERE id = ?`,
    [
      version,
      description,
      maintainer,
      status,
      name_with_namespace,
      web_url,
      last_activity_at,
      ci_config_path,
      updated_at,
      packageId,
    ]
  );
  return result.affectedRows;
};

// Fetch & store project/package details
export const fetchAndStorePackageDetails = async (projectId) => {
  try {
    // Check if package already exists in our database
    const existingPackage = await getByProjectId(projectId);

    // Fetch package details from GitLab API
    console.log(`Fetching package data for project: ${projectId}`);
    const response = await salsaApi.get(`/projects/${projectId}`);
    const projectData = response.data;

    // Transform GitLab data to our schema
    const formattedData = {
      name: projectData.name,
      project_id: projectData.id,
      version: '1.0.0', // Default version for now
      description: projectData.description || '',
      maintainer: '', // Could be populated from elsewhere perhaps
      status: 'active', // later determine from last_activity_at or other fields
      name_with_namespace: projectData.name_with_namespace,
      web_url: projectData.web_url,
      last_activity_at: projectData.last_activity_at,
      ci_config_path: projectData.ci_config_path,
      created_at: projectData.created_at,
      updated_at: projectData.updated_at,
    };

    if (existingPackage) {
      // Update existing package
      await update(existingPackage.id, formattedData);
      console.log(`Updated package: ${projectData.name} (ID: ${projectId})`);
      return existingPackage.id;
    } else {
      // Create new package
      const id = await create(formattedData);
      console.log(
        `Created new package: ${projectData.name} (ID: ${projectId})`
      );
      return id;
    }
  } catch (err) {
    console.error(`Error fetching package details for ${projectId}:`, err);
    throw err;
  }
};

// Get all packages
export const getList = async (limit = 100, offset = 0) => {
  const [rows] = await pool.query('SELECT * FROM packages LIMIT ? OFFSET ?', [
    limit,
    offset,
  ]);
  return rows;
};
