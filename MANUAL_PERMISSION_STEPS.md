# Manual Steps to Make Function Public

## ✅ You've Already Done:
1. ✅ Updated org policy to "Allow All"
2. ✅ Function is deployed successfully

## 🎯 Next: Add Public Access via Console

Since the command-line is still showing cached policy, use the Firebase Console:

### **Method 1: Firebase Console**

1. Go to: https://console.firebase.google.com/project/alpha-search-index/functions/list

2. Click on **`apiHandler`** function

3. Click the **"Permissions"** tab

4. Click **"Add member"** or **"Grant access"**

5. In the dialog:
   - **New principals**: `allUsers`
   - **Role**: `Cloud Functions Invoker`
   - Click **"Save"**

### **Method 2: Google Cloud Console**

1. Go to: https://console.cloud.google.com/functions/details/us-central1/apiHandler?project=alpha-search-index&tab=permissions

2. Click **"Grant Access"**

3. In the dialog:
   - **New principals**: `allUsers`
   - **Select a role**: `Cloud Functions Invoker`
   - Click **"Save"**

---

## 🧪 Test After Adding Permission

Once you've added `allUsers` with the Invoker role:

1. Visit: https://alphasearch.gridnetai.com/
2. Search for "Michael Jordan" or "stripe.com"
3. Should work! ✅

---

## ⏱️ Or Wait 2-3 Minutes

The org policy change can take 2-3 minutes to propagate. After waiting, try the command again:

```bash
gcloud functions add-iam-policy-binding apiHandler --region=us-central1 --member=allUsers --role=roles/cloudfunctions.invoker --project=alpha-search-index
```

---

**The org policy is fixed - now just need to add the IAM permission!**
