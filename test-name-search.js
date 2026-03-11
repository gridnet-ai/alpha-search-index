/**
 * Test script for name search with timeout fixes
 */

async function testNameSearch(query) {
  console.log(`\n=== Testing Name Search: "${query}" ===\n`);
  
  const startTime = Date.now();
  
  try {
    const response = await fetch('http://localhost:5000/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });
    
    const elapsed = Date.now() - startTime;
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ FAIL: HTTP ${response.status}`);
      console.error(`Response: ${errorText}`);
      return;
    }
    
    const data = await response.json();
    
    console.log(`✅ SUCCESS (${elapsed}ms)\n`);
    console.log(`Query: "${data.query}"`);
    console.log(`Pages found: ${data.totalPages || data.pagesFound || 0}`);
    console.log(`Average score: ${data.avgScore}/100`);
    console.log(`Grade: ${data.grade}\n`);
    
    if (data.results && data.results.length > 0) {
      console.log('Individual results:');
      data.results.forEach((result, i) => {
        const cacheStatus = result.fromCache ? '(cached)' : '(fresh)';
        console.log(`  ${i + 1}. ${result.domain} - ${result.score}/100 ${cacheStatus}`);
        console.log(`     ${result.pageTitle}`);
      });
    } else {
      console.log('⚠️  No results returned');
      if (data.message) {
        console.log(`Message: ${data.message}`);
      }
    }
    
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`❌ FAIL (${elapsed}ms): ${error.message}`);
  }
}

// Run test
testNameSearch('George Washington').catch(console.error);
