# Autonomous Analytics Usage Guide

## ✅ Setup Complete!

Your Google Analytics 4 and Search Console data is now accessible autonomously.

## How It Works

**What's Configured:**
- ✅ Google Cloud service account: `claude-analytics-reader@mystery-maker-analytics.iam.gserviceaccount.com`
- ✅ GA4 Property ID: `504442584`
- ✅ GSC Site URL: `https://www.mysterymaker.party/`
- ✅ Credentials: `.google-analytics-credentials.json` and `.google-search-console-credentials.json`
- ✅ Protected by `.gitignore` (never committed to git)

## Fetching Analytics Data

### Method 1: npm Script (Easiest)

```bash
npm run fetch-analytics
```

This will:
1. Pull GA4 metrics for the Victorian post (last 7 days)
2. Pull GSC metrics for the Victorian post (last 7 days)
3. Save results to `temp-files/ga-metrics.json` and `temp-files/gsc-metrics.json`

### Method 2: Individual Scripts

```bash
# Fetch GA4 only
node -r dotenv/config scripts/fetchGAMetrics.mjs

# Fetch GSC only
node -r dotenv/config scripts/fetchGSCMetrics.mjs
```

### Method 3: Claude Can Run It Autonomously

Just ask: **"Can you check the analytics for the Victorian post?"**

Claude will:
1. Run `npm run fetch-analytics`
2. Read the JSON files
3. Analyze the data
4. Provide insights and recommendations

## What Data Gets Fetched

### Google Analytics 4 (`ga-metrics.json`)

```json
{
  "lastUpdated": "2026-02-16T12:12:06.491Z",
  "postPath": "/blog/en/how-to-host-a-victorian-murder-mystery-party",
  "dateRange": {
    "start": "2026-02-09",
    "end": "2026-02-16"
  },
  "dailyMetrics": [
    {
      "date": "2026-02-16",
      "pageviews": 23,
      "avgTimeOnPage": 267,
      "bounceRate": 39.1,
      "conversions": 2
    }
  ],
  "summary": {
    "totalPageviews": 145,
    "avgTimeOnPage": 245,
    "avgBounceRate": 42.3,
    "totalConversions": 12
  }
}
```

**Metrics:**
- `pageviews` - Total page views
- `avgTimeOnPage` - Average time spent on page (seconds)
- `bounceRate` - Percentage of single-page sessions
- `conversions` - Total conversion events

### Google Search Console (`gsc-metrics.json`)

```json
{
  "lastUpdated": "2026-02-16T12:12:07.737Z",
  "postUrl": "https://mysterymaker.party/blog/en/how-to-host-a-victorian-murder-mystery-party",
  "dateRange": {
    "start": "2026-02-09",
    "end": "2026-02-16"
  },
  "dailyMetrics": [
    {
      "date": "2026-02-16",
      "impressions": 450,
      "clicks": 18,
      "ctr": 4.0,
      "position": 5.2
    }
  ],
  "topQueries": [
    {
      "query": "victorian murder mystery party",
      "impressions": 450,
      "clicks": 18,
      "ctr": 4.0,
      "position": 5.2
    }
  ],
  "summary": {
    "totalImpressions": 1250,
    "totalClicks": 45,
    "avgCTR": 3.6,
    "avgPosition": 8.2
  }
}
```

**Metrics:**
- `impressions` - How many times the page appeared in search results
- `clicks` - How many times users clicked through
- `ctr` - Click-through rate (percentage)
- `position` - Average position in search results
- `topQueries` - Top 10 search queries driving traffic

## Customizing What Gets Tracked

### Change the Post Being Tracked

Edit the scripts to track different posts:

**`scripts/fetchGAMetrics.mjs` (line 27):**
```javascript
victorianPostPath: '/blog/en/your-new-post-slug',
```

**`scripts/fetchGSCMetrics.mjs` (line 27):**
```javascript
victorianPostUrl: 'https://mysterymaker.party/blog/en/your-new-post-slug',
```

### Change the Date Range

Both scripts default to 7 days back. To change:

**`scripts/fetchGAMetrics.mjs` (line 29):**
```javascript
daysBack: 30 // Pull last 30 days instead
```

**`scripts/fetchGSCMetrics.mjs` (line 29):**
```javascript
daysBack: 30 // Pull last 30 days instead
```

## Daily Tracking Workflow

### For 7-Day Tracking (Feb 16-23, 2026)

See [7-day-tracking-plan.md](7-day-tracking-plan.md) for the complete checklist.

**Daily routine:**
1. Run: `npm run fetch-analytics`
2. Ask Claude: "What changed in the analytics since yesterday?"
3. Claude reads the JSON files and provides insights

### What Claude Can Tell You

**Example queries:**
- "How's the Victorian post performing?"
- "What are the top search queries?"
- "Is the optimization working?"
- "Compare today vs. yesterday"
- "What's the average position for our target keyword?"
- "Are conversions improving?"

**Claude will:**
- Read the latest metrics
- Compare trends
- Identify improvements or issues
- Suggest optimizations
- Flag anomalies

## Automation Options (Future)

### Cron Job (Daily Auto-Fetch)

Add to your crontab (`crontab -e`):
```bash
0 9 * * * cd /path/to/project && npm run fetch-analytics
```

This will fetch analytics every day at 9 AM automatically.

### GitHub Actions (Scheduled)

See [README-ANALYTICS-SETUP.md](../scripts/README-ANALYTICS-SETUP.md) for full GitHub Actions workflow example.

## Troubleshooting

### Error: "API not enabled"

**Solution:** Wait 5-10 minutes after enabling APIs in Google Cloud Console.

### Error: "Permission denied"

**Solution:** Verify the service account email is added to:
- GA4: Admin → Property access management (Viewer role)
- GSC: Settings → Users and permissions (Full access)

### Error: "No data returned"

**Reasons:**
- Post is too new (wait 24-48 hours for data)
- Wrong post URL/path in scripts
- Date range too narrow

### Credentials Not Found

**Check:**
- Files exist: `.google-analytics-credentials.json` and `.google-search-console-credentials.json`
- Files are in project root (not in a subdirectory)
- Files have correct JSON format

## Security Notes

✅ **What's Secure:**
- Credentials in `.gitignore` (not committed)
- Service account has read-only access
- Credentials stored locally only

⚠️ **Important:**
- Never commit `.google-analytics-credentials.json` or `.google-search-console-credentials.json`
- Never share these files publicly
- If compromised, revoke the service account key in Google Cloud Console

## Next Steps

1. ✅ **Wait 24-48 hours** for Victorian post data to accumulate
2. ✅ **Run daily checks** during the 7-day tracking period (Feb 16-23)
3. ✅ **Ask Claude for insights** instead of manually checking dashboards
4. ✅ **Use data to decide** whether to optimize more posts (Phase 2)

---

**Questions?** Just ask Claude: "How do I use the autonomous analytics system?"
