#!/usr/bin/env python3
"""
Generate RESEARCH-PACK-{11..24}-PROMPT.md files for 270 remaining blog posts.
Groups posts by research domain adjacency for efficient external research.
"""

import os

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

# ============================================================
# PACK DEFINITIONS
# Each pack: title, description, expert_types, themes[]
# Each theme: name, description, search_terms[]
# ============================================================

PACKS = {
    11: {
        "title": "Ancient & Classical Civilizations",
        "description": "20 ancient civilization, medieval, and historical-era themes",
        "expert_types": "historians, archaeologists, classicists, museum curators, medieval studies scholars",
        "cross_refs": [],
        "themes": [
            {
                "name": "Ancient Greece Mysteries",
                "desc": "Classical Greek settings with philosophers, senators, Olympic athletes, and Athenian intrigue",
                "terms": ["ancient Greece tourism market size", "Greek mythology entertainment industry", "classical history education trends"]
            },
            {
                "name": "Ancient Rome Mysteries",
                "desc": "Roman Empire settings with gladiators, senators, emperors, and imperial conspiracies",
                "terms": ["Roman Empire tourism statistics", "gladiator entertainment popularity", "ancient Rome media franchise revenue"]
            },
            {
                "name": "Ancient Egyptian Temple Mysteries",
                "desc": "Sacred temple settings with priests, pharaohs, tomb robbers, and divine rituals",
                "terms": ["Egyptian tourism market statistics", "ancient Egypt entertainment industry", "Egyptology public interest trends"]
            },
            {
                "name": "Egyptian Pyramid Mysteries",
                "desc": "Pyramid archaeological settings with pharaoh secrets, cursed tombs, and archaeological expeditions",
                "terms": ["pyramid tourism revenue statistics", "archaeological discovery media coverage", "Egypt archaeological expedition trends"]
            },
            {
                "name": "Ancient Aztec Mysteries",
                "desc": "Mesoamerican settings with warriors, priests, astronomical observations, and temple rituals",
                "terms": ["Mesoamerican archaeology tourism", "Aztec civilization public interest", "pre-Columbian history education market"]
            },
            {
                "name": "Ancient Mayan Mysteries",
                "desc": "Mayan civilization settings with calendar predictions, jungle temples, and astronomical wisdom",
                "terms": ["Mayan ruins tourism statistics", "Mayan civilization documentary popularity", "Central American archaeological tourism"]
            },
            {
                "name": "Ancient Celtic Mysteries",
                "desc": "Celtic settings with druids, warriors, mystical rituals, and ancient tribal politics",
                "terms": ["Celtic heritage tourism market", "Celtic mythology entertainment popularity", "druid and pagan interest trends"]
            },
            {
                "name": "Viking Longship Mysteries",
                "desc": "Norse seafaring settings with Viking warriors, raids, Nordic mythology, and shipboard intrigue",
                "terms": ["Viking entertainment franchise revenue", "Norse mythology media popularity", "Viking tourism Scandinavia statistics"]
            },
            {
                "name": "Colonial America Mysteries",
                "desc": "Colonial-era settings with pilgrims, patriots, Revolutionary War intrigue, and founding father drama",
                "terms": ["colonial history tourism market", "American Revolution entertainment", "historical reenactment industry statistics"]
            },
            {
                "name": "Medieval Monastery Mysteries",
                "desc": "Monastery settings with monks, scribes, sacred texts, forbidden knowledge, and monastic intrigue",
                "terms": ["medieval monastery tourism statistics", "Name of the Rose cultural impact", "religious history tourism market"]
            },
            {
                "name": "Medieval Tournament Mysteries",
                "desc": "Jousting tournament settings with knights, chivalry competitions, and castle intrigue",
                "terms": ["Renaissance faire industry statistics", "medieval tournament reenactment market", "jousting entertainment events revenue"]
            },
            {
                "name": "Renaissance Fair Mysteries",
                "desc": "Renaissance marketplace settings with artisans, merchants, royalty, and guild rivalries",
                "terms": ["Renaissance faire attendance statistics", "Renaissance faire industry revenue", "historical themed event market size"]
            },
            {
                "name": "Victorian London Mysteries",
                "desc": "Gaslit London settings with Sherlock Holmes vibes, Jack the Ripper era, and fog-shrouded streets",
                "terms": ["Victorian era entertainment market", "Sherlock Holmes franchise revenue", "Jack the Ripper tourism London statistics"]
            },
            {
                "name": "Mummy Tomb Mysteries",
                "desc": "Ancient tomb settings with cursed artifacts, mummy awakenings, and archaeological danger",
                "terms": ["mummy movie franchise box office", "Egyptian tomb discovery media coverage", "archaeology adventure entertainment market"]
            },
            {
                "name": "Atlantis Mysteries",
                "desc": "Lost city settings with ancient technology, underwater ruins, and civilization discovery",
                "terms": ["lost civilization media popularity", "Atlantis cultural references entertainment", "underwater archaeology public interest"]
            },
            {
                "name": "Desert Oasis Mysteries",
                "desc": "Desert caravan settings with oasis encounters, merchant rivalries, and survival intrigue",
                "terms": ["desert adventure tourism market", "Sahara tourism statistics", "desert expedition entertainment trends"]
            },
            {
                "name": "Gothic Romance Mysteries",
                "desc": "Dark romantic settings with brooding estates, passionate secrets, and love intertwined with danger",
                "terms": ["gothic romance book market size", "dark romance fiction sales statistics", "gothic literature popularity trends"]
            },
            {
                "name": "Gothic Cathedral Mysteries",
                "desc": "Grand cathedral settings with sacred spaces, religious art, sinister clergy, and architectural secrets",
                "terms": ["gothic cathedral tourism statistics", "cathedral architecture tourism revenue", "religious heritage site visitors"]
            },
            {
                "name": "Crystal Cave Mysteries",
                "desc": "Underground crystal cavern settings with geological wonders, cave exploration, and mineral disputes",
                "terms": ["cave tourism industry statistics", "crystal and gem market size", "adventure caving participation rates"]
            },
            {
                "name": "Crystal Palace Mysteries",
                "desc": "Gemstone-adorned palace settings with royal intrigue, jewel heists, and architectural grandeur",
                "terms": ["gemstone market size global", "luxury jewelry industry statistics", "palace tourism revenue worldwide"]
            },
        ]
    },
    12: {
        "title": "Jazz Age, Noir, Prohibition & Wild West",
        "description": "20 period-themed posts spanning the Roaring Twenties, film noir, Prohibition era, Wild West, and steampunk genres",
        "expert_types": "film historians, cultural studies scholars, western history experts, entertainment industry analysts",
        "cross_refs": [
            {"theme": "Steampunk themes", "source": "Existing published steampunk posts", "exists": "Core steampunk market data, Victorian sci-fi crossover", "needed": "Airship-specific, adventure variant, and laboratory variant data"},
            {"theme": "Prohibition/Speakeasy themes", "source": "Pack 2 + existing published posts", "exists": "Basic speakeasy market data, Prohibition-era entertainment", "needed": "Casino gambling crossover, bootlegger-specific, gambling den variant data"},
        ],
        "themes": [
            {
                "name": "Roaring Twenties Mysteries",
                "desc": "1920s party settings with flappers, jazz, bootleggers, and Art Deco glamour",
                "terms": ["1920s themed party market", "Great Gatsby event popularity", "Roaring Twenties entertainment trends"]
            },
            {
                "name": "Jazz Age Mysteries",
                "desc": "Jazz-era settings capturing the music, speakeasies, and cultural revolution of the 1920s",
                "terms": ["jazz music industry revenue", "jazz festival attendance statistics", "1920s jazz era cultural tourism"]
            },
            {
                "name": "Old Hollywood Mysteries",
                "desc": "Golden age Hollywood settings with film stars, studio moguls, premiere nights, and glamorous scandals",
                "terms": ["classic Hollywood tourism statistics", "old Hollywood nostalgia market", "golden age cinema cultural impact"]
            },
            {
                "name": "Noir Detective Mysteries",
                "desc": "Hard-boiled detective settings with shadowy streets, femme fatales, and urban crime",
                "terms": ["film noir cultural popularity", "detective fiction market size", "noir genre entertainment revenue"]
            },
            {
                "name": "Art Deco Mysteries",
                "desc": "Art Deco-styled settings with geometric elegance, 1920s-30s architecture, and period sophistication",
                "terms": ["Art Deco architecture tourism", "Art Deco design market trends", "1920s design aesthetic popularity"]
            },
            {
                "name": "Art Nouveau Mysteries",
                "desc": "Art Nouveau-styled settings with organic curves, Belle Époque elegance, and turn-of-century intrigue",
                "terms": ["Art Nouveau architecture tourism", "Belle Époque cultural interest", "Art Nouveau design market trends"]
            },
            {
                "name": "Prohibition Speakeasy Mysteries",
                "desc": "Hidden speakeasy settings with secret passwords, bathtub gin, and underground nightlife",
                "terms": ["speakeasy bar trend statistics", "Prohibition era entertainment market", "hidden bar concept restaurant revenue"]
            },
            {
                "name": "Prohibition Casino Mysteries",
                "desc": "Underground gambling settings combining Prohibition-era secrecy with high-stakes casino action",
                "terms": ["illegal gambling history cultural interest", "casino entertainment market size", "Prohibition-era gambling media"]
            },
            {
                "name": "Prohibition Bootlegger Mysteries",
                "desc": "Bootlegging operation settings with rum runners, moonshine, and underworld supply chains",
                "terms": ["bootlegging history cultural interest", "craft spirits moonshine market", "Prohibition smuggling documentary popularity"]
            },
            {
                "name": "Speakeasy Gambling Den Mysteries",
                "desc": "Underground gambling den settings combining speakeasy atmosphere with card shark intrigue",
                "terms": ["underground gambling culture", "poker night event trends", "casino themed party market"]
            },
            {
                "name": "Wild West Saloon Mysteries",
                "desc": "Frontier saloon settings with cowboys, outlaws, poker games, and frontier justice",
                "terms": ["Wild West entertainment market", "western tourism statistics", "cowboy culture event popularity"]
            },
            {
                "name": "Wild West Train Mysteries",
                "desc": "Railroad adventure settings with train robberies, frontier passengers, and cross-country intrigue",
                "terms": ["heritage railroad tourism market", "train robbery cultural interest", "western railroad entertainment"]
            },
            {
                "name": "Wild West Ghost Town Mysteries",
                "desc": "Abandoned frontier town settings with haunted mines, forgotten secrets, and frontier ghosts",
                "terms": ["ghost town tourism statistics", "abandoned place tourism market", "Wild West ghost town visitor numbers"]
            },
            {
                "name": "Masquerade Mysteries",
                "desc": "Masked ball settings with hidden identities, Venetian intrigue, and elegant deception",
                "terms": ["masquerade ball event market", "Venetian mask tourism statistics", "masked event popularity trends"]
            },
            {
                "name": "Pirate Cave Mysteries",
                "desc": "Hidden cave settings with buried treasure maps, pirate hideouts, and underground secrets",
                "terms": ["pirate entertainment franchise revenue", "treasure hunting experience market", "pirate themed tourism statistics"]
            },
            {
                "name": "Steampunk Airship Mysteries",
                "desc": "Victorian-era airship settings with sky pirates, mechanical marvels, and high-altitude adventure",
                "terms": ["steampunk convention attendance", "steampunk market size", "alternative history entertainment trends"]
            },
            {
                "name": "Steampunk Adventure Mysteries",
                "desc": "Steampunk exploration settings with clockwork gadgets, Victorian inventors, and mechanical wonders",
                "terms": ["steampunk genre media revenue", "steampunk fashion market", "Victorian sci-fi entertainment popularity"]
            },
            {
                "name": "Steampunk Laboratory Mysteries",
                "desc": "Victorian science lab settings with mechanical experiments, steam-powered inventions, and mad engineers",
                "terms": ["steampunk maker movement statistics", "Victorian science cultural interest", "mad scientist entertainment trope popularity"]
            },
            {
                "name": "Carnival Mysteries",
                "desc": "Big top carnival settings with ringmasters, acrobats, sideshow performers, and circus intrigue",
                "terms": ["circus entertainment industry revenue", "carnival event market size", "big top experience attendance statistics"]
            },
            {
                "name": "Secret Agent Mysteries",
                "desc": "Spy thriller settings with undercover agents, espionage gadgets, and international intrigue",
                "terms": ["spy entertainment franchise revenue", "James Bond franchise statistics", "espionage fiction market size"]
            },
        ]
    },
    13: {
        "title": "Fantasy, Supernatural & Haunted Themes",
        "description": "20 fantasy, magic, supernatural, and horror-themed posts",
        "expert_types": "fantasy authors, horror entertainment analysts, folklore scholars, paranormal tourism experts, game designers",
        "cross_refs": [
            {"theme": "Zombie Apocalypse Survival", "source": "`mm-research-zombies-superheros.md`", "exists": "Zombie entertainment market, Walking Dead stats, zombie run events", "needed": "Survival game crossover, post-apocalyptic tabletop gaming data"},
            {"theme": "Superhero Convention", "source": "`mm-research-zombies-superheros.md`", "exists": "Superhero franchise revenue, comic convention data", "needed": "Convention-specific murder mystery data, fan event entertainment trends"},
        ],
        "themes": [
            {
                "name": "Dragon Lair Mysteries",
                "desc": "Epic fantasy settings with knights, wizards, mythical creatures, and dragon hoards",
                "terms": ["fantasy genre entertainment revenue", "dragon media franchise statistics", "tabletop RPG market size D&D"]
            },
            {
                "name": "Wizard Academy Mysteries",
                "desc": "Magical school settings with spellcasting students, enchanted classrooms, and dark arts",
                "terms": ["Harry Potter franchise revenue total", "wizard school entertainment market", "magical academy fiction popularity"]
            },
            {
                "name": "Enchanted Forest Mysteries",
                "desc": "Magical woodland settings with fairies, talking animals, enchanted paths, and forest spirits",
                "terms": ["fairy tale entertainment market", "enchanted forest attraction attendance", "fairy tale tourism industry"]
            },
            {
                "name": "Enchanted Castle Mysteries",
                "desc": "Spellbound castle settings with magical transformations, cursed rooms, and enchanted inhabitants",
                "terms": ["castle tourism worldwide statistics", "Disney castle attraction revenue", "fairy tale castle event venue market"]
            },
            {
                "name": "Fantasy Castle Mysteries",
                "desc": "High fantasy castle settings with kingdoms, royal courts, and epic quests for power",
                "terms": ["fantasy genre book market size", "castle themed venue event revenue", "medieval fantasy entertainment popularity"]
            },
            {
                "name": "Elemental Magic Mysteries",
                "desc": "Elemental power settings with fire, water, earth, and air magic wielders in conflict",
                "terms": ["elemental magic in gaming statistics", "magic system fiction popularity", "Avatar franchise revenue"]
            },
            {
                "name": "Mythical Creature Mysteries",
                "desc": "Legendary creature settings with griffins, unicorns, phoenixes, and mythological beings",
                "terms": ["mythology entertainment market", "mythical creature media franchise revenue", "cryptozoology tourism statistics"]
            },
            {
                "name": "Shapeshifter Mysteries",
                "desc": "Supernatural transformation settings with werewolves, changelings, and identity-shifting suspects",
                "terms": ["werewolf entertainment franchise revenue", "shapeshifter fiction market", "supernatural romance book sales"]
            },
            {
                "name": "Mermaid Kingdom Mysteries",
                "desc": "Underwater kingdom settings with mer-people, ocean politics, and aquatic court intrigue",
                "terms": ["mermaid entertainment market statistics", "Little Mermaid franchise revenue", "mermaid tourism attraction visitors"]
            },
            {
                "name": "Haunted Library Mysteries",
                "desc": "Ghostly library settings with spectral librarians, supernatural stacks, and cursed books",
                "terms": ["haunted attraction industry revenue", "library themed entertainment", "ghost story entertainment market"]
            },
            {
                "name": "Haunted Mansion Mysteries",
                "desc": "Classic haunted house settings with ghosts, secret passages, and supernatural phenomena",
                "terms": ["haunted house attraction industry revenue", "haunted mansion tourism statistics", "ghost hunting entertainment market"]
            },
            {
                "name": "Haunted Hotel Mysteries",
                "desc": "Spooky hotel settings with ghostly guests, cursed rooms, and paranormal check-ins",
                "terms": ["haunted hotel tourism market", "paranormal tourism industry statistics", "horror hotel entertainment popularity"]
            },
            {
                "name": "Haunted Graveyard Mysteries",
                "desc": "Cemetery settings with restless spirits, tombstone clues, and graveyard encounters",
                "terms": ["cemetery tourism statistics", "dark tourism market size", "graveyard tour attendance worldwide"]
            },
            {
                "name": "Ghost Ship Mysteries",
                "desc": "Phantom vessel settings with spectral crews, cursed voyages, and maritime hauntings",
                "terms": ["ghost ship legends cultural interest", "maritime mystery entertainment", "nautical horror fiction market"]
            },
            {
                "name": "Vampire Ball Mysteries",
                "desc": "Gothic vampire settings with immortal intrigue, blood pacts, and ballroom darkness",
                "terms": ["vampire entertainment franchise revenue", "gothic event attendance statistics", "vampire fiction book sales"]
            },
            {
                "name": "Possession Mysteries",
                "desc": "Supernatural possession settings with demonic influence, exorcism drama, and paranormal investigators",
                "terms": ["exorcism entertainment media revenue", "paranormal horror movie box office", "possession fiction market trends"]
            },
            {
                "name": "Zombie Apocalypse Survival Mysteries",
                "desc": "Post-apocalyptic zombie settings combining survival gameplay with murder investigation",
                "terms": ["zombie entertainment market 2025", "survival game market size", "post-apocalyptic fiction sales statistics"]
            },
            {
                "name": "Superhero Convention Mysteries",
                "desc": "Comic convention settings with heroes, villains, cosplayers, and comic crime investigations",
                "terms": ["comic convention attendance statistics", "cosplay industry market size", "superhero entertainment revenue 2025"]
            },
            {
                "name": "Abandoned Theme Park Mysteries",
                "desc": "Decaying amusement park settings with nostalgic rides, rusted attractions, and forgotten secrets",
                "terms": ["abandoned places tourism statistics", "dark tourism amusement park", "theme park industry revenue"]
            },
            {
                "name": "Lighthouse Island Mysteries",
                "desc": "Isolated lighthouse settings with stormy seas, stranded suspects, and maritime mystery",
                "terms": ["lighthouse tourism statistics", "isolated setting mystery popularity", "maritime heritage tourism market"]
            },
        ]
    },
    14: {
        "title": "Space, Robots & Sci-Fi Technology",
        "description": "20 science fiction themes covering space exploration, robotics, cyberpunk, and futuristic technology",
        "expert_types": "sci-fi authors, space industry analysts, robotics researchers, futurists, technology journalists",
        "cross_refs": [],
        "themes": [
            {
                "name": "Cyberpunk Mysteries",
                "desc": "Neon-lit dystopian settings with hackers, corporations, augmented humans, and digital underworlds",
                "terms": ["cyberpunk genre market size", "Cyberpunk 2077 sales statistics", "cyberpunk aesthetic cultural popularity"]
            },
            {
                "name": "Cyborg Mysteries",
                "desc": "Human-machine hybrid settings with cybernetic enhancements, identity crises, and tech conspiracies",
                "terms": ["cyborg fiction market", "human augmentation technology market", "transhumanism cultural interest statistics"]
            },
            {
                "name": "Cyberspace Mysteries",
                "desc": "Digital world settings with virtual environments, data heists, and online identity deception",
                "terms": ["cybersecurity market size", "virtual world user statistics", "digital crime entertainment popularity"]
            },
            {
                "name": "Digital Detective Mysteries",
                "desc": "Cyber investigation settings with computer forensics, data trails, and digital evidence",
                "terms": ["digital forensics market size", "cybercrime statistics global", "computer forensics industry growth"]
            },
            {
                "name": "Robot Revolution Mysteries",
                "desc": "AI uprising settings with sentient robots, android suspects, and machine rebellion",
                "terms": ["robotics industry market size", "AI in entertainment revenue", "robot fiction cultural impact statistics"]
            },
            {
                "name": "Holodeck Mysteries",
                "desc": "Virtual reality simulation settings with immersive environments, program glitches, and simulated crime",
                "terms": ["virtual reality entertainment market", "VR gaming industry revenue", "holographic technology market size"]
            },
            {
                "name": "Space Station Mysteries",
                "desc": "Orbital station settings with astronaut crews, zero-gravity investigations, and cosmic isolation",
                "terms": ["space industry market size", "space tourism market projections", "space entertainment franchise revenue"]
            },
            {
                "name": "Space Elevator Mysteries",
                "desc": "Orbital transport settings with vertical ascent, engineering marvels, and high-altitude intrigue",
                "terms": ["space elevator concept engineering", "orbital transport research statistics", "space infrastructure market projections"]
            },
            {
                "name": "Submarine Mysteries",
                "desc": "Deep-sea submarine settings with underwater pressure, naval intrigue, and claustrophobic tension",
                "terms": ["submarine tourism market", "submarine entertainment media popularity", "naval adventure fiction market"]
            },
            {
                "name": "Moon Base Mysteries",
                "desc": "Lunar colony settings with astronaut suspects, moon base operations, and extraterrestrial evidence",
                "terms": ["lunar exploration market projections", "moon base concept popularity", "space colonization entertainment"]
            },
            {
                "name": "Alien Zoo Mysteries",
                "desc": "Extraterrestrial zoological settings with alien creatures, interstellar exhibits, and cosmic caretakers",
                "terms": ["alien entertainment franchise revenue", "sci-fi zoo concept in media", "extraterrestrial fiction market size"]
            },
            {
                "name": "Alien Planet Mysteries",
                "desc": "Extraterrestrial world settings with alien civilizations, planetary exploration, and first contact",
                "terms": ["exoplanet discovery public interest", "alien fiction entertainment market", "space exploration documentary popularity"]
            },
            {
                "name": "Space Pirates Mysteries",
                "desc": "Cosmic buccaneer settings with starship raids, galactic treasure, and interstellar outlaws",
                "terms": ["space opera genre market size", "pirate sci-fi entertainment revenue", "space adventure fiction sales"]
            },
            {
                "name": "Floating City Mysteries",
                "desc": "Aquatic civilization settings with floating metropolis, maritime governance, and ocean-bound intrigue",
                "terms": ["floating city concept engineering interest", "seasteading market projections", "aquatic architecture futurism"]
            },
            {
                "name": "Floating Island Mysteries",
                "desc": "Sky island settings with gravity-defying platforms, aerial communities, and cloud-bound secrets",
                "terms": ["floating island fiction popularity", "sky castle entertainment trope", "flying city concept cultural interest"]
            },
            {
                "name": "Floating Casino Mysteries",
                "desc": "Airborne or waterborne casino settings with high-stakes gambling in exotic locations",
                "terms": ["casino boat industry revenue", "floating casino market statistics", "cruise ship casino revenue"]
            },
            {
                "name": "Time Machine Mysteries",
                "desc": "Temporal travel settings with era-hopping investigators, paradox problems, and historical crime scenes",
                "terms": ["time travel entertainment franchise revenue", "time travel fiction market size", "temporal paradox cultural interest"]
            },
            {
                "name": "Skyscraper Mysteries",
                "desc": "High-rise settings with penthouse intrigue, elevator confrontations, and vertigo-inducing investigations",
                "terms": ["skyscraper tourism market", "observation deck visitor statistics", "tall building cultural fascination"]
            },
            {
                "name": "Dinosaur Museum Mysteries",
                "desc": "Natural history museum settings with fossil theft, paleontology drama, and prehistoric exhibits",
                "terms": ["natural history museum attendance statistics", "Jurassic Park franchise revenue", "paleontology public interest trends"]
            },
            {
                "name": "Quantum Physics Mysteries",
                "desc": "Particle physics settings with quantum experiments, Schrödinger scenarios, and scientific uncertainty",
                "terms": ["quantum computing market size", "physics entertainment media popularity", "science fiction quantum themes"]
            },
        ]
    },
    15: {
        "title": "Research Stations, Biotech & Psychic Powers",
        "description": "20 themes covering remote research facilities, biotechnology labs, and psychic/mental power abilities",
        "expert_types": "scientists, bioethicists, parapsychology researchers, neuroscience experts, technology futurists",
        "cross_refs": [],
        "themes": [
            {
                "name": "Bioengineering Lab Mysteries",
                "desc": "Genetic engineering lab settings with CRISPR experiments, ethical dilemmas, and scientific breakthroughs gone wrong",
                "terms": ["bioengineering market size", "CRISPR technology market projections", "biotech industry revenue global"]
            },
            {
                "name": "Genetic Laboratory Mysteries",
                "desc": "DNA research settings with genetic testing, hereditary secrets, and laboratory cover-ups",
                "terms": ["genetic testing market size", "DNA testing industry revenue", "genetic research funding statistics"]
            },
            {
                "name": "Genetic Engineering Mysteries",
                "desc": "Gene editing settings with designer organisms, evolutionary ethics, and modified creature intrigue",
                "terms": ["gene therapy market size", "genetic engineering ethics surveys", "GMO debate public opinion statistics"]
            },
            {
                "name": "Cloning Laboratory Mysteries",
                "desc": "Cloning facility settings with genetic duplicates, identity confusion, and ethical nightmares",
                "terms": ["cloning technology cultural interest", "clone fiction entertainment market", "genetic duplication science news coverage"]
            },
            {
                "name": "Underwater Research Station Mysteries",
                "desc": "Deep-sea lab settings with marine biology, underwater habitats, and oceanic pressure dangers",
                "terms": ["ocean research industry funding", "underwater habitat technology market", "marine biology research statistics"]
            },
            {
                "name": "Underwater Laboratory Mysteries",
                "desc": "Submerged lab settings with aquatic experiments, pressurized chambers, and deep-sea secrets",
                "terms": ["deep sea exploration market", "underwater technology industry revenue", "marine research station statistics"]
            },
            {
                "name": "Underwater Prison Mysteries",
                "desc": "Submerged detention settings with escape attempts, deep-water justice, and claustrophobic cells",
                "terms": ["prison fiction market size", "underwater thriller entertainment", "confined setting mystery popularity"]
            },
            {
                "name": "Desert Research Station Mysteries",
                "desc": "Arid research outpost settings with extreme heat, isolated scientists, and desert survival",
                "terms": ["desert research station real world examples", "Mars habitat simulation statistics", "extreme environment research funding"]
            },
            {
                "name": "Volcano Research Station Mysteries",
                "desc": "Volcanic research settings with geological danger, eruption countdowns, and seismic intrigue",
                "terms": ["volcanology research funding", "volcano tourism market statistics", "geological disaster entertainment media"]
            },
            {
                "name": "Arctic Research Station Mysteries",
                "desc": "Frozen outpost settings with blizzard isolation, ice core secrets, and cold-weather survival",
                "terms": ["Arctic research funding statistics", "polar expedition tourism market", "The Thing cultural impact horror"]
            },
            {
                "name": "Teleportation Lab Mysteries",
                "desc": "Matter transport lab settings with teleportation experiments, molecular errors, and transport mishaps",
                "terms": ["teleportation science fiction market", "quantum teleportation research news", "matter transport concept cultural interest"]
            },
            {
                "name": "Artificial Intelligence Mysteries",
                "desc": "AI consciousness settings with digital beings, algorithmic ethics, and machine intelligence crime",
                "terms": ["artificial intelligence market size 2025", "AI in entertainment industry revenue", "AI ethics public discourse statistics"]
            },
            {
                "name": "Nano-Technology Mysteries",
                "desc": "Microscopic technology settings with nanobots, molecular manipulation, and invisible threats",
                "terms": ["nanotechnology market size global", "nanomedicine industry revenue", "nanotechnology in fiction popularity"]
            },
            {
                "name": "Mind Control Mysteries",
                "desc": "Psychological manipulation settings with brainwashing, hypnotic influence, and mental subjugation",
                "terms": ["mind control fiction popularity", "psychological thriller market size", "MK Ultra cultural interest statistics"]
            },
            {
                "name": "Mind Reading Mysteries",
                "desc": "Telepathic investigation settings with thought detection, mental eavesdropping, and psychic evidence",
                "terms": ["telepathy in fiction market", "psychic phenomena public belief statistics", "mind reading technology research"]
            },
            {
                "name": "Memory Manipulation Mysteries",
                "desc": "Memory alteration settings with erased recollections, implanted memories, and identity confusion",
                "terms": ["memory manipulation fiction popularity", "Eternal Sunshine cultural impact", "false memory research statistics"]
            },
            {
                "name": "Telekinesis Mysteries",
                "desc": "Mind-over-matter settings with objects moving by thought, psychic attacks, and mental power struggles",
                "terms": ["telekinesis in entertainment media", "psychic powers fiction market", "Stephen King Carrie franchise revenue"]
            },
            {
                "name": "Telepathic Network Mysteries",
                "desc": "Connected minds settings with hive-mind communication, shared consciousness, and network intrusion",
                "terms": ["brain-computer interface market size", "neural network fiction popularity", "collective consciousness science fiction"]
            },
            {
                "name": "Psychic Powers Mysteries",
                "desc": "Extrasensory perception settings with visions, premonitions, and supernatural investigation tools",
                "terms": ["psychic services industry revenue", "paranormal belief statistics US", "psychic fiction entertainment market"]
            },
            {
                "name": "Clairvoyance Mysteries",
                "desc": "Fortune-telling settings with prophetic visions, crystal balls, and fate-driven investigations",
                "terms": ["psychic reading industry market size", "fortune telling cultural statistics", "divination entertainment popularity"]
            },
        ]
    },
    16: {
        "title": "Superpowers, Dimensions & Virtual Worlds",
        "description": "20 themes covering supernatural abilities, dimensional travel, and virtual/digital reality concepts",
        "expert_types": "sci-fi authors, game designers, VR technology analysts, physics popularizers, entertainment franchise experts",
        "cross_refs": [],
        "themes": [
            {
                "name": "Teleportation Mysteries",
                "desc": "Instant-travel settings with disappearing suspects, location-jumping evidence, and spatial anomalies",
                "terms": ["teleportation fiction franchise revenue", "Star Trek transporter cultural impact", "instant travel concept entertainment"]
            },
            {
                "name": "Invisible Man Mysteries",
                "desc": "Invisibility settings with unseen suspects, invisible evidence, and optical deception",
                "terms": ["Invisible Man franchise revenue", "invisibility fiction market", "H.G. Wells cultural impact statistics"]
            },
            {
                "name": "Invisibility Technology Mysteries",
                "desc": "Advanced cloaking settings with stealth tech, optical camouflage, and vanishing suspects",
                "terms": ["stealth technology market size", "invisibility cloak research news", "cloaking technology fiction popularity"]
            },
            {
                "name": "Shapeshifting Virus Mysteries",
                "desc": "Biological mutation settings with identity-altering infections, viral transformations, and containment drama",
                "terms": ["body horror entertainment market", "virus thriller fiction sales", "shapeshifting concept entertainment popularity"]
            },
            {
                "name": "Shapeshifting Technology Mysteries",
                "desc": "Advanced disguise settings with morphing technology, identity systems, and impersonation crime",
                "terms": ["deepfake technology market", "identity fraud statistics", "digital disguise entertainment trends"]
            },
            {
                "name": "Emotion Control Mysteries",
                "desc": "Feelings manipulation settings with mood alteration, emotional blackmail, and empathic weapons",
                "terms": ["emotional intelligence market size", "emotion AI technology revenue", "mood manipulation fiction popularity"]
            },
            {
                "name": "Dream World Mysteries",
                "desc": "Dreamscape investigation settings with subconscious clues, nightmare worlds, and sleep-state crime",
                "terms": ["Inception movie cultural impact revenue", "lucid dreaming market statistics", "dream entertainment fiction market"]
            },
            {
                "name": "Astral Projection Mysteries",
                "desc": "Out-of-body experience settings with spirit-form investigation, astral realms, and spiritual crime",
                "terms": ["astral projection cultural interest statistics", "out-of-body experience research", "spiritual entertainment market size"]
            },
            {
                "name": "Gravity Control Mysteries",
                "desc": "Weightless crime settings with gravity manipulation, floating evidence, and physics-defying investigations",
                "terms": ["zero gravity entertainment experiences", "space tourism weightlessness market", "gravity manipulation in fiction"]
            },
            {
                "name": "Energy Manipulation Mysteries",
                "desc": "Power-wielding settings with electrical attacks, energy shields, and force-field intrigue",
                "terms": ["superhero entertainment market size", "energy manipulation in gaming", "power-based fiction genre statistics"]
            },
            {
                "name": "Size Manipulation Mysteries",
                "desc": "Shrinking/growing settings with miniature investigations, giant encounters, and scale-shifting crime",
                "terms": ["Ant-Man franchise box office", "size change fiction entertainment", "miniature world cultural fascination"]
            },
            {
                "name": "Probability Control Mysteries",
                "desc": "Luck manipulation settings with odds-defying events, statistical anomalies, and fate-rigging crime",
                "terms": ["probability in fiction entertainment", "luck manipulation trope popularity", "casino probability entertainment"]
            },
            {
                "name": "Phasing Technology Mysteries",
                "desc": "Walk-through-walls settings with intangibility, ghost-tech, and solid-state bypassing",
                "terms": ["quantum tunneling cultural interest", "phasing superpower popularity", "intangibility fiction entertainment"]
            },
            {
                "name": "Dimensional Rift Mysteries",
                "desc": "Portal-travel settings with interdimensional crime, rift anomalies, and cross-reality investigations",
                "terms": ["multiverse entertainment franchise revenue", "dimension travel fiction market", "portal fantasy genre popularity"]
            },
            {
                "name": "Dimension Portal Mysteries",
                "desc": "Reality-bending settings with portal networks, dimension-hopping suspects, and alternate world evidence",
                "terms": ["multiverse concept media popularity", "portal fiction entertainment market", "Doctor Strange franchise revenue"]
            },
            {
                "name": "Parallel Universe Mysteries",
                "desc": "Alternate reality settings with doppelgängers, divergent timelines, and cross-dimensional witnesses",
                "terms": ["multiverse theory cultural popularity", "Everything Everywhere box office", "parallel universe fiction sales"]
            },
            {
                "name": "Parallel Earth Mysteries",
                "desc": "Alternate Earth settings with timeline tensions, reality divergence, and Earth-variant intrigue",
                "terms": ["alternate history fiction market size", "parallel Earth entertainment media", "What If cultural impact statistics"]
            },
            {
                "name": "Time Loop Mysteries",
                "desc": "Repeating timeline settings with Groundhog Day scenarios, temporal puzzles, and recurring crime",
                "terms": ["time loop entertainment franchise revenue", "Groundhog Day cultural impact", "time loop fiction genre popularity"]
            },
            {
                "name": "Virtual Reality Mysteries",
                "desc": "Digital world settings with simulated crime scenes, avatar suspects, and VR-based investigation",
                "terms": ["virtual reality market size 2025", "VR gaming industry revenue", "virtual world entertainment statistics"]
            },
            {
                "name": "Holographic Mysteries",
                "desc": "Light-projection settings with holographic disguises, projected crime scenes, and photonic evidence",
                "terms": ["holographic display market size", "hologram entertainment revenue", "holographic technology projections"]
            },
        ]
    },
    17: {
        "title": "Venues — Entertainment, Travel & Luxury",
        "description": "20 entertainment venue, travel destination, and luxury location themes for murder mystery parties",
        "expert_types": "event planners, hospitality industry analysts, tourism researchers, entertainment venue managers",
        "cross_refs": [],
        "themes": [
            {
                "name": "Broadway Theater Mysteries",
                "desc": "Theater settings with show must go on drama, backstage rivalries, and opening night intrigue",
                "terms": ["Broadway industry revenue statistics", "theater attendance trends", "live theater entertainment market size"]
            },
            {
                "name": "Film Studio Mysteries",
                "desc": "Movie studio settings with on-set drama, director rivalries, and production sabotage",
                "terms": ["film production industry revenue", "movie studio tour attendance", "film industry employment statistics"]
            },
            {
                "name": "Nightclub Mysteries",
                "desc": "Nightlife settings with dance floor drama, VIP intrigue, and DJ booth deception",
                "terms": ["nightclub industry market size", "nightlife entertainment revenue", "club culture event statistics"]
            },
            {
                "name": "Mansion Mysteries",
                "desc": "Grand estate settings with aristocratic families, secret passages, and inheritance disputes",
                "terms": ["mansion tourism market statistics", "historic house visitor numbers", "stately home event venue revenue"]
            },
            {
                "name": "Escape Room Mysteries",
                "desc": "Puzzle room settings combining escape room mechanics with murder mystery investigation",
                "terms": ["escape room industry market size", "escape room entertainment revenue", "puzzle room participation statistics"]
            },
            {
                "name": "Tropical Resort Mysteries",
                "desc": "Paradise resort settings with poolside intrigue, island isolation, and vacation deception",
                "terms": ["tropical resort tourism market", "all-inclusive resort revenue statistics", "tropical destination visitor numbers"]
            },
            {
                "name": "Mountain Resort Mysteries",
                "desc": "Alpine resort settings with ski lodge intrigue, mountain isolation, and scenic danger",
                "terms": ["mountain resort tourism market", "ski resort industry revenue", "mountain destination visitor statistics"]
            },
            {
                "name": "Casino Boat Mysteries",
                "desc": "Riverboat casino settings with high-stakes gambling, nautical intrigue, and floating fortunes",
                "terms": ["riverboat casino industry revenue", "casino boat market statistics", "gambling cruise entertainment"]
            },
            {
                "name": "Resort Casino Mysteries",
                "desc": "Luxury casino resort settings with Vegas-style glamour, high-roller drama, and resort intrigue",
                "terms": ["casino resort industry revenue", "Las Vegas tourism statistics", "integrated resort market size"]
            },
            {
                "name": "Luxury Train Mysteries",
                "desc": "Orient Express-style settings with first-class passengers, dining car drama, and locomotive luxury",
                "terms": ["luxury train travel market", "Orient Express cultural impact", "heritage railway tourism revenue"]
            },
            {
                "name": "Cruise Line Mysteries",
                "desc": "Ocean liner settings with shipboard entertainment, port-of-call intrigue, and passenger drama",
                "terms": ["cruise industry revenue statistics", "cruise ship passenger numbers", "cruise entertainment spending"]
            },
            {
                "name": "Underground Bunker Mysteries",
                "desc": "Subterranean shelter settings with survival stockpiles, bunker politics, and underground isolation",
                "terms": ["bunker tourism market statistics", "underground attraction visitor numbers", "survival shelter industry"]
            },
            {
                "name": "Aquarium Mysteries",
                "desc": "Public aquarium settings with marine exhibits, behind-the-scenes access, and oceanic investigation",
                "terms": ["aquarium industry revenue statistics", "public aquarium attendance worldwide", "marine attraction visitor numbers"]
            },
            {
                "name": "Aquatic Theme Park Mysteries",
                "desc": "Water park settings with splash attractions, aquatic shows, and poolside crime",
                "terms": ["water park industry revenue", "aquatic theme park attendance", "water attraction market size"]
            },
            {
                "name": "Observatory Mysteries",
                "desc": "Stargazing facility settings with astronomical observations, telescope intrigue, and celestial secrets",
                "terms": ["observatory tourism statistics", "astronomy public interest trends", "planetarium attendance numbers"]
            },
            {
                "name": "Observatory Dome Mysteries",
                "desc": "Dome-based observatory settings with stellar crime scenes, nighttime investigations, and cosmic clues",
                "terms": ["observatory visitor numbers worldwide", "astronomical tourism market", "dark sky tourism statistics"]
            },
            {
                "name": "Planetarium Mysteries",
                "desc": "Star projection settings with cosmic presentations, constellation clues, and educational intrigue",
                "terms": ["planetarium attendance statistics", "space education entertainment market", "immersive dome experience revenue"]
            },
            {
                "name": "Lighthouse Mysteries",
                "desc": "Coastal lighthouse settings with maritime signals, isolated keepers, and beacon intrigue",
                "terms": ["lighthouse tourism statistics", "maritime heritage tourism", "coastal attraction visitor numbers"]
            },
            {
                "name": "Boardwalk Mysteries",
                "desc": "Seaside promenade settings with carnival games, ocean views, and boardwalk vendor intrigue",
                "terms": ["boardwalk tourism revenue", "seaside entertainment market", "coastal amusement pier statistics"]
            },
            {
                "name": "Country Fair Mysteries",
                "desc": "Rural fair settings with livestock competitions, carnival rides, and small-town showdown",
                "terms": ["county fair attendance statistics", "agricultural fair industry revenue", "state fair visitor numbers"]
            },
        ]
    },
    18: {
        "title": "Venues — Food, Craft, Industrial & Niche",
        "description": "20 food/beverage, artisan, industrial, and niche venue themes for murder mystery parties",
        "expert_types": "food industry analysts, craft business experts, manufacturing historians, venue design specialists",
        "cross_refs": [],
        "themes": [
            {
                "name": "Wine Cellar Mysteries",
                "desc": "Underground wine vault settings with vintage collections, sommelier rivalries, and cellar secrets",
                "terms": ["wine industry market size global", "wine cellar tourism statistics", "wine tasting experience market"]
            },
            {
                "name": "Vineyard Mysteries",
                "desc": "Winery estate settings with harvest drama, grape growing rivalries, and vineyard intrigue",
                "terms": ["wine tourism market size", "vineyard visitor statistics", "winery event venue revenue"]
            },
            {
                "name": "Cooking Competition Mysteries",
                "desc": "Culinary contest settings with chef rivalries, recipe sabotage, and kitchen confrontations",
                "terms": ["cooking competition TV ratings", "culinary entertainment market", "cooking show franchise revenue"]
            },
            {
                "name": "Spa and Wellness Mysteries",
                "desc": "Luxury spa settings with relaxation gone wrong, wellness retreat intrigue, and treatment room secrets",
                "terms": ["spa and wellness industry revenue", "wellness tourism market size", "luxury spa market statistics"]
            },
            {
                "name": "Chocolate Factory Mysteries",
                "desc": "Chocolate production settings with sweet secrets, confectionery rivalries, and Willy Wonka-style intrigue",
                "terms": ["chocolate industry market size global", "chocolate factory tourism statistics", "confectionery industry revenue"]
            },
            {
                "name": "Candy Store Mysteries",
                "desc": "Sweet shop settings with sugary schemes, candy aisle clues, and confectionery crime",
                "terms": ["candy industry market size", "sweet shop tourism attractions", "confectionery retail statistics"]
            },
            {
                "name": "Cheese Factory Mysteries",
                "desc": "Cheese production settings with aging room secrets, artisan rivalries, and dairy intrigue",
                "terms": ["cheese industry market size global", "cheese tourism statistics", "artisan cheese market growth"]
            },
            {
                "name": "Perfume Shop Mysteries",
                "desc": "Fragrance shop settings with aromatic clues, scent-based evidence, and perfumer rivalries",
                "terms": ["fragrance industry market size", "perfume retail statistics", "niche perfumery market growth"]
            },
            {
                "name": "Butterfly Garden Mysteries",
                "desc": "Enclosed garden settings with lepidopterist investigations, delicate specimens, and botanical intrigue",
                "terms": ["butterfly garden attraction attendance", "botanical garden tourism statistics", "insect conservation public interest"]
            },
            {
                "name": "Flower Shop Mysteries",
                "desc": "Floral shop settings with botanical arrangements, flower language clues, and petal-strewn evidence",
                "terms": ["floral industry market size", "flower shop retail statistics", "floristry market trends"]
            },
            {
                "name": "Antique Car Show Mysteries",
                "desc": "Vintage automobile settings with classic car competitions, collector rivalries, and restoration drama",
                "terms": ["classic car market size", "vintage auto show attendance", "collector car industry statistics"]
            },
            {
                "name": "Antique Clock Shop Mysteries",
                "desc": "Timepiece shop settings with clockwork mechanisms, horological mysteries, and vintage valuations",
                "terms": ["antique watch market size", "horology industry statistics", "vintage clock collector market"]
            },
            {
                "name": "Paper Mill Mysteries",
                "desc": "Industrial paper production settings with manufacturing secrets, pulp processing, and factory intrigue",
                "terms": ["paper industry market size global", "paper mill tourism industrial heritage", "manufacturing industry employment"]
            },
            {
                "name": "Soap Factory Mysteries",
                "desc": "Soap production settings with chemical processes, industrial secrets, and manufacturing drama",
                "terms": ["soap industry market size", "artisan soap market growth", "industrial heritage tourism statistics"]
            },
            {
                "name": "Textile Mill Mysteries",
                "desc": "Fabric production settings with weaving secrets, industrial espionage, and manufacturing intrigue",
                "terms": ["textile industry market size global", "textile mill heritage tourism", "fabric manufacturing statistics"]
            },
            {
                "name": "Winter Festival Mysteries",
                "desc": "Snow festival settings with ice sculptures, winter markets, and cold-weather celebration intrigue",
                "terms": ["winter festival tourism statistics", "Christmas market attendance worldwide", "winter event industry revenue"]
            },
            {
                "name": "Tree House Mysteries",
                "desc": "Elevated treehouse settings with canopy exploration, elevated platforms, and woodland secrets",
                "terms": ["treehouse accommodation market", "treehouse tourism statistics", "glamping industry market size"]
            },
            {
                "name": "Windmill Mysteries",
                "desc": "Historic windmill settings with grinding mechanisms, rural charm, and mill-keeper secrets",
                "terms": ["windmill tourism statistics Netherlands", "historic mill visitor numbers", "rural heritage tourism market"]
            },
            {
                "name": "Greenhouse Mysteries",
                "desc": "Glass greenhouse settings with exotic plants, botanical poisons, and horticultural intrigue",
                "terms": ["botanical garden industry revenue", "greenhouse attraction visitor numbers", "horticulture industry market size"]
            },
            {
                "name": "Small Spaces Mysteries",
                "desc": "Compact venue solutions for hosting murder mysteries in apartments, small rooms, and limited spaces",
                "terms": ["small gathering party market", "apartment party trends", "intimate event venue statistics"]
            },
        ]
    },
    19: {
        "title": "Character Profiles — Professions & Investigators",
        "description": "20 profession-based and role-based character themes for murder mystery parties",
        "expert_types": "career counselors, industry association leaders, occupational psychologists, entertainment casting experts",
        "cross_refs": [
            {"theme": "Detective", "source": "Existing published detective post", "exists": "Core detective fiction market data", "needed": "Professional investigator industry data, private detective statistics"},
        ],
        "themes": [
            {
                "name": "Detective Character Mysteries",
                "desc": "Professional investigator characters with PI credentials, case methodologies, and sleuth dynamics",
                "terms": ["private investigator industry market size", "detective fiction book sales", "mystery dinner theater market"]
            },
            {
                "name": "Forensic Expert Character Mysteries",
                "desc": "Crime scene analyst characters with forensic science skills, evidence analysis, and lab expertise",
                "terms": ["forensic science market size", "CSI effect on jury behavior", "forensic technology industry revenue"]
            },
            {
                "name": "Security Guard Character Mysteries",
                "desc": "Security professional characters with surveillance access, patrol knowledge, and facility control",
                "terms": ["security services industry market size", "security guard employment statistics", "private security market growth"]
            },
            {
                "name": "Insurance Investigator Character Mysteries",
                "desc": "Fraud investigator characters with claims analysis, deception detection, and financial tracking",
                "terms": ["insurance fraud statistics annual", "insurance investigation industry size", "claims fraud detection market"]
            },
            {
                "name": "Photographer Character Mysteries",
                "desc": "Visual evidence characters with photography skills, captured moments, and darkroom secrets",
                "terms": ["photography industry market size", "photographer employment statistics", "visual evidence in criminal investigations"]
            },
            {
                "name": "News Anchor Character Mysteries",
                "desc": "Broadcast journalist characters with media access, on-camera secrets, and newsroom politics",
                "terms": ["broadcast news industry revenue", "TV news anchor salary statistics", "journalism industry employment"]
            },
            {
                "name": "Magician Character Mysteries",
                "desc": "Illusionist characters with stage deception, sleight of hand, and performance secrets",
                "terms": ["magic entertainment industry revenue", "magician performance market", "magic show attendance statistics"]
            },
            {
                "name": "Librarian Character Mysteries",
                "desc": "Knowledge keeper characters with archive access, research skills, and literary secrets",
                "terms": ["library industry statistics", "librarian employment data", "public library usage statistics"]
            },
            {
                "name": "Food Critic Character Mysteries",
                "desc": "Culinary reviewer characters with restaurant access, taste expertise, and dining industry influence",
                "terms": ["food criticism industry", "restaurant review influence statistics", "food media market size"]
            },
            {
                "name": "Fitness Trainer Character Mysteries",
                "desc": "Athletic coach characters with gym access, physical expertise, and client secrets",
                "terms": ["fitness industry market size", "personal trainer employment statistics", "gym membership market"]
            },
            {
                "name": "Veterinarian Character Mysteries",
                "desc": "Animal doctor characters with medical knowledge, pet clinic access, and pharmaceutical expertise",
                "terms": ["veterinary industry market size", "vet employment statistics", "pet care industry revenue"]
            },
            {
                "name": "Florist Character Mysteries",
                "desc": "Botanical expert characters with flower arrangement skills, plant knowledge, and shop front secrets",
                "terms": ["floral industry employment statistics", "florist market size", "flower delivery market revenue"]
            },
            {
                "name": "Mechanic Character Mysteries",
                "desc": "Vehicle expert characters with automotive knowledge, garage access, and mechanical sabotage expertise",
                "terms": ["auto repair industry market size", "mechanic employment statistics", "automotive service revenue"]
            },
            {
                "name": "Auctioneer Character Mysteries",
                "desc": "Bidding expert characters with auction house access, valuation skills, and high-value item knowledge",
                "terms": ["auction industry market size", "auction house revenue statistics", "art auction market trends"]
            },
            {
                "name": "Hacker Character Mysteries",
                "desc": "Cybercrime expert characters with digital infiltration, coding skills, and tech-world secrets",
                "terms": ["cybersecurity industry market size", "hacker culture entertainment popularity", "cybercrime statistics global"]
            },
            {
                "name": "Blackmailer Character Mysteries",
                "desc": "Extortion-focused characters with secret knowledge, leverage tactics, and coercion dynamics",
                "terms": ["extortion crime statistics", "blackmail fiction popularity", "thriller genre book sales"]
            },
            {
                "name": "Real Estate Agent Character Mysteries",
                "desc": "Property expert characters with housing market knowledge, open house access, and deal secrets",
                "terms": ["real estate industry market size", "real estate agent employment statistics", "property market revenue"]
            },
            {
                "name": "Taxi Driver Character Mysteries",
                "desc": "Urban transport characters with street knowledge, passenger observations, and city navigation",
                "terms": ["taxi industry market size", "ride-hailing market statistics", "urban transportation revenue"]
            },
            {
                "name": "Taxi Dispatcher Character Mysteries",
                "desc": "Central command characters with communication control, route tracking, and dispatch knowledge",
                "terms": ["dispatch center industry statistics", "fleet management market size", "transportation logistics revenue"]
            },
            {
                "name": "Bank Teller Character Mysteries",
                "desc": "Financial service characters with money trail knowledge, transaction access, and vault proximity",
                "terms": ["banking industry employment statistics", "bank robbery statistics US", "financial services market size"]
            },
        ]
    },
    20: {
        "title": "Creating the Perfect Character — Artisan & Service Professions",
        "description": "21 character creation guides for artisan, service, and niche profession characters in murder mystery parties",
        "expert_types": "career development experts, artisan industry analysts, craft business consultants, character writing coaches",
        "cross_refs": [],
        "themes": [
            {
                "name": "Tour Guide Character",
                "desc": "Creating tour guide characters who know all the local secrets, hidden passages, and community history",
                "terms": ["tour guide industry statistics", "tourism employment worldwide", "guided tour market size"]
            },
            {
                "name": "Meteorologist Character",
                "desc": "Creating weather expert characters with forecast knowledge, atmospheric data, and storm predictions",
                "terms": ["weather forecasting industry market size", "meteorologist employment statistics", "weather media entertainment revenue"]
            },
            {
                "name": "Social Media Influencer Character",
                "desc": "Creating influencer characters with online reach, viral content skills, and digital reputation power",
                "terms": ["influencer marketing market size", "social media influencer statistics", "content creator economy revenue"]
            },
            {
                "name": "Yoga Instructor Character",
                "desc": "Creating wellness instructor characters with mindfulness expertise, studio access, and spiritual wisdom",
                "terms": ["yoga industry market size", "yoga instructor employment statistics", "wellness industry revenue"]
            },
            {
                "name": "Personal Trainer Character",
                "desc": "Creating fitness expert characters with athletic knowledge, client relationships, and gym connections",
                "terms": ["personal training market size", "fitness professional statistics", "health club industry revenue"]
            },
            {
                "name": "Dance Instructor Character",
                "desc": "Creating dance teacher characters with rhythm expertise, studio connections, and performance rivalries",
                "terms": ["dance studio industry market size", "dance education statistics", "performing arts market revenue"]
            },
            {
                "name": "Wedding Planner Character",
                "desc": "Creating event coordinator characters specializing in wedding ceremonies, vendor relationships, and bridal drama",
                "terms": ["wedding industry market size", "wedding planner statistics", "bridal industry revenue"]
            },
            {
                "name": "Event Coordinator Character",
                "desc": "Creating event management characters with logistics expertise, venue knowledge, and celebration planning",
                "terms": ["event management industry market size", "event planner employment statistics", "live events market revenue"]
            },
            {
                "name": "Food Truck Owner Character",
                "desc": "Creating mobile restaurant characters with culinary street cred, festival circuits, and food truck rivalries",
                "terms": ["food truck industry market size", "food truck employment statistics", "street food market revenue"]
            },
            {
                "name": "Pharmacist Character",
                "desc": "Creating pharmaceutical characters with drug knowledge, prescription access, and medical supply expertise",
                "terms": ["pharmacy industry market size", "pharmacist employment statistics", "pharmaceutical retail revenue"]
            },
            {
                "name": "Postal Worker Character",
                "desc": "Creating mail carrier characters with route knowledge, package access, and neighborhood observations",
                "terms": ["postal service industry statistics", "mail carrier employment data", "postal market revenue global"]
            },
            {
                "name": "Beekeeper Character",
                "desc": "Creating apiarist characters with hive knowledge, honey production, and bee-related danger",
                "terms": ["beekeeping industry market size", "honey production statistics", "apiculture market growth"]
            },
            {
                "name": "Lighthouse Keeper Character",
                "desc": "Creating maritime guardian characters with coastal knowledge, isolation experience, and beacon operations",
                "terms": ["lighthouse keeper profession history", "lighthouse tourism statistics", "maritime heritage employment"]
            },
            {
                "name": "Clockmaker Character",
                "desc": "Creating horologist characters with mechanical precision, timepiece knowledge, and workshop secrets",
                "terms": ["watchmaking industry market size", "horology profession statistics", "luxury watch market revenue"]
            },
            {
                "name": "Glassblower Character",
                "desc": "Creating glass artisan characters with furnace expertise, artistic vision, and studio secrets",
                "terms": ["glass art industry market size", "glassblowing tourism statistics", "artisan glass market revenue"]
            },
            {
                "name": "Jeweler Character",
                "desc": "Creating gemstone expert characters with appraisal skills, precious stone knowledge, and vault access",
                "terms": ["jewelry industry market size global", "jeweler employment statistics", "precious gems market revenue"]
            },
            {
                "name": "Textile Worker Character",
                "desc": "Creating fabric expert characters who know every thread, pattern, and manufacturing secret",
                "terms": ["textile industry employment statistics", "fabric market size global", "textile manufacturing revenue"]
            },
            {
                "name": "Cobbler Character",
                "desc": "Creating shoemaker characters with footwear expertise, leather crafting skills, and workshop secrets",
                "terms": ["footwear industry market size", "cobbler profession statistics", "artisan shoemaking market"]
            },
            {
                "name": "Blacksmith Character",
                "desc": "Creating metalworker characters with forge expertise, weapons knowledge, and smithing secrets",
                "terms": ["blacksmithing revival market statistics", "artisan metalwork industry", "blacksmith tourism experiences"]
            },
            {
                "name": "Stained Glass Artist Character",
                "desc": "Creating glass art characters with sacred and secular design skills, installation expertise, and artistic secrets",
                "terms": ["stained glass industry market", "glass art market statistics", "religious art restoration market"]
            },
            {
                "name": "Candle Maker Character",
                "desc": "Creating chandler characters with wax craft expertise, scent knowledge, and illuminating investigation skills",
                "terms": ["candle industry market size", "artisan candle market growth", "candle making hobby statistics"]
            },
        ]
    },
    21: {
        "title": "Holiday & Seasonal Events — Part 1",
        "description": "20 holiday and seasonal event themes for murder mystery parties covering major holidays and celebrations",
        "expert_types": "event planners, holiday market analysts, seasonal marketing experts, cultural celebration researchers",
        "cross_refs": [],
        "themes": [
            {
                "name": "New Year's Eve Mysteries",
                "desc": "Midnight celebration settings with countdown drama, champagne intrigue, and New Year's resolutions gone wrong",
                "terms": ["New Year's Eve spending statistics", "NYE party market size", "New Year celebration event revenue"]
            },
            {
                "name": "Valentine's Day Mysteries",
                "desc": "Romantic celebration settings with love triangles, secret admirers, and passion-driven crime",
                "terms": ["Valentine's Day spending statistics", "Valentine event market size", "romantic entertainment industry revenue"]
            },
            {
                "name": "Easter Mysteries",
                "desc": "Easter celebration settings with egg hunt investigations, spring gathering intrigue, and holiday drama",
                "terms": ["Easter spending statistics US", "Easter event market", "spring celebration industry revenue"]
            },
            {
                "name": "St. Patrick's Day Mysteries",
                "desc": "Irish-themed celebration settings with emerald intrigue, pub crawl investigations, and lucky clues",
                "terms": ["St Patrick's Day spending statistics", "Irish celebration market size", "St Patrick's Day event revenue"]
            },
            {
                "name": "April Fools Day Mysteries",
                "desc": "Prank-themed celebration settings with deception, practical jokes, and fool's gold investigations",
                "terms": ["April Fools Day marketing statistics", "prank culture popularity", "humor entertainment market"]
            },
            {
                "name": "Cinco de Mayo Mysteries",
                "desc": "Mexican celebration settings with fiesta intrigue, cultural celebration, and festive investigation",
                "terms": ["Cinco de Mayo spending statistics US", "Mexican cultural celebration market", "Hispanic holiday event revenue"]
            },
            {
                "name": "Mother's Day Mysteries",
                "desc": "Maternal celebration settings with brunch intrigue, family secrets, and elegant afternoon investigation",
                "terms": ["Mother's Day spending statistics", "Mother's Day event market", "brunch entertainment industry"]
            },
            {
                "name": "Father's Day Mysteries",
                "desc": "Paternal celebration settings with BBQ intrigue, dad-themed investigation, and backyard drama",
                "terms": ["Father's Day spending statistics", "Father's Day event market", "BBQ entertainment industry statistics"]
            },
            {
                "name": "Memorial Day Mysteries",
                "desc": "Patriotic remembrance settings with veteran honors, heroic investigations, and military-themed intrigue",
                "terms": ["Memorial Day spending statistics", "Memorial Day event attendance", "patriotic celebration market"]
            },
            {
                "name": "Flag Day Mysteries",
                "desc": "Patriotic symbol settings with national pride investigations, flag ceremony intrigue, and civic drama",
                "terms": ["Flag Day observance statistics", "patriotic event market", "civic celebration participation rates"]
            },
            {
                "name": "Independence Day Mysteries",
                "desc": "Fourth of July settings with fireworks drama, patriotic intrigue, and freedom celebration investigations",
                "terms": ["Fourth of July spending statistics", "Independence Day event market", "fireworks industry revenue"]
            },
            {
                "name": "Labor Day Mysteries",
                "desc": "End-of-summer settings with labor celebration, working class intrigue, and long weekend drama",
                "terms": ["Labor Day spending statistics", "Labor Day travel market", "end of summer event revenue"]
            },
            {
                "name": "Halloween Night Mysteries",
                "desc": "Spooky October 31st settings with trick-or-treat investigations, costume party intrigue, and horror drama",
                "terms": ["Halloween spending statistics US", "Halloween event market size", "Halloween party industry revenue"]
            },
            {
                "name": "Halloween Preparation Mysteries",
                "desc": "Spooky season preparation settings with costume shopping, haunted house setup, and pre-Halloween intrigue",
                "terms": ["Halloween costume market size", "haunted attraction industry revenue", "Halloween decoration spending"]
            },
            {
                "name": "Thanksgiving Mysteries",
                "desc": "Turkey dinner settings with family gathering tensions, gratitude gone wrong, and holiday feast intrigue",
                "terms": ["Thanksgiving spending statistics", "Thanksgiving dinner market", "holiday meal entertainment trends"]
            },
            {
                "name": "Thanksgiving Weekend Mysteries",
                "desc": "Extended holiday settings with family reunion drama, post-feast intrigue, and weekend gathering tensions",
                "terms": ["Thanksgiving weekend travel statistics", "holiday weekend spending", "family gathering entertainment market"]
            },
            {
                "name": "Mardi Gras Mysteries",
                "desc": "New Orleans carnival settings with parade floats, masked revelry, and Bourbon Street intrigue",
                "terms": ["Mardi Gras tourism revenue", "Mardi Gras economic impact", "carnival celebration market size"]
            },
            {
                "name": "Day of the Dead Mysteries",
                "desc": "Día de los Muertos settings with altar offerings, ancestral connections, and cultural celebration intrigue",
                "terms": ["Day of the Dead tourism statistics", "Día de los Muertos cultural market", "Mexican holiday celebration spending"]
            },
            {
                "name": "Oktoberfest Mysteries",
                "desc": "Bavarian beer festival settings with stein-raising drama, beer hall intrigue, and German cultural celebration",
                "terms": ["Oktoberfest tourism revenue statistics", "Oktoberfest attendance worldwide", "beer festival market size"]
            },
            {
                "name": "Milestone Birthday Mysteries",
                "desc": "Landmark birthday settings (30th, 40th, 50th) with age-themed intrigue and celebration drama",
                "terms": ["birthday party spending statistics", "milestone celebration market", "birthday event entertainment revenue"]
            },
        ]
    },
    22: {
        "title": "Holiday & Seasonal Events — Part 2",
        "description": "19 additional holiday, seasonal, and calendar event themes for murder mystery parties",
        "expert_types": "event planners, seasonal marketing analysts, sports event researchers, educational event coordinators",
        "cross_refs": [],
        "themes": [
            {
                "name": "Gender Reveal Mysteries",
                "desc": "Baby gender announcement settings with anticipation drama, party game intrigue, and reveal twist",
                "terms": ["gender reveal party spending statistics", "gender reveal market size", "baby shower alternative event trends"]
            },
            {
                "name": "Back-to-School Mysteries",
                "desc": "School return settings with academic year preparations, classroom drama, and educational intrigue",
                "terms": ["back-to-school spending statistics", "back-to-school event market", "school season entertainment"]
            },
            {
                "name": "First Day of School Mysteries",
                "desc": "Academic year launch settings with new student intrigue, classroom assignments, and school day drama",
                "terms": ["first day of school market statistics", "school event planning market", "education entertainment spending"]
            },
            {
                "name": "Autumn Equinox Mysteries",
                "desc": "Fall season transition settings with harvest moon intrigue, seasonal change drama, and equinox celebrations",
                "terms": ["autumn equinox celebration statistics", "fall festival market size", "seasonal event attendance trends"]
            },
            {
                "name": "Harvest Festival Mysteries",
                "desc": "Agricultural celebration settings with crop gathering, rural festivities, and harvest season intrigue",
                "terms": ["harvest festival attendance statistics", "agricultural fair market size", "fall harvest event revenue"]
            },
            {
                "name": "Summer Solstice Mysteries",
                "desc": "Longest day celebration settings with midsummer intrigue, sun worship, and daylight drama",
                "terms": ["summer solstice celebration statistics", "midsummer festival attendance", "solstice event tourism revenue"]
            },
            {
                "name": "Winter Solstice Mysteries",
                "desc": "Longest night settings with darkness-themed intrigue, winter celebration, and solstice ceremony drama",
                "terms": ["winter solstice celebration statistics", "winter festival market size", "solstice tourism revenue"]
            },
            {
                "name": "Columbus Day Mysteries",
                "desc": "Exploration-themed settings with voyage intrigue, discovery drama, and historical adventure",
                "terms": ["Columbus Day observance statistics", "exploration themed event market", "heritage celebration spending"]
            },
            {
                "name": "Veterans Day Mysteries",
                "desc": "Military honor settings with service recognition, veteran tribute, and patriotic investigation",
                "terms": ["Veterans Day observance statistics", "military appreciation market", "veteran event attendance"]
            },
            {
                "name": "Black Friday Mysteries",
                "desc": "Retail chaos settings with shopping frenzy, consumer competition, and deal-day drama",
                "terms": ["Black Friday spending statistics", "Black Friday event revenue", "retail holiday market size"]
            },
            {
                "name": "Cyber Monday Mysteries",
                "desc": "Digital shopping settings with online deal intrigue, tech marketplace drama, and cyber commerce crime",
                "terms": ["Cyber Monday sales statistics", "online shopping event revenue", "digital retail market trends"]
            },
            {
                "name": "Small Business Saturday Mysteries",
                "desc": "Local business settings with entrepreneurship intrigue, community commerce, and small-town shop drama",
                "terms": ["Small Business Saturday statistics", "small business event spending", "local commerce market trends"]
            },
            {
                "name": "Presidents Day Mysteries",
                "desc": "Political intrigue settings with governmental drama, presidential history, and patriotic investigation",
                "terms": ["Presidents Day spending statistics", "political history tourism", "presidential heritage site visitors"]
            },
            {
                "name": "Groundhog Day Mysteries",
                "desc": "Weather prediction settings with seasonal forecasting drama, repetitive investigation, and prediction intrigue",
                "terms": ["Groundhog Day tourism statistics", "Punxsutawney Phil attendance", "weather prediction entertainment"]
            },
            {
                "name": "Summer Olympics Mysteries",
                "desc": "Athletic competition settings with Olympic drama, medal intrigue, and international sports investigation",
                "terms": ["Summer Olympics economic impact statistics", "Olympic viewership numbers", "sports event entertainment market"]
            },
            {
                "name": "Winter Olympics Mysteries",
                "desc": "Ice sports settings with skiing drama, skating intrigue, and cold-weather athletic investigation",
                "terms": ["Winter Olympics viewership statistics", "winter sports market size", "Olympic winter sports revenue"]
            },
            {
                "name": "Earth Day Mysteries",
                "desc": "Environmental celebration settings with ecological intrigue, green crime, and conservation drama",
                "terms": ["Earth Day participation statistics", "environmental event market", "green celebration trends"]
            },
            {
                "name": "World Poetry Day Mysteries",
                "desc": "Literary celebration settings with poetic intrigue, wordsmith rivalries, and verse-based investigation",
                "terms": ["poetry market statistics", "literary event attendance", "poetry book sales trends"]
            },
            {
                "name": "International Peace Day Mysteries",
                "desc": "Global harmony settings with diplomatic intrigue, peace negotiation drama, and international investigation",
                "terms": ["International Peace Day participation", "peace event statistics", "diplomatic celebration trends"]
            },
        ]
    },
    23: {
        "title": "Problem-Solving Guides — Part 1: Guest & Group Issues",
        "description": "15 problem-solving guides focused on guest management, group dynamics, and interpersonal challenges at murder mystery parties",
        "expert_types": "event planners, group dynamics researchers, hospitality experts, party entertainment consultants",
        "cross_refs": [
            {"theme": "All problem-solving posts", "source": "Pack 10 research", "exists": "General event planning failure rate data, host pain point statistics", "needed": "Specific data for each problem area listed below"},
        ],
        "is_problem_solving": True,
        "themes": [
            {
                "name": "Fix Guests Arriving Late",
                "desc": "Solutions for handling latecomers who miss critical opening scenes, clue distributions, and character introductions",
                "terms": ["event late arrival statistics", "party punctuality trends", "event timing management best practices"]
            },
            {
                "name": "Fix Uncooperative Guest Behavior",
                "desc": "Strategies for managing disruptive, disengaged, or intentionally difficult guests at mystery events",
                "terms": ["difficult party guest statistics", "event behavior management", "group activity participation rates"]
            },
            {
                "name": "Fix Character Assignment Problems",
                "desc": "Solutions for poorly matched characters, role refusals, and character imbalance issues",
                "terms": ["role-playing comfort statistics", "character assignment event planning", "personality matching for group activities"]
            },
            {
                "name": "Fix Communication Breakdown Issues",
                "desc": "Strategies for unclear instructions, misunderstood clues, and poor information flow during events",
                "terms": ["event communication failure statistics", "party instruction clarity research", "group communication effectiveness"]
            },
            {
                "name": "Fix Group Dynamics Problems",
                "desc": "Solutions for cliques, dominant personalities, wallflowers, and social imbalance at mystery parties",
                "terms": ["group dynamics research statistics", "social event inclusivity data", "party group behavior studies"]
            },
            {
                "name": "Fix Prop and Costume Malfunctions",
                "desc": "Solutions for broken props, costume failures, and physical element problems during events",
                "terms": ["costume malfunction event statistics", "party prop failure rates", "event supplies quality data"]
            },
            {
                "name": "Fix Entertainment Value Problems",
                "desc": "Strategies for keeping momentum when energy drops, engagement fades, or fun factor decreases",
                "terms": ["party entertainment engagement statistics", "event energy management research", "guest satisfaction survey data"]
            },
            {
                "name": "Fix Age-Inappropriate Content Issues",
                "desc": "Solutions for content that's too mature for younger guests or too juvenile for adults in mixed-age groups",
                "terms": ["family event content appropriateness", "age-appropriate entertainment statistics", "multi-age party planning data"]
            },
            {
                "name": "Fix Participant Skill Level Gaps",
                "desc": "Strategies for handling mixed experience levels where some guests are mystery experts and others are novices",
                "terms": ["skill level gap event management", "puzzle difficulty balancing data", "game difficulty preference statistics"]
            },
            {
                "name": "Fix Cleanup and Aftermath Issues",
                "desc": "Solutions for post-event cleanup disasters, damage, and lingering effects",
                "terms": ["party cleanup statistics", "post-event management data", "event aftermath survey results"]
            },
            {
                "name": "Fix Guest List Management Problems",
                "desc": "Solutions for RSVPs, headcount changes, dietary needs tracking, and guest coordination logistics",
                "terms": ["event RSVP statistics", "party planning coordination data", "guest management software market"]
            },
            {
                "name": "Fix Venue Decoration Disasters",
                "desc": "Solutions for decoration failures, budget overruns, and atmosphere that doesn't match the theme",
                "terms": ["party decoration spending statistics", "event decoration failure rates", "DIY party decoration trends"]
            },
            {
                "name": "Fix Entertainment Scheduling Conflicts",
                "desc": "Solutions for timing clashes, activity overlap, and pacing problems with entertainment elements",
                "terms": ["event scheduling conflict statistics", "party timing management data", "entertainment coordination research"]
            },
            {
                "name": "Fix Cultural Sensitivity Issues",
                "desc": "Solutions for avoiding offensive stereotypes, cultural appropriation, and insensitive content in themed events",
                "terms": ["cultural sensitivity event planning", "inclusive event statistics", "cultural appropriation awareness trends"]
            },
            {
                "name": "Fix Language Barrier Challenges",
                "desc": "Solutions for multilingual groups, non-native speakers, and language accommodation at mystery events",
                "terms": ["multilingual event planning statistics", "language barrier event management", "translation services market size"]
            },
        ]
    },
    24: {
        "title": "Problem-Solving Guides — Part 2: Logistics, Tech & Venue Issues",
        "description": "15 problem-solving guides focused on logistics, technology, venue management, and practical party challenges",
        "expert_types": "event production managers, AV technicians, venue coordinators, event technology specialists",
        "cross_refs": [
            {"theme": "All problem-solving posts", "source": "Pack 10 research", "exists": "General event planning failure rate data, host pain point statistics", "needed": "Specific data for each problem area listed below"},
        ],
        "is_problem_solving": True,
        "themes": [
            {
                "name": "Fix Last-Minute Venue Changes",
                "desc": "Emergency solutions for venue cancellations, relocations, and last-minute space changes",
                "terms": ["event venue cancellation statistics", "backup venue planning data", "last-minute event changes frequency"]
            },
            {
                "name": "Fix Menu Planning Disasters",
                "desc": "Solutions for catering failures, dietary restriction oversights, and food service problems",
                "terms": ["catering failure statistics", "dietary restriction accommodation data", "party food planning survey results"]
            },
            {
                "name": "Fix Party Theme Consistency Issues",
                "desc": "Solutions for immersion-breaking inconsistencies, mixed themes, and atmosphere gaps",
                "terms": ["themed event consistency research", "party immersion statistics", "event theming industry data"]
            },
            {
                "name": "Fix Weather Contingency Planning",
                "desc": "Solutions for outdoor event weather disruptions, rain plans, and climate-related challenges",
                "terms": ["outdoor event weather cancellation statistics", "weather contingency planning data", "event weather insurance market"]
            },
            {
                "name": "Fix Photography and Documentation Issues",
                "desc": "Solutions for poor event documentation, photography problems, and memory capture failures",
                "terms": ["event photography statistics", "party documentation trends", "event photography market size"]
            },
            {
                "name": "Fix Social Media Integration Challenges",
                "desc": "Solutions for social media coordination, hashtag management, and online sharing during events",
                "terms": ["event social media usage statistics", "party social sharing data", "event hashtag engagement rates"]
            },
            {
                "name": "Fix Technology Integration Failures",
                "desc": "Solutions for tech problems, app failures, and digital tool malfunctions during mystery events",
                "terms": ["event technology failure statistics", "party tech integration data", "event management software market"]
            },
            {
                "name": "Fix Accessibility and Inclusion Issues",
                "desc": "Solutions for mobility limitations, sensory accommodations, and inclusive event design",
                "terms": ["event accessibility statistics", "inclusive event planning data", "disability accommodation event trends"]
            },
            {
                "name": "Fix Gift and Prize Distribution Issues",
                "desc": "Solutions for unfair prizes, award controversies, and reward system problems at mystery events",
                "terms": ["party prize spending statistics", "event reward system research", "gamification reward effectiveness"]
            },
            {
                "name": "Fix Guest Costume Coordination Issues",
                "desc": "Solutions for costume availability, dress code confusion, and outfit coordination problems",
                "terms": ["party costume participation statistics", "themed dress code compliance data", "costume rental market size"]
            },
            {
                "name": "Fix Lighting and Atmosphere Issues",
                "desc": "Solutions for poor ambiance, lighting failures, and atmosphere problems that dim the mystery experience",
                "terms": ["event lighting market size", "party atmosphere survey data", "ambient lighting effect on mood research"]
            },
            {
                "name": "Fix Audio and Sound System Problems",
                "desc": "Solutions for sound failures, music problems, and audio issues that disrupt mystery events",
                "terms": ["event audio equipment market", "sound system failure statistics", "party music industry data"]
            },
            {
                "name": "Fix Multi-Generational Group Challenges",
                "desc": "Solutions for age-diverse groups with grandparents, parents, and children all participating together",
                "terms": ["multi-generational event statistics", "intergenerational activity research", "family event planning trends"]
            },
            {
                "name": "Fix Guest Transportation Issues",
                "desc": "Solutions for guest arrival logistics, parking problems, and transportation coordination",
                "terms": ["event transportation statistics", "party guest travel data", "event shuttle service market"]
            },
            {
                "name": "Fix International Guest Accommodation",
                "desc": "Solutions for time zone coordination, cultural differences, and international guest needs",
                "terms": ["international event planning statistics", "cross-cultural event management", "global event participation trends"]
            },
        ]
    },
}


