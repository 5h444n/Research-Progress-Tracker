import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Validation schemas
const registerSchema = Joi.object({
    username: Joi.string().min(3).max(50).required(),
    email: Joi.string().email().required(),
    firstName: Joi.string().max(50).optional(),
    lastName: Joi.string().max(50).optional(),
    password: Joi.string().min(8).required(),
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
});

export const registerUser = async (req, res) => {
    const { username, email, firstName, lastName, password } = req.body;

    const { error } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { username:username,email:email,firstNname:firstName, lastName:lastName, hashedPassword:hashedPassword },
        });
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
        // Log error (consider a logging library like Winston)
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
};

export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    const { error } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(401).json({ error: 'Invalid email or password' });

        const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
        if (!isPasswordValid) return res.status(401).json({ error: 'Invalid email or password' });

        await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
};

// Graceful shutdown (optional)
process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});