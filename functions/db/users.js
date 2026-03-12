const { getFirestore, FieldValue } = require('firebase-admin/firestore');

/**
 * Create or update user profile on first login
 */
async function createUserProfile(uid, data) {
  const db = getFirestore();
  
  await db.collection('users').doc(uid).set({
    uid,
    email:             data.email        || null,
    displayName:       data.displayName  || null,
    photoURL:          data.photoURL     || null,
    plan:              'free',
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
