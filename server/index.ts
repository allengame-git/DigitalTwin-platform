/**
 * Express Server Entry Point
 * 
 * Main server file for the DigitalTwin API.
 */

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Load environment variables immediately
dotenv.config();

import authRoutes from './routes/auth';
import inviteRoutes from './routes/invite';
import annotationsRoutes from './routes/annotations';
import uploadRoutes from './routes/upload';
import geologyModelRoutes from './routes/geology-model';
import projectRoutes from './routes/project';
import boreholeRoutes from './routes/borehole';
import lithologyRoutes from './routes/lithology';
import { requestIdMiddleware, requestLogger, errorLogger } from './middleware/errorLogger';
import path from 'path';

// Middleware
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

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/invite', inviteRoutes);
app.use('/api/annotations', annotationsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/geology-model', geologyModelRoutes);
app.use('/api/project', projectRoutes);
app.use('/api/borehole', boreholeRoutes);
app.use('/api/lithology', lithologyRoutes);

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
