# Deployment and Database Management Scripts

This directory contains scripts for safe deployment and database management of the MatSplash Financial Calculator application.

## Scripts Overview

### 1. `deploy-safe.sh` - Safe Deployment Script

Performs a safe deployment with automatic database backup and rollback capabilities.

**Features:**
- Creates automatic database backup before deployment
- Deploys the application to Google App Engine
- Performs health checks on the new deployment
- Automatically rolls back if deployment fails
- Cleans up old backups (keeps last 10)

**Usage:**
```bash
./scripts/deploy-safe.sh
```

**Prerequisites:**
- Google Cloud SDK installed and configured
- Proper permissions for App Engine and Cloud Storage
- Project ID: `matsplash-fin-cal`

### 2. `backup-database.sh` - Manual Database Backup

Creates manual backups of the production database.

**Usage:**
```bash
./scripts/backup-database.sh
```

**Output:**
- Creates backup in `gs://matsplash-financial-db/backups/`
- Backup filename format: `manual-backup-YYYYMMDD-HHMMSS-database.sqlite`

### 3. `restore-database.sh` - Database Restore

Restores database from a backup file.

**Usage:**
```bash
./scripts/restore-database.sh <backup-filename>
```

**Example:**
```bash
./scripts/restore-database.sh manual-backup-20241129-143000-database.sqlite
```

**Safety Features:**
- Creates backup of current database before restore
- Verifies backup file exists before proceeding
- Shows available backups if no filename provided

## Database Backup Strategy

### Automatic Backups
- **Deployment backups**: Created automatically during each deployment
- **Scheduled backups**: Can be set up via Cloud Scheduler (recommended)
- **Application backups**: Created every 5 minutes during runtime

### Backup Retention
- **Recent backups**: Last 10 backups are kept automatically
- **Manual backups**: Kept indefinitely (manual cleanup required)
- **Deployment backups**: Kept with deployment history

### Backup Locations
All backups are stored in Google Cloud Storage:
- **Bucket**: `matsplash-financial-db`
- **Current database**: `gs://matsplash-financial-db/database.sqlite`
- **Backups directory**: `gs://matsplash-financial-db/backups/`

## Deployment Process

### Safe Deployment Steps

1. **Pre-deployment**:
   ```bash
   # Optional: Create manual backup
   ./scripts/backup-database.sh
   ```

2. **Deploy**:
   ```bash
   # Safe deployment with automatic backup and rollback
   ./scripts/deploy-safe.sh
   ```

3. **Post-deployment**:
   - Verify application functionality
   - Check data integrity
   - Monitor for any issues

### Emergency Procedures

#### Rollback Deployment
If issues are detected after deployment:

1. **Automatic rollback**: The deploy script handles this automatically if health checks fail
2. **Manual rollback**:
   ```bash
   # List versions
   gcloud app versions list --service=default
   
   # Switch traffic to previous version
   gcloud app services set-traffic default --splits=<previous-version>=1
   ```

#### Restore Database
If database corruption or data loss occurs:

1. **List available backups**:
   ```bash
   ./scripts/restore-database.sh
   ```

2. **Restore from backup**:
   ```bash
   ./scripts/restore-database.sh <backup-filename>
   ```

## Best Practices

### Before Deployment
- [ ] Test changes in development environment
- [ ] Create manual database backup
- [ ] Verify all migrations are tested
- [ ] Check for breaking changes

### During Deployment
- [ ] Use the safe deployment script
- [ ] Monitor deployment logs
- [ ] Verify health checks pass
- [ ] Test critical functionality

### After Deployment
- [ ] Verify data integrity
- [ ] Test user workflows
- [ ] Monitor error logs
- [ ] Check performance metrics

### Regular Maintenance
- [ ] Weekly manual backups
- [ ] Monthly backup cleanup
- [ ] Quarterly disaster recovery testing
- [ ] Monitor storage costs

## Troubleshooting

### Common Issues

1. **Deployment fails**:
   - Check build logs: `gcloud app logs tail`
   - Verify environment variables
   - Check database migrations

2. **Health check fails**:
   - Verify API endpoints are responding
   - Check database connectivity
   - Review application logs

3. **Database restore fails**:
   - Verify backup file exists and is not corrupted
   - Check Cloud Storage permissions
   - Ensure sufficient storage space

### Emergency Contacts
- **Technical Issues**: Contact development team
- **Infrastructure Issues**: Contact DevOps/Cloud team
- **Data Issues**: Contact database administrator

## Security Notes

- All scripts require appropriate Google Cloud permissions
- Database backups contain sensitive business data
- Access to restore scripts should be limited to authorized personnel
- Regular security audits of backup access are recommended
