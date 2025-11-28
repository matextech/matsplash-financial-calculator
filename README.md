# MatSplash Financial Calculator

A comprehensive financial management system for tracking earnings, expenses, salaries, material purchases, and profits for a purewater factory.

## Features

### Employee Management
- Support for three salary types:
  - **Fixed Salary**: Employees receiving a fixed monthly salary
  - **Commission Only**: Employees earning based on bags sold
  - **Both**: Employees receiving fixed salary plus commission

### Sales Tracking
- Record daily sales by driver
- Track bags sold (typically 300-800 bags per day)
- Automatic calculation of total revenue
- Price per bag tracking

### Expense Management
- **Fuel Expenses**: Daily fuel purchases
- **Driver Payments**: Payments based on trips
- **Material Purchases**: Track sachet rolls and packing nylon
- **Other Expenses**: Miscellaneous expenses

### Material Purchases
- **Sachet Rolls**: ₦31,000 per roll (450 bags capacity)
- **Packing Nylon**: ₦100,000 per package (5000 bags capacity)
- Automatic cost per bag calculation
- Inventory tracking with low stock alerts

### Salary Payments
- Calculate salaries based on employee type
- Support for daily, weekly, and monthly periods
- Commission calculation based on bags sold
- Fixed salary proration for partial periods

### Financial Reports
- **Daily Reports**: Track day-to-day financial performance
- **Weekly Reports**: Weekly financial summaries
- **Monthly Reports**: Monthly financial overview
- **Quarterly Reports**: Quarterly financial analysis
- **Yearly Reports**: Annual financial reports

### Dashboard
- Real-time financial overview
- Today's revenue and profit
- Expense breakdown
- Commission and salary summaries
- Comparison with previous period
- Quick access to all features

### Analytics
- Revenue trends
- Expense analysis
- Profit margins
- Employee performance metrics

### Security
- **Two-Factor Authentication (2FA)**: Required for all users
- **Role-Based Access Control**: Director, Manager, Receptionist, Storekeeper roles
- **Custom Login URL**: Hidden login page for security
- **Rate Limiting**: Protection against brute-force attacks
- **Password Recovery**: Available for directors with 2FA verification
- **Audit Logging**: All actions are logged for security

## Tech Stack

- **Frontend**: React 18, TypeScript, Material-UI (MUI)
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: SQLite with Google Cloud Storage sync
- **Build Tool**: Vite
- **Authentication**: JWT with 2FA (TOTP)
- **Deployment**: Google Cloud Platform (App Engine)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the backend server:
```bash
npm run server
```

3. Start the development server (in a new terminal):
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5179`

## Production Deployment

### Prerequisites
- GCP Project with billing enabled
- Google Cloud SDK installed (`gcloud` command)

### Quick Start

1. **Follow `GCP_SETUP.md`** for complete setup instructions:
   - Create Cloud Storage bucket
   - Set up service account permissions
   - Configure environment variables

2. **Build the application**:
```bash
npm run build
```

3. **Deploy to GCP App Engine**:
```bash
gcloud app deploy app.yaml
```

### Environment Variables

Set these in `app.yaml` or via `gcloud`:
- `GCS_BUCKET_NAME`: Cloud Storage bucket name (e.g., `matsplash-fin-db`)
- `JWT_SECRET`: Strong random string for JWT signing (32+ characters)
- `VITE_LOGIN_SECRET_PATH`: Secret path for login URL (e.g., `matsplash-fin-2024-secure`)
- `DATABASE_PATH`: Path to SQLite database (default: `/tmp/database.sqlite`)
- `DB_FILE_NAME`: Database filename in Cloud Storage (default: `database.sqlite`)

### Custom Login URL

The application uses a custom login URL for security. Access the login page at:
```
https://www.matsplash.com/login/[YOUR_SECRET_PATH]
```

Regular `/login` will redirect to 404. This prevents unauthorized access attempts.

## Data Storage

All data is stored in a SQLite database managed by the backend API server with automatic Cloud Storage synchronization:

- **On Startup**: Downloads database from Cloud Storage
- **During Runtime**: Database operates locally
- **Every 5 Minutes**: Automatically uploads to Cloud Storage
- **On Shutdown**: Uploads database before instance terminates

This ensures data persistence even when App Engine instances restart.

## Security Features

### Authentication
- JWT-based authentication
- Two-Factor Authentication (2FA) using TOTP
- Password recovery for directors (requires 2FA)
- Session management with inactivity timeout (2 minutes)

### Authorization
- Role-based access control (RBAC)
- Director: Full access to all features
- Manager: Sales and employee management
- Receptionist: Sales entry only
- Storekeeper: Material and packer entry management

### Security Headers
- Content-Security-Policy (CSP)
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security
- X-Content-Type-Options: nosniff

### Rate Limiting
- Login endpoint: 5 requests per 15 minutes
- 2FA verification: 10 requests per 15 minutes
- Prevents brute-force attacks

## Project Structure

```
matsplash_fin_cal/
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── services/          # API and business logic services
│   └── types/             # TypeScript type definitions
├── server/                 # Backend source code
│   ├── routes/            # API route handlers
│   ├── middleware/        # Express middleware
│   └── services/         # Backend services (Cloud Storage)
├── dist/                  # Built frontend files (generated)
├── app.yaml              # GCP App Engine configuration
├── .gcloudignore         # Files to exclude from GCP deployment
└── package.json          # Project dependencies
```

## Documentation

- **README.md** (this file) - Main project documentation
- **GCP_SETUP.md** - Step-by-step GCP setup guide
- **DEPLOYMENT.md** - Deployment instructions and troubleshooting
- **UPDATE_GUIDE.md** - How to update the application with new features

## Development

### Available Scripts

- `npm run dev` - Start development server (frontend)
- `npm run server` - Start backend API server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Code Style

- TypeScript for type safety
- ESLint for code quality
- Material-UI for consistent UI components

## Troubleshooting

### Database Issues
- Ensure Cloud Storage bucket exists and is accessible
- Check service account permissions
- Verify `GCS_BUCKET_NAME` environment variable

### Authentication Issues
- Verify JWT_SECRET is set in production
- Check 2FA setup for users
- Review rate limiting logs

### Deployment Issues
- Check `app.yaml` configuration
- Verify all environment variables are set
- Review GCP App Engine logs: `gcloud app logs tail`

## License

Private - MatSplash Financial Calculator

## Support

For issues or questions, contact the development team.
