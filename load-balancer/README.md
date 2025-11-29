# Cloud Load Balancer Setup Guide

This guide sets up an HTTP(S) Load Balancer to route traffic between WordPress and the Financial App.

## Architecture

```
www.matsplash.com
    ↓
Cloud Load Balancer
    ├── /login/* → Financial App (Cloud Run)
    ├── /api/* → Financial App (Cloud Run)
    └── /* (default) → WordPress (Cloud Run)
```

## Prerequisites

1. WordPress deployed to Cloud Run service: `wordpress`
2. Financial App deployed to Cloud Run service: `matsplash-fin`
3. Domain `www.matsplash.com` verified in Google Cloud
4. Billing enabled on project

## Quick Setup

### Option 1: Automated Script

```bash
cd load-balancer
./setup.sh
```

### Option 2: Manual Setup

Follow the steps in `setup.sh` manually or use the Google Cloud Console.

## Manual Setup Steps

### 1. Create Serverless NEGs

```bash
# WordPress NEG
gcloud compute network-endpoint-groups create wordpress-neg \
  --region=africa-south1 \
  --network-endpoint-type=serverless \
  --cloud-run-service=wordpress \
  --project=host-dev-378703

# Financial App NEG
gcloud compute network-endpoint-groups create financial-neg \
  --region=africa-south1 \
  --network-endpoint-type=serverless \
  --cloud-run-service=matsplash-fin \
  --project=host-dev-378703
```

### 2. Create Backend Services

```bash
# WordPress backend
gcloud compute backend-services create wordpress-backend \
  --global \
  --load-balancing-scheme=EXTERNAL \
  --project=host-dev-378703

# Financial app backend
gcloud compute backend-services create financial-backend \
  --global \
  --load-balancing-scheme=EXTERNAL \
  --project=host-dev-378703

# Add NEGs to backends
gcloud compute backend-services add-backend wordpress-backend \
  --global \
  --network-endpoint-group=wordpress-neg \
  --network-endpoint-group-region=africa-south1 \
  --project=host-dev-378703

gcloud compute backend-services add-backend financial-backend \
  --global \
  --network-endpoint-group=financial-neg \
  --network-endpoint-group-region=africa-south1 \
  --project=host-dev-378703
```

### 3. Create URL Map

```bash
gcloud compute url-maps create matsplash-url-map \
  --default-service=wordpress-backend \
  --path-matcher-name=financial-paths \
  --path-rules="/login/*=financial-backend,/api/*=financial-backend" \
  --project=host-dev-378703
```

### 4. Create HTTPS Proxy and Forwarding Rule

```bash
# Create SSL certificate
gcloud compute ssl-certificates create matsplash-ssl-cert \
  --domains=www.matsplash.com \
  --global \
  --project=host-dev-378703

# Create HTTPS proxy
gcloud compute target-https-proxies create matsplash-https-proxy \
  --url-map=matsplash-url-map \
  --ssl-certificates=matsplash-ssl-cert \
  --project=host-dev-378703

# Create forwarding rule
gcloud compute forwarding-rules create matsplash-https-rule \
  --global \
  --target-https-proxy=matsplash-https-proxy \
  --ports=443 \
  --project=host-dev-378703
```

### 5. Get Load Balancer IP

```bash
gcloud compute forwarding-rules describe matsplash-https-rule \
  --global \
  --project=host-dev-378703 \
  --format='value(IPAddress)'
```

### 6. Update DNS

Add an A record in your DNS provider:
- Name: `www.matsplash.com`
- Type: `A`
- Value: `[LOAD_BALANCER_IP]`

## Verification

1. Wait for DNS propagation (15 minutes to 48 hours)
2. Wait for SSL certificate provisioning (10-60 minutes)
3. Test:
   - `https://www.matsplash.com` → Should show WordPress
   - `https://www.matsplash.com/login/[secretPath]` → Should show Financial app login
   - `https://www.matsplash.com/api/health` → Should return API health check

## Troubleshooting

### SSL Certificate Not Provisioned
- Check certificate status: `gcloud compute ssl-certificates describe matsplash-ssl-cert --global --project=host-dev-378703`
- Ensure DNS is pointing to the load balancer IP
- Wait up to 60 minutes for provisioning

### 502 Bad Gateway
- Check Cloud Run services are running: `gcloud run services list --project=host-dev-378703`
- Verify NEGs are correctly configured
- Check backend service health

### Wrong Service Responding
- Verify URL map path rules are correct
- Check path matching order (more specific paths first)

## Cost Considerations

- Load balancer: ~$18/month base cost
- Data processing: ~$0.008/GB
- SSL certificate: Free (Google-managed)

## Cleanup

To remove the load balancer:

```bash
gcloud compute forwarding-rules delete matsplash-https-rule --global --project=host-dev-378703
gcloud compute target-https-proxies delete matsplash-https-proxy --project=host-dev-378703
gcloud compute ssl-certificates delete matsplash-ssl-cert --global --project=host-dev-378703
gcloud compute url-maps delete matsplash-url-map --project=host-dev-378703
gcloud compute backend-services delete wordpress-backend --global --project=host-dev-378703
gcloud compute backend-services delete financial-backend --global --project=host-dev-378703
gcloud compute network-endpoint-groups delete wordpress-neg --region=africa-south1 --project=host-dev-378703
gcloud compute network-endpoint-groups delete financial-neg --region=africa-south1 --project=host-dev-378703
```

