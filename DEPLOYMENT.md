# Production Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Variables
Set these in GCP Console -> Secret Manager or App Engine -> Settings -> Environment Variables:

- `JWT_SECRET`: Strong random string (32+ characters)
- `LOGIN_SECRET_PATH`: Secret path for login URL (e.g., `matsplash-fin-2024-secure`)
- `DATABASE_PATH`: Database file path (for SQLite)

### 2. Database Persistence (IMPLEMENTED)

**Solution**: Cloud Storage sync is implemented and configured.

The application automatically:
- Downloads database from Cloud Storage on startup
- Uploads database to Cloud Storage every 5 minutes
- Uploads database on graceful shutdown

**Setup Required**: Follow `GCP_SETUP.md` to create Cloud Storage bucket and set permissions.

### 3. Build Application

```bash
# Install dependencies
npm install

# Build frontend
npm run build

# The dist/ folder will contain the built application
```

### 4. Deploy to GCP App Engine

```bash
# Install Google Cloud SDK if not installed
# https://cloud.google.com/sdk/docs/install

# Login to GCP
gcloud auth login

# Set project
gcloud config set project YOUR_PROJECT_ID

# Deploy
gcloud app deploy app.yaml

# Set custom domain (if needed)
gcloud app domain-mappings create www.matsplash.com
```

### 5. Custom Domain Setup

1. In GCP Console -> App Engine -> Settings -> Custom Domains
2. Add `www.matsplash.com`
3. Follow DNS configuration instructions
4. SSL certificate is automatically provisioned

### 6. Custom Login URL

The login URL format is: `https://www.matsplash.com/login/[SECRET_PATH]`

Example: `https://www.matsplash.com/login/matsplash-fin-2024-secure`

- Set `VITE_LOGIN_SECRET_PATH` environment variable
- Share this URL only with authorized users
- Regular `/login` will redirect to 404

### 7. Post-Deployment

1. Verify health check: `https://www.matsplash.com/api/health`
2. Test login with custom URL
3. Verify database persistence (if using Cloud SQL)
4. Monitor logs: `gcloud app logs tail -s default`

### 8. Monitoring

- App Engine Dashboard: Monitor requests, errors, latency
- Set up alerts for errors and high latency
- Monitor database connections (if using Cloud SQL)

### 9. Rollback Procedure

```bash
# List versions
gcloud app versions list

# Rollback to previous version
gcloud app versions migrate PREVIOUS_VERSION
```

### 10. Cost Optimization

- Using F1 instance (free tier eligible)
- Min instances: 0 (scales to zero)
- Max instances: 1 (low usage)
- Estimated cost: ~$0-5/month for low usage

### Troubleshooting

- Check logs: `gcloud app logs tail -s default`
- Check instance status: `gcloud app instances list`
- Verify environment variables: `gcloud app describe`

