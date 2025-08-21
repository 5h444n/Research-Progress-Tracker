import bcrypt from 'bcrypt';
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