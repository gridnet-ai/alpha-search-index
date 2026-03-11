# SerpAPI Setup Guide (Optional Fallback)

## Important: SerpAPI is Now Optional

**Alpha Search now includes a built-in Google scraper** that works without any API keys! SerpAPI is kept as an optional fallback for reliability.

**You can use name search right now without setting up SerpAPI.**

## When to Use SerpAPI

SerpAPI is recommended as a fallback for:
- ✅ **Production reliability** - Guaranteed results even if scraper is blocked
- ✅ **100 free searches/month** (no credit card required for free tier)
- ✅ **Real Google search results** (not deprecated)
- ✅ **No IP blocking issues**

For development and testing, the built-in scraper works great without any setup.

## Setup Steps (5 minutes)

### 1. Create SerpAPI Account
Go to: **https://serpapi.com/users/sign_up**
- Sign up with your email (no credit card required for free tier)
- Verify your email

### 2. Get API Key
1. After signing in, you'll see your dashboard
2. Your API key is displayed at the top: **"Your API Key: ..."**
3. Copy the API key

### 3. Add to Environment Variables

**Local development** - Add to `functions/.env`:
```
SERPAPI_KEY=your_serpapi_key_here
GOOGLE_API_KEY=AIzaSyDXlrSBXTPqAiYbKwZlSLjwv_-BKZEHTOE
GOOGLE_CX=834115daf2b884c5d
```

**Production** - Deploy to Firebase:
```bash
firebase functions:config:set serpapi.key="your_serpapi_key_here"
```

### 4. Test It
Run the test script:
```bash
node test-scraper.js
```

You should see the built-in scraper working, or if configured, SerpAPI as fallback.

### 5. Restart Dev Server
```bash
firebase serve --only "functions,hosting"
```

Then go to http://localhost:5000 and search for "Michael Jordan" - it will work! 🎉

## How It Works

The system uses a **3-tier fallback strategy**:

1. **Direct Google scraper** (built-in, no API key needed)
2. **Google Custom Search API** (if configured with specific sites)
3. **SerpAPI** (if configured, final fallback)

This gives you:
- ✅ **Works out of the box** - No API keys needed for basic functionality
- ✅ **Reliable fallbacks** - Multiple options if one fails
- ✅ **Production ready** - SerpAPI ensures uptime even if scraper is blocked

## Pricing

| Tier | Searches/Month | Cost |
|------|----------------|------|
| Free | 100 | $0 |
| Paid | 5,000 | $50 |
| Paid | 15,000 | $125 |

For Alpha Search Index, 100 searches/month is perfect for initial testing and early users.

## API Documentation

- Dashboard: https://serpapi.com/dashboard
- Docs: https://serpapi.com/search-api
- Playground: https://serpapi.com/playground

## Quick Start (No API Key Needed!)

**To use name search right now:**

1. Make sure dependencies are installed:
   ```bash
   cd functions && npm install
   ```

2. Test the scraper:
   ```bash
   node test-scraper.js
   ```

3. Start the dev server:
   ```bash
   firebase serve --only "functions,hosting"
   ```

4. Go to http://localhost:5000 and search for any name!

## Optional: Add SerpAPI for Production

**Only if you want guaranteed reliability in production:**

1. Sign up at https://serpapi.com/users/sign_up
2. Copy your API key
3. Add `SERPAPI_KEY=your_key` to `functions/.env`
4. Deploy: `firebase deploy --only functions`

That's it! The scraper works immediately, SerpAPI is just insurance. 🚀
