import { validationResult, body } from 'express-validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Validation middleware
const validateRegister = [
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

const validateLogin = [
    body('email').trim().isEmail().normalizeEmail().escape(),
    body('password').trim().isLength({ min: 8 }).escape(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
        next();
    },
];

export const registerUser = [
    ...validateRegister,
    async (req, res) => {
        const { username, email, firstName, lastName, password } = req.body;
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = await prisma.user.create({ data: { username, email, firstName, lastName, hashedPassword } });
            res.status(201).json({ message: 'User registered successfully', userId: user.id });
        } catch (error) {
            if (error.code === 'P2002') {
                const target = error.meta?.target;
                return res.status(409).json({
                    error: target?.includes('email')
                        ? 'Email already exists'
                        : target?.includes('username')
                            ? 'Username already exists'
                            : 'User with this information already exists',
                });
            }
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Registration failed. Please try again.' });
        }
    },
];

export const loginUser = [
    ...validateLogin,
    async (req, res) => {
        const { email, password } = req.body;
        try {
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user) return res.status(401).json({ error: 'Invalid email or password' });

            const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
            if (!isPasswordValid) return res.status(401).json({ error: 'Invalid email or password' });

            await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

            const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });

            res.status(200).json({
                message: 'Login successful',
                token,
                user: { id: user.id, username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName },
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Login failed. Please try again.' });
        }
    },
];

process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});