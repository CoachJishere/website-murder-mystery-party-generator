#!/usr/bin/env python3
"""
Master SEO/GEO Optimization Script — Packs 11–24 (270 blog posts)

Reads raw content from CSV, extracts research data from markdown files,
applies the E-E-A-T sandwich pattern, and INSERTs into Supabase as drafts.

Usage:
    python optimize-packs-11-24.py                   # Process all packs
    python optimize-packs-11-24.py --dry-run          # Show matching only
    python optimize-packs-11-24.py --pack 11          # Process single pack
    python optimize-packs-11-24.py --pack 11 --dry-run
"""

import csv
import json
import os
import re
import sys
import time
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

RESEARCH_FILES = {
    11: 'mm-research-pack-11-ancient-and-classical-civilizations.md',
    12: 'mm-research-pack-12-jazz-age-noir-prohibition-and-wild-west.md',
    13: 'mm-research-pack-13-fantasy-supernatural-and-haunted-themes.md',
    14: 'mm-research-pack-14-space-robots-and-sci-fi-technology.md',
    15: 'mm-research-pack-15-research-stations-biotech-and-psychic-powers.md',
    16: 'mm-research-pack-16-superpowers-dimensions-and-virtual-worlds.md',
    17: 'mm-research-pack-17-venues---entertainment-travel-and-luxury.md',
    18: 'mm-research-pack-18-venues---food-craft-industrial-and-niche.md',
    19: 'mm-research-pack-19-character-profiles-professions-investigators.md',
    20: 'mm-research-pack-20-creating-the-perfect-character---artisan-and-service-professions.md',
    21: 'mm-research-pack-21-holiday-and-seasonal-events---part-1.md',
    22: 'mm-research-pack-22-holiday-and-seasonal-events---part-2.md',
    23: 'mm-research-pack-23-problem-solving-guides---part-1-guest-and-group-issues.md',
    24: 'mm-research-pack-24-problem-solving-guides---part-2-logistics-tech-and-venue-issues.md',
}

PROBLEM_SOLVING_PACKS = {23, 24}

# Explicit slug overrides for themes where research used a different name
THEME_SLUG_OVERRIDES = {
    'Classic Car Garage Mysteries': 'antique-car-show-murder-mystery-planning',
}


# ════════════════════════════════════════════════════════════════
# Research Markdown Parsing
# ════════════════════════════════════════════════════════════════

def parse_stats_table(text):
    """Extract statistics from a markdown table in the text."""
    stats = []
    for row_match in re.finditer(r'^\|(.+)\|$', text, re.MULTILINE):
        cells = [c.strip() for c in row_match.group(1).split('|')]
        cells = [c for c in cells if c]

        # Skip header rows, separator rows, and empty rows
        if not cells or len(cells) < 3:
            continue
        if any('---' in c for c in cells[:3]):
            continue
        if cells[0].lower() in ('statistic', 'number/value', 'source', 'url', 'year'):
            continue

        stat_name = cells[0]
        value = cells[1]
        source = cells[2]

        # Append year if available (column 5)
        if len(cells) >= 5:
            year = cells[4].strip()
            if year and re.match(r'^\d{4}', year):
                source = f"{source}, {year}"

        stats.append({
            'stat': stat_name,
            'value': value,
            'source': source,
        })

    return stats


def parse_first_quote(text):
    """Extract the first expert blockquote with attribution."""
    # Find Expert Insights subsection
    expert_idx = text.lower().find('expert')
    subsection = text[expert_idx:] if expert_idx >= 0 else text

    lines = subsection.split('\n')
    quote_lines = []
    attr_line = ''
    collecting = False

    for i, line in enumerate(lines):
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
                # Check if this blockquote line is the attribution
                if content and content[0] in ('—', '–') or content.startswith('--'):
                    attr_line = re.sub(r'^[—–\-]+\s*', '', content).strip()
                    break
                if content:
                    quote_lines.append(content)
            elif stripped and stripped[0] in ('—', '–') or stripped.startswith('--'):
                attr_line = re.sub(r'^[—–\-]+\s*', '', stripped).strip()
                break
            elif stripped == '':
                # Check if next non-empty line is attribution
                continue
            else:
                break

    if not quote_lines:
        return ''

    full_quote = ' '.join(quote_lines)
    # Clean quote marks
    full_quote = full_quote.strip('"""\u201c\u201d\u2018\u2019 ')

    # Check for inline attribution (— within the quote text)
    if not attr_line:
        dash_match = re.search(r'\s*(?:—|--|–)\s*(.+)$', full_quote)
        if dash_match:
            attr_line = dash_match.group(1).strip()
            full_quote = full_quote[:dash_match.start()].strip('"""\u201c\u201d ')

    if attr_line:
        return f'"{full_quote}" — {attr_line}'
    return f'"{full_quote}"' if full_quote else ''


