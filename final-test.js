// Final comprehensive test - Tests SerpAPI
const fs = require('fs');
const path = require('path');

// Read .env file
const envPath = path.join(__dirname, 'functions', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const SERPAPI_KEY = envVars.SERPAPI_KEY;
const GOOGLE_API_KEY = envVars.GOOGLE_API_KEY;
const GOOGLE_CX = envVars.GOOGLE_CX;

console.log('\n=== Alpha Search Index - API Test ===\n');
console.log('Configuration:');
console.log('  SerpAPI Key:', SERPAPI_KEY ? `${SERPAPI_KEY.substring(0, 20)}...` : 'NOT SET');
console.log('  Google API Key:', GOOGLE_API_KEY ? `${GOOGLE_API_KEY.substring(0, 20)}...` : 'NOT SET');
console.log('  Google CX:', GOOGLE_CX || 'NOT SET');
console.log('');

// Test SerpAPI
if (SERPAPI_KEY) {
  console.log('🧪 Testing SerpAPI (recommended)...\n');
  
  const url = `https://serpapi.com/search.json?q=test&num=3&api_key=${SERPAPI_KEY}`;
  
  fetch(url)
    .then(async res => {
      const data = await res.json();
      
      if (res.ok && data.organic_results) {
        console.log('✅ SUCCESS! SerpAPI is working!');
        console.log(`   Found ${data.organic_results.length} results`);
        console.log(`   Example: ${data.organic_results[0]?.title}`);
        console.log('\n🎉 Name search is ready! Restart your dev server and try it!\n');
      } else {
        console.log('❌ SerpAPI Error:', data.error || 'Unknown error');
        console.log('\n📝 Check your API key at: https://serpapi.com/dashboard\n');
      }
    })
    .catch(err => {
      console.error('❌ Network error:', err.message);
    });
} else {
  console.log('⚠️  SerpAPI key not configured');
  console.log('\n📝 To enable name search:');
  console.log('   1. Sign up at: https://serpapi.com/users/sign_up');
  console.log('   2. Copy your API key from the dashboard');
  console.log('   3. Add to functions/.env: SERPAPI_KEY=your_key_here');
  console.log('   4. Run this test again\n');
  console.log('See SERPAPI_SETUP.md for detailed instructions.\n');
}
