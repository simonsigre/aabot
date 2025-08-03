# Fixing "dispatch_failed" Error in AABot

## Issue Analysis

The Socket Mode client is connecting successfully to Slack:
```
[SOCKET] Successfully connected to Slack
[SOCKET] AABot v0.3.0 Socket Mode client started successfully
```

However, slash commands are not reaching our event handler, indicating a Slack app configuration issue.

## Root Cause

The "dispatch_failed" error typically occurs when:

1. **Socket Mode permissions missing**: The app needs proper Socket Mode scopes
2. **Slash command not properly registered**: The command isn't associated with the Socket Mode app
3. **App installation issues**: The app isn't properly installed in the workspace
4. **Token mismatch**: App-level token doesn't match the bot token workspace

## Solution Steps

### 1. Verify Slack App Configuration

In your Slack app settings (https://api.slack.com/apps):

1. **Socket Mode**: Ensure "Socket Mode" is enabled
2. **App-Level Tokens**: Generate an app-level token with `connections:write` scope
3. **Slash Commands**: Verify `/aabot-search` is registered under "Slash Commands"
4. **OAuth Scopes**: Ensure bot has `commands` scope
5. **Install App**: Reinstall the app to your workspace after any changes

### 2. Check Environment Variables

Verify you have the correct tokens:
- `SLACK_APP_TOKEN`: Should start with `xapp-`
- `SLACK_BOT_TOKEN`: Should start with `xoxb-`

### 3. Use Our Manifest

Apply the provided `slack-app-manifest.json` which includes all required settings:
- Socket Mode enabled
- Proper OAuth scopes including `commands`
- Slash command `/aabot-search` configured
- Interactive features enabled

### 4. Test Connection

The AABot dashboard should show:
- Socket Mode: Connected ✓
- Apache Answer: Connected ✓
- Overall Status: Connected ✓

## Quick Fix

1. Go to https://api.slack.com/apps
2. Select your AABot app
3. Go to "Socket Mode" → Enable if not already
4. Go to "App-Level Tokens" → Create token with `connections:write`
5. Copy the `xapp-` token to `SLACK_APP_TOKEN`
6. Go to "Install App" → Reinstall to workspace
7. Test `/aabot-search test` in any channel

This should resolve the dispatch_failed error immediately.