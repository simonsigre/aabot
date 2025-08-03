# Slack Setup Guide for AABot

This guide will help you set up AABot (Apache Answer Bot) in your Slack workspace using Socket Mode.

## Step 1: Create Slack App

1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Click **"Create New App"** → **"From an app manifest"**
3. Select your workspace
4. Copy and paste the contents of `slack-app-manifest.json` from this project
5. Click **"Create"**

## Step 2: Generate Tokens

### App-Level Token (for Socket Mode)
1. Go to **"Basic Information"** → **"App-Level Tokens"**
2. Click **"Generate Token and Scopes"**
3. Name: `AABot Socket Token`
4. Add scope: `connections:write`
5. Click **"Generate"**
6. Copy the token (starts with `xapp-`)

### Bot Token
1. Go to **"OAuth & Permissions"**
2. Click **"Install to Workspace"**
3. Authorize the app
4. Copy the **"Bot User OAuth Token"** (starts with `xoxb-`)

## Step 3: Configure Environment Variables

Add these to your Replit secrets:

```
SLACK_APP_TOKEN=xapp-1-AXXXXXXXX-XXXXXXXXX-your-actual-token-here
SLACK_BOT_TOKEN=xoxb-XXXXXXXXX-XXXXXXXXX-your-actual-token-here
SLACK_CHANNEL_ID=C1234567890
```

To find your channel ID:
1. Open Slack in browser
2. Go to your target channel
3. Look at the URL: `/archives/C1234567890` (the C... part is your channel ID)

## Step 4: Critical Configuration Fix

**MOST IMPORTANT STEP** - This fixes the "dispatch_failed" error:

1. In your Slack app, go to **"Slash Commands"**
2. Click on **"/aabot-search"**
3. **Clear the "Request URL" field completely** (must be empty)
4. Click **"Save"**

This is essential because Socket Mode uses WebSocket, not HTTP URLs.

## Step 5: Test the Setup

1. Restart your Replit application
2. Check logs for: `[SOCKET] AABot v0.3.0 connected to Slack via Socket Mode`
3. In Slack, try: `/aabot-search how to reset password`
4. You should see search results from Apache Answer

## Troubleshooting

### "dispatch_failed" Error
- **Cause**: Request URL field has a value
- **Fix**: Go to Slash Commands → /aabot-search → clear Request URL field → Save

### Socket Mode Not Connecting
- Check `SLACK_APP_TOKEN` starts with `xapp-`
- Verify Socket Mode is enabled in app settings
- Ensure `connections:write` scope is added

### Bot Not Responding
- Check `SLACK_BOT_TOKEN` starts with `xoxb-`
- Verify bot is added to the channel
- Confirm `SLACK_CHANNEL_ID` is correct

### Search Not Working
- Check `APACHE_ANSWER_API_URL` and `APACHE_ANSWER_API_KEY` are set
- Verify Apache Answer instance is accessible

## What Works After Setup

✅ Search Apache Answer from Slack with `/aabot-search`
✅ Interactive voting on search results  
✅ Real-time question logging in web dashboard
✅ Works behind firewalls (no webhook URLs needed)
✅ Analytics and usage tracking

## Support

If you continue having issues:
1. Check the application logs in Replit console
2. Verify all environment variables are set correctly
3. Ensure the Apache Answer instance is accessible
4. Try recreating the Slack app if problems persist