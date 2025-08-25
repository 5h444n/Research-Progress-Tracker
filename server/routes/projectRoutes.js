import express from 'express';
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware.js';
import { createProject, listProjects, updateProject, deleteProject } from '../controllers/projectController.js';

const router = express.Router();

router.post('/projects', authenticateToken, authorizeRole('user', 'admin'), createProject);
router.get('/projects', authenticateToken, authorizeRole('user', 'admin'), listProjects);
router.put('/projects/:id', authenticateToken, authorizeRole('user', 'admin'), updateProject);
router.delete('/projects/:id', authenticateToken, authorizeRole('user', 'admin'), deleteProject);

export default router;