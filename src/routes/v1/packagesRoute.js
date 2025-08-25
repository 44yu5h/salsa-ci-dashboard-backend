import express from 'express';
const router = express.Router();
import packagesController from '../../controllers/packagesController.js';

// Get all packages with pagination
router.get('/all', packagesController.getAllPackages);

// Get package list
router.get('/list', packagesController.getPackagesList);

// Manually update projects (all or one w/ body.projectId)
router.post('/manual-update', packagesController.manualUpdateProjects);

// Get package by ID
router.get('/:packageId', packagesController.getPackage);

export default router;
