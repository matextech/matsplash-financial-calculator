import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import setupDatabase from './database';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { securityHeaders } from './middleware/securityHeaders';
import { cloudStorageService } from './services/cloudStorage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
import reportUtilsRoutes from './routes/report-utils';

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
  if (process.env.NODE_ENV !== 'production') {
    console.log('✅ Auth routes registered at /api/auth');
    // Log available auth routes for debugging
    console.log('📋 Available auth routes: /login, /change-pin, /verify, /enable-2fa, /disable-2fa, /verify-2fa, /request-password-recovery, /verify-password-recovery, /logout');
  }
} catch (error) {
  if (process.env.NODE_ENV !== 'production') {
    console.error('❌ Error registering auth routes:', error);
  }
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
app.use('/api/report-utils', reportUtilsRoutes);
if (process.env.NODE_ENV !== 'production') {
  console.log('✅ All routes registered, including /api/audit-logs');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Root path handling - removed redirect since WordPress will handle root
// WordPress will serve www.matsplash.com/, financial app handles /login/* and /api/*
// This allows both services to coexist behind a load balancer

// Serve static files from dist folder (for production)
console.log('[DEBUG] NODE_ENV:', process.env.NODE_ENV);
if (process.env.NODE_ENV === 'production') {
  console.log('[DEBUG] Entering production static file serving block');
  const distPath = path.join(__dirname, '../dist');
  console.log('[DEBUG] distPath:', distPath);
  console.log('[DEBUG] distPath exists:', fs.existsSync(distPath));
  
  // Serve static files manually to ensure we can control fallthrough behavior
  app.use((req, res, next) => {
    // Only handle GET requests for static files
    if (req.method !== 'GET') {
      return next();
    }
    
    // Check if this is a static file request (has extension or is in /assets/)
    const staticExtensions = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json|map|webp)$/i;
    const isStaticFile = req.path.startsWith('/assets/') || staticExtensions.test(req.path);
    
    if (isStaticFile) {
      const filePath = path.join(distPath, req.path);
      if (fs.existsSync(filePath)) {
        // File exists, serve it
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.js') {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        } else if (ext === '.css') {
          res.setHeader('Content-Type', 'text/css; charset=utf-8');
        } else if (ext === '.svg') {
          res.setHeader('Content-Type', 'image/svg+xml');
        } else if (ext === '.ico') {
          res.setHeader('Content-Type', 'image/x-icon');
        }
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.sendFile(filePath);
      } else {
        // Static file requested but doesn't exist - return 404
        return res.status(404).send('File not found');
      }
    }
    
    // Not a static file request, continue to next middleware
    next();
  });
  
  // Serve index.html for all non-API, non-static routes (SPA routing)
  // This MUST be the last handler before 404 handler
  app.use((req, res, next) => {
    console.log('[SPA Handler] Request received:', req.method, req.path);
    
    if (req.method !== 'GET') {
      console.log('[SPA Handler] Not GET, calling next()');
      return next();
    }
    if (req.path.startsWith('/api/')) {
      console.log('[SPA Handler] API route, calling next()');
      return next();
    }
    
    // Check if this is a static file request
    const staticExtensions = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json|map|webp)$/i;
    const isStaticFileRequest = req.path.startsWith('/assets/') || staticExtensions.test(req.path);
    
    if (isStaticFileRequest) {
      console.log('[SPA Handler] Static file request, returning 404');
      return res.status(404).send('File not found');
    }
    
    // For all other routes, serve index.html
    console.log('[SPA Handler] Serving index.html for:', req.path);
    const indexPath = path.join(distPath, 'index.html');
    if (!fs.existsSync(indexPath)) {
      console.error('[SPA Handler] ERROR: index.html not found at:', indexPath);
      return res.status(404).send('Application not found - index.html missing');
    }
    
    console.log('[SPA Handler] Sending index.html');
    res.sendFile(indexPath);
  });
  
  // 404 handler for API routes only (inside production block, after SPA handler)
  app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({
        success: false,
        message: 'API route not found'
      });
    } else {
      // This should never be reached if SPA handler works correctly
      res.status(404).send('Route not found');
    }
  });
}

// Error handler (must be last) - Express 5.x compatible
// Error handlers must have 4 parameters: (err, req, res, next)
app.use(errorHandler as express.ErrorRequestHandler);

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
      if (process.env.NODE_ENV !== 'production') {
        console.error('❌ Database initialization error:', error);
      }
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

