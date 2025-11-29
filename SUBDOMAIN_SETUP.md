# Subdomain Setup - Quick Implementation Guide

## Architecture
```
www.matsplash.com → WordPress (Cloud Run)
app.matsplash.com → Financial App (Cloud Run) ✅ Already deployed
```

## Step 1: Financial App Domain Mapping ✅

The financial app is already deployed. Domain mapping has been created.

**DNS Records for app.matsplash.com:**
```
Type: CNAME
Name: app
Value: [Will be provided after mapping is created]
```

Add this CNAME record to your DNS provider.

## Step 2: Deploy WordPress

### 2.1 Set Up Cloud SQL Database

```bash
# Create Cloud SQL instance
gcloud sql instances create wordpress-db \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region=africa-south1 \
  --project=host-dev-378703

# Create database
gcloud sql databases create wordpress \
  --instance=wordpress-db \
  --project=host-dev-378703

# Create database user
gcloud sql users create wordpress \
  --instance=wordpress-db \
  --password=YOUR_SECURE_PASSWORD \
  --project=host-dev-378703

# Get connection name
gcloud sql instances describe wordpress-db \
  --project=host-dev-378703 \
  --format="value(connectionName)"
```

Save the connection name for the next step.

### 2.2 Export WordPress from VM

```bash
# On your VM, export database
mysqldump -u wordpress -p wordpress > wordpress_backup.sql

# Create Cloud Storage bucket for backup
gsutil mb gs://matsplash-wordpress-backup

# Upload backup
gsutil cp wordpress_backup.sql gs://matsplash-wordpress-backup/

# Import to Cloud SQL
gcloud sql import sql wordpress-db \
  gs://matsplash-wordpress-backup/wordpress_backup.sql \
  --database=wordpress \
  --project=host-dev-378703
```

### 2.3 Prepare WordPress Files

1. Copy WordPress files from VM to `wordpress/` directory
2. Copy `wordpress/wp-config-cloudrun.php` to `wordpress/wp-config.php`
3. Update `wp-config.php` with your database credentials

### 2.4 Deploy WordPress to Cloud Run

```bash
cd wordpress

# Build and push image
gcloud builds submit --tag gcr.io/host-dev-378703/wordpress:latest \
  --project=host-dev-378703

# Deploy (replace YOUR_CONNECTION_NAME and YOUR_PASSWORD)
gcloud run deploy wordpress \
  --image gcr.io/host-dev-378703/wordpress:latest \
  --region africa-south1 \
  --platform managed \
  --allow-unauthenticated \
  --add-cloudsql-instances=YOUR_CONNECTION_NAME \
  --set-env-vars="DB_NAME=wordpress,DB_USER=wordpress,DB_PASSWORD=YOUR_PASSWORD,DB_HOST=/cloudsql/YOUR_CONNECTION_NAME" \
  --set-env-vars="WP_HOME=https://www.matsplash.com,WP_SITEURL=https://www.matsplash.com" \
  --project=host-dev-378703
```

### 2.5 Map www.matsplash.com to WordPress

```bash
gcloud beta run domain-mappings create \
  --service wordpress \
  --domain www.matsplash.com \
  --region africa-south1 \
  --project=host-dev-378703
```

This will provide DNS records. Add them to your DNS provider.

## Step 3: Update DNS Records

Add these CNAME records to your DNS provider (where you manage matsplash.com):

```
Type: CNAME
Name: app
Value: [From app.matsplash.com mapping]

Type: CNAME  
Name: www
Value: [From www.matsplash.com mapping]
```

Both will point to `ghs.googlehosted.com` (Google's domain mapping service).

## Step 4: Update WordPress Configuration

After DNS propagates (15 minutes to 48 hours):

1. Access WordPress admin at `https://www.matsplash.com/wp-admin`
2. Go to Settings → General
3. Update:
   - WordPress Address: `https://www.matsplash.com`
   - Site Address: `https://www.matsplash.com`
4. Save changes

## Step 5: Update Financial App Access

Employees will now access the financial app at:
- **URL:** `https://app.matsplash.com/login/{secretPath}`
- Update any documentation or bookmarks

## Step 6: Verify Everything Works

1. **WordPress:** Visit `https://www.matsplash.com` → Should show WordPress site
2. **Financial App:** Visit `https://app.matsplash.com/login/{secretPath}` → Should show login page
3. **API:** Visit `https://app.matsplash.com/api/health` → Should return JSON

## Step 7: Shut Down VM

After everything is verified and working:

1. **Final Backup:** Backup any remaining files from VM
2. **Stop VM:** Stop the VM instance in Google Cloud Console
3. **Delete VM:** Delete if no longer needed (after confirming everything works)

## Monthly Cost Estimate

- **Cloud SQL (db-f1-micro):** ~$7.67/month
- **Cloud Run WordPress:** ~$1-2/month (pay per request)
- **Cloud Run Financial App:** ~$1-2/month (pay per request)
- **Domain Mapping:** FREE
- **Total: ~$8-10/month**

## Troubleshooting

### DNS Not Working
- Wait 15 minutes to 48 hours for DNS propagation
- Check DNS records are correct
- Use `dig app.matsplash.com` or `nslookup app.matsplash.com` to verify

### SSL Certificate Issues
- SSL certificates are automatically provisioned by Google
- Wait 10-60 minutes after DNS propagation
- Check status: `gcloud beta run domain-mappings describe app.matsplash.com --region=africa-south1`

### WordPress Not Loading
- Check Cloud Run service logs: `gcloud run services logs read wordpress --region=africa-south1`
- Verify database connection
- Check environment variables

### Financial App Not Loading
- Check Cloud Run service: `gcloud run services describe matsplash-fin --region=africa-south1`
- Verify domain mapping: `gcloud beta run domain-mappings describe app.matsplash.com --region=africa-south1`
- Test direct URL: `https://matsplash-fin-816277611494.africa-south1.run.app`

## Support

If you encounter issues:
1. Check Cloud Run service status
2. Review service logs
3. Verify DNS records
4. Check SSL certificate status

