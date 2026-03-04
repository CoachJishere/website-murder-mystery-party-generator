#!/bin/bash

# Phase 2 SQL Batch Execution Script
# Executes all 6 batch SQL files using psql

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database connection
DB_HOST="db.mhfikaomkmqcndqfohbp.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Phase 2: SQL Batch Execution${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check if PGPASSWORD is set
if [ -z "$PGPASSWORD" ]; then
    echo -e "${RED}Error: PGPASSWORD environment variable not set${NC}"
    echo "Please set it with: export PGPASSWORD='your-password'"
    exit 1
fi

# Batch files to execute
declare -a files=(
    "batch-pt-1-5.sql:Portuguese 1-5"
    "batch-pt-6-10.sql:Portuguese 6-10"
    "batch-ko-1-5.sql:Korean 1-5"
    "batch-ko-6-9.sql:Korean 6-9"
    "batch-zh-6-9.sql:Chinese 6-9"
    "batch-zh-10-12.sql:Chinese 10-12"
)

success_count=0
total_files=${#files[@]}

# Execute each file
for item in "${files[@]}"; do
    IFS=':' read -r file desc <<< "$item"

    echo -e "\n${BLUE}Executing: $desc${NC}"
    echo "   File: $file"

    if [ ! -f "$file" ]; then
        echo -e "   ${RED}❌ File not found: $file${NC}"
        continue
    fi

    file_size=$(du -h "$file" | cut -f1)
    echo "   Size: $file_size"

    # Execute the SQL file
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$file" --set ON_ERROR_STOP=on > /dev/null 2>&1; then
        echo -e "   ${GREEN}✅ Success${NC}"
        ((success_count++))
    else
        echo -e "   ${RED}❌ Failed${NC}"
    fi

    # Small delay between executions
    sleep 1
done

# Summary
echo -e "\n${BLUE}================================================${NC}"
echo -e "${BLUE}EXECUTION SUMMARY${NC}"
echo -e "${BLUE}================================================${NC}"
echo "   Successful: $success_count/$total_files"
echo "   Failed: $((total_files - success_count))"

# Verify counts
echo -e "\n${BLUE}Verifying post counts...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT
  language,
  COUNT(*) as count
FROM blog_posts
WHERE status = 'published'
  AND language IN ('pt', 'ko', 'zh-cn')
GROUP BY language
ORDER BY language;
"

echo -e "\n${GREEN}✨ Phase 2 Execution Complete${NC}\n"
