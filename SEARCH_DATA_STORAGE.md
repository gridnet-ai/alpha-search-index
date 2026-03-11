# Search Data Storage & Analytics

## Overview

Every name search is logged to Firestore with comprehensive metadata for analytics, debugging, and future entity-based indexing.

## Firestore Collection: `/name_searches/{id}`

### Document Structure

```javascript
{
  // Query Information
  query: "Michael Jordan",                    // The name/brand searched
  searchedAt: Timestamp,                      // When the search occurred
  
  // Results Summary
  totalPages: 7,                              // Number of pages successfully scored
  pagesFound: 10,                             // Total pages found by search provider
  pagesSuccessful: 7,                         // Pages that were successfully crawled
  pagesFailed: 3,                             // Pages that failed to crawl
  
  // Aggregate Scores
  avgScore: 61,                               // Average AI readiness score
  grade: "Machine Ready",                     // Aggregate grade
  gradeClass: "machine-ready",                // CSS class for grade
  
  // Search Provider
  searchProvider: "serpapi",                  // Which provider returned results
                                              // Options: "cloud-run", "google-custom-search", "serpapi", "none"
  
  // Detailed Results (array of page objects)
  results: [
    {
      domain: "en.wikipedia.org",
      pageTitle: "Michael Jordan - Wikipedia",
      pageUrl: "https://en.wikipedia.org/wiki/Michael_Jordan",
      score: 73,
      grade: "AI Ready",
      gradeClass: "ai-ready",
      fromCache: false,
      machineProfile: {
        jsonLd: true,
        llmsTxt: false,
        openApi: false,
        mcp: false,
        resolves: true
      }
    },
    // ... more results
  ],
  
  // Quick Access Arrays
  resultDomains: [                            // Array of domains for quick filtering
    "en.wikipedia.org",
    "instagram.com",
    "basketball-reference.com",
    // ...
  ],
  
  resultUrls: [                               // Array of full URLs
    "https://en.wikipedia.org/wiki/Michael_Jordan",
    "https://www.instagram.com/jumpman23/",
    // ...
  ],
  
  // Metadata
  source: "public",                           // "public" or "api" (for future API access)
  userAgent: "Mozilla/5.0...",                // Browser user agent
  ipAddress: "192.168.1.1"                    // User IP (for rate limiting)
}
```

## Use Cases

### 1. Analytics Dashboard

Query popular searches:
```javascript
db.collection('name_searches')
  .orderBy('searchedAt', 'desc')
  .limit(100)
  .get()
```

Find most searched names:
```javascript
db.collection('name_searches')
  .where('searchedAt', '>=', last30Days)
  .get()
  .then(docs => {
    const counts = {};
    docs.forEach(doc => {
      const query = doc.data().query;
      counts[query] = (counts[query] || 0) + 1;
    });
    return counts;
  })
```

### 2. Entity Index

Build a reverse index of which names appear on which domains:
```javascript
// For each search, create entity → domain mappings
{
  entity: "Michael Jordan",
  domains: ["en.wikipedia.org", "instagram.com", ...],
  avgScore: 61,
  lastUpdated: Timestamp
}
```

### 3. Search Provider Performance

Track which provider is most successful:
```javascript
db.collection('name_searches')
  .where('searchProvider', '==', 'serpapi')
  .where('totalPages', '>', 0)
  .get()
```

### 4. Domain Popularity

Find which domains appear most frequently in name searches:
```javascript
db.collection('name_searches')
  .get()
  .then(docs => {
    const domainCounts = {};
    docs.forEach(doc => {
      doc.data().resultDomains.forEach(domain => {
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      });
    });
    return domainCounts;
  })
```

### 5. AI Readiness Trends

Track how AI readiness changes over time for popular entities:
```javascript
db.collection('name_searches')
  .where('query', '==', 'Michael Jordan')
  .orderBy('searchedAt', 'asc')
  .get()
  .then(docs => {
    return docs.map(doc => ({
      date: doc.data().searchedAt,
      avgScore: doc.data().avgScore
    }));
  })
```

## Firestore Indexes Required

Add these to `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "name_searches",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "searchedAt", "order": "DESCENDING" },
        { "fieldPath": "avgScore", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "name_searches",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "query", "order": "ASCENDING" },
        { "fieldPath": "searchedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "name_searches",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "searchProvider", "order": "ASCENDING" },
        { "fieldPath": "totalPages", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## Privacy Considerations

### What We Store
- ✅ Search queries (names, brands)
- ✅ Results and scores
- ✅ User agent (for analytics)
- ✅ IP address (for rate limiting)

### What We Don't Store
- ❌ Personal identifiable information (unless searched)
- ❌ Authentication tokens
- ❌ Payment information

### Data Retention
- Searches are kept indefinitely for entity indexing
- IP addresses can be anonymized after 90 days
- User agents can be anonymized after 90 days

## Future Enhancements

### 1. Entity Graph
Build a knowledge graph connecting:
- Entities (people, brands)
- Domains (websites)
- AI readiness scores
- Relationships (person → company → website)

### 2. Trending Searches
Real-time dashboard showing:
- Most searched names today
- Fastest rising searches
- Highest scoring entities

### 3. Search Suggestions
Auto-complete based on popular searches:
```javascript
db.collection('name_searches')
  .where('query', '>=', userInput)
  .where('query', '<=', userInput + '\uf8ff')
  .orderBy('query')
  .limit(10)
```

### 4. API Access
Expose search history via API:
```
GET /api/searches?query=Michael+Jordan
GET /api/trending
GET /api/entities/{name}/history
```

## Monitoring Queries

### Check recent searches
```bash
firebase firestore:query name_searches \
  --orderBy searchedAt desc \
  --limit 10
```

### Count searches by provider
```bash
firebase firestore:query name_searches \
  --where searchProvider==serpapi \
  --count
```

### Find failed searches
```bash
firebase firestore:query name_searches \
  --where totalPages==0
```

## Security Rules

Current rules in `firestore.rules`:

```javascript
match /name_searches/{id} {
  allow read: if true;              // Public read access
  allow create: if true;            // Anyone can create searches
  allow update, delete: if false;   // No modifications after creation
}
```

## Example: Building a Search History UI

```javascript
// Fetch user's recent searches (by IP or session)
const recentSearches = await db.collection('name_searches')
  .where('ipAddress', '==', userIP)
  .orderBy('searchedAt', 'desc')
  .limit(10)
  .get();

// Display as clickable history
recentSearches.forEach(doc => {
  const data = doc.data();
  console.log(`${data.query} - ${data.avgScore}/100 - ${data.totalPages} pages`);
});
```

## Analytics Queries

### Most AI-Ready Entities
```javascript
db.collection('name_searches')
  .orderBy('avgScore', 'desc')
  .limit(100)
  .get()
```

### Search Volume by Day
```javascript
const today = new Date();
today.setHours(0, 0, 0, 0);

db.collection('name_searches')
  .where('searchedAt', '>=', admin.firestore.Timestamp.fromDate(today))
  .get()
  .then(snapshot => snapshot.size)
```

### Provider Success Rate
```javascript
const serpApiSearches = await db.collection('name_searches')
  .where('searchProvider', '==', 'serpapi')
  .get();

const successful = serpApiSearches.docs.filter(doc => 
  doc.data().totalPages > 0
).length;

const successRate = (successful / serpApiSearches.size) * 100;
```

---

**All search data is automatically logged. No additional configuration required!** 📊