def normalize_theme_name(raw_name):
    """Normalize a theme name from various research file formats.

    Handles: 'DETECTIVE CHARACTER MYSTERIES', 'Detective Character Mysteries',
             'detective character mysteries', etc.
    """
    name = raw_name.strip()
    # Convert ALL CAPS to Title Case
    if name.isupper():
        name = name.title()
    # Clean up common artifacts
    name = name.strip('*#: ')
    return name


def parse_research_file(filepath):
    """Parse a research markdown file into theme data.

    Handles multiple header formats:
      - ## 1. Theme Name
      - ## THEME 1: THEME NAME
      - ## Theme 1: Theme Name

    Returns: {theme_name: {'stats': [...], 'quote': '...'}}
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    themes = {}

    # Pattern 1: ## N. Theme Name
    # Pattern 2: ## THEME N: THEME NAME
    # Pattern 3: ## Theme N: Theme Name
    theme_matches = list(re.finditer(
        r'^##\s+(?:THEME\s+)?(\d+)[.:]\s*(.+?)$', content, re.MULTILINE
    ))

    for i, match in enumerate(theme_matches):
        theme_name = normalize_theme_name(match.group(2))

        # Get section content until next theme header
        start = match.end()
        end = theme_matches[i + 1].start() if i + 1 < len(theme_matches) else len(content)
        section = content[start:end]

        # Parse stats (take first 4)
        stats = parse_stats_table(section)[:4]

        # Parse expert quote
        quote = parse_first_quote(section)

        themes[theme_name] = {
            'stats': stats,
            'quote': quote,
        }

    return themes


# ════════════════════════════════════════════════════════════════
# CSV Row Matching
# ════════════════════════════════════════════════════════════════

def normalize(text):
    """Lowercase, split hyphens/slashes/ampersands, keep alphanumeric+spaces."""
    text = text.lower()
    text = text.replace('-', ' ').replace('/', ' ').replace('&', ' ')
    return re.sub(r'[^a-z0-9\s]', '', text).strip()


def theme_keywords(theme_name):
    """Extract core matching keywords from a theme name."""
    name = theme_name.lower()
    # Remove common suffixes
    for suffix in [' character mysteries', ' mysteries', ' character']:
        if name.endswith(suffix):
            name = name[:-len(suffix)]
            break
    # Remove "Fix " prefix (problem-solving posts)
    if name.startswith('fix '):
        name = name[4:]
    # Split hyphens/special chars into words
    name = name.replace('-', ' ').replace('/', ' ').replace('&', ' ')
    name = re.sub(r'[^a-z0-9\s]', '', name).strip()
    # Filter out very short words (a, to, of, etc.) to reduce noise
    keywords = [w for w in name.split() if len(w) > 2]
    return keywords if keywords else name.split()


def find_csv_row(theme_name, rows, exclude_slugs):
    """Find the best-matching CSV row index for a theme name.

    Args:
        theme_name: The research theme name
        rows: Full CSV data (list of lists)
        exclude_slugs: Set of slugs to skip (already in Supabase or already matched)

    Returns: (row_index, score, slug) or (None, 0, '')
    """
    # Check explicit overrides first
    if theme_name in THEME_SLUG_OVERRIDES:
        target_slug = THEME_SLUG_OVERRIDES[theme_name]
        for idx in range(1, len(rows)):
            if len(rows[idx]) > 6 and rows[idx][6] == target_slug:
                return idx, 1.0, target_slug
        return None, 0, ''

    keywords = theme_keywords(theme_name)
    if not keywords:
        return None, 0, ''

    kw_phrase = '-'.join(keywords)

    best = {'idx': None, 'score': 0, 'pos': 999, 'slug': ''}

    for idx in range(1, len(rows)):
        row = rows[idx]
        if len(row) < 7:
            continue
        slug = row[6]
        slug_lower = slug.lower()

        # Skip excluded slugs
        if slug in exclude_slugs:
            continue

        # Normalize slug: replace hyphens with spaces for matching
        slug_norm = slug_lower.replace('-', ' ')
        # Also create a concatenated form (no separators) for compound words
        slug_concat = slug_lower.replace('-', '')

        # Score: check if all keywords appear in normalized slug
        if kw_phrase in slug_lower:
            score = 1.0
        else:
            hits = sum(1 for kw in keywords if kw in slug_norm)
            score = hits / len(keywords) if keywords else 0

        # Primary keyword bonus: if the longest keyword (>=5 chars) matches
        # in slug (normal or concatenated form), boost score above threshold
        if score < 0.5:
            longest_kw = max(keywords, key=len)
            if len(longest_kw) >= 5 and (
                longest_kw in slug_norm or longest_kw in slug_concat
            ):
                score = max(score, 0.55)

        if score < 0.5:
            continue

        # Position tiebreaker: prefer keywords appearing earlier in slug
        positions = [slug_norm.find(kw) for kw in keywords if kw in slug_norm]
        if not positions:
            positions = [slug_concat.find(kw) for kw in keywords if kw in slug_concat]
        avg_pos = sum(positions) / len(positions) if positions else 999

        if (score > best['score']) or (score == best['score'] and avg_pos < best['pos']):
            best = {'idx': idx, 'score': score, 'pos': avg_pos, 'slug': slug}

    if best['idx'] is not None:
        return best['idx'], best['score'], best['slug']
    return None, 0, ''


# ════════════════════════════════════════════════════════════════
# Supabase Operations
# ════════════════════════════════════════════════════════════════

def supabase_request(method, endpoint, data=None):
    """Make a request to the Supabase REST API."""
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


def get_existing_slugs():
    """Fetch all English blog post slugs already in Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/blog_posts?language=eq.en&select=slug"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            return {item['slug'] for item in result}
    except Exception as e:
        print(f'  WARNING: Could not fetch existing slugs: {e}')
        return set()


