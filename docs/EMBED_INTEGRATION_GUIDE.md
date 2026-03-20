# Alpha Search - Corporate Website Integration Guide

This guide explains how to integrate Alpha Search into `www.gridnetai.com` with a seamless user experience, similar to OpenAI's homepage → ChatGPT flow.

---

## 🎯 What You Get

The embed widget (`embed.html`) is a **pixel-perfect clone** of the real Alpha Search interface:
- ✅ Identical neomorphic design
- ✅ Same logo, search bar, and account modal
- ✅ Smooth animations and interactions
- ✅ Fully responsive (desktop + mobile)
- ✅ Auto-redirects to full app on search or login

**User Experience**: Users interact with what looks like the real Alpha Search, then seamlessly transition to the full app when they search or sign in.

---

## 📦 Integration (Simple iframe Embed)

### Step 1: Add the Embed Widget to gridnetai.com

Add this HTML to your homepage (e.g., hero section or "Try Alpha Search" area):

```html
<!-- Alpha Search Interactive Widget -->
<section class="alpha-search-widget">
  <iframe 
    src="https://alphasearch.gridnetai.com/embed.html" 
    width="100%" 
    height="600px" 
    frameborder="0"
    style="border: none; border-radius: 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);"
  ></iframe>
</section>
```

### Step 2: Style the Container (Optional)

```css
.alpha-search-widget {
  max-width: 800px;
  margin: 80px auto;
  padding: 0 20px;
}

/* Or with a gradient background like the demo */
.alpha-search-widget {
  max-width: 100%;
  padding: 80px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.alpha-search-widget iframe {
  max-width: 800px;
  margin: 0 auto;
  display: block;
  background: #e8eaf0;
}
```

### How It Works:

1. **User sees** a pixel-perfect clone of Alpha Search on gridnetai.com
2. **User enters query** (e.g., "stripe.com")
3. **User clicks "Search"** or presses Enter
4. **Redirects to**: `https://alphasearch.gridnetai.com?q=stripe.com&autorun=true&ref=gridnet`
5. **Alpha Search auto-runs** the search and displays full results
6. **User can continue** searching, sign in, and track history

### Login Flow:

1. **User clicks "Sign In"** in the embed widget
2. **Redirects to**: `https://alphasearch.gridnetai.com?login=true&ref=gridnet`
3. **Login modal opens** immediately
4. **User signs in** with Google or Email/Password
5. **User is logged in** and can track their searches

---

## 🔗 URL Parameters

The embed widget uses these URL parameters to communicate with Alpha Search:

### Search Parameters:
```
https://alphasearch.gridnetai.com?q=QUERY&autorun=true&ref=SOURCE
```

- `q` - The search query (URL or name)
- `autorun` - If `true`, automatically runs the search on page load
- `ref` - Referral source for analytics (e.g., `gridnet`)

**Examples:**
- `?q=stripe.com&autorun=true&ref=gridnet` - Searches for stripe.com immediately
- `?q=Elon%20Musk&autorun=true&ref=gridnet` - Searches for "Elon Musk" immediately

### Login Parameter:
```
https://alphasearch.gridnetai.com?login=true&ref=SOURCE
```

- `login` - If `true`, opens the login modal immediately
- `ref` - Referral source for analytics

**Example:**
- User clicks "Sign In" → Redirects to `?login=true&ref=gridnet` → Login modal opens

---

## 🎨 Design Features

The embed widget is a **pixel-perfect clone** with:

- ✅ **Neomorphic Design**: Same raised/inset shadows as the main app
- ✅ **Gradient Logo**: "Alpha" with blue-to-green gradient
- ✅ **Status Pill**: Animated dot showing "Ready" state
- ✅ **Account Modal**: "Track your searches" + Sign In button
- ✅ **Search Bar**: Identical rounded search box with gradient button
- ✅ **Hint Text**: "Find out if AI can find you."
- ✅ **Footer**: Same minimal footer with links
- ✅ **Responsive**: Adapts to mobile screens

### Why This Approach?

Users see a **familiar interface** on gridnetai.com, making the transition to the full app feel seamless. It's like they're already using Alpha Search before they even click.

---

## 🚀 Deployment Steps

### 1. Deploy the Embed Widget

The embed widget is already included in your Firebase Hosting:

```bash
firebase deploy --only hosting
```

**Live URL**: `https://alphasearch.gridnetai.com/embed.html`

### 2. Add to gridnetai.com

Add the iframe embed code to your corporate website:

```html
<!-- In your homepage HTML -->
  <section id="try-alpha-search">
  <h2>Try Alpha Search</h2>
  <p>Find out how AI-ready any person, brand, or organization is</p>
  
  <iframe 
    src="https://alphasearch.gridnetai.com/embed.html" 
    width="100%" 
    height="600px" 
    frameborder="0"
    style="border: none; border-radius: 24px; max-width: 800px; margin: 0 auto; display: block; box-shadow: 0 20px 60px rgba(0,0,0,0.2);"
  ></iframe>
</section>
```

### 3. Test the Flow

1. Visit `www.gridnetai.com`
2. Enter a search query in the widget
3. Click "Search"
4. Verify redirect to Alpha Search with pre-filled query
5. Verify search auto-runs
6. Click "Sign In" in widget
7. Verify redirect to Alpha Search with login modal open

---

## 🔧 Advanced: Custom Integration

If you want more control, you can build your own widget using the Alpha Search API:

