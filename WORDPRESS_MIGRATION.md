# WordPress Migration Plan - Cost Optimization

## Current Setup
- **WordPress:** Running on `matsplash-vm` (e2-micro, us-central1-f)
- **Financial App:** Deployed on App Engine (europe-west)
- **DNS:** Managed via Squarespace
- **Domain:** www.matsplash.com

## Migration Strategy: Subdomain Approach (Safest)

### Phase 1: Subdomain Setup (No Downtime)

**Goal:** Route financial app to subdomain, keep WordPress on main domain

#### Step 1: Configure App Engine for Subdomain
- ✅ Updated `app.yaml` to use `app.matsplash.com`
- Financial app will be accessible at: `https://app.matsplash.com`

#### Step 2: Add DNS Record in Squarespace
1. Log into Squarespace DNS settings
2. Add a **CNAME record**:
   - **Host:** `app` (or `finance`)
   - **Points to:** `host-dev-378703.ew.r.appspot.com`
   - **TTL:** 3600 (or default)

#### Step 3: Create Domain Mapping in GCP
```bash
gcloud app domain-mappings create app.matsplash.com --project=host-dev-378703
```

This will provide SSL certificate and verify domain ownership.

#### Step 4: Verify Domain Ownership
After creating the domain mapping, GCP will provide DNS verification records. Add these to Squarespace:
- **TXT record** for domain verification
- Follow the instructions provided by GCP

#### Step 5: Redeploy with Updated Configuration
```bash
npm run build
gcloud app deploy app.yaml --project=host-dev-378703
```

### Result After Phase 1:
- ✅ WordPress: `https://www.matsplash.com` (unchanged, on VM)
- ✅ Financial App: `https://app.matsplash.com` (App Engine)
- ✅ No downtime
- ✅ WordPress continues working normally

---

## Phase 2: Optional - Migrate WordPress to Cloud Run (Further Cost Savings)

**Why Cloud Run?**
- Pay only for requests (scales to zero)
- Cheaper than e2-micro VM for low traffic
- Supports persistent storage via Cloud Storage
- Better performance and auto-scaling

### Estimated Cost Comparison:
- **Current (e2-micro VM):** ~$6-8/month (24/7 running)
- **Cloud Run:** ~$0-2/month (scales to zero, pay per request)
- **Savings:** ~$4-6/month

### Migration Steps (Future):

1. **Export WordPress Database**
   ```bash
   # SSH into VM
   gcloud compute ssh matsplash-vm --zone=us-central1-f
   # Export database
   mysqldump -u wordpress_user -p wordpress_db > wordpress_backup.sql
   ```

2. **Export WordPress Files**
   ```bash
   # From VM
   tar -czf wordpress-files.tar.gz /var/www/html/wordpress
   # Download to local
   gcloud compute scp matsplash-vm:wordpress-files.tar.gz . --zone=us-central1-f
   ```

3. **Create Cloud Run Service**
   - Use WordPress Docker image
   - Mount Cloud Storage for persistent files
   - Connect to Cloud SQL for database

4. **Update DNS**
   - Point www.matsplash.com to Cloud Run service

5. **Test and Verify**
   - Test all WordPress functionality
   - Verify SEO and redirects

6. **Shut Down VM**
   - After successful migration and testing
   - Delete VM to stop charges

---

## Current Migration Status: Phase 1 Ready

### Next Steps:
1. ✅ App Engine configured for `app.matsplash.com`
2. ⏳ Add CNAME record in Squarespace DNS
3. ⏳ Create domain mapping in GCP
4. ⏳ Verify domain ownership
5. ⏳ Redeploy application

### Commands to Run:

```bash
# 1. Create domain mapping
gcloud app domain-mappings create app.matsplash.com --project=host-dev-378703

# 2. Build and redeploy
npm run build
gcloud app deploy app.yaml --project=host-dev-378703

# 3. Check domain mapping status
gcloud app domain-mappings list --project=host-dev-378703
```

### DNS Records Needed in Squarespace:

1. **CNAME Record:**
   - Name: `app`
   - Value: `host-dev-378703.ew.r.appspot.com`
   - TTL: 3600

2. **TXT Record (for verification - provided by GCP):**
   - Will be shown after running `gcloud app domain-mappings create`
   - Add this to Squarespace DNS

---

## Testing Checklist

After migration:
- [ ] WordPress site loads at www.matsplash.com
- [ ] Financial app loads at app.matsplash.com
- [ ] Login works: `app.matsplash.com/login/matsplash-fin-2jg1wCHqcMOEhlBr`
- [ ] All API endpoints work
- [ ] SSL certificates are valid
- [ ] No broken links or redirects

---

## Rollback Plan

If anything goes wrong:
1. Remove CNAME record from Squarespace
2. WordPress continues working on VM (no changes made)
3. Financial app still accessible at: `https://host-dev-378703.ew.r.appspot.com`

---

## Cost Savings Summary

**Current:**
- VM (e2-micro): ~$6-8/month
- App Engine: ~$0-2/month (F1 instance, scales to zero)
- **Total: ~$6-10/month**

**After Phase 1 (Subdomain):**
- VM (e2-micro): ~$6-8/month (WordPress)
- App Engine: ~$0-2/month (Financial app)
- **Total: ~$6-10/month** (same, but better architecture)

**After Phase 2 (WordPress on Cloud Run):**
- Cloud Run: ~$0-2/month (WordPress)
- App Engine: ~$0-2/month (Financial app)
- **Total: ~$0-4/month** (savings of ~$6/month)

---

## Notes

- WordPress migration to Cloud Run is optional and can be done later
- Phase 1 (subdomain) is safe and reversible
- No changes needed to WordPress during Phase 1
- All WordPress functionality remains unchanged

