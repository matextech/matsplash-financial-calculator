import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import setupDatabase from './database';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { securityHeaders } from './middleware/securityHeaders';
import { cloudStorageService } from './services/cloudStorage';
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
import salesRoutes from './routes/sales';
import expensesRoutes from './routes/expenses';
import materialPurchasesRoutes from './routes/material-purchases';
import salaryPaymentsRoutes from './routes/salary-payments';
import packerEntriesRoutes from './routes/packer-entries';

// Load environment variables
dotenv.config();

const app = express();
const PORT = config.port;

// Middleware
app.use(securityHeaders);
app.use(cors(config.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`\n📥 ${new Date().toISOString()} - ${req.method} ${req.path}`);
    if (req.body && Object.keys(req.body).length > 0) {
      // Log request body (excluding sensitive data)
      const sanitizedBody = { ...req.body };
      if (sanitizedBody.passwordOrPin) sanitizedBody.passwordOrPin = '***';
      if (sanitizedBody.password) sanitizedBody.password = '***';
      if (sanitizedBody.pin) sanitizedBody.pin = '***';
      if (sanitizedBody.twoFactorCode) sanitizedBody.twoFactorCode = '***';
      console.log('📦 Request body:', sanitizedBody);
    }
    next();
  });
}

// Routes
try {
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes registered at /api/auth');
  // Log available auth routes for debugging
  console.log('📋 Available auth routes: /login, /change-pin, /verify, /enable-2fa, /disable-2fa, /verify-2fa, /request-pin-recovery, /verify-pin-recovery, /logout');
} catch (error) {
  console.error('❌ Error registering auth routes:', error);
}
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
app.use('/api/sales', salesRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/material-purchases', materialPurchasesRoutes);
app.use('/api/salary-payments', salaryPaymentsRoutes);
app.use('/api/packer-entries', packerEntriesRoutes);
console.log('✅ All routes registered, including /api/audit-logs');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 404 handler (must be before error handler)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server immediately, initialize database in background
app.listen(PORT, () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🌐 Frontend URL: ${config.frontendUrl}`);
  }
  
  // Initialize database with Cloud Storage sync
  (async () => {
    try {
      // Download database from Cloud Storage (if in production)
      if (process.env.NODE_ENV === 'production') {
        await cloudStorageService.downloadDatabase();
      }
      
      // Initialize database tables
      await setupDatabase();
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Database initialized successfully');
      }
    } catch (error: any) {
      console.error('❌ Database initialization error:', error);
      // Don't exit - server can still run for health checks
    }
  })();
  
  // Periodic database backup to Cloud Storage (every 5 minutes in production)
  if (process.env.NODE_ENV === 'production') {
    setInterval(async () => {
      try {
        await cloudStorageService.uploadDatabase();
      } catch (error) {
        // Silent fail - will retry on next interval
      }
    }, 5 * 60 * 1000); // 5 minutes
  }
  
  // Graceful shutdown - upload database before exit
  process.on('SIGTERM', async () => {
    if (process.env.NODE_ENV === 'production') {
      await cloudStorageService.uploadDatabase();
    }
    process.exit(0);
  });
  
  process.on('SIGINT', async () => {
    if (process.env.NODE_ENV === 'production') {
      await cloudStorageService.uploadDatabase();
    }
    process.exit(0);
  });
});

