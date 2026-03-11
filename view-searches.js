/**
 * View stored name searches from Firestore
 * 
 * Usage:
 *   node view-searches.js              # Show last 10 searches
 *   node view-searches.js 20           # Show last 20 searches
 *   node view-searches.js "Michael"    # Search for specific query
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('./alpha-search-index-firebase-adminsdk-fbsvc-430e5d950f.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function viewSearches() {
  const arg = process.argv[2];
  
  try {
    let query = db.collection('name_searches').orderBy('searchedAt', 'desc');
    
    if (arg && !isNaN(arg)) {
      // Limit by number
      query = query.limit(parseInt(arg));
      console.log(`\n📊 Last ${arg} searches:\n`);
    } else if (arg) {
      // Search by query string
      query = db.collection('name_searches')
        .where('query', '>=', arg)
        .where('query', '<=', arg + '\uf8ff')
        .orderBy('query')
        .orderBy('searchedAt', 'desc');
      console.log(`\n🔍 Searches matching "${arg}":\n`);
    } else {
      // Default: last 10
      query = query.limit(10);
      console.log('\n📊 Last 10 searches:\n');
    }
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      console.log('No searches found.\n');
      process.exit(0);
    }
    
    console.log(`Found ${snapshot.size} search(es)\n`);
    console.log('─'.repeat(80));
    
    snapshot.forEach((doc, index) => {
      const data = doc.data();
      const date = data.searchedAt.toDate();
      
      console.log(`\n${index + 1}. "${data.query}"`);
      console.log(`   Date: ${date.toLocaleString()}`);
      console.log(`   Score: ${data.avgScore}/100 (${data.grade})`);
      console.log(`   Pages: ${data.totalPages} successful, ${data.pagesFailed || 0} failed`);
      console.log(`   Provider: ${data.searchProvider || 'unknown'}`);
      
      if (data.resultDomains && data.resultDomains.length > 0) {
        console.log(`   Domains: ${data.resultDomains.slice(0, 5).join(', ')}${data.resultDomains.length > 5 ? '...' : ''}`);
      }
      
      if (data.results && data.results.length > 0) {
        console.log(`   Top result: ${data.results[0].pageTitle || data.results[0].domain}`);
        console.log(`               ${data.results[0].pageUrl}`);
        console.log(`               Score: ${data.results[0].score}/100`);
      }
    });
    
    console.log('\n' + '─'.repeat(80));
    console.log(`\nTotal: ${snapshot.size} search(es)\n`);
    
    // Show statistics
    const stats = {
      totalSearches: snapshot.size,
      avgScore: 0,
      providers: {},
      topQueries: {}
    };
    
    snapshot.forEach(doc => {
      const data = doc.data();
      stats.avgScore += data.avgScore || 0;
      
      const provider = data.searchProvider || 'unknown';
      stats.providers[provider] = (stats.providers[provider] || 0) + 1;
      
      stats.topQueries[data.query] = (stats.topQueries[data.query] || 0) + 1;
    });
    
    stats.avgScore = Math.round(stats.avgScore / snapshot.size);
    
    console.log('📈 Statistics:');
    console.log(`   Average Score: ${stats.avgScore}/100`);
    console.log(`   Providers: ${JSON.stringify(stats.providers)}`);
    
    const topQueries = Object.entries(stats.topQueries)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    if (topQueries.length > 0) {
      console.log(`   Top Queries:`);
      topQueries.forEach(([query, count]) => {
        console.log(`      - "${query}" (${count}x)`);
      });
    }
    
    console.log('');
    
  } catch (error) {
    console.error('Error fetching searches:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

viewSearches();