### JavaScript Example:

```javascript
function searchAlphaSearch(query) {
  // Encode query and redirect
  const encodedQuery = encodeURIComponent(query);
  window.location.href = `https://alphasearch.gridnetai.com?q=${encodedQuery}&autorun=true`;
}

function loginAlphaSearch() {
  // Redirect to login
  window.location.href = `https://alphasearch.gridnetai.com?login=true`;
}

// Usage:
document.getElementById('mySearchButton').addEventListener('click', () => {
  const query = document.getElementById('mySearchInput').value;
  searchAlphaSearch(query);
});
```

---

## 📊 Analytics & Tracking

### Track Referrals from gridnetai.com

Add a referral parameter to track traffic:

```javascript
const ALPHA_SEARCH_URL = 'https://alphasearch.gridnetai.com';

function handleEmbedSearch() {
  const query = document.getElementById('embedSearchInput').value.trim();
  if (!query) return;
  
  const encodedQuery = encodeURIComponent(query);
  window.location.href = `${ALPHA_SEARCH_URL}?q=${encodedQuery}&autorun=true&ref=gridnet`;
}
```

Then track `?ref=gridnet` in your analytics to measure conversion.

---

## 🎯 User Experience Flow

### Scenario 1: Search from Corporate Site

1. **User visits**: `www.gridnetai.com`
2. **User sees**: Interactive Alpha Search widget
3. **User enters**: "stripe.com"
4. **User clicks**: "Search" button
5. **Redirects to**: `alphasearch.gridnetai.com?q=stripe.com&autorun=true`
6. **Alpha Search**: Auto-runs search, displays results
7. **User sees**: Full Alpha Search interface with their results
8. **User can**: Sign in to save history, do more searches

### Scenario 2: Login from Corporate Site

1. **User visits**: `www.gridnetai.com`
2. **User sees**: "Sign In to Track Your Searches" link in widget
3. **User clicks**: Sign In link
4. **Redirects to**: `alphasearch.gridnetai.com?login=true`
5. **Alpha Search**: Opens login modal immediately
6. **User signs in**: With Google or Email/Password
7. **User is**: Logged in and can track their searches

---

## 🔒 Security Considerations

### CORS (Cross-Origin Resource Sharing)

If you want to make API calls from gridnetai.com to Alpha Search:

1. Update Cloud Functions CORS headers:

```javascript
// In functions/index.js
res.set('Access-Control-Allow-Origin', 'https://www.gridnetai.com');
```

2. Or use wildcard (less secure):

```javascript
res.set('Access-Control-Allow-Origin', '*');
```

### iframe Security

The embed widget uses:
- `frameborder="0"` - No border
- No `sandbox` attribute - Full functionality
- `allow="clipboard-write"` - For copy/paste functionality

---

## 📱 Mobile Optimization

The embed widget is fully responsive:

- **Desktop**: 600px max-width, horizontal layout
- **Tablet**: Adapts to container width
- **Mobile**: Vertical layout, full-width buttons

Test on all devices to ensure smooth experience.

---

## 🎨 Example: Full Integration Code

Here's a complete example for your gridnetai.com homepage:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gridnet - AI-Native Internet Infrastructure</title>
  <style>
    .hero {
      text-align: center;
      padding: 100px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .hero h1 {
      font-size: 48px;
      margin-bottom: 20px;
    }

    .hero p {
      font-size: 20px;
      margin-bottom: 40px;
    }

    .demo-section {
      max-width: 800px;
      margin: -80px auto 60px;
      padding: 0 20px;
      position: relative;
      z-index: 10;
    }

    .demo-section iframe {
      width: 100%;
      height: 400px;
      border: none;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      background: #e8eaf0;
    }
  </style>
</head>
<body>

  <section class="hero">
    <h1>Building the AI-Native Internet</h1>
    <p>Discover how AI sees the web with Alpha Search</p>
  </section>

  <section class="demo-section">
  <iframe 
    src="https://alphasearch.gridnetai.com/embed.html"
    title="Alpha Search Demo"
    style="width: 100%; height: 600px; border: none; border-radius: 24px; box-shadow: 0 30px 80px rgba(0,0,0,0.3);"
  ></iframe>
  </section>

  <!-- Rest of your content -->

</body>
</html>
```

---

## ✅ Checklist

Before going live:

- [ ] Deploy `embed.html` to Firebase Hosting
- [ ] Test embed widget on gridnetai.com staging
- [ ] Verify search redirect works
- [ ] Verify auto-run functionality
- [ ] Verify login redirect works
- [ ] Test on mobile devices
- [ ] Add analytics tracking (optional)
- [ ] Update gridnetai.com production

---

## 🚀 Go Live

Once everything is tested:

1. **Deploy Alpha Search**:
   ```bash
   firebase deploy --only hosting
   ```

2. **Update gridnetai.com**:
   - Add iframe embed code
   - Deploy to production

3. **Monitor**:
   - Check Firebase Analytics for traffic from `?ref=gridnet`
   - Monitor Cloud Functions logs for API usage
   - Track user sign-ups from corporate site

---

## 📞 Support

If you need help with integration:
- **Documentation**: This guide
- **Live Demo**: `https://alphasearch.gridnetai.com/embed.html`
- **API Docs**: See `functions/index.js` for endpoint details

---

**🎉 You're ready to integrate Alpha Search into your corporate website!**
