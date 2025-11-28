// Server Configuration
export const config = {
  // Server Configuration
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Frontend URL
  frontendUrl: process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://www.matsplash.com' : 'http://localhost:5179'),
  
  // JWT Secret - MUST be set via environment variable in production
  jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'matsplash-financial-secret-key-2024'),
  
  // Database Configuration
  database: {
    client: 'sqlite3',
    filename: process.env.DATABASE_PATH || './database.sqlite'
  },
  
  
  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? 'https://www.matsplash.com' : 'http://localhost:5179'),
    credentials: true
  }
};

