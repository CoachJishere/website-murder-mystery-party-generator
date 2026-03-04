#!/usr/bin/env node
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

console.log('Testing Anthropic API connection...');
console.log('API Key present:', !!process.env.ANTHROPIC_API_KEY);
console.log('API Key prefix:', process.env.ANTHROPIC_API_KEY?.substring(0, 15));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

try {
  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: 'Say "test successful" if you can read this.'
    }]
  });

  console.log('\n✓ API call successful!');
  console.log('Response:', message.content[0].text);
  console.log('Tokens:', message.usage);
} catch (error) {
  console.error('\n✗ API call failed:',error.message);
  console.error('Error details:', error);
}
