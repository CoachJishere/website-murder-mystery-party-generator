# Automated Analytics Cron Job

## ✅ Status: Active

Your analytics are now fetched automatically **every day at 9:00 AM**.

## What It Does

The cron job runs this command daily:
```bash
/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/scripts/fetch-analytics-cron.sh
```

Which:
1. Fetches GA4 metrics (pageviews, time on page, bounce rate, conversions)
2. Fetches GSC metrics (impressions, clicks, CTR, position, top queries)
3. Saves to `temp-files/ga-metrics.json` and `temp-files/gsc-metrics.json`
4. Logs to `~/analytics-fetch.log`

## Cron Schedule

```
0 9 * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, Sunday = 0 or 7)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

**Current schedule:** Every day at 9:00 AM

## How to Check It's Working

### View Recent Logs
```bash
tail -50 ~/analytics-fetch.log
```

### Watch Live (when testing)
```bash
tail -f ~/analytics-fetch.log
```

### Check Last Run Time
```bash
ls -lh "temp-files/ga-metrics.json" "temp-files/gsc-metrics.json"
```

The timestamp shows when analytics were last fetched.

## Managing the Cron Job

### View Current Cron Jobs
```bash
crontab -l
```

### Edit Cron Schedule
```bash
crontab -e
```

Examples of other schedules:
```bash
0 8 * * *     # 8 AM daily
0 12 * * *    # Noon daily
0 9 * * 1-5   # 9 AM weekdays only
0 */6 * * *   # Every 6 hours
```

### Disable (without deleting)
```bash
crontab -e
# Add # at start of line to comment it out:
# 0 9 * * * "/Users/jonathanmiller/My Drive/..."
```

### Remove Completely
```bash
crontab -r   # Removes ALL cron jobs (careful!)
```

Or edit and delete just this line:
```bash
crontab -e
# Delete the analytics line, save and exit
```

## Troubleshooting

### Cron Job Not Running?

**1. Check if cron has Full Disk Access:**
- System Settings → Privacy & Security → Full Disk Access
- Add `/usr/sbin/cron` if not present

**2. Verify script is executable:**
```bash
ls -l "scripts/fetch-analytics-cron.sh"
# Should show: -rwxr-xr-x (x = executable)
```

**3. Test script manually:**
```bash
./scripts/fetch-analytics-cron.sh
tail ~/analytics-fetch.log
```

**4. Check cron is running:**
```bash
ps aux | grep cron
```

### No Logs Appearing?

Logs are written to: `~/analytics-fetch.log`

If missing, cron might not have permission. Check System Settings → Privacy & Security → Full Disk Access.

### Wrong Time Zone?

Cron uses your system time. Check with:
```bash
date
```

If you travel or change time zones, the cron job will run at 9 AM in your NEW time zone.

## What Happens Next

### Tomorrow Morning (9:00 AM):
- ✅ Cron automatically fetches analytics
- ✅ JSON files updated with fresh data
- ✅ Log file records the execution

### When You Work with Claude:
Just ask: **"What do today's analytics show?"**

Claude will:
1. Read the fresh JSON files (already fetched at 9 AM)
2. Analyze the data
3. Provide insights and recommendations
4. No manual work needed from you!

## Benefits of This Setup

✅ **Fully Automatic** - No need to remember to run commands
✅ **Consistent** - Data fetched same time every day
✅ **Logged** - Full history in `~/analytics-fetch.log`
✅ **Secure** - Credentials stay on your machine
✅ **Offline-capable** - Works even without internet (fetches when connection restored)
✅ **Low overhead** - Runs in seconds, minimal system impact

## Example Usage

**Day 1 (Feb 16, 2026):**
- You: Set up cron job ✅
- Cron: Nothing yet (will run tomorrow at 9 AM)

**Day 2 (Feb 17, 2026 at 9:00 AM):**
- Cron: Fetches analytics automatically
- You: (later) "Hey Claude, how's the Victorian post doing?"
- Claude: Reads ga-metrics.json and gsc-metrics.json, gives insights

**Day 3-8 (Feb 18-23, 2026):**
- Cron: Fetches daily at 9 AM automatically
- You: Check progress whenever you want
- Claude: Provides trend analysis, compares day-over-day

## Manual Override

If you want to fetch analytics NOW (not wait until 9 AM):

```bash
npm run fetch-analytics
```

Or run the cron script directly:
```bash
./scripts/fetch-analytics-cron.sh
```

Both work the same way!

---

**Questions?** Just ask Claude: "How do I manage the cron job?"
