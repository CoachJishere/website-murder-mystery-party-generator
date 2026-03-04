/**
 * Test Make.com API Connection
 * Fetches scenarios to verify authentication works
 */

import { config } from 'dotenv';
config();

const MAKE_API_TOKEN = process.env.MAKE_API_TOKEN;
const MAKE_ORGANIZATION_ID = process.env.MAKE_ORGANIZATION_ID;
const MAKE_REGION = process.env.MAKE_REGION || 'eu2';

const BASE_URL = `https://${MAKE_REGION}.make.com/api/v2`;

async function testConnection() {
  console.log('🔌 Testing Make.com API connection...\n');
  console.log(`Region: ${MAKE_REGION}`);
  console.log(`Organization ID: ${MAKE_ORGANIZATION_ID}\n`);

  try {
    // Test with organization as query parameter
    const endpoint = `${BASE_URL}/scenarios?organizationId=${MAKE_ORGANIZATION_ID}`;
    console.log(`Testing endpoint: ${endpoint}\n`);
    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Token ${MAKE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const scenarios = data.scenarios || [];

    console.log(`✅ Connection successful!`);
    console.log(`\n📋 Found ${scenarios.length} scenarios:\n`);

    // Filter MM-related scenarios
    const mmScenarios = scenarios.filter(s =>
      s.name.toLowerCase().includes('mystery') ||
      s.name.toLowerCase().includes('mm') ||
      s.name.toLowerCase().includes('blog') ||
      s.name.toLowerCase().includes('translate') ||
      s.name.toLowerCase().includes('post')
    );

    if (mmScenarios.length > 0) {
      console.log(`🎯 MM-related scenarios (${mmScenarios.length}):\n`);
      mmScenarios.forEach(scenario => {
        console.log(`  📌 ${scenario.name}`);
        console.log(`     ID: ${scenario.id}`);
        console.log(`     Status: ${scenario.scheduling?.type || 'manual'}`);
        console.log('');
      });
    }

    console.log(`\n💾 Saving all scenarios to temp-files/make-scenarios.json`);

    // Save to file
    const { writeFileSync } = await import('fs');
    const { join, dirname } = await import('path');
    const { fileURLToPath } = await import('url');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const outputPath = join(__dirname, '../temp-files/make-scenarios.json');

    writeFileSync(outputPath, JSON.stringify({ scenarios, mmScenarios }, null, 2));
    console.log(`✅ Scenarios saved!`);

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    throw error;
  }
}

testConnection()
  .then(() => {
    console.log('\n✨ Make.com API integration ready!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  });
