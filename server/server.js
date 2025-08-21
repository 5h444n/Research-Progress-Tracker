import { config } from 'dotenv';
import express from 'express';
import authRoutes from'./routes/authRoutes.js';

config();
const app = express();

app.use(express.json());  // Parse JSON bodies
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} http://localhost:${PORT}`));