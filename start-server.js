// Simple server startup script to see errors
import('./server/index.ts').catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

