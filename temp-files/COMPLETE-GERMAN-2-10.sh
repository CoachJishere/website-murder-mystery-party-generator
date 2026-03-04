#!/bin/bash

#################################################################
# Complete German Translation for Posts 2-10
# This script provides the commands to finish the translation
#################################################################

echo "======================================================"
echo "German Translation Completion for Posts 2-10"
echo "======================================================"
echo ""

# Check status
echo "📊 Current Status:"
echo "  ✅ Post #2: Complete (in german-translated-batch-2-10.json)"
echo "  ⏳ Posts #3-10: Need translation (8 posts)"
echo ""

# Option 1: Use existing Claude API if available
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "⚠️  ANTHROPIC_API_KEY not set"
  echo ""
  echo "📋 Options to Complete:"
  echo ""
  echo "OPTION A - Set API Key and Auto-Translate:"
  echo "  export ANTHROPIC_API_KEY='your-key-here'"
  echo "  node translate-german-batch-2-10.mjs"
  echo ""
  echo "OPTION B - Use Make.com Automation:"
  echo "  1. The .env file has MAKE_API_TOKEN already"
  echo "  2. Create Make scenario with Claude integration"
  echo "  3. Process posts 3-10 through Claude"
  echo "  4. Auto-insert into Supabase"
  echo ""
  echo "OPTION C - Manual Translation (NOT RECOMMENDED):"
  echo "  Estimated time: 6-8 hours for 8 posts"
  echo ""
else
  echo "✅ ANTHROPIC_API_KEY is set"
  echo ""
  echo "Running automated translation..."
  node translate-german-batch-2-10.mjs
fi

echo ""
echo "======================================================"
echo "Once translations complete, run:"
echo "  node batch-insert-german-2-10.mjs"
echo "======================================================"
