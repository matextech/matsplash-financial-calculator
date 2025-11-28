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
- Comparison with previous period
- Quick access to all features

### Analytics
- Revenue and expense trends
- Profit margin calculations
- Visual charts and graphs
- Historical data comparison

## Technology Stack

- **React 18** with TypeScript
- **Material-UI (MUI)** for modern UI components
- **Vite** for fast development and building
- **Express.js** backend API server
- **SQLite** database with Cloud Storage sync for persistent data storage
- **Knex.js** SQL query builder
- **Recharts** for data visualization
- **Date-fns** for date manipulation

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
- `JWT_SECRET`: Strong random string for JWT signing
- `LOGIN_SECRET_PATH`: Secret path for login URL (e.g., `matsplash-fin-2024-secure`)

### Custom Login URL

The application uses a custom login URL for security. Access the login page at:
```
https://www.matsplash.com/login/[YOUR_SECRET_PATH]
```

Regular `/login` will redirect to 404.

## Data Storage

All data is stored in a SQLite database managed by the backend API server with automatic Cloud Storage synchronization:

- **On Startup**: Downloads database from Cloud Storage
- **During Runtime**: Database operates locally
- **Every 5 Minutes**: Automatically uploads to Cloud Storage
- **On Shutdown**: Uploads database before instance terminates

This ensures data persistence even when App Engine instances restart.

## Security Features

- **2FA Authentication**: Two-factor authentication for all users
- **Rate Limiting**: Protection against brute force attacks
- **Security Headers**: CSP, X-Frame-Options, X-XSS-Protection
- **Error Sanitization**: No sensitive data in error messages
- **Custom Login URL**: Hard-to-guess login path

## Development

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Documentation

- **GCP_SETUP.md**: Complete guide for GCP deployment setup
- **DEPLOYMENT.md**: Deployment instructions and troubleshooting

## License

Private project for MatSplash Factory
