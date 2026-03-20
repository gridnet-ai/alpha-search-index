#!/usr/bin/env node

/**
 * Count Firestore collections (index, searches, users, etc.).
 *
 * Run from the functions directory (so firebase-admin is found):
 *   cd functions
 *   node ../scripts/count-firestore.js
 *
 * Credentials: set GOOGLE_APPLICATION_CREDENTIALS to a service account key,
 * or run: gcloud auth application-default login
 *
 * Or use Firebase Console: Firestore → open each collection to see doc count.
 */

const admin = require('firebase-admin');

const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'alpha-search-index';

if (!admin.apps.length) {
  try {
    admin.initializeApp({ projectId });
  } catch (e) {
    console.error('Failed to initialize Firebase Admin. Set GOOGLE_APPLICATION_CREDENTIALS to a service account key, or run: gcloud auth application-default login');
    process.exit(1);
  }
}

const db = admin.firestore();

async function countCollection(collectionId) {
  const snap = await db.collection(collectionId).count().get();
  return snap.data().count;
}

async function countCollectionGroup(groupId) {
  const snap = await db.collectionGroup(groupId).count().get();
  return snap.data().count;
}

async function main() {
  console.log('\n--- Firestore counts (project: %s) ---\n', projectId);

  try {
    const indexCount = await countCollection('index');
    console.log('Index (crawled domains):     %s', indexCount.toLocaleString());

    const searchesCount = await countCollectionGroup('searches');
    console.log('Searches (total to date):    %s', searchesCount.toLocaleString());

    const usersCount = await countCollection('users');
    console.log('Users:                      %s', usersCount.toLocaleString());

    const alphapagesCount = await countCollection('alphapages');
    console.log('Alpha Pages:                %s', alphapagesCount.toLocaleString());

    const submissionsCount = await countCollection('submissions');
    console.log('Submissions:                %s', submissionsCount.toLocaleString());

    const nameSearchesCount = await countCollection('name_searches');
    console.log('Name searches (legacy):     %s', nameSearchesCount.toLocaleString());

    const searchLogCount = await countCollection('search_log');
    console.log('Search log (2nd index):     %s', searchLogCount.toLocaleString());

    const alphaPagesIndexCount = await countCollection('alpha_pages_index');
    console.log('Alpha pages index:          %s', alphaPagesIndexCount.toLocaleString());

    const total =
      indexCount + searchesCount + usersCount + alphapagesCount +
      submissionsCount + nameSearchesCount + searchLogCount + alphaPagesIndexCount;
    console.log('\nTotal (main collections):   %s\n', total.toLocaleString());
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
