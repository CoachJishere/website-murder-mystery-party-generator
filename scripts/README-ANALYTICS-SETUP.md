# Autonomous Analytics Setup for Claude

This guide helps you set up automated analytics data fetching so Claude can autonomously pull GA4 and GSC metrics without you needing to manually export reports.

## Quick Setup (5 minutes)

### Step 1: Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable these APIs:
   - **Google Analytics Data API**
   - **Google Search Console API**

### Step 2: Create Service Account

1. Navigate to **IAM & Admin → Service Accounts**
2. Click **Create Service Account**
3. Name it: `claude-analytics-reader`
4. Click **Create and Continue**
5. Skip role assignment (we'll add permissions in GA4/GSC)
6. Click **Done**

### Step 3: Generate Credentials

1. Click on your new service account
2. Go to **Keys** tab
3. Click **Add Key → Create new key**
4. Choose **JSON**
5. Save the downloaded file as:
   - `.google-analytics-credentials.json` (for GA4)
   - `.google-search-console-credentials.json` (for GSC)

   Place both in your project root directory.

### Step 4: Grant Access in Google Analytics

1. Go to [Google Analytics](https://analytics.google.com/)
2. Select your property
3. Click **Admin** (gear icon)
4. Under **Property**, click **Property access management**
5. Click **Add users**
6. Paste your service account email (from the JSON file, looks like: `claude-analytics-reader@project-id.iam.gserviceaccount.com`)
7. Assign role: **Viewer**
8. Click **Add**

### Step 5: Grant Access in Search Console

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Select your property
3. Click **Settings** (gear icon)
4. Click **Users and permissions**
5. Click **Add user**
6. Paste your service account email
7. Permission level: **Full** (required for API access)
8. Click **Add**

### Step 6: Configure Environment Variables

Add to your `.env` file:

```bash
GA4_PROPERTY_ID=123456789  # Your GA4 property ID (from GA Admin → Property Settings)
GSC_SITE_URL=https://mysterymaker.party  # Your site URL
```

### Step 7: Install Dependencies

```bash
npm install @google-analytics/data googleapis
```

### Step 8: Test the Setup

```bash
# Fetch GA4 metrics
node scripts/fetchGAMetrics.mjs

# Fetch GSC metrics
node scripts/fetchGSCMetrics.mjs
```

If successful, you'll see JSON files created in `temp-files/`:
- `ga-metrics.json` - Google Analytics data
- `gsc-metrics.json` - Search Console data

## How Claude Uses This

Once set up, Claude can:

1. **Run the scripts automatically:**
   ```bash
   node scripts/fetchGAMetrics.mjs && node scripts/fetchGSCMetrics.mjs
   ```

2. **Read the JSON files directly:**
   - `temp-files/ga-metrics.json` - Pageviews, bounce rate, time on page
   - `temp-files/gsc-metrics.json` - Impressions, clicks, position, queries

3. **Analyze trends without you:**
   - Compare day-over-day metrics
   - Track ranking improvements
   - Identify top-performing queries
   - Monitor conversion rates

## Automation Options

### Option A: Cron Job (Daily Updates)

Add to your crontab (run `crontab -e`):

```bash
# Fetch analytics daily at 9 AM
0 9 * * * cd /path/to/project && node scripts/fetchGAMetrics.mjs && node scripts/fetchGSCMetrics.mjs
```

### Option B: GitHub Actions (Scheduled)

Create `.github/workflows/fetch-analytics.yml`:

```yaml
name: Fetch Analytics

on:
  schedule:
    - cron: '0 9 * * *'  # Daily at 9 AM UTC
  workflow_dispatch:  # Manual trigger

jobs:
  fetch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Fetch analytics
        env:
          GA4_PROPERTY_ID: ${{ secrets.GA4_PROPERTY_ID }}
          GSC_SITE_URL: ${{ secrets.GSC_SITE_URL }}
        run: |
          echo '${{ secrets.GA_CREDENTIALS }}' > .google-analytics-credentials.json
          echo '${{ secrets.GSC_CREDENTIALS }}' > .google-search-console-credentials.json
          node scripts/fetchGAMetrics.mjs
          node scripts/fetchGSCMetrics.mjs

      - name: Commit results
        run: |
          git config user.name "Analytics Bot"
          git config user.email "bot@example.com"
          git add temp-files/ga-metrics.json temp-files/gsc-metrics.json
          git commit -m "chore: update analytics metrics" || echo "No changes"
          git push
```

### Option C: npm Script (Manual)

Add to `package.json`:

```json
{
  "scripts": {
    "fetch-analytics": "node scripts/fetchGAMetrics.mjs && node scripts/fetchGSCMetrics.mjs"
  }
}
```

Run with: `npm run fetch-analytics`

## Security Best Practices

1. **Add credentials to `.gitignore`:**
   ```
   .google-analytics-credentials.json
   .google-search-console-credentials.json
   ```

2. **Never commit credentials** to git

3. **Use GitHub Secrets** for CI/CD:
   - `GA_CREDENTIALS` - Contents of GA credentials JSON
   - `GSC_CREDENTIALS` - Contents of GSC credentials JSON
   - `GA4_PROPERTY_ID` - Your GA4 property ID
   - `GSC_SITE_URL` - Your site URL

4. **Limit service account permissions:**
   - Only grant **Viewer** role in GA4
   - Only grant **Full** in GSC (required for API)

## Troubleshooting

### "Error: ENOENT: no such file or directory"
- Make sure credentials JSON files are in project root
- Check file names match exactly

### "Error: 403 User does not have permission"
- Verify service account email is added to GA4/GSC
- Wait 5-10 minutes for permissions to propagate
- Check you're using the correct property ID

### "Error: API not enabled"
- Go to Google Cloud Console
- Enable Google Analytics Data API
- Enable Google Search Console API

### "Empty data returned"
- Check date range (new posts may have no data yet)
- Verify post URL matches exactly
- Wait 24-48 hours for data to appear in GA4/GSC

## What Claude Can Now Do Autonomously

✅ **Daily Monitoring:**
- Pull GA4 & GSC metrics automatically
- Compare today vs. yesterday
- Track 7-day trends

✅ **Performance Analysis:**
- Identify traffic spikes/drops
- Find top-performing queries
- Monitor ranking changes
- Calculate conversion rates

✅ **Reporting:**
- Generate weekly summaries
- Create optimization recommendations
- Track A/B test results
- Monitor Phase 2 progress

✅ **No Manual Work Required:**
- You don't need to export CSVs
- You don't need to copy/paste data
- You don't need to check dashboards daily
- Claude handles all of it

## Example: What Claude Will See

**`temp-files/ga-metrics.json`:**
```json
{
  "lastUpdated": "2026-02-16T10:30:00.000Z",
  "summary": {
    "totalPageviews": 145,
    "avgTimeOnPage": 245,
    "avgBounceRate": 42.3,
    "totalConversions": 12
  },
  "dailyMetrics": [
    {
      "date": "2026-02-16",
      "pageviews": 23,
      "avgTimeOnPage": 267,
      "bounceRate": 39.1,
      "conversions": 2
    }
  ]
}
```

**`temp-files/gsc-metrics.json`:**
```json
{
  "summary": {
    "totalImpressions": 1250,
    "totalClicks": 45,
    "avgCTR": 3.6,
    "avgPosition": 8.2
  },
  "topQueries": [
    {
      "query": "victorian murder mystery party",
      "impressions": 450,
      "clicks": 18,
      "ctr": 4.0,
      "position": 5.2
    }
  ]
}
```

Claude can then analyze this and tell you:
- "Victorian post is ranking #5.2 for the main keyword ✅"
- "CTR improved from 2.1% to 4.0% since optimization 📈"
- "Conversions up 50% week-over-week 🎯"

All without you lifting a finger!
