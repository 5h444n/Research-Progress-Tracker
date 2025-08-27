import {PrismaClient} from "@prisma/client";
import {logger} from "../utils/logger.js";
import * as fs from "node:fs";

const prisma = new PrismaClient();

export const uploadSingle = async (req, res) => {
    try {
        const {projectId} = req.body;
        const userId = req.user.userId;

        logger.info('Single document upload attempt', {
            userId, projectId, fileName: req.file?.originalname, fileSize: req.file?.size
        });

        if (!req.file) {
            logger.warn('Upload attempt without file', {userId, projectId});
            return res.status(400).json({error: 'No file uploaded'});
        }

        if (!projectId) {
            fs.unlinkSync(req.file.path);
            logger.warn('Upload attempt without project ID', {
                userId, fileName: req.file.originalname, deletedFile: req.file.path
            });
            return res.status(400).json({error: 'Project ID is required'});
        }

        const project = await prisma.project.findFirst({
            where: {id: parseInt(projectId), userId: userId, deletedAt: null}
        });

        if (!project) {
            fs.unlinkSync(req.file.path);
            logger.warn('Upload attempt to unauthorized project', {
                userId, projectId, fileName: req.file.originalname, deletedFile: req.file.path
            });
            return res.status(403).json({error: 'Project not found or access denied'});
        }

        const document = await prisma.document.create({
            data: {
                fileName: req.file.filename,
                originalName: req.file.originalname,
                path: req.file.path,
                mimeType: req.file.mimetype,
                size: req.file.size,
                projectId: project.id,
                uploadedById: userId
            }, include: {
                uploadedBy: {
                    select: {id: true, username: true, email: true}
                }, project: {
                    select: {id: true, title: true}
                }
            }
        });

        logger.info('Document uploaded successfully', {
            documentId: document.id,
            userId,
            projectId,
            fileName: document.originalName,
            fileSize: document.size
        });

        res.status(201).json({
            message: 'Document uploaded successfully',
            document
        });
    } catch (error) {
        // Clean up file if database operation fails
        if (req.file) {
            fs.unlinkSync(req.file.path);
            logger.error('Database operation failed, cleaned up uploaded file', {
                error: error.message,
                userId: req.user?.id,
                fileName: req.file.originalname,
                deletedFile: req.file.path
            });
        }
        logger.error('Single document upload error', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id,
            projectId: req.body?.projectId
        });
        res.status(500).json({ error: 'Internal server error' });
    }
};

