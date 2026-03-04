import { config } from 'dotenv';

// Load environment variables FIRST, before importing other modules
config();

import { fetchGAMetrics } from './fetchGAMetrics.mjs';
import { fetchGSCMetrics } from './fetchGSCMetrics.mjs';

console.log('🔍 Fetching analytics data...\n');

try {
  await fetchGAMetrics();
} catch (error) {
  console.error('❌ GA4 error:', error.message);
}

try {
  await fetchGSCMetrics();
} catch (error) {
  console.error('❌ GSC error:', error.message);
}

console.log('\n✨ Done! Analytics data saved to temp-files/');
console.log('   - ga-metrics.json');
console.log('   - gsc-metrics.json');
