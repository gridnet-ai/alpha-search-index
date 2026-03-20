# Fix 403 Error - Make Cloud Function Public

## 🐛 **Problem**

The Cloud Function `apiHandler` is returning 403 errors because it's not publicly accessible. An organization policy is blocking automatic public access configuration.

## ✅ **Solution: Manual IAM Configuration**

### **Option 1: Firebase Console (Easiest)**

1. Go to: https://console.firebase.google.com/project/alpha-search-index/functions
2. Find the `apiHandler` function
3. Click on the function name
4. Go to the "Permissions" tab
5. Click "Add Principal"
6. Enter: `allUsers`
7. Select role: "Cloud Functions Invoker"
8. Click "Save"

### **Option 2: Google Cloud Console**

1. Go to: https://console.cloud.google.com/functions/list?project=alpha-search-index
2. Click on `apiHandler`
3. Click "Permissions" tab
4. Click "Grant Access"
5. In "New principals": enter `allUsers`
6. In "Select a role": choose "Cloud Functions Invoker"
7. Click "Save"

### **Option 3: Organization Policy (If you have org admin access)**

If you have organization-level permissions, you can modify the policy:

1. Go to: https://console.cloud.google.com/iam-admin/orgpolicies?project=alpha-search-index
2. Find "Domain restricted sharing" or "Allowed Ingress Settings"
3. Edit the policy to allow `allUsers`
4. Save and wait 5 minutes for propagation
5. Then run:
   ```bash
   gcloud functions add-iam-policy-binding apiHandler \
     --region=us-central1 \
     --member=allUsers \
     --role=roles/cloudfunctions.invoker \
     --project=alpha-search-index
   ```

### **Option 4: Use Service Account (More Secure)**

If you can't make it public, use authenticated calls:

1. Create a service account
2. Grant it "Cloud Functions Invoker" role
3. Generate a key
4. Store the key in Firebase hosting environment
5. Update frontend to use authenticated requests

## 🧪 **Test After Fixing**

Once you've made the function public, test it:

```bash
curl -X POST https://us-central1-alpha-search-index.cloudfunctions.net/apiHandler/check \
  -H "Content-Type: application/json" \
  -d '{"url":"stripe.com"}'
```

Or visit: https://alphasearch.gridnetai.com/ and try a search!

## 📝 **What's Already Fixed**

✅ JavaScript error (`typing is not defined`) - FIXED
✅ Missing favicon - FIXED (added favicon.svg)
✅ Function code updated with `invoker: 'public'` - DEPLOYED

❌ IAM permissions - NEEDS MANUAL FIX (organization policy blocking)

## 🔧 **Alternative: Use Firebase Hosting Rewrites with Auth**

If you can't make the function public, you can use Firebase Hosting's built-in authentication:

1. The function is already configured in `firebase.json` as a rewrite
2. Firebase Hosting will handle authentication automatically
3. Users access via: `https://alphasearch.gridnetai.com/api/check`
4. Firebase forwards to the function with proper auth

**This should already work!** The 403 might be from direct function URL calls, but the hosting rewrite should bypass this.

## 🎯 **Quick Test**

Try accessing through the hosting URL instead of direct function URL:
- ❌ Direct: `https://us-central1-alpha-search-index.cloudfunctions.net/apiHandler/check`
- ✅ Via Hosting: `https://alphasearch.gridnetai.com/api/check`

The hosting rewrite might already work!

---

**Status:** Waiting for manual IAM configuration
**Priority:** High (blocking production use)
**ETA:** 5 minutes (once permissions are set)
