/**
 * Memento Backend - Main Entry Point
 * 
 * Local Node.js server that:
 * 1. Receives notifications from mobile app
 * 2. Processes through AI agent (Azure AI Foundry + MCP)
 * 3. Manages tasks in Azure SQL Database
 * 4. Provides API for mobile app
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import ingestRouter from './routes/ingest';
import tasksRouter from './routes/tasks';
import * as localStorage from './services/localStorage';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Initialize local storage
localStorage.initializeStorage().catch(err => {
  console.error('Failed to initialize storage:', err);
  process.exit(1);
});

// Middleware
app.use(cors()); // Allow requests from mobile app
app.use(morgan('dev')); // HTTP request logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'memento-backend',
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/ingest', ingestRouter);
app.use('/api/tasks', tasksRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('[ERROR]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║         Memento Backend Server Started            ║');
  console.log('╠════════════════════════════════════════════════════╣');
  console.log(`║  Port:        ${PORT}                                  ║`);
  console.log(`║  Environment: ${process.env.NODE_ENV || 'development'}                      ║`);
  console.log(`║  Health:      http://localhost:${PORT}/health          ║`);
  console.log('╠════════════════════════════════════════════════════╣');
  console.log('║  Endpoints:                                        ║');
  console.log(`║  POST /api/ingest/notification                     ║`);
  console.log(`║  POST /api/ingest/chat                             ║`);
  console.log(`║  GET  /api/tasks                                   ║`);
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('\n✓ Ready to receive notifications from mobile app\n');
});

export default app;
