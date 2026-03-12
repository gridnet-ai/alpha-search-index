const { getFirestore, FieldValue } = require('firebase-admin/firestore');

/**
 * Save a search to user's history
 */
async function saveSearchToHistory(uid, data) {
  const db = getFirestore();
  
  const ref = db
    .collection('users').doc(uid)
    .collection('searches').doc();
  
  await ref.set({
    id:          ref.id,
    query:       data.query,
    entityType:  data.entityType,
    alphaScore:  data.alphaScore,
    grade:       data.grade,
    cacheHit:    data.cacheHit    || false,
    serpApiUsed: data.serpApiUsed || false,
    searchedAt:  FieldValue.serverTimestamp(),
  });
  
  return ref.id;
}

/**
 * Get user's search history (most recent first)
 */
async function getUserSearchHistory(uid, limit = 50) {
  const db = getFirestore();
  
  const snap = await db
    .collection('users').doc(uid)
    .collection('searches')
    .orderBy('searchedAt', 'desc')
    .limit(limit)
    .get();
  
  return snap.docs.map(d => d.data());
}

/**
 * Save an AI Record to user's saved collection
 */
async function saveAiRecord(uid, data) {
  const db = getFirestore();
  
  const ref = db
    .collection('users').doc(uid)
    .collection('saved').doc();
  
  await ref.set({
    id:         ref.id,
    entityType: data.entityType,
    entityId:   data.entityId,
    alphaScore: data.alphaScore,
    grade:      data.grade,
    savedAt:    FieldValue.serverTimestamp(),
  });
  
  return ref.id;
}

/**
 * Get user's saved AI Records
 */
async function getUserSavedRecords(uid, limit = 100) {
  const db = getFirestore();
  
  const snap = await db
    .collection('users').doc(uid)
    .collection('saved')
    .orderBy('savedAt', 'desc')
    .limit(limit)
    .get();
  
  return snap.docs.map(d => d.data());
}

/**
 * Remove a saved AI Record
 */
async function removeSavedRecord(uid, recordId) {
  const db = getFirestore();
  
  await db
    .collection('users').doc(uid)
    .collection('saved').doc(recordId)
    .delete();
}

module.exports = { 
  saveSearchToHistory, 
  getUserSearchHistory,
  saveAiRecord,
  getUserSavedRecords,
  removeSavedRecord
};
