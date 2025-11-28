# Application Update Guide

## How to Update the Application

### Method 1: GCP App Engine Deployment (Recommended)

1. **Make changes locally** and test thoroughly
2. **Build the application**:
   ```bash
   npm run build
   ```
3. **Deploy to GCP**:
   ```bash
   gcloud app deploy app.yaml
   ```
4. **Verify deployment**:
   - Check health endpoint: `https://www.matsplash.com/api/health`
   - Test critical functionality
   - Monitor logs: `gcloud app logs tail -s default`

### Method 2: Rolling Updates

App Engine supports zero-downtime deployments:
- New version is deployed alongside old version
- Traffic gradually migrates to new version
- Old version remains available for rollback

### Rollback Procedure

If an update causes issues:

```bash
# List all versions
gcloud app versions list

# Rollback to previous version
gcloud app versions migrate PREVIOUS_VERSION

# Or delete problematic version
gcloud app versions delete VERSION_ID
```

## Database Updates

### Schema Changes

If you need to update the database schema:

1. **Modify `server/database.ts`**:
   - Add new table creation logic
   - Add column migration logic (see existing examples)

2. **Test locally**:
   - The database will auto-migrate on startup
   - Verify schema changes work correctly

3. **Deploy**:
   - On first startup, new schema will be applied
   - Cloud Storage will sync the updated database

### Data Migrations

For complex data migrations:
1. Create migration script in `server/database.ts`
2. Test on local database first
3. Deploy - migration runs automatically on startup

## Environment Variables

To update environment variables:

```bash
# Update app.yaml
# Then redeploy
gcloud app deploy app.yaml
```

Or via GCP Console:
1. Go to App Engine -> Settings -> Environment Variables
2. Update values
3. Save (requires redeployment)

## Adding New Features

### Frontend Features

1. Create new component in `src/components/`
2. Add route in `src/App.tsx`
3. Update navigation if needed
4. Test locally
5. Build and deploy

### Backend Features

1. Create new route in `server/routes/`
2. Register route in `server/index.ts`
3. Add API methods in `src/services/apiService.ts`
4. Test locally
5. Build and deploy

### Database Changes

1. Update schema in `server/database.ts`
2. Migration logic runs automatically
3. Test locally
4. Deploy

## Performance Optimization

### Bundle Size

- Run `npm run build` and check bundle sizes
- Use code splitting for large components
- Lazy load routes when possible

### Database Optimization

- Add indexes for frequently queried columns
- Review slow queries in logs
- Consider caching for read-heavy operations

## Monitoring Updates

After deploying updates:

1. **Check logs**: `gcloud app logs tail -s default`
2. **Monitor errors**: GCP Console -> App Engine -> Logs
3. **Check performance**: GCP Console -> App Engine -> Dashboard
4. **Verify functionality**: Test all critical paths

## Best Practices

1. **Always test locally first**
2. **Deploy during low-traffic periods** (if possible)
3. **Keep previous version** for quick rollback
4. **Monitor closely** after deployment
5. **Document changes** in commit messages

## Troubleshooting Updates

### Build Fails

- Check TypeScript errors: `npm run build`
- Fix linting issues
- Verify all dependencies installed

### Deployment Fails

- Check `app.yaml` syntax
- Verify environment variables
- Check GCP quotas and permissions

### Runtime Errors

- Check logs: `gcloud app logs tail -s default`
- Verify database migrations completed
- Check environment variables are set correctly

