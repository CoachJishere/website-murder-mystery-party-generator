#!/bin/bash

# Read the optimized content
CONTENT=$(cat "temp-files/victorian-content-only.txt")

# Escape single quotes for SQL by doubling them
ESCAPED_CONTENT="${CONTENT//\'/\'\'}"

# Create SQL update statement
SQL="UPDATE blog_posts
SET
  content = E'${ESCAPED_CONTENT}',
  reading_time = 14,
  updated_at = NOW()
WHERE id = 'f9e5ae63-d483-42e0-845e-6c5ce69c3624'
RETURNING id, slug, reading_time, updated_at;"

echo "Updating Victorian Murder Mystery post..."
echo "Content length: ${#CONTENT} characters"

# Execute via Supabase (you'll need to run this manually with proper credentials)
echo "$SQL"
