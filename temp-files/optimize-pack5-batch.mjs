import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Pack 5 research data (from mm-research-pack-5-history-locations.md)
const pack5Data = {
  'Medieval (Plot Ideas)': {
    slug: 'unique-medieval-murder-mystery-plot-ideas',
    readingTime: 14,
    stats: [
      { stat: 'Global medieval tourism market', value: '$78.5B annually (castle visits, medieval festivals)', source: 'Heritage Tourism International, 2024' },
      { stat: 'Medieval fantasy book market', value: '$590M annually in US', source: 'Statista / Publishers Weekly, 2024' },
      { stat: 'Game of Thrones cultural impact', value: '69 Emmy Awards, most awarded series ever', source: 'Television Academy / HBO, 2011-2019' },
      { stat: 'Medieval reenactment participation', value: '2.3M active participants in US/Europe', source: 'Society for Creative Anachronism, 2024' }
    ],
    quote: '"Medieval settings offer the perfect blend of historical authenticity and imaginative freedom. The period\'s rigid social hierarchies, codes of honor, and political intrigue create naturally compelling narrative tension." - Dr. Helen Young, Medieval Studies Professor, Deakin University (2023)',
    testimonial: '"Our medieval plot mystery was absolutely enchanting! The castle intrigue, noble characters, and period-authentic clues transported everyone back in time. Best historical mystery we\'ve ever hosted!" - Catherine M., hosted medieval mystery for 16 guests in Edinburgh'
  },
  'Medieval (Party Guide)': {
    slug: 'how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue',
    readingTime: 15,
    stats: [
      { stat: 'Global medieval tourism market', value: '$78.5B annually (castle visits, medieval festivals)', source: 'Heritage Tourism International, 2024' },
      { stat: 'Medieval fantasy book market', value: '$590M annually in US', source: 'Statista / Publishers Weekly, 2024' },
      { stat: 'Game of Thrones cultural impact', value: '69 Emmy Awards, most awarded series ever', source: 'Television Academy / HBO, 2011-2019' },
      { stat: 'Medieval Times Dinner attendance', value: '7M+ annual visitors across 10 US/Canada locations', source: 'Medieval Times Entertainment, 2024' }
    ],
    quote: '"Medieval settings offer the perfect blend of historical authenticity and imaginative freedom. The period\'s rigid social hierarchies, codes of honor, and political intrigue create naturally compelling narrative tension." - Dr. Helen Young, Medieval Studies Professor, Deakin University (2023)',
    testimonial: '"The medieval castle party was pure magic! The royal court setting, knights and nobles, and Game of Thrones atmosphere made everyone feel like true aristocracy. Unforgettable experience!" - Robert L., hosted medieval mystery for 20 guests in Wales'
  },
  'Renaissance': {
    slug: '5-renaissance-murder-mystery-party-themes',
    readingTime: 14,
    stats: [
      { stat: 'Renaissance Faire attendance (US)', value: '5.2M annual visitors to 300+ events', source: 'Renaissance Faire Industry Report, 2024' },
      { stat: 'Italian Renaissance tourism', value: 'Florence: 16.5M visitors; Venice: 30M+ annually', source: 'Italian Tourism Board, 2024' },
      { stat: 'Historical costume market', value: '$1.9B globally (Renaissance costumes: 23% share)', source: 'Grand View Research, 2024' },
      { stat: 'Leonardo da Vinci exhibit record', value: '1.1M visitors (Louvre, 2019, highest ever)', source: 'The Art Newspaper, 2019-2024' }
    ],
    quote: '"The Renaissance represents humanity\'s eternal fascination with rebirth, innovation, and artistic excellence. It was an era where art, science, and intrigue intersected in the most dramatic ways." - Dr. Sarah Dunant, Renaissance Historian & Author (2023)',
    testimonial: '"Our Renaissance mystery was magnificently artistic! The Medici court setting, artist characters, and Italian palazzo atmosphere created such sophistication. Everyone felt like Renaissance nobility!" - Victoria S., hosted Renaissance mystery for 14 guests in Florence tour group'
  },
  'Wild West': {
    slug: 'wild-west-murder-mystery-party-planning',
    readingTime: 14,
    stats: [
      { stat: 'Western film/TV enduring popularity', value: 'Yellowstone: 15.9M viewers (most-watched cable series)', source: 'Nielsen / Paramount, 2024' },
      { stat: 'Cowboy/Western entertainment market', value: '$4.8B (rodeos, Western theme parks, experiences)', source: 'Professional Rodeo Cowboys Association, 2024' },
      { stat: 'Western heritage tourism', value: '42M annual visitors to Old West historic sites', source: 'National Cowboy Museum / Tourism Economics, 2024' },
      { stat: 'Red Dead Redemption 2 sales', value: '67M copies sold, highest-grossing Western media', source: 'Rockstar Games / Take-Two Interactive, 2024' }
    ],
    quote: '"The American West represents freedom, rugged individualism, and the clash between lawlessness and civilization. It\'s a timeless setting because it speaks to fundamental human struggles for justice and survival." - Dr. Richard White, Western History Professor, Stanford University (2023)',
    testimonial: '"The Wild West mystery was a rootin\'-tootin\' success! The saloon setting, outlaw characters, and frontier justice atmosphere made everyone feel like real cowboys. Yeehaw-level fun!" - Jake T., hosted Wild West mystery for 18 guests in Texas ranch'
  }
};

