#!/usr/bin/env python3
"""Helper script to update a single blog post's content in Supabase.
Usage: python3 update-post.py <post_id> <content_file>
"""
import sys
import json
import urllib.request
import urllib.error

SUPABASE_URL = "https://mhfikaomkmqcndqfohbp.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjYzNTkwNCwiZXhwIjoyMDUyMjExOTA0fQ.gBxRyNzF2JhXwMbnOFGSR_W_-Oh95O5IV4FassJpJu4"

def update_post(post_id, content):
    """PATCH a post's content in Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/blog_posts?id=eq.{post_id}&language=eq.en"

    # Calculate reading time
    word_count = len(content.split())
    reading_time = max(5, round(word_count / 200))

    data = json.dumps({
        "content": content,
        "reading_time": reading_time,
    }).encode("utf-8")

    req = urllib.request.Request(url, data=data, method="PATCH")
    req.add_header("apikey", SUPABASE_KEY)
    req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "return=minimal")

    try:
        resp = urllib.request.urlopen(req)
        print(f"  Updated {post_id} — {word_count} words, {reading_time} min read")
        return True
    except urllib.error.HTTPError as e:
        print(f"  ERROR updating {post_id}: {e.code} {e.read().decode()}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 update-post.py <post_id> <content_file>")
        sys.exit(1)

    post_id = sys.argv[1]
    content_file = sys.argv[2]

    with open(content_file, "r") as f:
        content = f.read()

    success = update_post(post_id, content)
    sys.exit(0 if success else 1)
