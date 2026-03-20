# Deployment Guide — Alpha Search Index

## ⚠️ Cloud Build Permission Issue

The deployment is currently failing due to missing permissions on the Cloud Build service account. This is a common issue with Firebase projects and needs to be resolved in the Google Cloud Console.

### Fix Cloud Build Permissions

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/project/alpha-search-index

2. **Enable Billing (if not already enabled):**
   - Cloud Functions (2nd gen) require an active billing account
   - Go to: Billing → Link a billing account

3. **Grant Cloud Build Permissions:**
   - Go to: IAM & Admin → IAM
   - Find the service account: `169073379199-compute@developer.gserviceaccount.com`
   - Or: `PROJECT_NUMBER@cloudbuild.gserviceaccount.com`
   - Add the following roles:
     - **Cloud Build Service Account**
     - **Service Account User**
     - **Cloud Run Admin** (for 2nd gen functions)

4. **Alternative: Use Cloud Console to Deploy**
   - Go to: Firebase Console → Functions
   - Manually upload the functions code
   - Or use the Firebase CLI with `--debug` flag to see detailed errors

### Deployment Commands

Once permissions are fixed:

```bash
# Deploy everything
firebase deploy

# Or deploy individually
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore
```

## 🧪 Local Testing (Works Now)

You can test the entire application locally using Firebase emulators:

```bash
# Start emulators (Functions + Hosting + Firestore)
npm run serve

# Or manually:
firebase emulators:start --only functions,hosting,firestore
```

**Local URLs:**
- Hosting: http://localhost:5000
- Functions: http://localhost:5001/alpha-search-index/us-central1/api/check
- Firestore UI: http://localhost:4000

### Test the Crawler Locally

1. Open http://localhost:5000 in your browser
2. Enter a domain (e.g., `stripe.com`)
3. Click "Check"
4. The crawler will run locally and display results

**Note:** Local emulators use your local machine's network, so crawling external URLs works perfectly.

## 📊 Current Status

### ✅ Completed
- Firebase configuration files created
- Firestore security rules deployed
- Firestore indexes configured
- Cloud Functions code written (crawler + API)
- Public HTML interface wired to real API
- Local emulator testing ready

### ⏳ Pending
- Cloud Functions deployment (blocked by permissions)
- Hosting deployment (depends on functions)

### 🔧 Workaround

Until Cloud Functions are deployed, you can:

1. **Run locally with emulators** (fully functional)
2. **Deploy to a different Firebase project** with proper billing/permissions
3. **Use Firebase Console** to manually deploy functions

## 🚀 Alternative Deployment Method

If you have access to the Firebase Console:

1. Go to: https://console.firebase.google.com/project/alpha-search-index/functions
2. Click "Create Function"
3. Select:
   - Name: `api`
   - Region: `us-central1`
   - Trigger: HTTPS
   - Runtime: Node.js 20
4. Upload the `functions/` directory as a ZIP
5. Deploy

## 📝 Error Messages Explained

### "Could not build the function due to a missing permission"

**Cause:** The Cloud Build service account doesn't have permission to build container images.

**Solution:** Enable billing and grant Cloud Build Service Account role (see above).

### "Functions cannot be downgraded from GCFv2 to GCFv1"

**Cause:** A 2nd gen function was created, and Firebase doesn't allow downgrading.

**Solution:** Either fix the permissions for 2nd gen, or delete the function and redeploy as 1st gen.

## 🔗 Useful Links

- **Firebase Console:** https://console.firebase.google.com/project/alpha-search-index
- **Google Cloud Console:** https://console.cloud.google.com/project/alpha-search-index
- **Cloud Build Logs:** https://console.cloud.google.com/cloud-build/builds?project=alpha-search-index
- **IAM Permissions:** https://console.cloud.google.com/iam-admin/iam?project=alpha-search-index

## 💡 Recommended Next Steps

1. **Enable billing** on the Google Cloud project
2. **Grant Cloud Build permissions** via IAM console
3. **Redeploy functions:** `firebase deploy --only functions`
4. **Deploy hosting:** `firebase deploy --only hosting`
5. **Test production:** https://alpha-search-index.web.app

---

**Last Updated:** March 11, 2026  
**Status:** Local testing ready, production deployment blocked by permissions
