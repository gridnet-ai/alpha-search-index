/**
 * Test script for Google scraper
 * 
 * Tests the direct Google scraper functionality
 */

const { googleSearch } = require('./functions/scraper');

async function test() {
  console.log('\n=== Google Scraper Test ===\n');
  console.log('Testing scraper with query: "Terry French San Antonio founder"\n');
  
  try {
    const results = await googleSearch('Terry French San Antonio founder');
    
    if (results.length === 0) {
      console.error('❌ FAIL: No results returned');
      console.error('This could mean:');
      console.error('  - Google blocked the request (CAPTCHA)');
      console.error('  - HTML selectors need updating');
      console.error('  - Network issue\n');
      return;
    }
    
    console.log(`✅ SUCCESS: ${results.length} results returned\n`);
    
    // Display first 3 results
    const displayCount = Math.min(3, results.length);
    console.log(`Showing first ${displayCount} results:\n`);
    
    for (let i = 0; i < displayCount; i++) {
      const result = results[i];
      console.log(`${i + 1}. ${result.title}`);
      console.log(`   URL: ${result.url}`);
      console.log(`   Snippet: ${result.description.substring(0, 100)}${result.description.length > 100 ? '...' : ''}`);
      console.log('');
    }
    
    // Verify result structure
    const firstResult = results[0];
    if (!firstResult.url || !firstResult.title) {
      console.warn('⚠️  WARNING: Results missing required fields (url or title)');
    }
    
    console.log('✅ Test completed successfully!\n');
    
  } catch (error) {
    console.error('❌ FAIL: Error during scraping');
    console.error('Error:', error.message);
    console.error('\nStack trace:', error.stack);
    console.error('\nThis could indicate:');
    console.error('  - Google blocked the request');
    console.error('  - Network connectivity issue');
    console.error('  - Dependencies not installed (run: cd functions && npm install)\n');
  }
}

// Run the test
test().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
