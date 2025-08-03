#!/usr/bin/env node

/**
 * Test script to verify configuration encryption/decryption
 */

import { storage } from './server/storage.ts';

async function testConfiguration() {
  console.log('[TEST] Testing configuration decryption...');

  try {
    const config = await storage.getBotConfiguration();
    if (!config) {
      console.log('[TEST] No configuration found');
      return;
    }

    console.log('[TEST] Configuration found:');
    console.log(`  - ID: ${config.id}`);
    console.log(`  - Workspace: ${config.workspaceName}`);
    console.log(`  - Apache Answer URL: ${config.apacheAnswerApiUrl || 'not set'}`);
    console.log(`  - Apache Answer API Key: ${config.apacheAnswerApiKey ? 'configured' : 'not set'}`);
    console.log(`  - Slack Bot Token: ${config.slackBotToken ? 'configured' : 'not set'}`);
    console.log(`  - Slack App Token: ${config.slackAppToken ? 'configured' : 'not set'}`);
    console.log(`  - Slack Channel ID: ${config.slackChannelId || 'not set'}`);
    console.log(`  - Slack Signing Secret: ${config.slackSigningSecret ? 'configured' : 'not set'}`);
    console.log(`  - Search Limit: ${config.searchLimit}`);
    console.log(`  - Voting Enabled: ${config.enableVoting}`);

  } catch (error) {
    console.error('[TEST] Failed to test configuration:', error);
  }
}

testConfiguration();