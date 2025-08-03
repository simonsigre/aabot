#!/usr/bin/env node

/**
 * Migration script to transfer configuration from environment variables 
 * to encrypted database storage
 */

import { storage } from './server/storage.ts';
import { encryptionService } from './server/services/encryptionService.ts';

async function migrateConfiguration() {
  console.log('[MIGRATION] Starting configuration migration from environment variables to encrypted database...');

  try {
    // Check if configuration already exists
    const existingConfig = await storage.getBotConfiguration();
    if (existingConfig && existingConfig.encryptionSalt) {
      console.log('[MIGRATION] Configuration already exists in database with encryption. Skipping migration.');
      console.log('[MIGRATION] Existing configuration:');
      console.log(`  - Workspace: ${existingConfig.workspaceName}`);
      console.log(`  - Apache Answer URL: ${existingConfig.apacheAnswerApiUrl ? 'configured' : 'not set'}`);
      console.log(`  - Apache Answer API Key: ${existingConfig.apacheAnswerApiKey ? 'configured' : 'not set'}`);
      console.log(`  - Slack Bot Token: ${existingConfig.slackBotToken ? 'configured' : 'not set'}`);
      console.log(`  - Slack App Token: ${existingConfig.slackAppToken ? 'configured' : 'not set'}`);
      console.log(`  - Slack Channel ID: ${existingConfig.slackChannelId ? 'configured' : 'not set'}`);
      console.log(`  - Slack Signing Secret: ${existingConfig.slackSigningSecret ? 'configured' : 'not set'}`);
      console.log(`  - Search Limit: ${existingConfig.searchLimit}`);
      console.log(`  - Voting Enabled: ${existingConfig.enableVoting}`);
      return;
    }

    // Gather environment variables
    const configData = {
      workspaceName: "Apache Team",
      apacheAnswerApiUrl: process.env.APACHE_ANSWER_API_URL || "",
      apacheAnswerApiKey: process.env.APACHE_ANSWER_API_KEY || "",
      slackBotToken: process.env.SLACK_BOT_TOKEN || "",
      slackAppToken: process.env.SLACK_APP_TOKEN || "",
      slackChannelId: process.env.SLACK_CHANNEL_ID || "",
      slackSigningSecret: process.env.SLACK_SIGNING_SECRET || "",
      searchLimit: parseInt(process.env.SEARCH_RESULT_LIMIT || "10"),
      enableVoting: true,
    };

    console.log('[MIGRATION] Found environment variables:');
    console.log(`  - APACHE_ANSWER_API_URL: ${configData.apacheAnswerApiUrl ? 'configured' : 'not set'}`);
    console.log(`  - APACHE_ANSWER_API_KEY: ${configData.apacheAnswerApiKey ? 'configured' : 'not set'}`);
    console.log(`  - SLACK_BOT_TOKEN: ${configData.slackBotToken ? 'configured' : 'not set'}`);
    console.log(`  - SLACK_APP_TOKEN: ${configData.slackAppToken ? 'configured' : 'not set'}`);
    console.log(`  - SLACK_CHANNEL_ID: ${configData.slackChannelId ? 'configured' : 'not set'}`);
    console.log(`  - SLACK_SIGNING_SECRET: ${configData.slackSigningSecret ? 'configured' : 'not set'}`);
    console.log(`  - SEARCH_RESULT_LIMIT: ${configData.searchLimit}`);

    // Generate encryption salt and test encryption
    const salt = encryptionService.generateSalt();
    console.log('[MIGRATION] Generated encryption salt');

    if (!encryptionService.testEncryption(salt)) {
      throw new Error('Encryption test failed - cannot proceed with migration');
    }
    console.log('[MIGRATION] Encryption test passed');

    // Mask sensitive values for logging
    const maskValue = (value) => {
      if (!value) return 'not set';
      if (value.length <= 8) return '****';
      return value.slice(0, 4) + '****' + value.slice(-4);
    };

    console.log('[MIGRATION] Creating encrypted configuration with values:');
    console.log(`  - Apache Answer URL: ${configData.apacheAnswerApiUrl || 'not set'}`);
    console.log(`  - Apache Answer API Key: ${maskValue(configData.apacheAnswerApiKey)}`);
    console.log(`  - Slack Bot Token: ${maskValue(configData.slackBotToken)}`);
    console.log(`  - Slack App Token: ${maskValue(configData.slackAppToken)}`);
    console.log(`  - Slack Channel ID: ${configData.slackChannelId || 'not set'}`);
    console.log(`  - Slack Signing Secret: ${maskValue(configData.slackSigningSecret)}`);

    // Create encrypted configuration in database
    if (existingConfig) {
      // Update existing configuration
      const updatedConfig = await storage.updateBotConfiguration(configData);
      console.log('[MIGRATION] Updated existing configuration with encrypted values');
      console.log(`[MIGRATION] Configuration ID: ${updatedConfig.id}`);
    } else {
      // Create new configuration
      const createdConfig = await storage.createBotConfiguration(configData);
      console.log('[MIGRATION] Created new encrypted configuration');
      console.log(`[MIGRATION] Configuration ID: ${createdConfig.id}`);
    }

    // Verify the configuration can be decrypted
    const verifyConfig = await storage.getBotConfiguration();
    if (!verifyConfig) {
      throw new Error('Failed to retrieve configuration after migration');
    }

    console.log('[MIGRATION] Verification successful:');
    console.log(`  - Apache Answer URL: ${verifyConfig.apacheAnswerApiUrl ? 'decrypted successfully' : 'no value'}`);
    console.log(`  - Apache Answer API Key: ${verifyConfig.apacheAnswerApiKey ? 'decrypted successfully' : 'no value'}`);
    console.log(`  - Slack Bot Token: ${verifyConfig.slackBotToken ? 'decrypted successfully' : 'no value'}`);
    console.log(`  - Slack App Token: ${verifyConfig.slackAppToken ? 'decrypted successfully' : 'no value'}`);
    console.log(`  - Slack Channel ID: ${verifyConfig.slackChannelId ? 'decrypted successfully' : 'no value'}`);
    console.log(`  - Slack Signing Secret: ${verifyConfig.slackSigningSecret ? 'decrypted successfully' : 'no value'}`);

    console.log('\n[MIGRATION] ✅ Configuration migration completed successfully!');
    console.log('\n[MIGRATION] 🔐 All sensitive values are now encrypted in the database');
    console.log('[MIGRATION] 🌐 You can now manage configuration through the web UI');
    console.log('[MIGRATION] 🚀 The application will use database values instead of environment variables');
    
    console.log('\n[MIGRATION] Next steps:');
    console.log('  1. Test the configuration panel in the web UI');
    console.log('  2. Verify Slack and Apache Answer connections');
    console.log('  3. Optionally remove environment variables from secrets (they are now redundant)');

  } catch (error) {
    console.error('[MIGRATION] ❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateConfiguration()
  .then(() => {
    console.log('[MIGRATION] Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[MIGRATION] Migration script failed:', error);
    process.exit(1);
  });