#!/usr/bin/env node

/**
 * Firestore to Cloud SQL Migration Script
 * 
 * 3-Stage Validation:
 * 1. Export/Count - Verify row counts match
 * 2. Spot-Check - Verify data integrity on 10 sample domains
 * 3. Dual-Read - Run in production for 1 week before cutover
 * 
 * Usage:
 *   export CLOUD_SQL_PASSWORD="your-password"
 *   node scripts/migrate-firestore-to-sql.js
 */

const admin = require('firebase-admin');
const { query } = require('../functions/db/connection');
const { upsertAiRecord } = require('../functions/db/sql');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ============================================================================
// STAGE 1: EXPORT AND COUNT VALIDATION
// ============================================================================

async function stage1_exportAndCount() {
  console.log('\n========================================');
  console.log('STAGE 1: EXPORT AND COUNT VALIDATION');
  console.log('========================================\n');
  
  // Count Firestore records
  console.log('Counting Firestore records...');
  const firestoreSnapshot = await db.collection('index').get();
  const firestoreCount = firestoreSnapshot.size;
  console.log(`Firestore count: ${firestoreCount.toLocaleString()} domains`);
  
  // Export and insert to Cloud SQL
  console.log('\nMigrating records to Cloud SQL...');
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  const batchSize = 100;
  const docs = firestoreSnapshot.docs;
  
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (doc) => {
      try {
        const data = doc.data();
        const domain = doc.id;
        
        // Map Firestore data to Cloud SQL schema
        const entity_source = {
          primary: 'firestore_migration',
          migrated_at: new Date().toISOString(),
          original_timestamp: data.timestamp?.toDate?.()?.toISOString() || null
        };
        
        const type_data = {
          domain,
          homepage_url: data.url || `https://${domain}`,
          llms_txt: data.llmsTxt || false,
          llms_txt_url: data.llmsTxtUrl || null,
          json_ld: data.jsonLd || false,
          json_ld_types: data.jsonLdTypes || [],
          open_api: data.openApi || false,
          open_api_url: data.openApiUrl || null,
          mcp: data.mcp || false,
          mcp_url: data.mcpUrl || null,
          robots_txt: data.robotsTxt || false,
          sitemap: data.sitemap || false,
          sitemap_url: data.sitemapUrl || null,
          title: data.title || null,
          description: data.description || null,
          favicon_url: data.faviconUrl || null,
          status_code: data.statusCode || null,
          response_time_ms: data.responseTime || null
        };
        
        await upsertAiRecord({
          entity_type: 'domain',
          entity_id: domain,
          alpha_score: data.alphaRankScore || data.score,
          grade: data.grade,
          grade_class: data.gradeClass || 'unknown',
          entity_source,
          type_data
        });
        
        successCount++;
        
        if (successCount % 100 === 0) {
          console.log(`  Migrated ${successCount.toLocaleString()} / ${firestoreCount.toLocaleString()} records...`);
        }
      } catch (error) {
        errorCount++;
        errors.push({ domain: doc.id, error: error.message });
        console.error(`  Error migrating ${doc.id}:`, error.message);
      }
    }));
  }
  
  console.log(`\nMigration complete:`);
  console.log(`  Success: ${successCount.toLocaleString()}`);
  console.log(`  Errors: ${errorCount.toLocaleString()}`);
  
  // Count Cloud SQL records
  console.log('\nCounting Cloud SQL records...');
  const sqlResult = await query(
    `SELECT COUNT(*) as count FROM ai_records WHERE entity_type = 'domain'`
  );
  const sqlCount = parseInt(sqlResult.rows[0].count);
  console.log(`Cloud SQL count: ${sqlCount.toLocaleString()} domains`);
  
  // Validation
  console.log('\n--- STAGE 1 VALIDATION ---');
  const countMismatch = firestoreCount - sqlCount;
  console.log(`Count mismatch: ${countMismatch}`);
  
  if (countMismatch === 0) {
    console.log('✅ STAGE 1 PASSED: Row counts match');
    return { passed: true, firestoreCount, sqlCount, errors };
  } else {
    console.log('❌ STAGE 1 FAILED: Row count mismatch detected');
    return { passed: false, firestoreCount, sqlCount, errors };
  }
}

// ============================================================================
// STAGE 2: SPOT-CHECK VALIDATION
// ============================================================================

