#!/bin/bash

echo "=========================================="
echo "TRANSLATING POSTS 26-30 TO SPANISH"
echo "=========================================="
echo ""

# Array of post slugs
declare -a posts=(
  "how-to-fix-unsatisfying-mystery-endings-create-reveals-that-actually-satisfy"
  "how-to-host-a-fairy-tale-murder-mystery-party-once-upon-a-crime"
  "how-to-host-a-hollywood-murder-mystery-party"
  "how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue"
  "how-to-host-a-prohibition-era-murder-mystery-bootleg-your-way-to-excitement"
)

declare -a titles=(
  "Post 26: Unsatisfying Mystery Endings"
  "Post 27: Fairy Tale Murder Mystery"
  "Post 28: Hollywood Murder Mystery"
  "Post 29: Medieval Castle Murder Mystery"
  "Post 30: Prohibition Era Murder Mystery"
)

# Report status
for i in "${!posts[@]}"; do
  num=$((i + 26))
  echo "Post $num: ${titles[$i]}"
  echo "  Slug: ${posts[$i]}"
  echo "  Status: Ready for translation"
  echo ""
done

echo "=========================================="
echo "All 5 posts prepared for translation"
echo "=========================================="

