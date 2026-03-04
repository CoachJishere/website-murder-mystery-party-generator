#!/usr/bin/env node

import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, readFileSync } from 'fs';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Post data from the query we already ran
const posts = [
  {
    num: 21,
    id: 'bd829048-623b-467a-94e2-c7676bdf8ef2',
    title: 'How to Host a Zombie Apocalypse Murder Mystery That Will Have Your Guests Fighting for Survival',
    slug: 'how-to-host-a-zombie-apocalypse-murder-mystery-that-will-have-your-guests-fighting-for-survival',
    meta: 'Create engaging zombie apocalypse murder mystery parties combining survival horror with detective work. Balanced tension, resource management, and investigation.'
  },
  {
    num: 22,
    id: '17325502-e5ad-4b92-bde3-0857f82a9254',
    title: 'Medical Examiner Murder Mystery Themes: Forensic Experts Solve Deadly Cases',
    slug: 'medical-examiner-murder-mystery-themes-forensic-investigations',
    meta: 'Create murder mysteries featuring medical examiner characters who use forensic expertise to solve crimes. Generate custom autopsy-driven investigations with scientific clues.'
  },
  {
    num: 23,
    id: 'e69f4207-ddbd-48fa-bbcc-7c08a16ed49b',
    title: 'Art Gallery Murder Mystery Party Planning: Create Sophisticated Creative Crimes',
    slug: 'art-gallery-murder-mystery-party-planning-create-sophisticated-creative-crimes',
    meta: 'Appreciate deadly art with sophisticated gallery murder mystery parties featuring artists, critics, and creative crimes.'
  },
  {
    num: 24,
    id: '9016f13f-eebd-4300-984a-e7fd4066b465',
    title: 'Murder Mystery Party for Birthday Celebrations: Make Their Special Day Unforgettable',
    slug: 'murder-mystery-party-for-birthday-celebrations-make-their-special-day-unforgettable',
    meta: 'Celebrate another year with unforgettable birthday murder mystery parties customized for the guest of honor.'
  },
  {
    num: 25,
    id: '6c030a19-7884-42fa-aecb-d97ef2b0bdac',
    title: 'Unique Underwater Murder Mystery Plots That Will Make a Splash at Your Party',
    slug: 'unique-underwater-murder-mystery-plots-that-will-make-a-splash-at-your-party',
    meta: 'Dive deep with aquatic murder mystery adventures featuring submarines, marine biologists, and oceanic secrets.'
  },
  {
    num: 26,
    id: '4662e124-df40-455b-852d-2d8f2e13515e',
    title: 'How to Fix Guests Breaking Character: Keep Your Murder Mystery Party Immersive',
    slug: 'how-to-fix-guests-breaking-character-keep-your-murder-mystery-party-immersive',
    meta: 'Keep everyone in character with engaging custom roles and clear guidelines that maintain immersion throughout the party.'
  },
  {
    num: 27,
    id: '92cc7ea6-11d3-4263-8b06-84058d4de32a',
    title: '5 Spy Thriller Murder Mystery Themes That Will Have Your Guests Going Undercover',
    slug: '5-spy-thriller-murder-mystery-themes-that-will-have-your-guests-going-undercover',
    meta: 'Go undercover with espionage murder mystery parties featuring secret agents, double crosses, and international intrigue.'
  },
  {
    num: 28,
    id: '2aaee48f-eb45-4183-8340-f92616812fe2',
    title: 'How to Host a Fairy Tale Murder Mystery Party: Once Upon a Crime',
    slug: 'how-to-host-a-fairy-tale-murder-mystery-party-once-upon-a-crime',
    meta: 'Once upon a crime with whimsical fairy tale murder mystery parties featuring beloved characters with dark secrets.'
  },
  {
    num: 29,
    id: 'cea7e6f4-77b7-448d-aeab-daa6ccff7593',
    title: 'Lawyer Murder Mystery Themes: Courtroom Drama and Legal Intrigue',
    slug: 'lawyer-murder-mystery-themes-courtroom-drama-legal-intrigue',
    meta: 'Create murder mysteries featuring lawyer characters who navigate legal ethics, courtroom secrets, and professional rivalries. Generate custom legal thriller scenarios.'
  },
  {
    num: 30,
    id: 'a25bacd6-e0e9-4906-84cf-eb50500ee473',
    title: 'Cruise Ship Murder Mystery Party Guide: Set Sail for Murder on the High Seas',
    slug: 'cruise-ship-murder-mystery-party-guide-set-sail-for-murder-on-the-high-seas',
    meta: 'Set sail for murder with luxury cruise ship mystery parties featuring passengers, crew, and high-seas drama.'
  }
];

// Since we already fetched the content via MCP tool, it's in the file
// Let me read individual post files that need to be created separately

console.log('This script requires post content files to be created first.');
console.log('Please run the MCP fetch commands individually for each post.');
console.log('\nTo translate, we need the English content for each post.');
