#!/bin/bash
# Cloud Load Balancer Setup Script for WordPress + Financial App
# This script sets up an HTTP(S) Load Balancer with path-based routing

PROJECT_ID="host-dev-378703"
REGION="africa-south1"
DOMAIN="www.matsplash.com"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up Cloud Load Balancer...${NC}"

# Step 1: Create backend services
echo -e "${YELLOW}Step 1: Creating backend services...${NC}"

# Get Cloud Run service URLs
WORDPRESS_SERVICE=$(gcloud run services describe wordpress --region=$REGION --project=$PROJECT_ID --format="value(status.url)" 2>/dev/null)
FINANCIAL_SERVICE=$(gcloud run services describe matsplash-fin --region=$REGION --project=$PROJECT_ID --format="value(status.url)" 2>/dev/null)

if [ -z "$WORDPRESS_SERVICE" ]; then
    echo "Error: WordPress service not found. Please deploy WordPress first."
    exit 1
fi

if [ -z "$FINANCIAL_SERVICE" ]; then
    echo "Error: Financial app service not found."
    exit 1
fi

echo "WordPress service: $WORDPRESS_SERVICE"
echo "Financial service: $FINANCIAL_SERVICE"

# Step 2: Create serverless NEGs (Network Endpoint Groups)
echo -e "${YELLOW}Step 2: Creating serverless NEGs...${NC}"

# Create NEG for WordPress
gcloud compute network-endpoint-groups create wordpress-neg \
  --region=$REGION \
  --network-endpoint-type=serverless \
  --cloud-run-service=wordpress \
  --project=$PROJECT_ID

# Create NEG for Financial App
gcloud compute network-endpoint-groups create financial-neg \
  --region=$REGION \
  --network-endpoint-type=serverless \
  --cloud-run-service=matsplash-fin \
  --project=$PROJECT_ID

# Step 3: Create backend services
echo -e "${YELLOW}Step 3: Creating backend services...${NC}"

gcloud compute backend-services create wordpress-backend \
  --global \
  --load-balancing-scheme=EXTERNAL \
  --project=$PROJECT_ID

gcloud compute backend-services create financial-backend \
  --global \
  --load-balancing-scheme=EXTERNAL \
  --project=$PROJECT_ID

# Add NEGs to backend services
gcloud compute backend-services add-backend wordpress-backend \
  --global \
  --network-endpoint-group=wordpress-neg \
  --network-endpoint-group-region=$REGION \
  --project=$PROJECT_ID

gcloud compute backend-services add-backend financial-backend \
  --global \
  --network-endpoint-group=financial-neg \
  --network-endpoint-group-region=$REGION \
  --project=$PROJECT_ID

# Step 4: Create URL map with path-based routing
echo -e "${YELLOW}Step 4: Creating URL map...${NC}"

gcloud compute url-maps create matsplash-url-map \
  --default-service=wordpress-backend \
  --path-matcher-name=financial-paths \
  --path-rules="/login/*=financial-backend,/api/*=financial-backend" \
  --project=$PROJECT_ID

# Step 5: Create HTTPS proxy
echo -e "${YELLOW}Step 5: Creating HTTPS proxy...${NC}"

# Create SSL certificate (managed)
gcloud compute ssl-certificates create matsplash-ssl-cert \
  --domains=$DOMAIN \
  --global \
  --project=$PROJECT_ID

gcloud compute target-https-proxies create matsplash-https-proxy \
  --url-map=matsplash-url-map \
  --ssl-certificates=matsplash-ssl-cert \
  --project=$PROJECT_ID

# Step 6: Create forwarding rule
echo -e "${YELLOW}Step 6: Creating forwarding rule...${NC}"

gcloud compute forwarding-rules create matsplash-https-rule \
  --global \
  --target-https-proxy=matsplash-https-proxy \
  --ports=443 \
  --project=$PROJECT_ID

# Step 7: Create HTTP to HTTPS redirect
echo -e "${YELLOW}Step 7: Creating HTTP to HTTPS redirect...${NC}"

gcloud compute url-maps create matsplash-http-redirect \
  --default-service=wordpress-backend \
  --project=$PROJECT_ID

gcloud compute target-http-proxies create matsplash-http-proxy \
  --url-map=matsplash-http-redirect \
  --project=$PROJECT_ID

gcloud compute forwarding-rules create matsplash-http-rule \
  --global \
  --target-http-proxy=matsplash-http-proxy \
  --ports=80 \
  --project=$PROJECT_ID

echo -e "${GREEN}Load balancer setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Get the load balancer IP:"
echo "   gcloud compute forwarding-rules describe matsplash-https-rule --global --project=$PROJECT_ID --format='value(IPAddress)'"
echo ""
echo "2. Update DNS records:"
echo "   - Create A record: $DOMAIN -> [LOAD_BALANCER_IP]"
echo "   - Or use CNAME if provided by Google"
echo ""
echo "3. Wait for SSL certificate provisioning (can take 10-60 minutes)"
echo "4. Test the setup:"
echo "   - https://$DOMAIN -> WordPress"
echo "   - https://$DOMAIN/login/[secretPath] -> Financial app"

