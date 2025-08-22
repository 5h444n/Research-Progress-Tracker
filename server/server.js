import { config } from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import winston from 'winston';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/authRoutes.js';

config();
const app = express();
const prisma = new PrismaClient();

// Set up Winston logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
    ],
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple(),
    }));
}

app.use(helmet());
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' },
});

app.use(express.json());
app.use('/api/auth', limiter);
app.use('/api/auth', authRoutes);

app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

async function startServer() {
    try {
        await prisma.$connect();
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => logger.info(`Server running on http://localhost:${PORT}`));
    } catch (error) {
        logger.error('Failed to connect to database:', error);
        process.exit(1);
    }
}

startServer();

process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    logger.info('Server shutting down');
    process.exit(0);
});