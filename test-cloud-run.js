/**
 * Test script for Cloud Run Puppeteer scraper
 * 
 * Tests the deployed Cloud Run service directly
 */

async function test() {
  // Get URL from environment or use placeholder
  const url = process.env.SCRAPER_URL || 'REPLACE_WITH_YOUR_CLOUD_RUN_URL';
  
  if (url === 'REPLACE_WITH_YOUR_CLOUD_RUN_URL') {
    console.error('❌ ERROR: SCRAPER_URL not set');
    console.error('');
    console.error('Set the environment variable:');
    console.error('  Windows: set SCRAPER_URL=https://your-cloud-run-url');
    console.error('  Or edit this file and replace the placeholder');
    console.error('');
    return;
  }

  console.log('\n=== Cloud Run Scraper Test ===\n');
  console.log(`Testing: ${url}/search\n`);

  try {
    console.log('Sending request...');
    const startTime = Date.now();
    
    const response = await fetch(`${url}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Terry French San Antonio founder' })
    });

    const elapsed = Date.now() - startTime;
    console.log(`Response received in ${elapsed}ms\n`);

    if (!response.ok) {
      console.error(`❌ FAIL: HTTP ${response.status}`);
      const text = await response.text();
      console.error('Response:', text);
      return;
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      console.error('❌ FAIL: No results returned');
      console.error('Response:', JSON.stringify(data, null, 2));
      return;
    }

    console.log(`✅ SUCCESS: ${data.results.length} results returned\n`);
    
    // Display first 3 results
    const displayCount = Math.min(3, data.results.length);
    console.log(`Showing first ${displayCount} results:\n`);
    
    for (let i = 0; i < displayCount; i++) {
      const result = data.results[i];
      console.log(`${i + 1}. ${result.title}`);
      console.log(`   Link: ${result.link}`);
      console.log(`   Snippet: ${result.snippet.substring(0, 80)}${result.snippet.length > 80 ? '...' : ''}`);
      console.log('');
    }

    // Verify result structure
    const firstResult = data.results[0];
    if (!firstResult.link || !firstResult.title) {
      console.warn('⚠️  WARNING: Results missing required fields (link or title)');
    }

    console.log('✅ Test completed successfully!\n');
    console.log('Next steps:');
    console.log('1. Add SCRAPER_URL to functions/.env');
    console.log('2. Restart Firebase dev server');
    console.log('3. Test name search in UI\n');

  } catch (error) {
    console.error('❌ FAIL: Error during test');
    console.error('Error:', error.message);
    console.error('');
    
    if (error.message.includes('fetch')) {
      console.error('This could indicate:');
      console.error('  - Cloud Run service not deployed');
      console.error('  - Incorrect URL');
      console.error('  - Network connectivity issue');
    }
    console.error('');
  }
}

// Run the test
test().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
