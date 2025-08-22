import { config } from 'dotenv';
import express from 'express';
import authRoutes from './routes/authRoutes.js';

config();
const app = express();

app.use(express.json());

app.use('/api/auth', authRoutes);

// Global error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} http://localhost:${PORT}`));