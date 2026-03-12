#!/usr/bin/env node

/**
 * Migration Validation Script
 * Run this after migration to verify data integrity
 * 
 * Usage:
 *   export CLOUD_SQL_PASSWORD="your-password"
 *   node scripts/validate-migration.js
 */

const admin = require('firebase-admin');
const { query } = require('../functions/db/connection');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function validateCounts() {
  console.log('\n=== COUNT VALIDATION ===\n');
  
  // Firestore count
  const fsSnapshot = await db.collection('index').count().get();
  const fsCount = fsSnapshot.data().count;
  console.log(`Firestore domains: ${fsCount.toLocaleString()}`);
  
  // Cloud SQL counts
  const aiRecordsResult = await query(
    `SELECT COUNT(*) as count FROM ai_records WHERE entity_type = 'domain'`
  );
  const aiRecordsCount = parseInt(aiRecordsResult.rows[0].count);
  console.log(`Cloud SQL ai_records: ${aiRecordsCount.toLocaleString()}`);
  
  const recordDomainsResult = await query(
    `SELECT COUNT(*) as count FROM record_domains`
  );
  const recordDomainsCount = parseInt(recordDomainsResult.rows[0].count);
  console.log(`Cloud SQL record_domains: ${recordDomainsCount.toLocaleString()}`);
  
  const viewResult = await query(
    `SELECT COUNT(*) as count FROM alpha_search_index WHERE entity_type = 'domain'`
  );
  const viewCount = parseInt(viewResult.rows[0].count);
  console.log(`Cloud SQL alpha_search_index (domains): ${viewCount.toLocaleString()}`);
  
  // Validation
  const allMatch = (fsCount === aiRecordsCount) && 
                   (aiRecordsCount === recordDomainsCount) &&
                   (recordDomainsCount === viewCount);
  
  if (allMatch) {
    console.log('\n✅ All counts match perfectly');
    return true;
  } else {
    console.log('\n❌ Count mismatch detected');
    return false;
  }
}

async function validateSampleData(sampleSize = 20) {
  console.log(`\n=== SAMPLE DATA VALIDATION (${sampleSize} domains) ===\n`);
  
  // Get random sample from Firestore
  const snapshot = await db.collection('index').limit(sampleSize * 10).get();
  const allDocs = snapshot.docs;
  
  const sampleDomains = [];
  for (let i = 0; i < sampleSize && i < allDocs.length; i++) {
    const randomIndex = Math.floor(Math.random() * allDocs.length);
    sampleDomains.push(allDocs[randomIndex].id);
  }
  
  let matches = 0;
  let mismatches = 0;
  const issues = [];
  
  for (const domain of sampleDomains) {
    const fsDoc = await db.collection('index').doc(domain).get();
    const fsData = fsDoc.data();
    
    const sqlResult = await query(
      `SELECT * FROM alpha_search_index WHERE entity_type = 'domain' AND entity_id = $1`,
      [domain]
    );
    const sqlData = sqlResult.rows[0];
    
    if (!sqlData) {
      mismatches++;
      issues.push({ domain, issue: 'missing_in_sql' });
      continue;
    }
    
    const fsScore = fsData.alphaRankScore || fsData.score;
    const sqlScore = sqlData.alpha_score;
    
    if (fsScore === sqlScore && fsData.grade === sqlData.grade) {
      matches++;
    } else {
      mismatches++;
      issues.push({
        domain,
        issue: 'data_mismatch',
        fs: { score: fsScore, grade: fsData.grade },
        sql: { score: sqlScore, grade: sqlData.grade }
      });
    }
  }
  
  console.log(`Matches: ${matches}/${sampleSize}`);
  console.log(`Mismatches: ${mismatches}/${sampleSize}`);
  
  if (mismatches > 0) {
    console.log('\nIssues found:');
    issues.forEach(issue => console.log('  -', JSON.stringify(issue)));
  }
  
  const accuracy = (matches / sampleSize) * 100;
  console.log(`\nAccuracy: ${accuracy.toFixed(2)}%`);
  
  if (accuracy === 100) {
    console.log('✅ Perfect data integrity');
    return true;
  } else if (accuracy >= 99) {
    console.log('⚠️  High accuracy but some mismatches detected');
    return false;
  } else {
    console.log('❌ Significant data integrity issues');
    return false;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        MIGRATION VALIDATION REPORT                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  try {
    const countsValid = await validateCounts();
    const dataValid = await validateSampleData(20);
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              VALIDATION SUMMARY                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`\nCount validation: ${countsValid ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Data validation:  ${dataValid ? '✅ PASS' : '❌ FAIL'}`);
    
    if (countsValid && dataValid) {
      console.log('\n✅ Migration validated successfully');
      console.log('Ready to proceed with dual-read period');
      process.exit(0);
    } else {
      console.log('\n❌ Migration validation failed');
      console.log('Do not proceed to dual-read until issues are resolved');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Validation failed with error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { validateCounts, validateSampleData };
