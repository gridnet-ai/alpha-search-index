const { getFirestore, FieldValue } = require('firebase-admin/firestore');

/**
 * Create or update user profile on first login
 */
function parseFirstLast(displayName) {
  if (!displayName || typeof displayName !== 'string') return { firstName: null, lastName: null };
  const trimmed = displayName.trim();
  if (!trimmed) return { firstName: null, lastName: null };
  const space = trimmed.indexOf(' ');
  if (space === -1) return { firstName: trimmed, lastName: null };
  return { firstName: trimmed.slice(0, space), lastName: trimmed.slice(space + 1).trim() || null };
}

async function createUserProfile(uid, data) {
  const db = getFirestore();
  const displayName = data.displayName || null;
  const { firstName, lastName } = data.firstName != null && data.lastName != null
    ? { firstName: data.firstName || null, lastName: data.lastName || null }
    : parseFirstLast(displayName);

  await db.collection('users').doc(uid).set({
    uid,
    email:             data.email        || null,
    displayName,
    firstName,
    lastName,
    businessName:      data.businessName ?? null,
    photoURL:          data.photoURL     || null,
    plan:              data.plan         || 'free',
    searchesThisMonth: 0,
    totalSearches:     0,
    createdAt:         FieldValue.serverTimestamp(),
    lastActiveAt:      FieldValue.serverTimestamp(),
  }, { merge: true });
}

/**
 * Get user profile by UID
 */
async function getUserProfile(uid) {
  const db = getFirestore();
  const doc = await db.collection('users').doc(uid).get();
  
  if (!doc.exists) {
    return null;
  }
  
  return doc.data();
}

/**
 * Increment user search counts
 */
async function incrementSearchCount(uid) {
  const db = getFirestore();
  
  await db.collection('users').doc(uid).update({
    searchesThisMonth: FieldValue.increment(1),
    totalSearches:     FieldValue.increment(1),
    lastActiveAt:      FieldValue.serverTimestamp(),
  });
}

/**
 * Update user's last active timestamp
 */
async function updateLastActive(uid) {
  const db = getFirestore();
  
  await db.collection('users').doc(uid).update({
    lastActiveAt: FieldValue.serverTimestamp(),
  });
}

module.exports = { 
  createUserProfile, 
  getUserProfile, 
  incrementSearchCount,
  updateLastActive 
};
