import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { validateRegister, validateLogin} from "../middleware/validationMiddleware.js";

const prisma = new PrismaClient();

export const registerUser = [
    ...validateRegister,
    async (req, res) => {
        const { username, email, firstName, lastName, password } = req.body;
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = await prisma.user.create({ data: { username: username,
                                                                                                                        email: email,
                                                                                                                        firstName: firstName,
                                                                                                                        lastName: lastName,
                                                                                                                        hashedPassword: hashedPassword }});
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
            logger.error('Registration error:', error);
            res.status(500).json({ error: 'Registration failed. Please try again.' });
        }
    },
];

export const loginUser = [
    ...validateLogin,
    async (req, res) => {
        const { username, password } = req.body;
        try {
            const user = await prisma.user.findUnique({ where: { username } });
            if (!user) return res.status(401).json({ error: 'Invalid username' });

            const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
            if (!isPasswordValid) return res.status(401).json({ error: 'Invalid password' });

            await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

            const token = jwt.sign({ userId: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
            res.status(200).json({
                message: 'Login successful',
                token,
                user: { id: user.id, username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
            });
        } catch (error) {
            logger.error('Login error:', error);
            res.status(500).json({ error: 'Login failed. Please try again.' });
        }
    },
];

process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});