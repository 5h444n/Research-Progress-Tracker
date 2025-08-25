import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        logger.info('Access attempt failed: No token provided', { ip: req.ip });
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        logger.info('Access attempt successful', { userId: decoded.userId, ip: req.ip, route: req.path });
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            logger.info('Access attempt failed: Token expired', { ip: req.ip, expires: error.expiredAt });
            return res.status(401).json({ error: 'Token expired. Please log in again.', expiredAt: error.expiredAt });
        }
        logger.info('Access attempt failed: Invalid token', { ip: req.ip, error: error.message });
        return res.status(403).json({ error: 'Invalid token.' });
    }
};

export const authorizeRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            logger.info('Access denied: Insufficient permissions', { userId: req.user?.userId, ip: req.ip, requiredRoles: roles });
            return res.status(403).json({ error: 'Insufficient permissions.' });
        }
        next();
    };
};