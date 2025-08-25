import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { validateCreateProject, validateUpdateProject} from "../middleware/validationMiddleware.js";

const prisma = new PrismaClient();

export const createProject = [
    ...validateCreateProject,
    async (req, res) => {
        const { title, description, startDate, endDate, status } = req.body;
        const userId = req.user.userId;

        try {
            const project = await prisma.$transaction(async (tx) => {
                const createdProject = await tx.project.create({
                    data: { title, description, startDate, endDate, status, userId },
                });
                await tx.auditLog.create({
                    data: { userId, action: 'CREATE', entity: 'Project', entityId: createdProject.id, details: { title } },
                });
                return createdProject;
            });
            logger.info('Project created', { projectId: project.id, userId });
            res.status(201).json({ message: 'Project created successfully', projectId: project.id });
        } catch (error) {
            logger.error('Create project error:', error);
            res.status(500).json({ error: 'Failed to create project.' });
        }
    },
];

export const listProjects = [
    async (req, res) => {
        const userId = req.user.userId;
        const { cursor, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', status } = req.query;

        // Validate query parameters
        const limitNum = parseInt(limit);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
            throw new Error('Limit must be between 1 and 50');
        }
        const validSortBy = ['createdAt', 'updatedAt', 'title', 'status'];
        if (!validSortBy.includes(sortBy)) throw new Error('Invalid sortBy field');
        if (!['asc', 'desc'].includes(sortOrder.toLowerCase())) throw new Error('Invalid sortOrder, use asc or desc');
        if (status && !['active', 'completed', 'onhold'].includes(status)) throw new Error('Invalid status filter');

        const where = { userId, deletedAt: null };
        if (status) where.status = status;

        try {
            let projectsQuery = prisma.project.findMany({
                where,
                orderBy: { [sortBy]: sortOrder },
                take: limitNum + 1, // Fetch one extra to check for next page
            });

            if (cursor) {
                const cursorId = parseInt(cursor);
                if (isNaN(cursorId)) throw new Error('Invalid cursor value');
                projectsQuery = projectsQuery.cursor({ id: cursorId }).where(where);
            }

            const projects = await projectsQuery;
            const hasNextPage = projects.length > limitNum;
            if (hasNextPage) projects.pop(); // Remove the extra item

            const hasPreviousPage = !!cursor;
            const nextCursor = hasNextPage ? projects[projects.length - 1]?.id : null;
            const previousCursor = cursor ? (await prisma.project.findFirst({ where, orderBy: { [sortBy]: sortOrder === 'desc' ? 'asc' : 'desc' }, skip: 1 })?.id) : null;

            logger.info('Projects listed successfully', { userId, limit: limitNum, cursor, hasNextPage, hasPreviousPage });
            res.status(200).json({
                projects,
                pagination: {
                    limit: limitNum,
                    hasNextPage,
                    hasPreviousPage,
                    nextCursor,
                    previousCursor,
                },
            });
        } catch (error) {
            logger.error('List projects error:', error);
            res.status(500).json({ error: error.message || 'Failed to list projects.' });
        }
    },
];

export const updateProject = [
    ...validateUpdateProject,
    async (req, res) => {
        const { id } = req.params;
        const { title, description, startDate, endDate, status } = req.body;
        const userId = req.user.userId;

        try {
            const projectId = parseInt(id);
            if (isNaN(projectId)) throw new Error('Invalid project ID');

            const project = await prisma.$transaction(async (tx) => {
                const existingProject = await tx.project.findUnique({ where: { id: projectId } });
                if (!existingProject) throw new Error('Project not found.');
                if (existingProject.userId !== userId) throw new Error('Unauthorized to update this project.');

                const updatedProject = await tx.project.update({
                    where: { id: projectId },
                    data: { title, description, startDate, endDate, status, updatedAt: new Date() },
                });
                await tx.auditLog.create({
                    data: { userId, action: 'UPDATE', entity: 'Project', entityId: projectId, details: { title } },
                });
                return updatedProject;
            });
            logger.info('Project updated', { projectId, userId });
            res.status(200).json({ message: 'Project updated successfully', project });
        } catch (error) {
            logger.error('Update project error:', error);
            const statusCode = error.message.includes('Unauthorized') ? 403 : error.message.includes('not found') ? 404 : 500;
            res.status(statusCode).json({ error: error.message || 'Failed to update project.' });
        }
    },
];

export const deleteProject = [
    async (req, res) => {
        const { id } = req.params;
        const userId = req.user.userId;

        try {
            const projectId = parseInt(id);
            if (isNaN(projectId)) throw new Error('Invalid project ID');

            const project = await prisma.$transaction(async (tx) => {
                const existingProject = await tx.project.findUnique({ where: { id: projectId } });
                if (!existingProject) throw new Error('Project not found.');
                if (existingProject.userId !== userId) throw new Error('Unauthorized to delete this project.');

                await tx.project.update({
                    where: { id: projectId },
                    data: { deletedAt: new Date() },
                });
                await tx.auditLog.create({
                    data: { userId, action: 'DELETE', entity: 'Project', entityId: projectId, details: { title: existingProject.title } || {} },
                });
                return existingProject;
            });
            logger.info('Project soft deleted', { projectId, userId });
            res.status(200).json({ message: 'Project deleted successfully' });
        } catch (error) {
            logger.error('Delete project error:', error);
            const statusCode = error.message.includes('Unauthorized') ? 403 : error.message.includes('not found') ? 404 : 500;
            res.status(statusCode).json({ error: error.message || 'Failed to delete project.' });
        }
    },
];