# Stripe setup for Alpha Search

Search is free. Alpha Pages require a paid plan (Starter, Premium, or Pro). This doc explains how to configure Stripe.

## Plan mapping (same names in Stripe and app)

| Product name          | Price    | Plan id   |
|-----------------------|----------|-----------|
| Alpha Page Starter    | $4.99/mo | `starter` |
| Alpha Page Premium    | $9.99/mo | `premium` |
| Alpha Page Pro        | $19.99/mo| `pro`     |

## 1. Set your Stripe secret key (required)

**Never commit your secret key to git.** Set it via Firebase config:

```bash
firebase functions:config:set stripe.secret="sk_live_YOUR_SECRET_KEY"
```

Then redeploy functions:

```bash
firebase deploy --only functions
```

Your **publishable key** (`pk_live_...`) is not needed in the backend; checkout redirects are created server-side.

## 2. Stripe products (match your catalog)

**In code:**

- **Alpha Page Starter** — $4.99/mo — Product ID: `prod_UAv5tkMHtO3aV8`  
  - Up to 2 Alpha Pages, AI visibility, basic score improvement.

- **Alpha Page Premium** — $9.99/mo — Product ID: `prod_UAv5mvZXPgxp0w`  
  - Up to 5 Alpha Pages, higher score potential, priority processing.

- **Alpha Page Pro** — $19.99/mo — set product ID in config:
  ```bash
  firebase functions:config:set stripe.product_pro="prod_XXXX"   # your Alpha Page Pro product ID
  firebase deploy --only functions
  ```
  - Unlimited Alpha Pages.

Price IDs are resolved automatically from each product (first active recurring price).

### 2b. Stream Disc (NFC card) — optional add-on on every plan

The app shows **“Add Stream Disc (+$19.99 one-time)”** with a **quantity** control on **every** plan (Starter, Premium, Pro). Customers can add as many as they want. After they complete the subscription they are redirected to a second Stripe Checkout to pay for the chosen quantity (one-time).

**Configure the one-time price:**

1. In Stripe Dashboard → **Products** → open your **Stream Disc** product (e.g. “Stream Disc -9010 model 1”).
2. Copy the **one-time Price ID** (`price_...`).
3. Set it in Firebase:
   ```bash
   firebase functions:config:set stripe.price_nfc="price_YOUR_STREAM_DISC_PRICE_ID"
   firebase deploy --only functions
   ```
4. Optional: use env var `STRIPE_PRICE_NFC` instead of config.

If `stripe.price_nfc` is not set, the add-on checkbox still appears but the redirect to NFC checkout will fail with a clear error; you can then set the config and redeploy.

## 3. Webhook configuration (recommended)

To keep user plans in sync when customers subscribe, change, or cancel:

### Use one endpoint

You should have **only one** webhook endpoint pointing at your function. If two endpoints use the same URL, Stripe sends each event twice and you risk duplicate updates.

- **Recommended:** Keep the **Snapshot** endpoint and remove the other (or point the other at a different URL).
- **URL:** `https://us-central1-alpha-search-index.cloudfunctions.net/stripeWebhook`

### Recommended endpoint settings

| Setting        | Value |
|----------------|--------|
| **Payload style** | **Snapshot** (our handler supports Thin too, but Snapshot is simpler) |
| **Events**     | Only these 3: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` |
| **API version** | Any (e.g. 2025-07-30.basil or Unversioned) |

Listening to “all events” (e.g. 223) is unnecessary and increases load; the handler ignores other event types.

### Set the signing secret

1. In Stripe Dashboard → Developers → Webhooks, open the endpoint you kept.
2. Copy its **Signing secret** (starts with `whsec_`).
3. Set it in Firebase (use the secret for **that** endpoint only):

   ```bash
   firebase functions:config:set stripe.webhook_secret="whsec_YOUR_SIGNING_SECRET"
   firebase deploy --only functions
   ```

Without the webhook, plan updates (e.g. after cancellation) won’t sync to Firestore.

## 4. Firestore

The backend writes to `users/{uid}`:

- `plan`: `'free'` | `'starter'` | `'premium'` | `'pro'`
- `stripeCustomerId`: set after first checkout
- `stripeSubscriptionId`: current subscription ID (cleared when cancelled)
- `planUpdatedAt`: timestamp

Ensure your Firestore rules allow the Cloud Functions service account to update `users`.

## 5. Gating

- **Search:** no plan required (free for everyone).
- **Alpha Page builder / publish:** requires `plan === 'starter'`, `'premium'`, or `'pro'`. If the user is on `free`, they see an upgrade prompt and are sent to Settings → Plan.

## 6. Optional: env instead of config

You can use environment variables instead of `functions.config()`:

- `STRIPE_SECRET_KEY` — same as `stripe.secret`
- `STRIPE_WEBHOOK_SECRET` — same as `stripe.webhook_secret`

Set them in Firebase (e.g. via Google Cloud Console for the function or in `firebase.json`/`.env` for local emulator).
