import { SocketModeClient } from '@slack/socket-mode';
import { WebClient } from '@slack/web-api';
import { auditLog } from '../security.js';
import { ApacheAnswerService } from './apacheAnswerService.js';
import { storage } from '../storage.js';

export class SocketModeService {
  private socketModeClient: SocketModeClient | null = null;
  private webClient: WebClient | null = null;
  private apacheAnswerService: ApacheAnswerService | null = null;

  constructor() {
    // Constructor logic will be minimal
  }

  async initialize(): Promise<void> {
    try {
      console.log('[SOCKET] Initializing Socket Mode service...');
      
      // Get configuration from database (with fallback to environment variables)
      const config = await storage.getBotConfiguration();
      console.log('[SOCKET] Configuration loaded:', !!config);
      
      // Check if we have Slack configuration
      const slackAppToken = config?.slackAppToken || process.env.SLACK_APP_TOKEN;
      const slackBotToken = config?.slackBotToken || process.env.SLACK_BOT_TOKEN;
      
      console.log('[SOCKET] Tokens available:', { 
        appToken: !!slackAppToken, 
        botToken: !!slackBotToken 
      });
      
      if (!slackAppToken || !slackBotToken) {
        console.log('[SOCKET] Slack tokens not configured in database or environment, skipping Socket Mode initialization');
        return;
      }
      
      if (!slackAppToken.startsWith('xapp-')) {
        console.error('[SOCKET] Invalid Slack App Token format - must start with "xapp-"');
        return;
      }
      
      if (!slackBotToken.startsWith('xoxb-')) {
        console.error('[SOCKET] Invalid Slack Bot Token format - must start with "xoxb-"');
        return;
      }

      // Initialize Slack services
      this.webClient = new WebClient(slackBotToken);
      const apiUrl = config?.apacheAnswerApiUrl || process.env.APACHE_ANSWER_API_URL || 'https://meta.answer.dev';
      const apiKey = config?.apacheAnswerApiKey || process.env.APACHE_ANSWER_API_KEY;
      this.apacheAnswerService = new ApacheAnswerService(apiUrl, apiKey);

      // Initialize Socket Mode client using official @slack/socket-mode
      console.log('[SOCKET] Creating SocketModeClient with app token');
      this.socketModeClient = new SocketModeClient({
        appToken: slackAppToken
      });
      console.log('[SOCKET] SocketModeClient created successfully');

      // Set up event handlers using proper @slack/socket-mode pattern
      await this.setupEventHandlers();

      // Add connection event logging
      this.socketModeClient.on('connected', () => {
        console.log('[SOCKET] Successfully connected to Slack');
      });
      
      this.socketModeClient.on('disconnected', () => {
        console.log('[SOCKET] Disconnected from Slack');
      });
      
      this.socketModeClient.on('error', (error) => {
        console.error('[SOCKET] Socket Mode error:', error);
      });
      
      // Add additional event logging for debugging
      this.socketModeClient.on('message', (data) => {
        console.log('[SOCKET] Raw message received:', data.type);
      });
      
      // Start the client
      await this.socketModeClient.start();
      
      auditLog('socket_connected', { timestamp: new Date().toISOString() });
      console.log('[SOCKET] AABot v0.3.0 Socket Mode client started successfully');
    } catch (error) {
      console.error('[SOCKET] Failed to initialize Socket Mode client:', error);
      throw error;
    }
  }

