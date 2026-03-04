#!/bin/bash

# Italian Translation Project - Quick Start Script
# Posts 20-29 Translation Workflow

echo ""
echo "================================================================================"
echo "ITALIAN TRANSLATION PROJECT - POSTS 20-29"
echo "================================================================================"
echo ""

# Check if source files exist
echo "Checking source files..."
file_count=$(ls italian-post-*.json 2>/dev/null | wc -l)

if [ $file_count -eq 10 ]; then
    echo "✅ All 10 source files ready for translation"
    echo ""
    ls -1 italian-post-*.json | nl -w2 -s'. '
    echo ""
else
    echo "❌ ERROR: Expected 10 files, found $file_count"
    echo "Run: node italian-translation-batch-20-29-output.mjs"
    exit 1
fi

echo "================================================================================"
echo "TRANSLATION OPTIONS"
echo "================================================================================"
echo ""
echo "1. AUTOMATED (Make.com Webhook)"
echo "   → node translate-italian-via-make.mjs"
echo "   → Fast, automated, ~30-60 minutes"
echo ""
echo "2. MANUAL (Claude/GPT)"
echo "   → Open each italian-post-XX.json"
echo "   → Translate with AI (formal Lei, proper accents)"
echo "   → Save as italian-translation-XX.json"
echo "   → High quality, ~3-5 hours"
echo ""
echo "3. PROFESSIONAL SERVICE"
echo "   → Export JSON files to translation service"
echo "   → Import completed translations"
echo "   → Highest quality, 1-2 days"
echo ""
echo "================================================================================"
echo "AFTER TRANSLATION COMPLETE"
echo "================================================================================"
echo ""
echo "Run database insertion:"
echo "   → node insert-italian-translations-20-29.mjs"
echo ""
echo "This will automatically insert all translated posts into Supabase"
echo ""
echo "================================================================================"
echo "ITALIAN TRANSLATION REQUIREMENTS"
echo "================================================================================"
echo ""
echo "✓ Formal 'Lei' form throughout"
echo "✓ Date: *Pubblicato: 16 febbraio 2026*"
echo "✓ Proper accents: è, é, à, ì, ò, ù"
echo "✓ Preserve markdown formatting"
echo "✓ Use 'Giallo' for 'Murder Mystery'"
echo ""
echo "================================================================================"
echo ""

read -p "Start automated translation via Make.com? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo ""
    echo "Starting Make.com translation..."
    node translate-italian-via-make.mjs
else
    echo ""
    echo "Manual translation selected. Follow Option 2 above."
    echo ""
    echo "Documentation available:"
    echo "  - ITALIAN-TRANSLATION-REPORT.md"
    echo "  - ITALIAN-TRANSLATION-WORKFLOW.md"
    echo ""
fi