def generate_prompt_file(pack_num, pack):
    """Generate a research prompt markdown file for the given pack."""

    theme_count = len(pack["themes"])
    is_problem = pack.get("is_problem_solving", False)

    lines = []

    # Header
    lines.append(f"# Murder Mystery Blog Post Research — Pack {pack_num}: {pack['title']}")
    lines.append("")

    # Project Overview
    lines.append("## Project Overview")
    lines.append("")
    lines.append("You are conducting research for **mysterymaker.party**, a murder mystery party generator website that creates custom mystery scenarios for various themes, settings, character types, and event occasions.")
    lines.append("")
    lines.append(f"The website has ~400 English blog posts covering different murder mystery themes, character archetypes, professions, settings, and event types. These posts need optimization to rank better in Google search AND to be cited by AI platforms like ChatGPT, Perplexity, and Google AI Overviews.")
    lines.append("")

    # Why This Research Matters
    lines.append("## Why This Research Matters")
    lines.append("")
    lines.append("Modern content optimization requires a **dual-track approach**:")
    lines.append("")
    lines.append("1. **SEO (Search Engine Optimization)** — Traditional Google ranking using keywords, internal links, meta descriptions")
    lines.append("2. **GEO (Generative Engine Optimization)** — AI platform citations using statistics, expert quotes, and authoritative sources")
    lines.append("")
    lines.append("**Research from Princeton/Georgia Tech shows GEO effectiveness:**")
    lines.append("- Statistics with citations: **+30.6% visibility** in AI responses")
    lines.append("- Expert quotations: **+40.9% visibility** in AI responses")
    lines.append("- Authoritative source citations: **+27% visibility** in AI responses")
    lines.append("- Comparison tables: **2.5x citation rate** in AI platforms")
    lines.append("")
    lines.append("Your job is to gather **premium, citation-worthy data** that will make these blog posts rank on Google AND get cited by AI platforms.")
    lines.append("")

    # Cross-Reference Section
    if pack.get("cross_refs"):
        lines.append("## Cross-Reference: Existing Research")
        lines.append("")
        lines.append("The following themes have partial data in prior research packs. **Do not duplicate existing data** — gather only supplemental or updated (2025-2026) information:")
        lines.append("")
        lines.append("| Theme | Existing Source | What Already Exists | What's Still Needed |")
        lines.append("|-------|----------------|--------------------|--------------------|")
        for ref in pack["cross_refs"]:
            lines.append(f"| {ref['theme']} | {ref['source']} | {ref['exists']} | {ref['needed']} |")
        lines.append("")
        fresh_count = theme_count - len(pack["cross_refs"])
        if fresh_count > 0:
            lines.append(f"All other {fresh_count} themes in this pack require **full fresh research**.")
        lines.append("")

    # Your Mission
    lines.append("## Your Mission")
    lines.append("")

    if is_problem:
        lines.append(f"Research **{theme_count} problem-solving topics** for murder mystery party hosts. For each problem area, gather:")
        lines.append("")
        lines.append("1. **Problem Statistics** (3-5 per theme)")
        lines.append("   - How frequently this problem occurs at events")
        lines.append("   - Impact on guest satisfaction and event success")
        lines.append("   - Industry survey data on event planning pain points")
        lines.append("   - Cost of the problem (time, money, reputation)")
        lines.append("")
        lines.append("2. **Expert Quotes** (2-3 per theme)")
        lines.append("   - Event planners, party entertainment experts, hospitality professionals")
        lines.append("   - Full attribution with credentials")
        lines.append("   - Must be real, verifiable quotes")
        lines.append("")
        lines.append("3. **Solution Data & Best Practices** (3-5 per theme)")
        lines.append("   - Proven solutions with success rates where available")
        lines.append("   - Industry best practices from event planning professionals")
        lines.append("   - Technology or tool solutions with adoption statistics")
    else:
        lines.append(f"Research **{theme_count} {pack['description'].split(' ', 1)[1] if ' ' in pack['description'] else 'themes'}** for murder mystery parties. For each theme, gather:")
        lines.append("")
        lines.append("1. **Market Statistics** (3-5 per theme)")
        lines.append("   - Market size, revenue, growth rates")
        lines.append("   - Consumer spending patterns")
        lines.append("   - Popularity metrics, attendance/participation data")
        lines.append("   - Industry trends, demographics")
        lines.append("")
        lines.append("2. **Expert Quotes** (2-3 per theme)")
        lines.append(f"   - {pack['expert_types']}")
        lines.append("   - Full attribution with credentials")
        lines.append("   - Must be real, verifiable quotes")
        lines.append("")
        lines.append("3. **Consumer Trends** (3-5 per theme)")
        lines.append("   - What people are searching for")
        lines.append("   - Emerging preferences")
        lines.append("   - Popular variations or sub-niches")

    lines.append("")

    # Themes List
    lines.append(f"## {theme_count} Themes to Research")
    lines.append("")

    for i, theme in enumerate(pack["themes"], 1):
        lines.append(f"{i}. **{theme['name']}**")
        lines.append(f"   - {theme['desc']}")
        lines.append(f"   - Search terms: \"{theme['terms'][0]}\", \"{theme['terms'][1]}\", \"{theme['terms'][2]}\"")
        lines.append("")

    # Data Requirements
    lines.append("## Data Requirements for Each Theme")
    lines.append("")

    if is_problem:
        lines.append("### Problem Statistics Table Format")
        lines.append("")
        lines.append("For each theme, create a markdown table:")
        lines.append("")
        lines.append("```markdown")
        lines.append("## [PROBLEM NAME] Statistics")
        lines.append("")
        lines.append("| Statistic | Number/Value | Source | URL | Year |")
        lines.append("|-----------|--------------|--------|-----|------|")
        lines.append("| Problem frequency | X% of events | Source Name | https://... | 2024 |")
        lines.append("| Guest satisfaction impact | X% decrease | Source Name | https://... | 2024 |")
        lines.append("| Host reporting rate | X% of hosts | Source Name | https://... | 2023 |")
        lines.append("```")
    else:
        lines.append("### Statistics Table Format")
        lines.append("")
        lines.append("For each theme, create a markdown table:")
        lines.append("")
        lines.append("```markdown")
        lines.append("## [THEME NAME] Statistics")
        lines.append("")
        lines.append("| Statistic | Number/Value | Source | URL | Year |")
        lines.append("|-----------|--------------|--------|-----|------|")
        lines.append("| Market size | $X billion | Source Name | https://... | 2024 |")
        lines.append("| Growth rate | X% CAGR | Source Name | https://... | 2024 |")
        lines.append("| Consumer spending | $X per event | Source Name | https://... | 2023 |")
        lines.append("```")

    lines.append("")
    lines.append("**Requirements:**")
    lines.append("- Exact numbers with units ($, %, millions, billions)")
    lines.append("- Full source name (company/publication)")
    lines.append("- Complete, working URL")
    lines.append("- Year of data")
    lines.append(f"- 3-5 statistics per theme")
    lines.append("")

    lines.append("### Expert Quotes Format")
    lines.append("")
    lines.append("```markdown")
    lines.append(f"## [{'PROBLEM' if is_problem else 'THEME'} NAME] Expert Insights")
    lines.append("")
    lines.append("> \"Quote text here.\"")
    lines.append("— Expert Name, Credentials/Title, Publication/Source (Year)")
    lines.append("```")
    lines.append("")
    lines.append("**Requirements:**")
    lines.append("- Real, verifiable quotes")
    lines.append("- Full attribution with credentials")
    lines.append("- 2-3 quotes per theme")
    lines.append(f"- Relevant to the theme's {'problem resolution, prevention, or host experience' if is_problem else 'appeal, trends, or psychology'}")
    lines.append("")

    if is_problem:
        lines.append("### Solution Data Format")
        lines.append("")
        lines.append("```markdown")
        lines.append("## [PROBLEM NAME] Solutions & Best Practices")
        lines.append("")
        lines.append("- Solution 1: Description with effectiveness data")
        lines.append("- Solution 2: Description with adoption statistics")
        lines.append("- Solution 3: Description with expert recommendation")
        lines.append("```")
    else:
        lines.append("### Trends Summary Format")
        lines.append("")
        lines.append("```markdown")
        lines.append("## [THEME NAME] Consumer Trends")
        lines.append("")
        lines.append("- Trend 1: Description with context")
        lines.append("- Trend 2: Description with context")
        lines.append("- Trend 3: Description with context")
        lines.append("```")

    lines.append("")
    lines.append("**Requirements:**")
    lines.append("- 3-5 actionable items")
    if is_problem:
        lines.append("- Focus on proven solutions, emerging tools, and practical workarounds")
        lines.append("- Connect to murder mystery party context specifically where possible")
    else:
        lines.append("- Focus on what's popular, emerging preferences, demographic insights")
        lines.append("- Connect to murder mystery party appeal where relevant")
    lines.append("")

    # Research Quality Standards
    lines.append("## Research Quality Standards")
    lines.append("")
    lines.append("✅ **DO:**")
    lines.append("- Use authoritative sources (market research firms, industry associations, academic studies, major publications)")
    lines.append("- Cite exact numbers with sources and URLs")
    lines.append("- Find recent data (2020-2026 preferred)")
    lines.append("- Verify all URLs work")
    lines.append("- Include diverse data types (market, consumer behavior, demographics, trends)")
    lines.append("")
    lines.append("❌ **DON'T:**")
    lines.append("- Use vague language like \"many people\" or \"growing trend\" without numbers")
    lines.append("- Cite sources without URLs")
    lines.append("- Include broken or paywalled links")
    lines.append("- Make up statistics or quotes")
    lines.append("- Use outdated data (pre-2015) unless historical context is relevant")
    lines.append("")

    # Output Format
    lines.append("## Output Format")
    lines.append("")
    lines.append("Save your research in this exact markdown structure:")
    lines.append("")
    lines.append("```markdown")
    lines.append(f"# Murder Mystery Research — Pack {pack_num}: {pack['title']}")
    lines.append("")
    lines.append(f"## 1. {pack['themes'][0]['name']}")
    lines.append("")
    lines.append("### Statistics")
    lines.append("[Table as shown above]")
    lines.append("")
    lines.append("### Expert Insights")
    lines.append("[Quotes as shown above]")
    lines.append("")
    if is_problem:
        lines.append("### Solutions & Best Practices")
    else:
        lines.append("### Consumer Trends")
    lines.append("[List as shown above]")
    lines.append("")
    lines.append("---")
    lines.append("")
    if len(pack["themes"]) > 1:
        lines.append(f"## 2. {pack['themes'][1]['name']}")
        lines.append("")
        lines.append("[Repeat format]")
        lines.append("")
        lines.append("---")
        lines.append("")
    lines.append(f"[Continue for all {theme_count} themes]")
    lines.append("```")
    lines.append("")

    # Deliverable
    pack_slug = pack['title'].lower().replace(' ', '-').replace(',', '').replace('&', 'and').replace('—', '-').replace(':', '')
    lines.append("## Deliverable")
    lines.append("")
    lines.append(f"**File name:** `mm-research-pack-{pack_num}-{pack_slug}.md`")
    lines.append("")
    lines.append("**Save location:** Same location where you found this prompt")
    lines.append("")
    lines.append("**Expected completion time:** 90-120 minutes with Claude Opus 4.6")
    lines.append("")
    expected_words = theme_count * 800
    lines.append(f"**Expected output:** ~{expected_words:,}-{expected_words + 5000:,} words of comprehensive, citation-rich research data")
    lines.append("")
    lines.append("---")
    lines.append("")

    # Final Notes
    lines.append("## Final Notes")
    lines.append("")
    lines.append("This research will be used to optimize blog posts with:")
    lines.append("- E-E-A-T signals (Experience, Expertise, Authoritativeness, Trustworthiness)")
    lines.append("- Statistics that AI platforms can cite")
    lines.append("- Expert quotes that increase credibility")
    lines.append("- Trend data that makes content feel current and authoritative")
    lines.append("")
    lines.append("Your research directly impacts whether these posts get cited by ChatGPT, Perplexity, and Google AI Overviews, so **quality and verifiability are critical**.")
    lines.append("")
    lines.append("Start researching now!")

    return "\n".join(lines)


def main():
    total_themes = 0
    for pack_num in sorted(PACKS.keys()):
        pack = PACKS[pack_num]
        content = generate_prompt_file(pack_num, pack)
        filename = f"RESEARCH-PACK-{pack_num}-PROMPT.md"
        filepath = os.path.join(OUTPUT_DIR, filename)

        with open(filepath, 'w') as f:
            f.write(content)

        theme_count = len(pack["themes"])
        total_themes += theme_count
        print(f"✓ {filename} — {theme_count} themes ({pack['title']})")

    print(f"\nTotal: {total_themes} themes across {len(PACKS)} packs")

    # Verify no duplicate theme names
    all_themes = []
    for pack_num in sorted(PACKS.keys()):
        for theme in PACKS[pack_num]["themes"]:
            all_themes.append((pack_num, theme["name"]))

    names = [t[1] for t in all_themes]
    dupes = set([n for n in names if names.count(n) > 1])
    if dupes:
        print(f"\n⚠️  DUPLICATE THEME NAMES: {dupes}")
    else:
        print("✓ No duplicate theme names")


if __name__ == "__main__":
    main()