  private async setupEventHandlers(): Promise<void> {
    if (!this.socketModeClient) {
      throw new Error('Socket Mode client not initialized');
    }

    const socketModeClient = this.socketModeClient;
    const webClient = this.webClient;

    console.log('[SOCKET] Registering slash_commands event handler (note: plural)');
    
    // Handle slash commands - note the correct event name for @slack/socket-mode
    socketModeClient.on('slash_commands', async ({ ack, body, context }) => {
      console.log(`[SOCKET] *** SLASH COMMAND RECEIVED *** ${body.command} with text: "${body.text}"`);
      console.log('[SOCKET] Full command body:', JSON.stringify(body, null, 2));
      
      try {
        // Acknowledge immediately with empty response - this is critical for Socket Mode
        await ack({});
        console.log('[SOCKET] Command acknowledged successfully with empty response');
        
        // Process the command asynchronously to avoid timeout
        setImmediate(() => {
          this.handleSlashCommand(body).catch(error => {
            console.error('[SOCKET] Error in async command handler:', error);
          });
        });
        
      } catch (error) {
        console.error('[SOCKET] Error in slash command acknowledgment:', error);
        
        // Try to acknowledge with error response if ack failed
        try {
          await ack({
            response_type: 'ephemeral',
            text: 'Sorry, there was an error processing your command.'
          });
        } catch (ackError) {
          console.error('[SOCKET] Failed to acknowledge command:', ackError);
        }
      }
    });

    // Handle interactive components (buttons)
    socketModeClient.on('interactive', async ({ ack, body, context }) => {
      try {
        // Acknowledge the interaction immediately with empty response
        await ack({});
        console.log('[SOCKET] Interactive component acknowledged');

        // Handle vote buttons
        if (body.actions && body.actions[0] && body.actions[0].action_id) {
          const actionId = body.actions[0].action_id;
          
          if (actionId.startsWith('vote_')) {
            const [, direction, questionId] = actionId.split('_');
            const isUpvote = direction === 'up';
            
            console.log(`[SOCKET] Processing ${isUpvote ? 'upvote' : 'downvote'} for question ${questionId}`);
            
            try {
              // Update the message to show the vote was registered
              const updatedBlocks = body.message.blocks.map((block: any) => {
                if (block.accessory && block.accessory.action_id === actionId) {
                  return {
                    ...block,
                    accessory: {
                      ...block.accessory,
                      text: {
                        ...block.accessory.text,
                        text: `${isUpvote ? '👍' : '👎'} Voted!`
                      }
                    }
                  };
                }
                return block;
              });

              // Send updated message
              if (webClient) {
                await webClient.chat.update({
                  channel: body.channel.id,
                  ts: body.message.ts,
                  blocks: updatedBlocks,
                  text: body.message.text
                });
              }
              
            } catch (error) {
              console.error('[SOCKET] Error updating vote message:', error);
            }
          }
        }
      } catch (error) {
        console.error('[SOCKET] Error handling interactive component:', error);
      }
    });

    console.log('[SOCKET] Event handlers configured successfully');
  }

