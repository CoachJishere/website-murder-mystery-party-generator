#!/bin/bash

# Split the SQL file into individual INSERTs
csplit -f insert- -b '%03d.sql' all-phase3-inserts.sql '/^-- /' '{*}' 2>/dev/null

# Count them
COUNT=$(ls insert-*.sql 2>/dev/null | wc -l)
echo "Split into $COUNT SQL files"
echo "First few files:"
ls insert-*.sql | head -5