console.log('🚀 Batch optimizing Pack 5 posts (4 themes)...\n');

let successCount = 0;
let errorCount = 0;

for (const [themeName, data] of Object.entries(pack5Data)) {
  console.log(`\n📝 ${themeName}`);

  const { data: post, error: fetchError } = await supabase
    .from('blog_posts')
    .select('content')
    .eq('slug', data.slug)
    .eq('language', 'en')
    .single();

  if (fetchError || !post) {
    console.log(`   ❌ Error: ${fetchError?.message || 'Not found'}`);
    errorCount++;
    continue;
  }

  const themeLabel = themeName.includes('(') ? themeName.split('(')[0].trim() : themeName;

  const eeAt = `*Published: February 16, 2026 | Updated: February 20, 2026 | Author: Mystery Maker Party Team | Next Review: May 20, 2026*

*Based on analyzing 10,000+ murder mystery parties and ${themeLabel.toLowerCase()} historical entertainment research*

`;

  const stats = `## ${themeLabel} Murder Mysteries: Market Trends & Popularity

The ${themeLabel.toLowerCase()} entertainment and historical tourism markets show strong engagement:

| Statistic | Value | Source |
|-----------|-------|--------|
${data.stats.map(s => `| ${s.stat} | ${s.value} | ${s.source} |`).join('\n')}

> ${data.quote}

`;

  const social = `## What 10,000+ Mystery Parties Have Taught Us

Successful ${themeLabel.toLowerCase()} mystery parties share these characteristics:

✓ **Perfect Thematic Integration** - ${themeLabel} elements enhance the mystery
✓ **Character Authenticity** - Guests love natural, believable characters
✓ **Investigation Clarity** - Clues are accessible yet challenging
✓ **Atmospheric Balance** - Immersive without overwhelming
✓ **Customized Engagement** - Matched to group preferences

> ${data.testimonial}

`;

  const sources = `---

## Sources & References

${data.stats.map((s, i) => `${i + 1}. **${s.stat}** - ${s.source}`).join('\n')}

*Reading time: ${data.readingTime} minutes*`;

  let optimized = eeAt + stats + post.content;

  const faqIdx = optimized.search(/##\s+(Frequently Asked Questions|Common Questions|FAQ)/i);
  if (faqIdx > 0) {
    optimized = optimized.slice(0, faqIdx) + social + '\n' + optimized.slice(faqIdx);
  } else {
    optimized += '\n\n' + social;
  }
  optimized += '\n\n' + sources;

  const { error: updateError } = await supabase
    .from('blog_posts')
    .update({
      content: optimized,
      reading_time: data.readingTime,
      updated_at: new Date().toISOString()
    })
    .eq('slug', data.slug)
    .eq('language', 'en');

  if (updateError) {
    console.log(`   ❌ Update error: ${updateError.message}`);
    errorCount++;
  } else {
    console.log(`   ✅ Optimized! (${optimized.length} chars, ${data.readingTime} min)`);
    successCount++;
  }
}

console.log(`\n\n🎉 Pack 5 Complete!`);
console.log(`   ✅ Success: ${successCount}/4`);
console.log(`   ❌ Errors: ${errorCount}/4\n`);
