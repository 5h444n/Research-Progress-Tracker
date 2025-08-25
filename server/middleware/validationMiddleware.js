import {body, param, validationResult} from "express-validator";
import {logger} from "../utils/logger.js";

export const validateRegister = [
    body('username').trim().isLength({ min: 3, max: 50 }).escape(),
    body('email').trim().isEmail().normalizeEmail().escape(),
    body('firstName').trim().optional().isLength({ max: 50 }).escape(),
    body('lastName').trim().optional().isLength({ max: 50 }).escape(),
    body('password').trim().isLength({ min: 8 }).escape(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
        next();
    },
];

export const validateLogin = [
    body('username').trim().isLength({ min: 3, max: 50 }).escape(),
    body('password').trim().isLength({ min: 8 }).escape(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty())
            return res.status(400).json({ error: errors.array()[0].msg });
        next();
    },
];

export const validateCreateProject = [
    body('title').trim().isLength({ min: 1, max: 100 }).escape(),
    body('description').trim().optional().isLength({ max: 1000 }).escape(),
    body('startDate').optional().isISO8601().toDate(),
    body('endDate').optional().isISO8601().toDate().custom((value, { req }) => {
        if (value && req.body.startDate && new Date(value) < new Date(req.body.startDate)) throw new Error('End date must be after start date');
        return true;
    }),
    body('status').optional().isIn(['active', 'completed', 'onhold']).escape(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
        next();
    },
];

export const validateUpdateProject = [
    param('id').isInt().withMessage('Project ID must be an integer'),
    body('title').trim().optional().isLength({ min: 1, max: 100 }).escape(),
    body('description').trim().optional().isLength({ max: 1000 }).escape(),
    body('startDate').optional().isISO8601().toDate(),
    body('endDate').optional().isISO8601().toDate().custom((value, { req }) => {
        if (value && req.body.startDate && new Date(value) < new Date(req.body.startDate)) {
            throw new Error('End date must be after start date');
        }
        return true;
    }).withMessage('Invalid end date'),
    body('status').optional().isIn(['active', 'completed', 'onhold']).escape(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation failed for update project', { errors: errors.array(), userId: req.user?.userId });
            return res.status(400).json({ error: errors.array()[0].msg });
        }
        next();
    },
];