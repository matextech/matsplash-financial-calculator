# WordPress Deployment to Cloud Run

## Prerequisites

1. Google Cloud Project with billing enabled
2. Cloud SQL instance for WordPress database
3. WordPress files from your VM

## Step 1: Set Up Cloud SQL Database

```bash
# Create Cloud SQL instance (MySQL)
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
```

## Step 2: Get Database Connection Details

```bash
# Get connection name
gcloud sql instances describe wordpress-db \
  --project=host-dev-378703 \
  --format="value(connectionName)"
```

## Step 3: Prepare WordPress Files

1. Copy WordPress files from your VM to the `wordpress/` directory
2. Copy `wp-config-cloudrun.php` to `wp-config.php` and customize
3. Ensure `wp-content/uploads` directory exists (will use Cloud Storage later)

## Step 4: Build and Push Docker Image

```bash
# Build the image
docker build -t gcr.io/host-dev-378703/wordpress:latest ./wordpress

# Push to Google Container Registry
docker push gcr.io/host-dev-378703/wordpress:latest

# Or use Cloud Build
gcloud builds submit --tag gcr.io/host-dev-378703/wordpress ./wordpress \
  --project=host-dev-378703
```

## Step 5: Deploy to Cloud Run

```bash
# Deploy WordPress service
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

## Step 6: Import Database (if migrating from VM)

```bash
# Export from VM
mysqldump -u wordpress -p wordpress > wordpress_backup.sql

# Import to Cloud SQL
gcloud sql import sql wordpress-db gs://YOUR_BUCKET/wordpress_backup.sql \
  --database=wordpress \
  --project=host-dev-378703
```

## Step 7: Configure Cloud Storage for Uploads (Optional)

For persistent file storage, set up Cloud Storage bucket and configure WordPress to use it.

## Notes

- WordPress will be accessible at: `https://wordpress-XXXXX-africa-south1.run.app`
- After load balancer setup, it will be at: `https://www.matsplash.com`
- Make sure to set all environment variables in Cloud Run service configuration
- Update `WP_HOME` and `WP_SITEURL` after load balancer is configured

