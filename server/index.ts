import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import setupDatabase from './database';
import { config } from './config';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import employeeRoutes from './routes/employees';
import receptionistSalesRoutes from './routes/receptionist-sales';
import storekeeperEntriesRoutes from './routes/storekeeper-entries';
import settlementsRoutes from './routes/settlements';
import settlementPaymentsRoutes from './routes/settlement-payments';
import settingsRoutes from './routes/settings';
import bagPricesRoutes from './routes/bag-prices';
import materialPricesRoutes from './routes/material-prices';
import auditLogsRoutes from './routes/audit-logs';

// Load environment variables
dotenv.config();

const app = express();
const PORT = config.port;

// Middleware
app.use(cors(config.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/receptionist-sales', receptionistSalesRoutes);
app.use('/api/storekeeper-entries', storekeeperEntriesRoutes);
app.use('/api/settlements', settlementsRoutes);
app.use('/api/settlement-payments', settlementPaymentsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/bag-prices', bagPricesRoutes);
app.use('/api/material-prices', materialPricesRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
console.log('✅ All routes registered, including /api/audit-logs');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler (must be last, after all routes)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

// Start server immediately, initialize database in background
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Frontend URL: ${config.frontendUrl}`);
  console.log('🔄 Initializing database in background...');
  
  // Initialize database in background
  setupDatabase()
    .then(() => {
      console.log('✅ Database initialized successfully');
    })
    .catch((error: any) => {
      console.error('❌ Database initialization failed:', error);
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
      // Don't exit - server can still run for health checks
    });
});

