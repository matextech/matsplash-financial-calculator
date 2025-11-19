# Backend Server Setup

## Overview
The application now uses a backend server with SQLite database instead of browser-local IndexedDB. This allows data to be synchronized across all browsers and devices.

## Server Structure

```
server/
├── index.ts          # Main server entry point
├── config.ts         # Server configuration
├── database.ts       # Database setup and initialization
└── routes/
    ├── auth.ts       # Authentication endpoints (login, PIN change)
    └── users.ts      # User management endpoints
```

## Running the Server

### Development Mode (with frontend)
```bash
npm run dev:full
```

This runs both the backend server (port 3001) and frontend (port 5179) concurrently.

### Server Only
```bash
npm run server
```

The server will start on `http://localhost:3001`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email/phone and password/PIN
- `POST /api/auth/change-pin` - Change PIN (for temporary PIN reset)
- `GET /api/auth/verify` - Verify JWT token
- `POST /api/auth/logout` - Logout

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `POST /api/users/:id/reset-pin` - Reset user PIN (generates new temporary PIN)
- `DELETE /api/users/:id` - Delete user

## Database

The server uses SQLite with the following tables:
- `users` - User accounts (director, manager, receptionist, storekeeper)
- `employees` - Drivers and packers
- `expenses` - Expense records
- `material_purchases` - Material purchase records
- `sales` - Sales records
- `salary_payments` - Salary payment records
- `settings` - Application settings
- `receptionist_sales` - Receptionist sales entries
- `storekeeper_entries` - Storekeeper entries
- `settlements` - Settlement records
- `audit_logs` - Audit logs
- `notifications` - Notifications

## Default Users

On first run, the server creates default users:
- **Director**: `director@matsplash.com` / `admin123`
- **Manager**: `manager@matsplash.com` / PIN: `1234`
- **Receptionist**: `receptionist@matsplash.com` / PIN: `1234`
- **Storekeeper**: `storekeeper@matsplash.com` / PIN: `1234`

## Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5179
CORS_ORIGIN=http://localhost:5179
JWT_SECRET=your-secret-key-here
DATABASE_PATH=./database.sqlite
```

## PIN Reset Flow

1. Director resets PIN via `/api/users/:id/reset-pin`
2. Server generates new temporary PIN and sets `pin_reset_required = true`
3. User logs in with temporary PIN
4. Frontend detects `pinResetRequired` flag
5. User is prompted to change PIN via `/api/auth/change-pin`
6. PIN is updated and `pin_reset_required` is set to `false`

## Deployment to GCP

### Option 1: Cloud Run (Recommended - Cheapest)
1. Build Docker image
2. Push to Container Registry
3. Deploy to Cloud Run
4. Use Cloud SQL (PostgreSQL) for production database

### Option 2: Compute Engine
1. Create VM instance
2. Install Node.js
3. Run server with PM2
4. Use Cloud SQL or local PostgreSQL

### Option 3: App Engine
1. Create `app.yaml`
2. Deploy to App Engine
3. Use Cloud SQL for database

## Migration from IndexedDB

The frontend still has IndexedDB code for backward compatibility. To fully migrate:
1. Update all components to use `apiService` instead of `dbService`
2. Remove IndexedDB initialization from `App.tsx`
3. Update all data fetching to use API endpoints

## Next Steps

1. ✅ Backend server structure created
2. ✅ Authentication endpoints implemented
3. ✅ User management endpoints implemented
4. ✅ PIN reset flow implemented
5. ⏳ Update all frontend components to use API
6. ⏳ Add remaining API endpoints (expenses, sales, materials, etc.)
7. ⏳ Add authentication middleware
8. ⏳ Deploy to GCP