  private async handleSlashCommand(body: any): Promise<void> {
    const startTime = Date.now();
    
    if (body.command !== '/aabot-search') {
      console.log(`[SOCKET] Ignoring command ${body.command}, expected /aabot-search`);
      return;
    }

    const query = body.text?.trim();
    if (!query) {
      await this.sendErrorMessage(
        'Please provide a search query. Usage: `/aabot-search your question`',
        body.response_url
      );
      return;
    }

    // Audit log the search request
    auditLog('slack_search', {
      userId: body.user_id,
      userName: body.user_name,
      query: query,
      channelId: body.channel_id,
      teamId: body.team_id
    });

    // Send immediate response to show search started
    console.log(`[SOCKET] Sending immediate search notification via response_url`);
    try {
      const immediateResponse = await fetch(body.response_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response_type: 'ephemeral',
          text: `🔍 Searching for "${query}" in Apache Answer...`
        })
      });
      console.log(`[SOCKET] Immediate search notification sent`);
    } catch (immediateError) {
      console.error(`[SOCKET] Failed to send immediate response:`, immediateError);
    }

    // Perform the search
    console.log(`[API] Searching for: "${query}" on ${process.env.APACHE_ANSWER_API_URL || 'https://meta.answer.dev'}`);
    
    if (!this.apacheAnswerService) {
      console.error('[SOCKET] Apache Answer service not available');
      await this.sendErrorMessage('Search service temporarily unavailable', body.response_url);
      return;
    }

    try {
      const searchResults = await this.apacheAnswerService.searchQuestions(query, 1, 10);
      
      // Save search to database REGARDLESS of result count
      try {
        await storage.logSlackQuestion({
          userId: body.user_id,
          userName: body.user_name || 'Unknown User',
          query: query,
          channelId: body.channel_id,
          teamId: body.team_id,
          resultCount: searchResults?.length || 0,
          responseTime: Date.now() - startTime
        });
      } catch (dbError) {
        console.error('[SOCKET] Failed to log question to database:', dbError);
        // Continue processing even if database logging fails
      }
      
      if (!searchResults || searchResults.length === 0) {
        console.log(`[SOCKET] No results found for: ${query}`);
        await this.sendErrorMessage(`No results found for "${query}". Try different keywords.`, body.response_url);
        return;
      }

      console.log(`[SOCKET] Search completed, found ${searchResults.length} results`);

      // Format and send results via response_url for delayed response
      console.log(`[SOCKET] Sending ${searchResults.length} results via response_url`);
      
      const formattedResults = await this.formatSearchResults(searchResults, query);
      
      try {
        const delayedResponse = await fetch(body.response_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            response_type: 'in_channel',
            blocks: formattedResults.blocks,
            text: formattedResults.text
          })
        });

        if (!delayedResponse.ok) {
          const errorText = await delayedResponse.text();
          console.error(`[SOCKET] Failed to send search results: ${delayedResponse.status} - ${errorText}`);
        } else {
          console.log(`[SOCKET] Search results sent successfully via response_url`);
        }
      } catch (responseError) {
        console.error(`[SOCKET] Error sending search results:`, responseError);
      }

    } catch (error) {
      console.error(`[SOCKET] Error processing search:`, error);
      await this.sendErrorMessage('An error occurred while processing your search.', body.response_url);
    }
  }

  private async sendErrorMessage(message: string, responseUrl: string): Promise<void> {
    try {
      await fetch(responseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response_type: 'ephemeral',
          text: message
        })
      });
    } catch (error) {
      console.error('[SOCKET] Failed to send error message:', error);
    }
  }

  private async formatSearchResults(results: any[], query: string) {
    // Check if voting is enabled
    const config = await storage.getBotConfiguration();
    const votingEnabled = config?.enableVoting ?? true;

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🔍 *Search Results for "${query}"*\nFound ${results.length} result${results.length !== 1 ? 's' : ''} in Apache Answer:`
        }
      },
      { type: 'divider' }
    ];

    // Add each result as a block
    results.slice(0, 5).forEach((result, index) => {
      const title = result.title || 'Untitled';
      const url = result.url || '#';
      
      // Improved excerpt extraction - try multiple fields from API response
      let excerpt = 'No description available';
      if (result.snippet && result.snippet.trim()) {
        excerpt = result.snippet.trim();
      } else if (result.excerpt && result.excerpt.trim()) {
        excerpt = result.excerpt.trim();
      } else if (result.description && result.description.trim()) {
        excerpt = result.description.trim();
      } else if (result.content && result.content.trim()) {
        // Remove HTML tags if present
        excerpt = result.content.replace(/<[^>]*>/g, '').trim();
      } else if (result.parsed_text && result.parsed_text.trim()) {
        excerpt = result.parsed_text.trim();
      }
      
      // Decode HTML entities if present
      if (excerpt !== 'No description available') {
        excerpt = excerpt
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>');
      }
      
      const truncatedExcerpt = excerpt.length > 200 ? excerpt.substring(0, 197) + '...' : excerpt;
      
      const sectionBlock = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${index + 1}. <${url}|${title}>*\n${truncatedExcerpt}`
        }
      } as any;

      // Add vote buttons if voting is enabled
      if (votingEnabled) {
        sectionBlock.accessory = {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '👍 Helpful'
          },
          action_id: `vote_up_${result.question_id || index}`,
          value: JSON.stringify({
            question_id: result.question_id || result.id,
            title: title,
            url: url,
            vote_type: 'up'
          })
        };
      }
      
      blocks.push(sectionBlock);

      // Add downvote button as a separate action if voting enabled
      if (votingEnabled) {
        blocks.push({
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '👎 Not helpful'
              },
              action_id: `vote_down_${result.question_id || index}`,
              value: JSON.stringify({
                question_id: result.question_id || result.id,
                title: title,
                url: url,
                vote_type: 'down'
              })
            }
          ]
        } as any);
      }
    });

    if (results.length > 5) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `_Showing top 5 of ${results.length} results_`
          }
        ]
      } as any);
    }

    return {
      blocks,
      text: `Found ${results.length} results for "${query}"`
    };
  }

  async stop(): Promise<void> {
    if (this.socketModeClient) {
      try {
        await this.socketModeClient.disconnect();
        this.socketModeClient = null;
        this.webClient = null;
        this.apacheAnswerService = null;
        console.log('[SOCKET] Socket Mode client disconnected and cleaned up');
        auditLog('socket_disconnected', { timestamp: new Date().toISOString() });
      } catch (error) {
        console.error('[SOCKET] Error disconnecting Socket Mode client:', error);
        throw error;
      }
    }
  }

  async start(): Promise<void> {
    if (this.socketModeClient) {
      console.log('[SOCKET] Socket Mode client already running');
      return;
    }
    
    console.log('[SOCKET] Starting Socket Mode client...');
    await this.initialize();
  }

  isConnected(): boolean {
    return this.socketModeClient !== null;
  }

  getStatus(): { connected: boolean; hasConfig: boolean } {
    return {
      connected: this.socketModeClient !== null,
      hasConfig: this.webClient !== null && this.apacheAnswerService !== null
    };
  }
}

// Global instance for status checking
let globalSocketModeService: SocketModeService | null = null;

// Export function to get Socket Mode status (for routes)
export async function getSocketModeStatus(): Promise<boolean> {
  if (!globalSocketModeService) {
    return false;
  }
  
  return (globalSocketModeService as any).socketModeClient !== null;
}

// Export function to initialize and set global instance
export function initializeGlobalSocketMode(): void {
  globalSocketModeService = new SocketModeService();
  globalSocketModeService.initialize().catch(error => {
    console.error('[STARTUP] Failed to initialize Socket Mode:', error);
  });
}

export function getGlobalSocketModeService(): SocketModeService | null {
  return globalSocketModeService;
}

export function ensureGlobalSocketModeService(): SocketModeService {
  if (!globalSocketModeService) {
    globalSocketModeService = new SocketModeService();
  }
  return globalSocketModeService;
}