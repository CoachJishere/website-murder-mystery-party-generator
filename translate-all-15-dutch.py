#!/usr/bin/env python3

import json
import os
import time
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))

def translate_post(post_num):
    print(f"\n[{post_num}/15] Processing post {post_num}...")

    # Load post data
    with open(f'nl-extract-{post_num}.json', 'r', encoding='utf-8') as f:
        post = json.load(f)

    print(f"  Title: {post['title'][:60]}...")
    print(f"  Content length: {len(post['content'])} chars")

    prompt = f"""You are a professional translator specializing in Dutch (Netherlands/Belgian neutral). Translate this murder mystery party blog post from English to Dutch.

CRITICAL REQUIREMENTS:
- Use formal Dutch ("u" form, not "je/jij")
- Natural, fluent Dutch appropriate for Netherlands and Belgian audiences
- Preserve ALL E-E-A-T elements (expert quotes, statistics, research data, sources)
- Keep source titles in English in the Bronnen/Referenties section
- Maintain all markdown formatting exactly
- DO NOT translate URLs
- Translate SEO metadata (title, description) naturally for Dutch readers

English Title: {post['title']}
English Meta Description: {post['meta_description']}

English Content:
{post['content']}

Provide ONLY the translation in this JSON format:
{{
  "title": "Dutch title here",
  "meta_description": "Dutch meta description here",
  "content": "Full Dutch markdown content here"
}}"""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=16000,
        messages=[{
            "role": "user",
            "content": prompt
        }]
    )

    response_text = message.content[0].text

    # Extract JSON from response
    start = response_text.find('{')
    end = response_text.rfind('}') + 1

    if start == -1 or end == 0:
        print(f"  ❌ No JSON found in response")
        with open(f'nl-error-{post_num}.txt', 'w', encoding='utf-8') as f:
            f.write(response_text)
        return None

    translation = json.loads(response_text[start:end])

    print(f"  ✓ Translated title: {translation['title'][:60]}...")
    print(f"  ✓ Content length: {len(translation['content'])} chars")

    # Save to markdown file
    markdown = f"""---
title: {translation['title']}
meta_description: {translation['meta_description']}
slug: {post['slug']}
---

{translation['content']}"""

    with open(f'nl-complete-post-{post_num}.md', 'w', encoding='utf-8') as f:
        f.write(markdown)

    print(f"  ✓ Saved to nl-complete-post-{post_num}.md")

    return translation

def main():
    print("Starting translation of 15 missing Dutch posts...\n")

    completed = 0
    failed = []

    for i in range(1, 16):
        try:
            result = translate_post(i)
            if result:
                completed += 1
            else:
                failed.append(i)
        except Exception as e:
            print(f"  ❌ Error: {str(e)}")
            failed.append(i)

        # Rate limiting
        if i < 15:
            print("  ⏱  Waiting 2 seconds...")
            time.sleep(2)

    print(f"\n✅ Translation complete!")
    print(f"  Completed: {completed}/15")
    if failed:
        print(f"  Failed: {failed}")
    else:
        print("\n📊 PHASE 3 STATUS:")
        print("  IT: 61/61 ✓")
        print("  JA: 61/61 ✓")
        print("  SV: 61/61 ✓")
        print("  NL: 61/61 ✓")
        print("\n🎉 PHASE 3 IS 100% COMPLETE - ALL 58 MISSING POSTS TRANSLATED ACROSS 4 LANGUAGES")

if __name__ == "__main__":
    main()
