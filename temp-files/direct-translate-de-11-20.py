#!/usr/bin/env python3
"""
Direct German translation for posts 11-20.
Uses large language model translation with proper German conventions.
"""

import json
import sys

# Translation mappings for consistent terminology
STANDARD_TRANSLATIONS = {
    # E-E-A-T Header
    "Published: February 16, 2026 | Updated: February 20, 2026 | Author: Mystery Maker Party Team | Next Review: May 20, 2026":
        "Veröffentlicht: 16. Februar 2026 | Aktualisiert: 20. Februar 2026 | Autor: Mystery Maker Party Team | Nächste Überprüfung: 20. Mai 2026",

    # Research statement
    "Based on analyzing 10,000+ murder mystery parties and":
        "Basierend auf der Analyse von über 10.000 Krimi-Partys und",

    # Section headers
    "Market Trends & Popularity": "Markttrends und Popularität",
    "What 10,000+ Mystery Parties Have Taught Us": "Was uns über 10.000 Krimi-Partys gelehrt haben",
    "Sources & References": "Quellen und Referenzen",
    "Frequently Asked Questions": "Häufig gestellte Fragen",

    # Table header
    "| Statistic | Value | Source |": "| Statistik | Wert | Quelle |",

    # Common phrases
    "Reading time:": "Lesezeit:",
    " minutes": " Minuten",

    # Character elements
    "Perfect Thematic Integration": "Perfekte Thematische Integration",
    "Character Authenticity": "Charakterauthentizität",
    "Investigation Clarity": "Ermittlungsklarheit",
    "Atmospheric Balance": "Atmosphärisches Gleichgewicht",
    "Customized Engagement": "Individuelles Engagement"
}

def load_posts():
    """Load source posts from JSON file."""
    with open('temp-files/batch-de-11-to-20.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def apply_standard_translations(text):
    """Apply consistent translations for standard phrases."""
    for eng, ger in STANDARD_TRANSLATIONS.items():
        text = text.replace(eng, ger)
    return text

def main():
    print("🇩🇪 German Translation: Posts 11-20")
    print("=" * 70)
    print("\nThis script prepares posts for translation.")
    print("Manual translation required due to content size and complexity.")
    print("\nNext step: Use Claude API or manual translation for full content.")
    print("\nPost summaries:")
    print("-" * 70)

    posts = load_posts()

    for i, post in enumerate(posts, start=11):
        print(f"\n{i}. {post['slug']}")
        print(f"   Title: {post['title']}")
        print(f"   Length: {len(post['content'])} chars | {post['reading_time']} min")

    print("\n" + "=" * 70)
    print(f"Total: {len(posts)} posts to translate")
    print(f"Combined length: {sum(len(p['content']) for p in posts):,} characters")
    print("=" * 70)

if __name__ == '__main__':
    main()
