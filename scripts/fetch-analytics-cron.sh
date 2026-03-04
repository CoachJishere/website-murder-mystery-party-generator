#!/bin/bash
# Daily analytics fetcher for cron
# This script is called by cron to fetch GA4 and GSC metrics

# Set PATH so cron can find node and npm
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

# Set the project directory
PROJECT_DIR="/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main"

# Change to project directory
cd "$PROJECT_DIR" || exit 1

# Log the execution
echo "=== Analytics Fetch Started: $(date) ===" >> "$HOME/analytics-fetch.log"

# Run the fetch command
/usr/local/bin/npm run fetch-analytics >> "$HOME/analytics-fetch.log" 2>&1

# Log completion
echo "=== Analytics Fetch Completed: $(date) ===" >> "$HOME/analytics-fetch.log"
echo "" >> "$HOME/analytics-fetch.log"
