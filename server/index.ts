/**
 * Express Server Entry Point
 * 
 * Main server file for the DigitalTwin API.
 */

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import inviteRoutes from './routes/invite';
import annotationsRoutes from './routes/annotations';
import { requestIdMiddleware, requestLogger, errorLogger } from './middleware/errorLogger';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(requestIdMiddleware);
app.use(requestLogger);
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/invite', inviteRoutes);
app.use('/api/annotations', annotationsRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error logging middleware
app.use(errorLogger);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.status(500).json({ message: '伺服器錯誤', error: err.message });
});

// Start server
app.listen(Number(PORT), () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
});

export default app;
