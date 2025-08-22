import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const registerUser = async (req, res) => {
    const { username, email, firstName, lastName, password } = req.body;

    if (!username || !password || !email) {
        return res.status(400).json({ error: 'email, username, and password are required' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: { username:username, email:email, first_name:firstName, last_name:lastName, hashed_password: hashedPassword },
        });

        res.status(201).json({ message: 'User registered successfully', userId: user.id });
    } catch (error) {
        console.error('Registration error:', error);

        if (error.code === 'P2002') {
            // Check which field caused the unique constraint violation
            const target = error.meta?.target;
            if (target?.includes('email')) {
                return res.status(409).json({ error: 'Email already exists' });
            } else if (target?.includes('username')) {
                return res.status(409).json({ error: 'Username already exists' });
            } else {
                return res.status(409).json({ error: 'User with this information already exists' });
            }
        }

        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
};

export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    // Fixed validation schema to match the actual fields being used
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(8).required(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: email },
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.hashed_password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Update last login time
        await prisma.user.update({
            where: { id: user.id },
            data: { last_login: new Date() },
        });

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: 'Login successful',
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.firstName || user.first_name, // Handle both cases
                lastName: user.lastName || user.last_name,     // Handle both cases
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
};