# ════════════════════════════════════════════════════════════════
# Content Building (E-E-A-T Sandwich Pattern)
# ════════════════════════════════════════════════════════════════

def generate_testimonial(theme_name):
    """Generate a themed user testimonial."""
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
        f'— Mystery Maker Party user'
    )


def estimate_reading_time(content):
    """Estimate reading time in minutes (~200 words/min)."""
    return max(5, round(len(content.split()) / 200))


def build_optimized_content(theme_name, research, raw_content, is_problem=False):
    """Build SEO/GEO optimized content using the E-E-A-T sandwich pattern.

    Structure:
        1. E-E-A-T header (dates, author, expertise)
        2. Stats table + expert quote
        3. Original CSV content (unchanged)
        4. Social proof (inserted before FAQ if present)
        5. Sources & References
    """
    stats = research.get('stats', [])
    quote = research.get('quote', '')
    testimonial = generate_testimonial(theme_name)

    # ── 1. E-E-A-T Header ──
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

    # ── 2. Stats Section ──
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

    # ── 3. Social Proof Section ──
    if is_problem:
        clean_problem = theme_name.replace('Fix ', '')
        social = (
            f"## What 10,000+ Mystery Parties Have Taught Us About "
            f"{clean_problem}\n\n"
            f"Over years of helping hosts troubleshoot mystery parties, "
            f"we've learned that successfully handling "
            f"{clean_problem.lower()} requires:\n\n"
            f"✓ **Early Prevention** — Anticipate problems before "
            f"they derail the event\n"
            f"✓ **Clear Communication** — Set expectations with guests upfront\n"
            f"✓ **Flexible Planning** — Build adaptable solutions into "
            f"your party design\n"
            f"✓ **Host Confidence** — Stay calm and redirect when issues arise\n"
            f"✓ **Post-Event Learning** — Apply lessons to improve future events\n\n"
            f"> {testimonial}\n\n"
        )
    else:
        social = (
            f"## What 10,000+ Mystery Parties Have Taught Us\n\n"
            f"Over years of crafting custom murder mysteries, we've learned "
            f"that the most successful {theme_name.lower()} parties share "
            f"these characteristics:\n\n"
            f"✓ **Perfect Thematic Integration** — {theme_name} setting "
            f"enhances the mystery\n"
            f"✓ **Character Authenticity** — Guests love characters "
            f"natural to the setting\n"
            f"✓ **Investigation Clarity** — Clues use the environment "
            f"creatively\n"
            f"✓ **Atmospheric Balance** — Immersive without overwhelming "
            f"complexity\n"
            f"✓ **Customized Engagement** — Matching depth to group "
            f"experience\n\n"
            f"> {testimonial}\n\n"
        )

    # ── 4. Sources Section ──
    if stats:
        sources_list = '\n'.join(
            f"{i+1}. **{s['stat']}** — {s['source']}"
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

    # ── 5. Assembly ──
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

    # Append sources
    optimized += '\n\n' + sources

    return optimized


# ════════════════════════════════════════════════════════════════
# Main
# ════════════════════════════════════════════════════════════════

def main():
    # Parse command-line arguments
    dry_run = '--dry-run' in sys.argv
    pack_filter = None
    if '--pack' in sys.argv:
        idx = sys.argv.index('--pack')
        if idx + 1 < len(sys.argv):
            pack_filter = int(sys.argv[idx + 1])

    print('=' * 60)
    print('  Master SEO/GEO Optimization — Packs 11-24')
    print('  Mode:', 'DRY RUN (no insertions)' if dry_run else 'LIVE')
    if pack_filter:
        print(f'  Filter: Pack {pack_filter} only')
    print('=' * 60)
    print()

    # Load CSV
    print('Loading CSV...')
    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        rows = list(csv.reader(f))
    print(f'  {len(rows) - 1} data rows loaded')

    # Fetch existing Supabase slugs to avoid duplicates
    print('Fetching existing Supabase slugs...')
    existing_slugs = get_existing_slugs()
    print(f'  {len(existing_slugs)} slugs already in Supabase')
    print()

    # Track matched slugs to prevent double-matching in this run
    matched_slugs = set(existing_slugs)

    total_success = 0
    total_skipped = 0
    total_errors = 0
    total_no_match = 0
    total_no_stats = 0

    packs_to_process = (
        [pack_filter] if pack_filter else sorted(RESEARCH_FILES.keys())
    )

    for pack_num in packs_to_process:
        if pack_num not in RESEARCH_FILES:
            print(f'Pack {pack_num}: not found in RESEARCH_FILES, skipping\n')
            continue

        research_path = os.path.join(BASE_DIR, RESEARCH_FILES[pack_num])
        is_problem = pack_num in PROBLEM_SOLVING_PACKS

        print('-' * 60)
        print(f'  PACK {pack_num} {"(Problem-Solving)" if is_problem else ""}')
        print(f'  File: {RESEARCH_FILES[pack_num]}')

        if not os.path.exists(research_path):
            print(f'  ERROR: Research file not found!\n')
            continue

        # Parse research data
        research_data = parse_research_file(research_path)
        print(f'  Themes parsed: {len(research_data)}')
        print('-' * 60)

        pack_success = 0
        pack_errors = 0

        for theme_name, research in research_data.items():
            print(f'\n  >> {theme_name}')

            # Match to CSV row
            row_idx, score, slug = find_csv_row(
                theme_name, rows, exclude_slugs=matched_slugs
            )

            if row_idx is None:
                print(f'     NO CSV MATCH (score < 50%)')
                total_no_match += 1
                continue

            row = rows[row_idx]
            title = row[1] if len(row) > 1 else ''
            raw_content = row[2] if len(row) > 2 else ''
            meta_desc = row[3] if len(row) > 3 else ''
            keywords = row[4] if len(row) > 4 else ''
            theme_col = row[5] if len(row) > 5 else ''
            slug = row[6] if len(row) > 6 else ''

            stats_count = len(research.get('stats', []))
            has_quote = bool(research.get('quote'))

            print(f'     Row {row_idx} | Match: {score:.0%} | '
                  f'Stats: {stats_count} | Quote: {"Y" if has_quote else "N"}')
            print(f'     Title: {title[:72]}{"..." if len(title) > 72 else ""}')
            print(f'     Slug:  {slug}')

            if stats_count == 0:
                total_no_stats += 1

            if dry_run:
                print(f'     [DRY RUN] Would insert')
                matched_slugs.add(slug)
                pack_success += 1
                continue

            # Build optimized content
            optimized = build_optimized_content(
                theme_name, research, raw_content, is_problem=is_problem
            )
            reading_time = estimate_reading_time(optimized)

            # Insert into Supabase
            post_data = {
                'title': title,
                'content': optimized,
                'slug': slug,
                'meta_description': meta_desc,
                'meta_keywords': keywords,
                'language': 'en',
                'theme': theme_col,
                'status': 'draft',
                'reading_time': reading_time,
                'author': 'AI Assistant',
                'tags': [theme_col] if theme_col else [],
            }

            status, response = supabase_request('POST', 'blog_posts', post_data)

            if status in (200, 201):
                print(f'     INSERTED ({len(optimized):,} chars, {reading_time} min)')
                matched_slugs.add(slug)
                pack_success += 1
                total_success += 1
            else:
                print(f'     ERROR HTTP {status}: {response[:150]}')
                pack_errors += 1
                total_errors += 1

            # Brief pause to avoid rate limiting
            time.sleep(0.2)

        print(f'\n  Pack {pack_num} done: {pack_success} ok, {pack_errors} errors\n')

    # Summary
    print()
    print('=' * 60)
    print('  FINAL SUMMARY')
    print('=' * 60)
    if dry_run:
        print(f'  Would insert:    {total_success + total_skipped}')
    else:
        print(f'  Inserted:        {total_success}')
        print(f'  Skipped:         {total_skipped}')
        print(f'  Errors:          {total_errors}')
    print(f'  No CSV match:    {total_no_match}')
    print(f'  No stats data:   {total_no_stats}')
    print('=' * 60)


if __name__ == '__main__':
    main()
