#!/bin/bash

# Fetch all 10 posts for German Batch 3 using Supabase MCP tool
# Posts 21-30

echo "=== Fetching German Batch 3 Posts (21-30) ==="
echo ""

# Post IDs from our earlier query
declare -A posts=(
  ["21"]="bd829048-623b-467a-94e2-c7676bdf8ef2"
  ["22"]="17325502-e5ad-4b92-bde3-0857f82a9254"
  ["23"]="e69f4207-ddbd-48fa-bbcc-7c08a16ed49b"
  ["24"]="9016f13f-eebd-4300-984a-e7fd4066b465"
  ["25"]="6c030a19-7884-42fa-aecb-d97ef2b0bdac"
  ["26"]="4662e124-df40-455b-852d-2d8f2e13515e"
  ["27"]="92cc7ea6-11d3-4263-8b06-84058d4de32a"
  ["28"]="2aaee48f-eb45-4183-8340-f92616812fe2"
  ["29"]="cea7e6f4-77b7-448d-aeab-daa6ccff7593"
  ["30"]="a25bacd6-e0e9-4906-84cf-eb50500ee473"
)

echo "Post IDs ready for individual fetch via MCP tool"
echo ""
echo "Next steps:"
echo "1. Use mcp__supabase__execute_sql to fetch each post's content"
echo "2. Save to individual files: post-[num]-en-content.txt"
echo "3. Translate each using Claude"
echo ""

for num in {21..30}; do
  echo "Post $num: ${posts[$num]}"
done
