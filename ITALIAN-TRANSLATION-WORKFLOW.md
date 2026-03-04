# Italian Translation Workflow for Posts 20-29

## Status: Ready for Translation

### Posts Prepared for Translation

All 10 posts (20-29) have been extracted and saved as `italian-post-20.json` through `italian-post-29.json`.

### Posts to Translate:

1. **Post 20**: How to Host a Prohibition Era Murder Mystery
2. **Post 21**: How to Host a Steampunk Murder Mystery Party
3. **Post 22**: Jazz Club Murder Mystery Party Planning
4. **Post 23**: Journalist Murder Mystery Themes
5. **Post 24**: Lawyer Murder Mystery Themes
6. **Post 25**: Medical Examiner Murder Mystery Themes
7. **Post 26**: Murder Mystery Party for Birthday Celebrations
8. **Post 27**: Murder Mystery Party for Corporate Events
9. **Post 28**: Murder Mystery Party for Date Night Ideas
10. **Post 29**: Murder Mystery Party for Game Night Groups

## Translation Requirements

### Italian Translation Guidelines:

- **E-E-A-T Compliance**: Maintain all expertise markers, author credentials, and trust signals
- **Formal Register**: Use formal "Lei" form throughout
- **Proper Accents**: Include all Italian accents (è, é, à, ì, ò, ù)
- **Date Format**: Change "*Published: February 16, 2026*" to "*Pubblicato: 16 febbraio 2026*"
- **SEO Preservation**: Keep all markdown formatting, links, and structure intact
- **Cultural Adaptation**: Adapt idioms and cultural references appropriately for Italian readers
- **Technical Terms**: Use appropriate Italian translations for murder mystery terminology

### Slug Generation:

Italian slug should be:
- Translated title in Italian
- Lowercase
- Accents removed
- Spaces replaced with hyphens
- Special characters removed

## Workflow Options

### Option 1: Use Make.com Webhook (Recommended)

Run: `node translate-italian-via-make.mjs`

This will send each post to the Make.com webhook for automated translation.

### Option 2: Manual Translation with Claude

For each post file (`italian-post-20.json` through `italian-post-29.json`):

1. Open the file
2. Copy the content to Claude
3. Ask Claude to translate to Italian following the guidelines above
4. Save the response in format matching `translation_it.txt` (JSON structure)
5. Name the output file: `italian-translation-20.json`, etc.

### Option 3: Batch Script Insert

Once translations are complete:

Run: `node insert-italian-translations-20-29.mjs`

This will find all `italian-translation-*.json` files and insert them into the database.

## Progress Tracking

- [ ] Post 20 - Prohibition Era (translated)
- [ ] Post 21 - Steampunk (translated)
- [ ] Post 22 - Jazz Club (translated)
- [ ] Post 23 - Journalist (translated)
- [ ] Post 24 - Lawyer (translated)
- [ ] Post 25 - Medical Examiner (translated)
- [ ] Post 26 - Birthday (translated)
- [ ] Post 27 - Corporate Events (translated)
- [ ] Post 28 - Date Night (translated)
- [ ] Post 29 - Game Night (translated)

## Files Created

### Extraction Files:
- `italian-post-20.json` through `italian-post-29.json` (10 files)

### Translation Scripts:
- `italian-translation-batch-20-29-output.mjs` - Extraction script
- `translate-italian-via-make.mjs` - Make.com webhook integration
- `insert-italian-translations-20-29.mjs` - Database insertion script

### Expected Output Files:
- `italian-translation-20.json` through `italian-translation-29.json` (10 files)

## Next Steps

1. Choose your translation method (Make.com, Claude, or manual)
2. Translate all 10 posts following Italian guidelines
3. Save translations in the correct JSON format
4. Run the insert script to add to database
5. Verify all 10 posts in Supabase

## Database Connection

```javascript
const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);
```

Target table: `blog_posts` with `language='it'`
