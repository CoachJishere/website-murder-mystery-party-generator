#!/bin/bash

###############################################################################
# Fetch All Analytics Data
#
# This script runs all analytics fetch scripts in sequence:
# 1. fetchSiteMetrics.mjs - Site-wide GA4 and GSC metrics
# 2. fetchAllBlogMetrics.mjs - All blog posts analytics
# 3. fetchGAMetrics.mjs - Victorian post GA4 metrics
# 4. fetchGSCMetrics.mjs - Victorian post GSC metrics
#
# Logs are written to ~/analytics-fetch.log
#
# Usage: ./scripts/fetch-all-analytics.sh
###############################################################################

# Set environment variables
export GA4_PROPERTY_ID=504442584
export GSC_SITE_URL='https://www.mysterymaker.party/'

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$HOME/analytics-fetch.log"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠${NC} $1" | tee -a "$LOG_FILE"
}

# Change to project root
cd "$PROJECT_ROOT"

# Clear or create log file
echo "==============================================================================" > "$LOG_FILE"
echo "Analytics Fetch Log - $(date)" >> "$LOG_FILE"
echo "==============================================================================" >> "$LOG_FILE"

log "🚀 Starting comprehensive analytics fetch..."
log "📁 Project root: $PROJECT_ROOT"
log "📝 Log file: $LOG_FILE"
echo ""

# Track success/failure
TOTAL_SCRIPTS=5
SUCCESS_COUNT=0
FAILED_SCRIPTS=()

# Script 1: Site-wide metrics
log "📊 [1/5] Fetching site-wide metrics..."
if node "$SCRIPT_DIR/fetchSiteMetrics.mjs" >> "$LOG_FILE" 2>&1; then
    log_success "Site-wide metrics fetched successfully"
    ((SUCCESS_COUNT++))
else
    log_error "Failed to fetch site-wide metrics"
    FAILED_SCRIPTS+=("fetchSiteMetrics.mjs")
fi
echo ""

# Script 2: All blog posts metrics (this takes the longest)
log "📚 [2/5] Fetching all blog posts metrics (this may take several minutes)..."
log_warning "This script makes many API calls and includes rate limiting delays"
if node "$SCRIPT_DIR/fetchAllBlogMetrics.mjs" >> "$LOG_FILE" 2>&1; then
    log_success "All blog posts metrics fetched successfully"
    ((SUCCESS_COUNT++))
else
    log_error "Failed to fetch all blog posts metrics"
    FAILED_SCRIPTS+=("fetchAllBlogMetrics.mjs")
fi
echo ""

# Script 3: Victorian post GA4 metrics
log "🎩 [3/5] Fetching Victorian post GA4 metrics..."
if node "$SCRIPT_DIR/fetchGAMetrics.mjs" >> "$LOG_FILE" 2>&1; then
    log_success "Victorian post GA4 metrics fetched successfully"
    ((SUCCESS_COUNT++))
else
    log_error "Failed to fetch Victorian post GA4 metrics"
    FAILED_SCRIPTS+=("fetchGAMetrics.mjs")
fi
echo ""

# Script 4: AI referral traffic
log "🤖 [4/5] Fetching AI referral traffic metrics..."
if GA4_PROPERTY_ID=$GA4_PROPERTY_ID node "$SCRIPT_DIR/fetchAIReferrals.mjs" >> "$LOG_FILE" 2>&1; then
    log_success "AI referral metrics fetched successfully"
    ((SUCCESS_COUNT++))
else
    log_error "Failed to fetch AI referral metrics"
    FAILED_SCRIPTS+=("fetchAIReferrals.mjs")
fi
echo ""

# Script 5: Victorian post GSC metrics
log "🔍 [5/5] Fetching Victorian post GSC metrics..."
if node "$SCRIPT_DIR/fetchGSCMetrics.mjs" >> "$LOG_FILE" 2>&1; then
    log_success "Victorian post GSC metrics fetched successfully"
    ((SUCCESS_COUNT++))
else
    log_error "Failed to fetch Victorian post GSC metrics"
    FAILED_SCRIPTS+=("fetchGSCMetrics.mjs")
fi
echo ""

# Summary
echo "==============================================================================" | tee -a "$LOG_FILE"
log "📈 Analytics fetch completed!"
log "✓ Success: $SUCCESS_COUNT/$TOTAL_SCRIPTS scripts"

if [ ${#FAILED_SCRIPTS[@]} -gt 0 ]; then
    log_error "✗ Failed scripts:"
    for script in "${FAILED_SCRIPTS[@]}"; do
        log_error "  - $script"
    done
    echo "" | tee -a "$LOG_FILE"
    log_warning "Check $LOG_FILE for detailed error messages"
    exit 1
else
    log_success "All analytics data fetched successfully!"
    log "📁 Results saved to temp-files/"
    echo "" | tee -a "$LOG_FILE"
    log "Generated files:"
    log "  - temp-files/site-metrics.json"
    log "  - temp-files/all-blog-metrics.json"
    log "  - temp-files/ga-metrics.json"
    log "  - temp-files/ai-referral-metrics.json"
    log "  - temp-files/gsc-metrics.json"
fi

echo "==============================================================================" | tee -a "$LOG_FILE"
log "🔍 Full log saved to: $LOG_FILE"

exit 0
