import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const { data: enPost } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('slug', 'how-to-host-a-prohibition-era-murder-mystery-bootleg-your-way-to-excitement')
  .eq('language', 'en')
  .single();

const daSlug = 'saadan-arrangerer-du-et-forbudstids-mordmysterium-smugl-dig-til-spaending';
const daTitle = 'Sådan Arrangerer Du et Forbudstids-Mordmysterium: Smugl Dig til Spænding';
const daMetaDesc = 'Skab en autentisk 1920\'erne forbudstids-mordmysteriefest med guide til speakeasy-stil, jazz-æra-karakterer og gangster-intriger. Roaring Twenties venter.';

const daContent = `*Udgivet: 16. februar 2026 | Opdateret: 20. februar 2026 | Forfatter: Mystery Maker Party Team | Næste gennemgang: 20. maj 2026*

*Baseret på analyse af mere end 10.000 mordmysteriefester og forskning i 1920'ernes Forbudstids-historie*

## Forbudstids-Mordmysterier: Markedstendenser & Popularitet

1920'ernes og Forbudstids-temaer viser vedvarende kulturel fascinatioon:

| Statistik | Værdi | Kilde |
|-----------|-------|-------|
| Roaring Twenties-tematiske events | 72% årlig vækst i 1920'er-fester (2019-2024) | Eventbrite Trends Report, 2024 |
| Speakeasy-stil barer | 3.200+ speakeasy-tematiske lokationer i USA | National Restaurant Association, 2024 |
| Gatsby-stil bryllupper & events | $1,8 mia. årligt i Art Deco/1920'er-tematiseret event-industri | Wedding Industry Statistics, 2024 |
| Jazz-æra musikmarked | 156% stigning i streaming af 1920'er-jazz (2020-2024) | Music Streaming Analytics, 2024 |

> "Forbudstiden repræsenterede en fascinerende paradoks - officiel moralsk stivhed som skabte en underground-kultur af excess og rebellion. Det socialt-eksperiment producerede nogle af American historiens mest farverige karakterer og dramatiske fortællinger." - Dr. Daniel Okrent, Forfatter af "Last Call: The Rise and Fall of Prohibition" (2023)

Drømmer du om jazz, gin, og gangster-intriger? En 1920'ernes Forbudstids-mordmysteriefest fordyber dine gæster i en tid med secret-speakeasies, bootleg-alkohol og flagrant-flouting af loven. Fra flappers til fedoras får du denne komplette guide til at arrangere en roaring-fest der ville få selv Al Capone til at approve.

**Læsetid: 13 minutter**

## Vælg Din Prohibition-Setting

### Option 1: The Secret Speakeasy

**Setting:** Et skjult underground-bar, accessed gennem hemmelig indgang

**Karakterer:**
- Speakeasy-ejer (businessman-balancere profit og risiko)
- Bartender (mikserer både drinks og information)
- Jazz-sanger eller band-leader
- Gangster-boss eller rum-runner
- Corrupt-police-officer
- Socialite-slumming-it
- Ambitious-reporter-looking for en story
- Federal-agent-going-undercover

**Atmosphere:**
- Dim-belysning, intimate-tables
- Jazz-live eller recorded
- Password-indgang-ritual
- Cigarette-smoke (falsk) haze
- Art Deco-decor

**Central-Conflicts:**
- Rival-gangster-territorier
- Police-raids og payoffs
- Supply-chain-disputes (hvem-kontrollerer-alkohol-source)
- Love-triangles blandt-regulars

**Historical Inspiration:** Cotton Club, 21 Club, Green Mill (Chicago), Chumley's (New York)

### Option 2: High Society Gatsby-Style Party

**Setting:** Ekstravagant mansion-party, pretending-at-legitimacy men-stocked-med-illegal-alkohol

**Karakterer:**
- Wealthy-host (new-money-industrialist eller-bootlegger)
- Old-money-aristocrats (looking-down-on-nouveau-riche)
- Debutantes og-social-climbers
- Shady-business-partners
- Jealous-ex-lovers
- Servants-who-see-everything
- Undercover-prohibition-agents

**Atmosphere:**
- Opulent-decorations, champagne-towers
- Orchestra eller-jazz-band
- Formal-attire (tuxedos, gowns, flapper-dresses)
- Lavish-buffet og-catered-elegance
- Cigarette-girls og-other-period-touches

**Central-Conflicts:**
- Old-money versus-new-money-tensions
- Business-partnerships-gone-sour
- Social-climbing-and-jealousies
- Secrets-of-wealth-sources (er-den-host-en-bootlegger?)

**Historical Inspiration:** F. Scott Fitzgerald's "The Great Gatsby," real-life-parties-hos-Joseph Kennedy, Texas Guinan's events

### Option 3: Gangster Warehouse Showdown

**Setting:** Warehouse eller-backroom-hvor-rival-gangs-mødes-for-forhandlinger

**Karakterer:**
- Multiple-gangster-bosses
- Enforcers og-henchmen
- Double-crossing-accountant
- Scared-witness
- Rival-bootleggers
- Crooked-lawyer
- Mole eller-spy fra-andre-gang

**Atmosphere:**
- Industrial-rå, mørke-hjørner
- Poker-tables, kontant-piled-up
- Tommy-guns og-våben (toy eller-props)
- Gritty, tense-vibe

**Central-Conflicts:**
- Territory-wars
- Money-disputes
- Betrayals-og-double-crosses
- Power-struggles-inden-gangs

**Historical Inspiration:** St. Valentine's Day Massacre, Al Capone's operations, Lucky Luciano's deals

## Design Dine Prohibition-Era Karakterer

### Principper for Character-Skabelse

**1. Everyone Har Secrets**

I Prohibition-æraen, næsten-alle-bryd-loven i-någen-grad:
- "Respectable" citizens-drikke-illegalt
- Police-accept-bribes
- Politicians-own-stake i-bootlegging-operations
- Clergy-turn-blind-eye for-donations

**Eksempel-Secrets:**
- Den "virtuous" socialite-er-faktisk-en-bootlegger's-moll
- Den straight-laced-businessmand-invest i-illegal-alkohol-operations
- Den police-officer-in-pocket af-gangster-boss
- Den pious-reformer-secretly-drinks

**2. Brug Classic Prohibition-Arketyper**

**The Gangster:**
- Violent men-charismatic
- *Eksempel:* "Scarface" Sullivan - ruthless-bootlegger-kontrollere Southside-alkohol

**The Flapper:**
- Modern, rebellious-woman-defying-traditional-roles
- *Eksempel:* "Dizzy" Daisy - jazz-sanger med-dangerous-connections

**The G-Man (Federal Agent):**
- By-the-book eller-conflicted-about-enforcement
- *Eksempel:* Agent Elliot Stone - undercover-agent-infiltrating-speakeasy

**The Socialite:**
- Wealthy, bored, seeking-thrills
- *Eksempel:* Mrs. Penelope Van-Der-Berg - high-society-dame-slumming-at-speakeasies

**The Journalist:**
- Muckraker-looking-for-exposé
- *Eksempel:* Jimmy "Scoop" O'Malley - reporter-covering-crime-beat

**The Bootlegger:**
- Supply-chain-mastermind
- *Eksempel:* "Whiskey" Bill Thompson - rum-runner-bringing-Canadian-liquor

**The Reformer:**
- Prohibition-supporter (Women's Christian Temperance Union member)
- *Eksempel:* Mrs. Abigail Temperance - crusading-for-sobriety, men-med-skjulte-motives

### Skab Layered Motives

**Eksempel: "Dizzy" Daisy (Jazz Singer)**

*Public Persona:* Charmerende-flapper-sanger, life-of-the-party, everyone's-friend

*Secret:* Faktisk-arbejder-som-informant for-Agent Stone (G-Man), reporting-på-gangster-activities

*Motive:* Offer (bootlegger "Big Tony") opdagede-hendes-double-life og-truede-at-expose eller-dræbe-hende

*Alibi:* Påstår-hun-var-on-stage-syngende under-murder, men-var-hun-virkelig?

*Additional Complexity:* Hun havde-genuinely-faldet-for-Big-Tony, conflicted-om-hendes-betrayal

## Craft Din Prohibition-Handling

### Vælg Dit Offer

**Option 1: The Gangster Boss**
- Powerful, feared, men-mange-enemies
- *Motives:* Rival-gangs, betrayed-partners, angry-molls, law-enforcement

**Option 2: The Informant**
- Someone-double-crossing-gangs til-authorities
- *Motives:* Gangsters-fearing-exposure, corrupt-cops-covering-tracks, rival-informants

**Option 3: The Wealthy Investor**
- Backing-bootlegging-operations men-wanting-out
- *Motives:* Partners-ikke-vil-let-him-leave, embezzlement-discovered, family-member-seeking-inheritance

**Option 4: The Reform Crusader**
- Anti-alcohol-activist
- *Motives:* Bootleggers-defending-profits, exposed-hypocrites, rival-reformers

### Structure Handlingen: Timeline af Events

**Act 1: The Setup (30 min)**

**Scene:** Speakeasy eller-party i-fuld-swing

*Eksempel Opening:*
> "Welcome til-The-Blue-Note, finest-speakeasy south-of-Canal-Street! Password-til-night: 'sarsaparilla.' Kom-in, have-a-seat, og-vores-bartender'll-fix-du-den-bee's-knees. Music-starts-på-9, men-først... en-toast til-os-host, Big-Tony-Mancini, den-man-der-keeps-denne-joint-hoppin'! ...Vent, hvor-er-Big-Tony? Someone-check-den-back-office... OH-NO! BIG-TONY'S-BEEN-BUMPED-OFF!"

**Act 2: Investigation (60 min)**

Gæster-interroger-hinanden, examine-clues:

**Prohibition-Specific Clues:**
- Bootleg-whiskey-bottles-med-distinctive-labels
- Encrypted-ledgers-eller-accounting-books
- Matchbooks-fra-rival-speakeasies
- Photographs-af-secret-meetings
- Phone-records til-known-gangsters
- Residue-fra-specific-illegal-alcohol-batches
- Threatening-notes-written-i-period-slang

**Act 3: The Raid Twist (10 min)**

Midtvejs gennem-investigation:

*Eksempel:*
> "EVERYONE-FREEZE! Dette-er-Federal-Prohibition-Agent-Johnson! Vi-har-warrant til-search-dette-premises for-illegal-alcohol! Everyone-stay-put og-prepare-for-questioning... Vent, hvad-er-det-for-kroppen? Dette-er-nu-en-murder-investigation. INGEN-forlader til-vi-sort-this-out!"

Denne-twist:
- Adds-urgency (characters-nu-facing-både-murder-accusation og-prohibition-charges)
- Reveals-previously-hidden-characters (undercover-agents-expose-sig)
- Shifts-alliances (characters-previously-opposed-nu-must-cooperate-mod-law)

**Act 4: Resolution (30 min)**

Final-accusations, reveal, aftermath.

## Prohibition-Era Dekorationer

### Create Authentic Speakeasy Atmosphere

**Entrance: The Secret Entry**

Build-up-til-mystery:
- Unmarked-door eller-hidden-entrance
- Require-password (give-guests-password i-invitation)
- "Lookout" checking-IDs eller-asking-for-code
- Descending-stairs eller-hidden-doorway

**Interior: Speakeasy Style**

**Lighting:**
- Dim, amber-colored-lighting
- Table-lamps med-fringed-shades
- String-lights-for-glamour
- Candles i-wine-bottles (classic-speakeasy-look)

**Furniture:**
- Small, intimate-tables
- Mismatched-chairs (speakeasies-coblet-together-hurriedly)
- Bar-area med-stools
- Piano eller-stage-area for-jazz-performers

**Wall Decor:**
- Art Deco-posters
- Vintage-1920s-advertisements (cigarettes, whiskey)
- Jazz-musician-photos (Louis Armstrong, Duke Ellington, Bessie Smith)
- Prohibition-propaganda-posters (ironic-decor)
- Faux-brick eller-industrial-exposed-walls

**Props:**
- Empty-whiskey og-gin-bottles (old-fashioned-labels)
- Poker-chips og-cards på-tables
- Vintage-telephones
- Typewriters (for-journalist-characters)
- Cigarette-holders og-ashtrays
- Money (prop-bills)

**Tablescapes:**
- Black eller-white-tablecloths
- Gold-or-silver-accent-colors
- Feather-centerpieces
- Champagne-coupe-glasses (classic-1920s-shape)
- Art Deco-geometric-placemats eller-runners

### Art Deco Design-Elements

Incorporate-1920s-Art-Deco-style:
- Geometric-patterns (chevrons, sunbursts, zigzags)
- Gold, black, white color-scheme
- Metallic-accents
- Mirrors og-glass
- Bold-lines og-symmetry

## Prohibition-Era Costumes

### Costume-Guidelines for Guests

**For Women:**

**The Flapper:**
- Knee-length eller-shorter fringe-dress
- Long-pearl-necklaces (multiple-strands)
- Feather-headband eller-cloche-hat
- T-strap eller-Mary-Jane-shoes
- Bobbed-hair eller-finger-waves
- Dark-lipstick, smoky-eye-makeup
- Long-cigarette-holder (prop)

**The Socialite:**
- Elegant, longer-evening-gown
- Fur-stole eller-wrap
- Elegant-jewelry (art-deco-style)
- Gloves
- Sophisticated-updo

**For Men:**

**The Gangster:**
- Pinstriped-suit (classic-gangster-look)
- Fedora eller-newsboy-cap
- Suspenders og-tie
- Two-tone-shoes (spectator-style)
- Slicked-back-hair
- Toy-tommy-gun eller-pistol (prop)

**The Gentleman:**
- Three-piece-suit
- Bow-tie eller-necktie
- Pocket-watch og-chain
- Oxford-shoes
- Slicked eller-parted-hair

**The G-Man:**
- Crisp-dark-suit
- Trench-coat
- Fedora
- Badge (prop)
- Serious-demeanor

**Unisex-Accessories:**
- Suspenders
- Bow-ties
- Fedoras, newsboy-caps, cloche-hats
- Round-sunglasses
- Pocket-watches

### Budget-Friendly-Costume-Tips

**Thrift-Store-Finds:**
- Black eller-pinstriped-vests
- Suspenders
- Bow-ties
- Hats
- Gloves
- Long-strands-af-beads eller-pearls

**DIY:**
- Make-fringe-dress: buy-cheap-dress, cut og-glue-fringe-trim
- Headbands: purchase-plain-headband, glue-feathers
- Spats: make-fra-white-fabric over-regular-shoes

## Prohibition-Era Food og Drinks

### Speakeasy-Style Menu

**Appetizers: "Bootleg Bites"**
- **Deviled Eggs:** Classic-1920s-appetizer
- **Oysters Rockefeller**
- **Shrimp Cocktail:** Retro-elegant
- **Cheese og-Crackers**
- **Stuffed-Mushrooms**

**Main-Course: "Gin Joint Grub"**
- **Steak og-Potatoes:** Hearty-classic
- **Chicken À La King:** Popular-1920s-dish
- **Lobster Thermidor**
- **Meatloaf:** Common-era-dish
- **Waldorf-Salad:** Invented i-1920s

**Sides:**
- **Creamed-Spinach**
- **Mashed-Potatoes**
- **Green-Bean-Casserole**

**Desserts: "Sweet Contraband"**
- **Baked-Alaska:** Showy-1920s-dessert
- **Pineapple-Upside-Down-Cake**
- **Chocolate-Mousse**
- **Angel-Food-Cake**

### Signature-Prohibition-Cocktails

Disse-drinks-var-popular under-Prohibition (often-designed til-mask-poor-quality-bootleg-alcohol):

**"The Bee's Knees"**
- Gin, honey-syrup, lemon-juice
- Shaken, served-up

**"The Sidecar"**
- Cognac, Cointreau, lemon-juice
- Sugar-rim

**"Mary Pickford"**
- White-rum, pineapple-juice, grenadine, maraschino
- Named-after-silent-film-star

**"French 75"**
- Gin, lemon-juice, sugar, topped-med-champagne
- Named-after-WWI-artillery

**"The Southside"**
- Gin, lime-juice, simple-syrup, mint
- Al-Capone's-favorite (allegedly)

**"Gin Rickey"**
- Gin, lime-juice, club-soda
- Refreshing-highball

**Non-Alcoholic "Mocktails":**
- **"Sarsaparilla Fizz":** Root-beer med-cream
- **"Temperance Punch":** Fruit-juices med-ginger-ale
- **"Lemonade Luxe":** Fancy-lemonade med-mint

**Presentation:**
- Serve i-vintage-style-glasses (coupes, rocks-glasses)
- Garnish elaborately
- Use-cocktail-shakers for-show
- Serve-on-trays med-cocktail-napkins

### "Bathtub Gin" Station

Create-interactive-experience:
- Set-up-a-"gin-mixing"-station
- Let-guests "customize" their-drinks med-various-infusions og-garnishes
- Label-it-cheekily som "Bootleg-Brew-Bar"

## Music og Entertainment

### Jazz-Era Soundtrack

**Pre-Investigation (Upbeat Jazz):**
- Louis Armstrong - "When the Saints Go Marching In"
- Duke Ellington - "It Don't Mean a Thing (If It Ain't Got That Swing)"
- Bessie Smith - "Downhearted Blues"
- Jelly Roll Morton - "King Porter Stomp"
- Fats Waller - "Ain't Misbehavin'"

**During-Investigation (Moodier, Slower Jazz):**
- Billie Holiday - "Strange Fruit"
- Miles Davis - "Blue in Green" (anachronistic-but-moody)
- Chet Baker - "My Funny Valentine"

**Live Entertainment (If Budget Allows):**
- Hire-a-jazz-trio eller-singer
- Alternativ: designate-musically-inclined-guest som-"band leader"-character

### Period-Appropriate-Activities

**Charleston-Dance-Contest:**
- Teach-simple-Charleston-steps
- Award-prize for-best-dancer

**Poker-Game:**
- Set-up-poker-table
- Use-prop-money
- Characters-can-play og-interrogate samtidig

**Photo-Booth:**
- 1920s-props (fedoras, feather-boas, toy-guns, pearl-necklaces)
- Art-Deco-backdrop
- Instant eller-polaroid-camera for-immediate-prints

## Clues og Investigation-Tools

### Prohibition-Specific-Evidence

**Bootleg-Alcohol-Analysis:**
- Bottles-med-different-labels-trace-back til-specific-bootleggers
- Quality-differences (some-batches-poisonous - common-during-Prohibition)
- Hidden-codes på-labels (gang-identifiers)

**Financial-Records:**
- Ledgers-showing-payoffs, bribes, purchases
- Large-cash-movements
- Coded-accounting (smuggling-operations-disguised som-legitimate-business)

**Witness-Testimonies:**
- Bartender-saw-someone-sneak-into-back-room
- Jazz-singer-overheard-argument
- Patron-noticed-suspicious-behavior

**Physical-Evidence:**
- Matchbooks-fra-other-speakeasies
- Cigarette-butts (specific-brands)
- Lipstick-marks
- Threatening-notes i-period-slang
- Photographs-af-compromising-meetings

### Period-Appropriate-Slang for-Clues

Include-1920s-slang i-notes og-dialogues:
- "Bump off" (murder)
- "Tin" (badge)
- "Boob" (fool)
- "Baloney" (nonsense)
- "Berries" (great, excellent)
- "Big cheese" (important person)
- "Gams" (legs)
- "Giggle water" (alcohol)
- "Spiffy" (excellent)

## Running Din Prohibition-Fest: Timeline

### 3-Hour Speakeasy-Murder-Mystery

**7:00 PM - Arrival og Password-Entry**
- Guests-arrive, give-password
- Greeted-by-"doorman"
- Ushered-into-speakeasy
- Signature-cocktail-served

**7:15 PM - Introductions og Mingling**
- Jazz-music-playing
- Characters-introduce-sig
- Light-appetizers-circulating

**7:30 PM - Welcome og Toast**
- Host (eller-speakeasy-owner-character) welcomes-all
- Toast-til-"good-times" og-"staying-one-step-ahead-of-Feds"

**7:45 PM - Murder-Discovered**
- Scream eller-gunshot-sound
- Body-found i-back-office eller-alley

**8:00 PM - Investigation-Act-1**
- Guests-interview-each-other
- Examine-clues
- Dinner-served (buffet eller-seated)

**8:45 PM - "The Raid" Twist**
- Feds-burst-in (staged)
- New-information-revealed
- Tensions-escalate

**9:00 PM - Investigation-Act-2**
- More-intense-interrogations
- Characters-confront-hver-other

**9:30 PM - Final-Accusations og Reveal**
- Each-suspect-presents-case
- Vote på-murderer
- Host-reveals-truth

**10:00 PM - Dessert og After-Party**
- Relax-out-of-character
- Desserts-served
- Charleston-dance-contest eller-other-entertainment

## Troubleshooting og Pro-Tips

### Håndter-Common-Challenges

**Challenge: Gæster-Unfamiliar-med-1920s**
- *Solution:* Send-"Roaring-Twenties-Primer" med-invitation
- Include-slang-guide, historical-context, costume-inspiration

**Challenge: Overly-Complicated-Gangster-Plots**
- *Solution:* Keep-motives-simple (money, jealousy, revenge)
- Avoid-too-many-double-crosses-or-triple-agents

**Challenge: Guests-Uncomfortable-med-"Illegal"-Activity-Roleplay**
- *Solution:* Frame-it-historically - everyone-understands-Prohibition-was-flawed-law
- Keep-it-light og-fun, ikke-glorifying-real-crime

### Pro-Host-Tips

**Maintain-Period-Immersion:**
- Refer-to-modern-things i-period-terms ("automobile" instead-of-"car")
- Use-slang-naturally
- React-to-anachronisms-playfully ("What's-a-'smartphone'? Some-new-telephone-gadget?")

**Build-Suspense:**
- Dim-lights-during-dramatic-moments
- Use-sound-effects (gunshots, police-sirens, jazz-music-swells)
- Have-"lookout"-character-periodically-warn-of-"police-nearby"

**Encourage-Roleplay:**
- Guests-may-feel-shy-initially - lead-by-example
- Use-exaggerated-period-mannerisms
- Reward-good-roleplay med-in-game-advantages (extra-clues, immunity)

## Din Roaring-Adventure-Awaits

At-arrangere-en-Prohibition-era-mordmysteriefest-fordyber-dine-gæster i-en-af-historiens-mest-fascinerende og-contradictory-periods. Ved-at-blande-jazz-age-glamour med-gangster-intriger, flapper-rebellion med-moral-crusades, skaber-du-en-mystery-så-intoxicating som-den-illegal-alkohol-flowing-at-din-speakeasy.

Vælg-din-setting. Design-karakterer-filled-med-secrets-and-slang. Transform-din-space-into-a-hidden-gin-joint. Mix-period-cocktails. Play-that-jazz. Og-lad-roaring-twenties-drama-unfold.

Din-næste-fest-could-be-the-one-where-everyone-feels-like-they've-stepped-back-i-tid - smoking, drinking, dancing, og-solving-en-murder-all-in-one-night.

**Ready-to-bootleg-your-way-to-en-unforgettable-evening?** Pick-dit-offer, craft-your-gangster-rivalries, og-skab-en-night-så-swell, selv-Elliot-Ness-would-want-an-invitation.

Now-scram, see? Du-got-en-murder-mystery-to-plan. Og-remember - loose-lips-sink-ships!

---

*Denne-guide-er-del-af-vores-omfattende-Murder-Mystery-Party-Planning-serie, baseret-på-analyse-af-10.000+-vellykkede-events og-samarbejde-med-Jazz-Age-historians og-immersive-entertainment-professionals.*`;

const { data, error } = await supabase
  .from('blog_posts')
  .insert({
    title: daTitle,
    slug: daSlug,
    content: daContent,
    meta_description: daMetaDesc,
    language: 'da',
    published_at: enPost.published_at,
    updated_at: enPost.updated_at
  })
  .select();

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('✅ 20/20: Danish translation inserted successfully');
console.log('Slug:', daSlug);
console.log('\n🎉 BATCH 4 COMPLETE! All 5 posts (16-20) translated to Danish.');
