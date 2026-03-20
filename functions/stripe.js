/**
 * Stripe integration: Checkout, Customer Portal, Webhooks.
 * Requires Firebase config: firebase functions:config:set stripe.secret="sk_live_..."
 *
 * Product IDs (from Stripe Dashboard):
 * - Alpha Page Starter $4.99/mo: prod_UAv5tkMHtO3aV8
 * - Alpha Page Premium $9.99/mo: prod_UAv5mvZXPgxp0w
 * - Alpha Page Pro $19.99/mo: set stripe.product_pro
 * Price IDs are resolved from these products at runtime (first active recurring price).
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const Stripe = require('stripe');

const PRODUCT_STARTER = 'prod_UAv5tkMHtO3aV8';   // Alpha Page Starter $4.99/mo
const PRODUCT_PREMIUM = 'prod_UAv5mvZXPgxp0w';   // Alpha Page Premium $9.99/mo
// Alpha Page Pro $19.99/mo (unlimited): firebase functions:config:set stripe.product_pro="prod_xxx"
const PRODUCT_PRO = process.env.STRIPE_PRODUCT_PRO || functions.config().stripe?.product_pro || '';
// Stream Disc (NFC card) one-time price: firebase functions:config:set stripe.price_nfc="price_xxx"
const PRICE_NFC = process.env.STRIPE_PRICE_NFC || functions.config().stripe?.price_nfc || '';

function getStripe() {
  const secret = process.env.STRIPE_SECRET_KEY || functions.config().stripe?.secret;
  if (!secret) throw new Error('Stripe secret not configured. Set stripe.secret with: firebase functions:config:set stripe.secret="sk_live_..."');
  return new Stripe(secret);
}

/**
 * Get the first active recurring price ID for a product (used for Checkout).
 */
async function getPriceIdForProduct(stripe, productId) {
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    type: 'recurring',
    limit: 1,
  });
  if (!prices.data.length) throw new Error(`No price found for product ${productId}`);
  return prices.data[0].id;
}

/**
 * Create a Stripe Checkout Session for subscription.
 * plan: 'starter' | 'premium' | 'pro'
 * addNfcCard: if true, success_url will include add_nfc=1 so the app can redirect to NFC checkout after.
 * nfcQty: number of Stream Discs to add (add-on, any plan). Used when add_nfc=1 in success_url.
 * Returns { url } for redirect.
 */
async function createCheckoutSession(uid, email, plan, successUrl, cancelUrl, addNfcCard, nfcQty) {
  const stripe = getStripe();
  let productId = PRODUCT_STARTER;
  if (plan === 'premium') productId = PRODUCT_PREMIUM;
  else if (plan === 'pro') {
    if (!PRODUCT_PRO) throw new Error('Pro plan not configured. Set stripe.product_pro to your Stripe product ID (prod_xxx).');
    productId = PRODUCT_PRO;
  }
  const priceId = await getPriceIdForProduct(stripe, productId);

  let finalSuccessUrl = successUrl || `${getAppOrigin()}/?checkout=success`;
  if (addNfcCard && (nfcQty == null || nfcQty > 0)) {
    const qty = Math.max(1, parseInt(nfcQty, 10) || 1);
    finalSuccessUrl += (finalSuccessUrl.indexOf('?') >= 0 ? '&' : '?') + 'add_nfc=1&nfcQty=' + qty;
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: email || undefined,
    client_reference_id: uid,
    metadata: { firebase_uid: uid, plan },
    success_url: finalSuccessUrl,
    cancel_url: cancelUrl || `${getAppOrigin()}/?checkout=cancelled`,
    allow_promotion_codes: true, // Link only appears if you have ≥1 promotion code in Stripe Dashboard
    subscription_data: {
      metadata: { firebase_uid: uid, plan },
    },
  });

  return { url: session.url, sessionId: session.id };
}

/**
 * Create a one-time Checkout Session for the Stream Disc (NFC card) add-on.
 * quantity: number of Stream Discs (default 1).
 * Returns { url } for redirect. Requires stripe.price_nfc to be set.
 */
async function createNfcCheckoutSession(uid, email, returnUrl, quantity) {
  if (!PRICE_NFC) throw new Error('Stream Disc price not configured. Set stripe.price_nfc to your one-time price ID (price_xxx).');
  const qty = Math.max(1, parseInt(quantity, 10) || 1);
  const stripe = getStripe();
  const base = returnUrl || getAppOrigin() + '/';
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{ price: PRICE_NFC, quantity: qty }],
    customer_email: email || undefined,
    client_reference_id: uid,
    metadata: { firebase_uid: uid, product: 'stream_disc_nfc' },
    success_url: base + (base.indexOf('?') >= 0 ? '&' : '?') + 'nfc=success',
    cancel_url: base + (base.indexOf('?') >= 0 ? '&' : '?') + 'nfc=cancelled',
    allow_promotion_codes: true,
  });
  return { url: session.url, sessionId: session.id };
}