async function stage2_spotCheck() {
  console.log('\n========================================');
  console.log('STAGE 2: SPOT-CHECK VALIDATION');
  console.log('========================================\n');
  
  // Get 10 random domains from Firestore
  console.log('Selecting 10 random domains for spot-check...');
  const snapshot = await db.collection('index').limit(1000).get();
  const allDocs = snapshot.docs;
  
  // Randomly select 10
  const sampleDomains = [];
  for (let i = 0; i < 10 && i < allDocs.length; i++) {
    const randomIndex = Math.floor(Math.random() * allDocs.length);
    sampleDomains.push(allDocs[randomIndex].id);
  }
  
  console.log('Sample domains:', sampleDomains);
  
  // Compare each domain
  let passCount = 0;
  let failCount = 0;
  const failures = [];
  
  for (const domain of sampleDomains) {
    console.log(`\nChecking: ${domain}`);
    
    // Get from Firestore
    const fsDoc = await db.collection('index').doc(domain).get();
    const fsData = fsDoc.data();
    
    // Get from Cloud SQL
    const sqlResult = await query(
      `SELECT * FROM alpha_search_index
       WHERE entity_type = 'domain' AND entity_id = $1`,
      [domain]
    );
    const sqlData = sqlResult.rows[0];
    
    if (!sqlData) {
      console.log('  ❌ FAIL: Not found in Cloud SQL');
      failCount++;
      failures.push({ domain, reason: 'missing_in_sql' });
      continue;
    }
    
    // Compare scores
    const fsScore = fsData.alphaRankScore || fsData.score;
    const sqlScore = sqlData.alpha_score;
    
    if (fsScore !== sqlScore) {
      console.log(`  ❌ FAIL: Score mismatch (FS: ${fsScore}, SQL: ${sqlScore})`);
      failCount++;
      failures.push({ domain, reason: 'score_mismatch', fs: fsScore, sql: sqlScore });
      continue;
    }
    
    // Compare grades
    if (fsData.grade !== sqlData.grade) {
      console.log(`  ❌ FAIL: Grade mismatch (FS: ${fsData.grade}, SQL: ${sqlData.grade})`);
      failCount++;
      failures.push({ domain, reason: 'grade_mismatch', fs: fsData.grade, sql: sqlData.grade });
      continue;
    }
    
    // Compare machine profile
    const fsMachineProfile = fsData.machineProfile || {};
    const sqlMachineProfile = sqlData.machine_profile || {};
    
    const fsSignals = Object.keys(fsMachineProfile).filter(k => fsMachineProfile[k]);
    const sqlSignals = Object.keys(sqlMachineProfile).filter(k => sqlMachineProfile[k]);
    
    if (fsSignals.length !== sqlSignals.length) {
      console.log(`  ⚠️  WARNING: Machine profile signal count differs (FS: ${fsSignals.length}, SQL: ${sqlSignals.length})`);
      // Not a hard failure, but worth noting
    }
    
    console.log(`  ✅ PASS: Data matches`);
    passCount++;
  }
  
  // Validation
  console.log('\n--- STAGE 2 VALIDATION ---');
  console.log(`Passed: ${passCount}/10`);
  console.log(`Failed: ${failCount}/10`);
  
  if (failCount === 0) {
    console.log('✅ STAGE 2 PASSED: All spot-checks passed');
    return { passed: true, passCount, failCount, failures };
  } else {
    console.log('❌ STAGE 2 FAILED: Some spot-checks failed');
    console.log('Failures:', failures);
    return { passed: false, passCount, failCount, failures };
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   FIRESTORE → CLOUD SQL MIGRATION WITH VALIDATION         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  try {
    // Stage 1: Export and Count
    const stage1Result = await stage1_exportAndCount();
    
    if (!stage1Result.passed) {
      console.error('\n❌ Migration aborted: Stage 1 failed');
      console.error('Fix count mismatch before proceeding to Stage 2');
      process.exit(1);
    }
    
    // Stage 2: Spot-Check
    const stage2Result = await stage2_spotCheck();
    
    if (!stage2Result.passed) {
      console.error('\n❌ Migration aborted: Stage 2 failed');
      console.error('Fix data integrity issues before proceeding to Stage 3');
      process.exit(1);
    }
    
    // Success
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ MIGRATION VALIDATION COMPLETE                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\nNext steps:');
    console.log('1. Enable dual-read in production (functions/db/dual-read.js)');
    console.log('2. Monitor for 1 week minimum');
    console.log('3. Target: < 0.1% discrepancy rate');
    console.log('4. Cutover to Cloud SQL once validation passes');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed with error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { stage1_exportAndCount, stage2_spotCheck };
