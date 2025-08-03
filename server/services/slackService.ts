import { WebClient, ChatPostMessageArguments } from "@slack/web-api";
import { storage } from "../storage";

let slack: WebClient | null = null;

// Initialize Slack client dynamically
async function getSlackClient(): Promise<WebClient | null> {
  if (slack) return slack;
  
  try {
    const config = await storage.getBotConfiguration();
    const token = config?.slackBotToken || process.env.SLACK_BOT_TOKEN;
    
    if (token) {
      slack = new WebClient(token);
      return slack;
    }
  } catch (error) {
    console.warn('[SLACK] Failed to get configuration:', error);
  }
  
  return null;
}

export interface SearchResultBlock {
  title: string;
  snippet: string;
  votes: number;
  answers: number;
  author: string;
  tags: string[];
  url: string;
  accepted: boolean;
}

/**
 * Sends a structured message to a Slack channel using the Slack Web API
 */
export async function sendSlackMessage(
  message: ChatPostMessageArguments
): Promise<string | undefined> {
  const slackClient = await getSlackClient();
  
  if (!slackClient) {
    console.warn('Slack client not initialized - tokens not configured');
    return undefined;
  }
  
  try {
    const response = await slackClient.chat.postMessage(message);
    return response.ts;
  } catch (error) {
    console.error('Error sending Slack message:', error);
    throw error;
  }
}

/**
 * Sends error message to channel
 */
export async function sendErrorMessage(
  message: string,
  channelId?: string
): Promise<string | undefined> {
  let channel = channelId;
  
  if (!channel) {
    try {
      const config = await storage.getBotConfiguration();
      channel = config?.slackChannelId || process.env.SLACK_CHANNEL_ID || '';
    } catch (error) {
      channel = process.env.SLACK_CHANNEL_ID || '';
    }
  }
  
  return sendSlackMessage({
    channel,
    text: message
  });
}

/**
 * Sends search results to Slack channel (for direct API usage, not Socket Mode)
 */
export async function sendSearchResults(
  query: string,
  results: SearchResultBlock[],
  channelId?: string
): Promise<string | undefined> {
  let channel = channelId;
  
  if (!channel) {
    try {
      const config = await storage.getBotConfiguration();
      channel = config?.slackChannelId || process.env.SLACK_CHANNEL_ID || '';
    } catch (error) {
      channel = process.env.SLACK_CHANNEL_ID || '';
    }
  }
  
  if (results.length === 0) {
    return sendSlackMessage({
      channel,
      text: `No results found for "${query}"`
    });
  }

  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🔍 *Search Results for "${query}"*\nFound ${results.length} result${results.length !== 1 ? 's' : ''}:`
      }
    },
    { type: 'divider' }
  ];

  // Add each result as a block
  results.slice(0, 5).forEach((result, index) => {
    const title = result.title || 'Untitled';
    const url = result.url || '#';
    const excerpt = result.snippet || 'No description available';
    const truncatedExcerpt = excerpt.length > 200 ? excerpt.substring(0, 197) + '...' : excerpt;
    
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${index + 1}. <${url}|${title}>*\n${truncatedExcerpt}\n_${result.votes} votes • ${result.answers} answers • by ${result.author}_`
      }
    });
  });

  if (results.length > 5) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `_Showing top 5 of ${results.length} results_`
      }
    });
  }

  return sendSlackMessage({
    channel,
    blocks,
    text: `Found ${results.length} results for "${query}"`
  });
}