/**
 * Create a Stripe Customer Portal session (manage subscription, payment method).
 * User must have an existing Stripe customer ID (set by webhook after first checkout).
 */
async function createBillingPortalSession(uid, returnUrl) {
  const stripe = getStripe();
  const admin = require('firebase-admin');
  const db = admin.firestore();
  const userDoc = await db.collection('users').doc(uid).get();
  const stripeCustomerId = userDoc.exists && userDoc.data().stripeCustomerId;

  if (!stripeCustomerId) {
    throw new Error('No billing account found. Subscribe to a plan first.');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl || `${getAppOrigin()}/`,
  });

  return { url: session.url };
}

function getAppOrigin() {
  return process.env.FIREBASE_HOSTING_URL || 'https://alpha-search-index.web.app';
}

/**
 * Resolve full object from event (Snapshot has event.data.object; Thin has event.related_object and we fetch).
 */
async function getEventObject(stripe, event) {
  if (event.data && event.data.object) return event.data.object;
  const rel = event.related_object;
  if (!rel || !rel.id) return null;
  if (rel.type === 'checkout.session' || (rel.url && rel.url.includes('/checkout/sessions/'))) {
    return stripe.checkout.sessions.retrieve(rel.id, { expand: ['subscription'] });
  }
  if (rel.type === 'subscription' || (rel.url && rel.url.includes('/subscriptions/'))) {
    return stripe.subscriptions.retrieve(rel.id);
  }
  return null;
}

/**
 * Normalize event type (Thin payloads can use names like "v1.checkout.session.completed").
 */
function normalizeEventType(type) {
  if (!type) return type;
  const t = String(type);
  if (t.includes('checkout.session.completed')) return 'checkout.session.completed';
  if (t.includes('subscription.updated')) return 'customer.subscription.updated';
  if (t.includes('subscription.deleted')) return 'customer.subscription.deleted';
  return t;
}

/**
 * Handle Stripe webhook (checkout.session.completed, customer.subscription.updated/deleted).
 * Supports Snapshot and Thin payloads. Call with raw body string and stripe-signature header.
 */
async function handleWebhook(rawBody, signature) {
  const stripe = getStripe();
  const firestore = admin.firestore();
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || functions.config().stripe?.webhook_secret;
  if (!endpointSecret) {
    console.warn('Stripe webhook secret not set; skipping signature verification');
  }

  let event;
  try {
    event = endpointSecret
      ? stripe.webhooks.constructEvent(rawBody, signature, endpointSecret)
      : JSON.parse(rawBody);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    throw new Error('Webhook signature verification failed');
  }

  const eventType = normalizeEventType(event.type);

  switch (eventType) {
    case 'checkout.session.completed': {
      let session = event.data && event.data.object;
      if (!session) session = await getEventObject(stripe, event);
      if (!session) break;
      const uid = session.client_reference_id || (session.metadata && session.metadata.firebase_uid);
      const plan = (session.metadata && session.metadata.plan) || (session.subscription ? 'starter' : 'free');
      let customerId = session.customer;
      if (!customerId && session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription);
        customerId = sub.customer;
      }
      if (uid) {
        const ref = firestore.collection('users').doc(uid);
        const planValue = (plan === 'premium' || plan === 'pro') ? plan : 'starter';
        await ref.set({
          plan: planValue,
          stripeCustomerId: customerId || null,
          stripeSubscriptionId: session.subscription || null,
          planUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log('Updated user', uid, 'to plan', plan, 'customer', customerId);
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      let sub = event.data && event.data.object;
      if (!sub) sub = await getEventObject(stripe, event);
      if (!sub) break;
      const customerId = sub.customer;
      const usersSnap = await firestore.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
      if (!usersSnap.empty) {
        const uid = usersSnap.docs[0].id;
        const plan = sub.status === 'active' ? (sub.metadata && sub.metadata.plan || 'starter') : 'free';
        const planValue = (plan === 'starter' || plan === 'premium' || plan === 'pro') ? plan : 'free';
        await firestore.collection('users').doc(uid).set({
          plan: planValue,
          stripeSubscriptionId: sub.status === 'active' ? sub.id : null,
          planUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log('Subscription', sub.status, 'for customer', customerId, 'user', uid, '-> plan', planValue);
      }
      break;
    }
    default:
      console.log('Unhandled Stripe event:', event.type);
  }

  return { received: true };
}

module.exports = {
  getStripe,
  createCheckoutSession,
  createNfcCheckoutSession,
  createBillingPortalSession,
  handleWebhook,
  PRODUCT_STARTER,
  PRODUCT_PREMIUM,
  PRODUCT_PRO,
};
