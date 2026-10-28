
import dotenv from 'dotenv';
dotenv.config();
import cors from 'cors';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB, isDBConnected } from './server/config/db.js';
import { seedFleetData } from './server/seed/seedData.js';

// Route imports
import authRoutes from './server/routes/authRoutes.js';
import vehicleRoutes from './server/routes/vehicleRoutes.js';
import driverRoutes from './server/routes/driverRoutes.js';
import tripRoutes from './server/routes/tripRoutes.js';
import fuelRoutes from './server/routes/fuelRoutes.js';
import maintenanceRoutes from './server/routes/maintenanceRoutes.js';
import expenseRoutes from './server/routes/expenseRoutes.js';
import notificationRoutes from './server/routes/notificationRoutes.js';
import dashboardRoutes from './server/routes/dashboardRoutes.js';
import analyticsRoutes from './server/routes/analyticsRoutes.js';
import decisionRoutes from './server/routes/decisionRoutes.js';
import aiRoutes from './server/routes/aiRoutes.js';

import { errorHandler } from './server/middleware/errorMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = '0.0.0.0';

  console.log('');
  console.log('==============================================');
  console.log('       FLEETNOVA SMART FLEET MANAGEMENT');
  console.log('==============================================');
  console.log('[FLEETNOVA] Initializing application...');
  console.log('[FLEETNOVA] Connecting to database...');

  // Connect to MongoDB
  try {
    await connectDB();

    if (isDBConnected()) {
      console.log('[DATABASE] MongoDB Status: CONNECTED');
    } else {
      console.warn(
        '[DATABASE] MongoDB Status: NOT CONNECTED'
      );
      console.warn(
        '[DATABASE] Check server/config/db.js and your .env configuration.'
      );
    }
  } catch (error) {
    console.error('[DATABASE] MongoDB connection failed.');
    console.error('[DATABASE] Reason:', error.message);
    throw error;
  }

  // Seed data only when the database connection is active.
  if (isDBConnected()) {
    try {
      await seedFleetData();
      console.log('[DATABASE] Fleet data initialization complete.');
    } catch (error) {
      console.error('[DATABASE] Fleet data initialization failed:', error.message);
      throw error;
    }
  } else {
    console.warn(
      '[DATABASE] Skipping database seeding because MongoDB is disconnected.'
    );
  }

  // Middleware
  
  // CORS Middleware
  const corsOptions = {
    origin: 'https://fleet-nova-xi.vercel.app',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };

  app.use(cors(corsOptions));

  // Other middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));


  // REST API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/vehicles', vehicleRoutes);
  app.use('/api/drivers', driverRoutes);
  app.use('/api/trips', tripRoutes);
  app.use('/api/fuel', fuelRoutes);
  app.use('/api/maintenance', maintenanceRoutes);
  app.use('/api/expenses', expenseRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/decisions', decisionRoutes);
  app.use('/api/ai', aiRoutes);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    const databaseConnected = isDBConnected();

    res.status(databaseConnected ? 200 : 503).json({
      success: true,
      service: 'FLEETNOVA Smart Fleet Management System',
      status: 'operational',
      server: {
        status: 'running',
        url: `http://localhost:${PORT}`
      },
      database: {
        type: 'MongoDB',
        status: databaseConnected ? 'connected' : 'disconnected'
      },
      timestamp: new Date().toISOString()
    });
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Vite development middleware
    const { createServer: createViteServer } = await import('vite');

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true'
      },
      appType: 'spa'
    });

    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(__dirname, 'dist');

    app.use(express.static(distPath));

    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // Error handler
  app.use(errorHandler);

  // Start HTTP server
  const server = app.listen(PORT, HOST, () => {
    console.log('');
    console.log('==============================================');
    console.log('          FLEETNOVA STATUS REPORT');
    console.log('==============================================');
    console.log('[SERVER] Status: RUNNING');
    console.log(`[SERVER] Local URL: http://localhost:${PORT}`);
    console.log(`[SERVER] Network binding: ${HOST}:${PORT}`);
    console.log(
      `[DATABASE] MongoDB Status: ${
        isDBConnected() ? 'CONNECTED' : 'DISCONNECTED'
      }`
    );
    console.log('[API] Health check: http://localhost:' + PORT + '/api/health');
    console.log('[API] FleetAI endpoint: /api/ai/chat');
    console.log('[FRONTEND] Vite development middleware: READY');
    console.log('==============================================');
    console.log('');
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`[SERVER] Port ${PORT} is already in use.`);
      console.error(
        '[SERVER] Stop the other process or configure a different PORT in .env.'
      );
    } else {
      console.error('[SERVER] HTTP server error:', error.message);
    }

    process.exitCode = 1;
  });
}

startServer().catch((error) => {
  console.error('');
  console.error('[FLEETNOVA] Failed to start application.');
  console.error('[FLEETNOVA] Error:', error.message);
  process.exitCode = 1;
});
