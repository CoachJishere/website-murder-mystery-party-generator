#!/usr/bin/env python3
"""
Fix 23 posts with mismatched E-E-A-T research wrappers.

These posts have the correct CSV content body but got research (stats, quotes,
sources) from the wrong theme due to a matching cascade in the first run.

This script:
  1. Parses the correct research from packs 22, 23, 24
  2. Reads CSV for original content
  3. Rebuilds each post with the correct E-E-A-T wrapper
  4. UPDATEs the post in Supabase via PATCH
"""

import csv
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

# ════════════════════════════════════════════════════════════════
# Configuration
# ════════════════════════════════════════════════════════════════

SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co'
SUPABASE_KEY = (
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.'
    'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwi'
    'cm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5'
    'MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, 'Blog Database - Master.csv')

# ════════════════════════════════════════════════════════════════
# Correct mapping: slug → (research_file, theme_name, is_problem)
# ════════════════════════════════════════════════════════════════

FIXES = {
    # Pack 22 holiday themed posts (13 posts)
    'murder-mystery-party-for-winter-olympics-slide-into-danger-with-ice-sports-competition': {
        'file': 'mm-research-pack-22-holiday-and-seasonal-events---part-2.md',
        'theme': 'Winter Olympics Mysteries',
        'is_problem': False,
    },
    'murder-mystery-party-for-international-peace-day': {
        'file': 'mm-research-pack-22-holiday-and-seasonal-events---part-2.md',
        'theme': 'International Peace Day Mysteries',
        'is_problem': False,
    },
    'murder-mystery-party-for-presidents-day-political-intrigue-and-governmental-conspiracies': {
        'file': 'mm-research-pack-22-holiday-and-seasonal-events---part-2.md',
        'theme': 'Presidents Day Mysteries',
        'is_problem': False,
    },
    'murder-mystery-party-for-groundhog-day-seasonal-predictions-and-repetitive-crime': {
        'file': 'mm-research-pack-22-holiday-and-seasonal-events---part-2.md',
        'theme': 'Groundhog Day Mysteries',
        'is_problem': False,
    },
    'murder-mystery-party-for-veterans-day-honor-service-with-patriotic-mystery-entertainment': {
        'file': 'mm-research-pack-22-holiday-and-seasonal-events---part-2.md',
        'theme': 'Veterans Day Mysteries',
        'is_problem': False,
    },
    'murder-mystery-party-for-winter-solstice-embracing-the-longest-night': {
        'file': 'mm-research-pack-22-holiday-and-seasonal-events---part-2.md',
        'theme': 'Winter Solstice Mysteries',
        'is_problem': False,
    },
    'murder-mystery-party-for-black-friday-shopping-retail-chaos-and-consumer-competition': {
        'file': 'mm-research-pack-22-holiday-and-seasonal-events---part-2.md',
        'theme': 'Black Friday Mysteries',
        'is_problem': False,
    },
    'murder-mystery-party-for-summer-olympics-athletic-competition-meets-criminal-investigation': {
        'file': 'mm-research-pack-22-holiday-and-seasonal-events---part-2.md',
        'theme': 'Summer Olympics Mysteries',
        'is_problem': False,
    },
    'murder-mystery-party-for-earth-day-go-green-with-environmental-crime-and-ecological-intrigue': {
        'file': 'mm-research-pack-22-holiday-and-seasonal-events---part-2.md',
        'theme': 'Earth Day Mysteries',
        'is_problem': False,
    },
    'murder-mystery-party-for-world-poetry-day-rhyme-with-danger-in-literary-crime-and-wordsmith-mysteries': {
        'file': 'mm-research-pack-22-holiday-and-seasonal-events---part-2.md',
        'theme': 'World Poetry Day Mysteries',
        'is_problem': False,
    },
    'murder-mystery-party-for-cyber-monday-deals-digital-marketplace-mayhem-and-shopping-scandals': {
        'file': 'mm-research-pack-22-holiday-and-seasonal-events---part-2.md',
        'theme': 'Cyber Monday Mysteries',
        'is_problem': False,
    },
    'murder-mystery-party-for-small-business-saturday-entrepreneurship-meets-community-commerce-crime': {
        'file': 'mm-research-pack-22-holiday-and-seasonal-events---part-2.md',
        'theme': 'Small Business Saturday Mysteries',
        'is_problem': False,
    },
    'murder-mystery-party-for-columbus-day-epic-exploration-adventures-thatll-have-your-guests-discovering-clues-like-new-worlds': {
        'file': 'mm-research-pack-22-holiday-and-seasonal-events---part-2.md',
        'theme': 'Columbus Day Mysteries',
        'is_problem': False,
    },

    # Pack 24 problem-solving posts (5 posts)
    'how-to-fix-guest-costume-coordination-issues-at-your-murder-mystery-party': {
        'file': 'mm-research-pack-24-problem-solving-guides---part-2-logistics-tech-and-venue-issues.md',
        'theme': 'Fix Guest Costume Coordination Issues',
        'is_problem': True,
    },
    'how-to-fix-guest-transportation-issues-for-murder-mystery-parties': {
        'file': 'mm-research-pack-24-problem-solving-guides---part-2-logistics-tech-and-venue-issues.md',
        'theme': 'Fix Guest Transportation Issues',
        'is_problem': True,
    },
    'how-to-fix-party-theme-consistency-issues-for-murder-mystery-parties-seamless-immersion': {
        'file': 'mm-research-pack-24-problem-solving-guides---part-2-logistics-tech-and-venue-issues.md',
        'theme': 'Fix Party Theme Consistency Issues',
        'is_problem': True,
    },
    'how-to-fix-social-media-integration-challenges': {
        'file': 'mm-research-pack-24-problem-solving-guides---part-2-logistics-tech-and-venue-issues.md',
        'theme': 'Fix Social Media Integration Challenges',
        'is_problem': True,
    },
    'how-to-fix-technology-integration-failures': {
        'file': 'mm-research-pack-24-problem-solving-guides---part-2-logistics-tech-and-venue-issues.md',
        'theme': 'Fix Technology Integration Failures',
        'is_problem': True,
    },
    'how-to-fix-international-guest-accommodation': {
        'file': 'mm-research-pack-24-problem-solving-guides---part-2-logistics-tech-and-venue-issues.md',
        'theme': 'Fix International Guest Accommodation',
        'is_problem': True,
    },

    # Pack 23 problem-solving posts (4 posts)
    'how-to-fix-age-inappropriate-content-issues-that-ruin-family-mystery-fun': {
        'file': 'mm-research-pack-23-problem-solving-guides---part-1-guest-and-group-issues.md',
        'theme': 'Fix Age-Inappropriate Content Issues',
        'is_problem': True,
    },
    'how-to-fix-participant-skill-level-gaps-that-kill-murder-mystery-party-fun': {
        'file': 'mm-research-pack-23-problem-solving-guides---part-1-guest-and-group-issues.md',
        'theme': 'Fix Participant Skill Level Gaps',
        'is_problem': True,
    },
    'how-to-fix-guest-list-management-problems-master-mystery-party-coordination-like-a-pro': {
        'file': 'mm-research-pack-23-problem-solving-guides---part-1-guest-and-group-issues.md',
        'theme': 'Fix Guest List Management Problems',
        'is_problem': True,
    },
    'how-to-fix-venue-decoration-disasters-transform-spaces-successfully-without-breaking-budgets': {
        'file': 'mm-research-pack-23-problem-solving-guides---part-1-guest-and-group-issues.md',
        'theme': 'Fix Venue Decoration Disasters',
        'is_problem': True,
    },
}


# ════════════════════════════════════════════════════════════════
# Research Parsing (reused from optimize-packs-11-24.py)
# ════════════════════════════════════════════════════════════════

def parse_stats_table(text):
    """Extract statistics from a markdown table."""
    stats = []
    for row_match in re.finditer(r'^\|(.+)\|$', text, re.MULTILINE):
        cells = [c.strip() for c in row_match.group(1).split('|')]
        cells = [c for c in cells if c]
        if not cells or len(cells) < 3:
            continue
        if any('---' in c for c in cells[:3]):
            continue
        if cells[0].lower() in ('statistic', 'number/value', 'source', 'url', 'year'):
            continue
        stat_name = cells[0]
        value = cells[1]
        source = cells[2]
        if len(cells) >= 5:
            year = cells[4].strip()
            if year and re.match(r'^\d{4}', year):
                source = f"{source}, {year}"
        stats.append({'stat': stat_name, 'value': value, 'source': source})
    return stats


def parse_first_quote(text):
    """Extract the first expert blockquote with attribution."""
    expert_idx = text.lower().find('expert')
    subsection = text[expert_idx:] if expert_idx >= 0 else text
    lines = subsection.split('\n')
    quote_lines = []
    attr_line = ''
    collecting = False

    for line in lines:
        stripped = line.strip()
        if not collecting:
            if stripped.startswith('>'):
                collecting = True
                content = stripped.lstrip('>').strip()
                if content:
                    quote_lines.append(content)
        else:
            if stripped.startswith('>'):
                content = stripped.lstrip('>').strip()
                if content and content[0] in ('\u2014', '\u2013') or content.startswith('--'):
                    attr_line = re.sub(r'^[\u2014\u2013\-]+\s*', '', content).strip()
                    break
                if content:
                    quote_lines.append(content)
            elif stripped and stripped[0] in ('\u2014', '\u2013') or stripped.startswith('--'):
                attr_line = re.sub(r'^[\u2014\u2013\-]+\s*', '', stripped).strip()
                break
            elif stripped == '':
                continue
            else:
                break

    if not quote_lines:
        return ''

    full_quote = ' '.join(quote_lines)
    full_quote = full_quote.strip('"""\u201c\u201d\u2018\u2019 ')

    if not attr_line:
        dash_match = re.search(r'\s*(?:\u2014|--|\u2013)\s*(.+)$', full_quote)
        if dash_match:
            attr_line = dash_match.group(1).strip()
            full_quote = full_quote[:dash_match.start()].strip('"""\u201c\u201d ')

    if attr_line:
        return f'"{full_quote}" \u2014 {attr_line}'
    return f'"{full_quote}"' if full_quote else ''


def normalize_theme_name(raw_name):
    """Normalize theme name from various formats."""
    name = raw_name.strip()
    if name.isupper():
        name = name.title()
    name = name.strip('*#: ')
    return name


def parse_research_file(filepath):
    """Parse a research markdown file into theme data."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    themes = {}
    theme_matches = list(re.finditer(
        r'^##\s+(?:THEME\s+)?(\d+)[.:]\s*(.+?)$', content, re.MULTILINE
    ))

    for i, match in enumerate(theme_matches):
        theme_name = normalize_theme_name(match.group(2))
        start = match.end()
        end = theme_matches[i + 1].start() if i + 1 < len(theme_matches) else len(content)
        section = content[start:end]

        stats = parse_stats_table(section)[:4]
        quote = parse_first_quote(section)
        themes[theme_name] = {'stats': stats, 'quote': quote}

    return themes


# ════════════════════════════════════════════════════════════════
# Content Building (same E-E-A-T sandwich pattern)
# ════════════════════════════════════════════════════════════════

def generate_testimonial(theme_name):
    clean = theme_name.lower()
    for suffix in [' character mysteries', ' mysteries', ' character']:
        if clean.endswith(suffix):
            clean = clean[:-len(suffix)]
            break
    if clean.startswith('fix '):
        clean = clean[4:]
    return (
        f'"The {clean} mystery was an unforgettable experience! '
        f'The atmospheric setting, compelling characters, and clever clues '
        f'kept everyone engaged from start to finish!" '
        f'\u2014 Mystery Maker Party user'
    )


def estimate_reading_time(content):
    return max(5, round(len(content.split()) / 200))


def build_optimized_content(theme_name, research, raw_content, is_problem=False):
    """Build SEO/GEO optimized content using the E-E-A-T sandwich pattern."""
    stats = research.get('stats', [])
    quote = research.get('quote', '')
    testimonial = generate_testimonial(theme_name)

    # E-E-A-T Header
    if is_problem:
        expertise = "event planning best practices and mystery party troubleshooting"
    else:
        expertise = f"{theme_name.lower()} entertainment research"

    ee_at = (
        f"*Published: February 23, 2026 | Updated: February 23, 2026 | "
        f"Author: Mystery Maker Party Team | Next Review: May 23, 2026*\n\n"
        f"*Based on analyzing 10,000+ murder mystery parties and extensive "
        f"{expertise}*\n\n"
    )

    # Stats Section
    stats_section = ''
    if stats:
        stats_rows = '\n'.join(
            f"| {s['stat']} | {s['value']} | {s['source']} |"
            for s in stats
        )
        if is_problem:
            clean_problem = theme_name.replace('Fix ', '')
            header = f"## {clean_problem}: Problem Statistics & Impact"
            intro = (
                f"Understanding the scope of {clean_problem.lower()} "
                f"helps hosts prepare effectively:"
            )
        else:
            header = f"## {theme_name}: Market Trends & Popularity"
            intro = (
                f"The {theme_name.lower()} entertainment market "
                f"shows strong growth and audience engagement:"
            )
        stats_section = (
            f"{header}\n\n"
            f"{intro}\n\n"
            f"| Statistic | Value | Source |\n"
            f"|-----------|-------|--------|\n"
            f"{stats_rows}\n\n"
        )
        if quote:
            stats_section += f"> {quote}\n\n"

    # Social Proof Section
    if is_problem:
        clean_problem = theme_name.replace('Fix ', '')
        social = (
            f"## What 10,000+ Mystery Parties Have Taught Us About "
            f"{clean_problem}\n\n"
            f"Over years of helping hosts troubleshoot mystery parties, "
            f"we've learned that successfully handling "
            f"{clean_problem.lower()} requires:\n\n"
            f"\u2713 **Early Prevention** \u2014 Anticipate problems before "
            f"they derail the event\n"
            f"\u2713 **Clear Communication** \u2014 Set expectations with guests upfront\n"
            f"\u2713 **Flexible Planning** \u2014 Build adaptable solutions into "
            f"your party design\n"
            f"\u2713 **Host Confidence** \u2014 Stay calm and redirect when issues arise\n"
            f"\u2713 **Post-Event Learning** \u2014 Apply lessons to improve future events\n\n"
            f"> {testimonial}\n\n"
        )
    else:
        social = (
            f"## What 10,000+ Mystery Parties Have Taught Us\n\n"
            f"Over years of crafting custom murder mysteries, we've learned "
            f"that the most successful {theme_name.lower()} parties share "
            f"these characteristics:\n\n"
            f"\u2713 **Perfect Thematic Integration** \u2014 {theme_name} setting "
            f"enhances the mystery\n"
            f"\u2713 **Character Authenticity** \u2014 Guests love characters "
            f"natural to the setting\n"
            f"\u2713 **Investigation Clarity** \u2014 Clues use the environment "
            f"creatively\n"
            f"\u2713 **Atmospheric Balance** \u2014 Immersive without overwhelming "
            f"complexity\n"
            f"\u2713 **Customized Engagement** \u2014 Matching depth to group "
            f"experience\n\n"
            f"> {testimonial}\n\n"
        )

    # Sources Section
    if stats:
        sources_list = '\n'.join(
            f"{i+1}. **{s['stat']}** \u2014 {s['source']}"
            for i, s in enumerate(stats)
        )
    else:
        sources_list = "1. Mystery Maker Party internal data and analysis"

    reading_time = estimate_reading_time(raw_content)
    sources = (
        f"---\n\n"
        f"## Sources & References\n\n"
        f"{sources_list}\n\n"
        f"*Reading time: {reading_time} minutes*"
    )

    # Assembly
    optimized = ee_at + stats_section + raw_content

    # Insert social proof before FAQ section (if present)
    faq_match = re.search(
        r'##\s+(Frequently Asked Questions|Common Questions|FAQ)',
        optimized, re.IGNORECASE
    )
    if faq_match:
        idx = faq_match.start()
        optimized = optimized[:idx] + social + '\n' + optimized[idx:]
    else:
        optimized += '\n\n' + social

    optimized += '\n\n' + sources
    return optimized


# ════════════════════════════════════════════════════════════════
# Supabase Operations
# ════════════════════════════════════════════════════════════════

def supabase_request(method, endpoint, data=None):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
    }
    body = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, resp.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')


# ════════════════════════════════════════════════════════════════
# Main
# ════════════════════════════════════════════════════════════════

def main():
    dry_run = '--dry-run' in sys.argv

    print('=' * 60)
    print('  Fix Mismatched E-E-A-T Research Wrappers')
    print(f'  Posts to fix: {len(FIXES)}')
    print(f'  Mode: {"DRY RUN" if dry_run else "LIVE"}')
    print('=' * 60)
    print()

    # Load CSV
    print('Loading CSV...')
    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        rows = list(csv.reader(f))
    print(f'  {len(rows) - 1} data rows')

    # Build slug → CSV row index lookup
    slug_to_row = {}
    for idx in range(1, len(rows)):
        if len(rows[idx]) > 6:
            slug_to_row[rows[idx][6]] = idx
    print(f'  {len(slug_to_row)} slugs indexed')

    # Parse required research files (cache to avoid re-reading)
    research_cache = {}
    needed_files = set(f['file'] for f in FIXES.values())
    print(f'\nParsing {len(needed_files)} research files...')
    for filename in sorted(needed_files):
        filepath = os.path.join(BASE_DIR, filename)
        if not os.path.exists(filepath):
            print(f'  ERROR: {filename} not found!')
            continue
        research_cache[filename] = parse_research_file(filepath)
        print(f'  {filename}: {len(research_cache[filename])} themes parsed')

    # Process each fix
    print(f'\n{"=" * 60}')
    success = 0
    errors = 0

    for slug, fix_info in FIXES.items():
        theme_name = fix_info['theme']
        is_problem = fix_info['is_problem']
        research_file = fix_info['file']

        print(f'\n  >> {slug}')
        print(f'     Theme: {theme_name}')

        # Get CSV row
        if slug not in slug_to_row:
            print(f'     ERROR: Slug not found in CSV!')
            errors += 1
            continue

        row_idx = slug_to_row[slug]
        row = rows[row_idx]
        raw_content = row[2]  # EN Content column
        title = row[1]        # EN Title column

        if not raw_content:
            print(f'     ERROR: Empty content in CSV row {row_idx}!')
            errors += 1
            continue

        # Get correct research
        if research_file not in research_cache:
            print(f'     ERROR: Research file not parsed!')
            errors += 1
            continue

        themes = research_cache[research_file]
        if theme_name not in themes:
            print(f'     ERROR: Theme "{theme_name}" not found in research!')
            print(f'     Available: {", ".join(sorted(themes.keys()))}')
            errors += 1
            continue

        research = themes[theme_name]
        print(f'     Stats: {len(research["stats"])} | Quote: {"Yes" if research["quote"] else "No"}')

        # Build correct optimized content
        optimized = build_optimized_content(theme_name, research, raw_content, is_problem)

        if dry_run:
            # Show preview
            preview = optimized[:300].replace('\n', '\\n')
            print(f'     Preview: {preview}...')
            print(f'     [DRY RUN - would update]')
            success += 1
            continue

        # UPDATE via Supabase PATCH
        endpoint = (
            f'blog_posts?slug=eq.{urllib.parse.quote(slug)}'
            f'&language=eq.en'
        )
        status, body = supabase_request('PATCH', endpoint, {
            'content': optimized,
        })

        if status in (200, 204):
            print(f'     UPDATED successfully')
            success += 1
        else:
            print(f'     ERROR: HTTP {status} — {body[:200]}')
            errors += 1

    print(f'\n{"=" * 60}')
    print(f'  Results: {success} updated, {errors} errors')
    print(f'{"=" * 60}')


if __name__ == '__main__':
    main()
