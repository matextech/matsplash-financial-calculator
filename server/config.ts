// Server Configuration
export const config = {
  // Server Configuration
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Frontend URL
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5179',
  
  // JWT Secret
  jwtSecret: process.env.JWT_SECRET || 'matsplash-financial-secret-key-2024',
  
  // Database Configuration
  database: {
    client: 'sqlite3',
    filename: process.env.DATABASE_PATH || './database.sqlite'
  },
  
  
  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5179',
    credentials: true
  }
};

