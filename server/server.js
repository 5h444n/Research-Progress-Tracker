import { config } from 'dotenv';
import express from 'express';

config();
const app = express();

app.use(express.json());  // Parse JSON bodies

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} http://localhost:${PORT}`));