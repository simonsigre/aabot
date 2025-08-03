import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { insertBotConfigurationSchema, insertSlackCommandSchema } from "@shared/schema";
import type { ConfigurationUpdate } from "./storage";
import { ApacheAnswerService } from "./services/apacheAnswerService";
import { sendSearchResults, sendErrorMessage, sendSlackMessage } from "./services/slackService";
import { 
  apiRateLimit, 
  searchRateLimit,
  validateSearchQuery,
  validateVoteInput,
  createErrorResponse,
  sanitiseError,
  auditLog
} from "./security";

import { BUILD_INFO } from "@shared/version";
import { getSocketModeStatus, getGlobalSocketModeService, ensureGlobalSocketModeService } from "./services/socketModeService";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Apply rate limiting to all API routes
  app.use('/api', apiRateLimit);

  // Version endpoint
  app.get("/api/version", (req, res) => {
    res.json(BUILD_INFO);
  });

  // Get bot configuration
  app.get("/api/bot/config", async (req, res) => {
    try {
      const config = await storage.getBotConfiguration();
      res.json(config);
    } catch (error) {
      console.error("Error getting bot configuration:", sanitiseError(error));
      const errorResponse = createErrorResponse(error, "Failed to get bot configuration");
      res.status(500).json(errorResponse);
    }
  });

  // Update bot configuration
  app.put("/api/bot/config", async (req, res) => {
    try {
      // Parse and clean the request body
      const parsedData = insertBotConfigurationSchema.parse(req.body);
      
      // Convert null values to undefined for our ConfigurationUpdate interface
      const cleanedData: ConfigurationUpdate = Object.fromEntries(
        Object.entries(parsedData).map(([key, value]) => [key, value === null ? undefined : value])
      ) as ConfigurationUpdate;
      
      const config = await storage.updateBotConfiguration(cleanedData);
      
      auditLog('CONFIG_UPDATE', {
        updated_fields: Object.keys(cleanedData),
        workspace: cleanedData.workspaceName
      }, req);
      
      res.json(config);
    } catch (error) {
      console.error("Error updating bot configuration:", sanitiseError(error));
      const errorResponse = createErrorResponse(error, "Failed to update bot configuration");
      res.status(500).json(errorResponse);
    }
  });

  // Get bot analytics
  app.get("/api/bot/analytics", async (req, res) => {
    try {
      const analytics = await storage.getBotAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error getting bot analytics:", sanitiseError(error));
      const errorResponse = createErrorResponse(error, "Failed to get bot analytics");
      res.status(500).json(errorResponse);
    }
  });

  // Search Apache Answer
  app.get("/api/search", searchRateLimit, validateSearchQuery, async (req, res) => {
    try {
      const { q: query, limit = "10" } = req.query;

      const config = await storage.getBotConfiguration();
      if (!config) {
        return res.status(500).json({ message: "Bot configuration not found" });
      }

      const apacheAnswerService = new ApacheAnswerService(
        config.apacheAnswerApiUrl,
        config.apacheAnswerApiKey
      );

      await storage.incrementSearchCount();
      await storage.incrementApiCallCount();

      const searchQuery = typeof query === 'string' ? query : '';
      const searchLimit = typeof limit === 'string' ? limit : '10';
      
      // Apply AABot's SEARCH_RESULT_LIMIT to control returned results
      const searchResultLimit = parseInt(process.env.SEARCH_RESULT_LIMIT || '10');
      const requestedLimit = Math.min(parseInt(searchLimit), config.searchLimit, searchResultLimit);
      
      const results = await apacheAnswerService.searchQuestions(
        searchQuery,
        1,
        requestedLimit
      );

      // Store search results in database for analytics
      try {
        for (const result of results) {
          await storage.createSearchResult({
            questionId: result.url.split('/').pop() || '',
            title: result.title,
            snippet: result.snippet || 'No description available',
            votes: result.votes || 0,
            answers: result.answers || 0,
            tags: Array.isArray(result.tags) ? result.tags : [],
            author: result.author || 'Unknown',
            views: 0, // This field doesn't exist in SearchResultBlock
            accepted: result.accepted || false,
            url: result.url,
          });
        }
      } catch (dbError) {
        console.log('[API] Failed to store search results in database:', dbError);
        // Continue processing even if database storage fails
      }

      res.json({
        query: searchQuery,
        results,
        count: results.length
      });
    } catch (error) {
      console.error("Error searching:", sanitiseError(error));
      
      // Check if it's an API accessibility issue
      const errorMessage = error instanceof Error ? error.message : 'Search failed';
      const isApiAccessError = errorMessage.includes('HTML instead of JSON') || 
                              errorMessage.includes('not be publicly accessible');
      
      if (isApiAccessError) {
        res.status(503).json({ 
          error: 'Apache Answer API is not accessible',
          details: 'The configured Apache Answer instance is returning HTML instead of JSON, even with authentication. This typically means the instance does not support API access or the API key is invalid. Please verify: 1) Your Apache Answer instance supports API access, 2) The API key is valid for your instance, 3) Your instance URL is correct.',
          apiUrl: process.env.APACHE_ANSWER_API_URL || 'https://meta.answer.dev',
          suggestion: 'Try using your own Apache Answer instance instead of the demo instance.'
        });
      } else {
        const errorResponse = createErrorResponse(error, "Search failed");
        res.status(500).json(errorResponse);
      }
    }
  });





  // Vote on a question/answer directly via API
  app.post("/api/vote", validateVoteInput, async (req, res) => {
    try {
      const { questionId, direction } = req.body;

      const config = await storage.getBotConfiguration();
      if (!config) {
        return res.status(500).json({ message: "Bot configuration not found" });
      }

      if (!config.enableVoting) {
        return res.status(403).json({ message: "Voting is currently disabled" });
      }

      const apacheAnswerService = new ApacheAnswerService(
        config.apacheAnswerApiUrl,
        config.apacheAnswerApiKey
      );

      await storage.incrementVoteCount();
      await storage.incrementApiCallCount();

      if (direction === 'up') {
        await apacheAnswerService.voteUp(questionId);
      } else {
        await apacheAnswerService.voteDown(questionId);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error voting:", sanitiseError(error));
      auditLog('VOTE_API_ERROR', { 
        questionId: req.body.questionId, 
        direction: req.body.direction,
        error: sanitiseError(error) 
      }, req);
      const errorResponse = createErrorResponse(error, "Vote failed");
      res.status(500).json(errorResponse);
    }
  });

  // Get bot configuration
  app.get("/api/bot/config", async (req, res) => {
    try {
      const config = await storage.getBotConfiguration();
      if (!config) {
        // Return default configuration if none exists
        return res.json({
          id: '',
          workspaceName: 'Apache Team',
          apacheAnswerApiUrl: '',
          apacheAnswerApiKey: '',
          slackBotToken: '',
          slackAppToken: '',
          slackChannelId: '',
          slackSigningSecret: '',
          searchLimit: 10,
          enableVoting: true,
        });
      }

      res.json(config);
    } catch (error) {
      console.error("Error fetching configuration:", sanitiseError(error));
      const errorResponse = createErrorResponse(error, "Failed to fetch configuration");
      res.status(500).json(errorResponse);
    }
  });

  // Update bot configuration
  app.patch("/api/bot/config", async (req, res) => {
    try {
      console.log('[API] Configuration update request received');
      const updates = req.body;
      console.log('[API] Update keys:', Object.keys(updates));
      
      // Validate required fields if provided
      if (updates.searchLimit && (updates.searchLimit < 1 || updates.searchLimit > 50)) {
        console.log('[API] Invalid search limit:', updates.searchLimit);
        return res.status(400).json({ message: "Search limit must be between 1 and 50" });
      }

      // Additional Docker environment logging
      if (process.env.NODE_ENV === 'production') {
        console.log('[API] Docker environment detected - validating configuration');
        console.log('[API] Database connection available:', !!process.env.DATABASE_URL);
        
        // Test database connectivity before attempting update
        try {
          console.log('[API] Testing database connection...');
          await db.execute('SELECT 1');
          console.log('[API] Database connection test passed');
        } catch (dbError) {
          console.error('[API] Database connection test failed:', dbError);
          return res.status(500).json({ 
            message: "Database connection unavailable",
            error: process.env.NODE_ENV === 'development' ? String(dbError) : 'Internal server error'
          });
        }
      }

      console.log('[API] Calling storage.updateBotConfiguration');
      const updatedConfig = await storage.updateBotConfiguration(updates);
      console.log('[API] Configuration updated successfully');
      
      auditLog('CONFIG_UPDATE', { 
        updates: Object.keys(updates),
        workspaceName: updatedConfig.workspaceName 
      }, req);

      res.json(updatedConfig);
    } catch (error) {
      console.error("Error updating configuration:", error);
      console.error("Full error details:", { 
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      });
      auditLog('CONFIG_UPDATE_ERROR', { 
        error: sanitiseError(error),
        updates: Object.keys(req.body || {}),
        errorDetails: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      }, req);
      const errorResponse = createErrorResponse(error, "Failed to update configuration");
      res.status(500).json(errorResponse);
    }
  });

  // Test Apache Answer API connection
  app.get("/api/test-connection", async (req, res) => {
    try {
      const config = await storage.getBotConfiguration();
      if (!config) {
        return res.status(500).json({ message: "Bot configuration not found" });
      }

      const apacheAnswerService = new ApacheAnswerService(
        config.apacheAnswerApiUrl,
        config.apacheAnswerApiKey
      );

      const isConnected = await apacheAnswerService.testConnection();
      
      res.json({ 
        connected: isConnected,
        apiUrl: config.apacheAnswerApiUrl 
      });
    } catch (error) {
      console.error("Error testing connection:", sanitiseError(error));
      const errorResponse = createErrorResponse(error, "Connection test failed");
      res.status(500).json({
        connected: false,
        ...errorResponse
      });
    }
  });

  // Get overall bot status including all connections
  app.get("/api/bot/status", async (req, res) => {
    try {
      const config = await storage.getBotConfiguration();
      if (!config) {
        return res.status(500).json({ message: "Bot configuration not found" });
      }

      // Test Apache Answer connection
      const apacheAnswerService = new ApacheAnswerService(
        config.apacheAnswerApiUrl,
        config.apacheAnswerApiKey
      );
      const apacheAnswerConnected = await apacheAnswerService.testConnection();

      // Check Slack connection and Socket Mode using database configuration
      const slackBotTokenConfigured = !!config.slackBotToken;
      const slackAppTokenConfigured = !!config.slackAppToken;
      const slackChannelConfigured = !!config.slackChannelId;
      const socketModeConnected = await getSocketModeStatus();
      
      // For Socket Mode, we only need app token and bot token
      const slackCredentialsConfigured = slackBotTokenConfigured && slackAppTokenConfigured;

      const overallStatus = apacheAnswerConnected && slackCredentialsConfigured && socketModeConnected;

      res.json({
        overall: overallStatus,
        apacheAnswer: {
          connected: apacheAnswerConnected,
          url: config.apacheAnswerApiUrl
        },
        slack: {
          credentialsConfigured: slackCredentialsConfigured,
          botTokenConfigured: slackBotTokenConfigured,
          appTokenConfigured: slackAppTokenConfigured,
          channelConfigured: slackChannelConfigured,
          socketModeConnected: socketModeConnected,
          apiWorking: socketModeConnected,
          channelId: config.slackChannelId || null
        },
        workspace: config.workspaceName
      });
    } catch (error) {
      console.error("Error getting bot status:", sanitiseError(error));
      const errorResponse = createErrorResponse(error, "Status check failed");
      res.status(500).json({
        overall: false,
        ...errorResponse
      });
    }
  });

  // Start bot (bring online)
  app.post("/api/bot/start", async (req, res) => {
    try {
      const socketService = ensureGlobalSocketModeService();
      await socketService.start();
      
      auditLog('BOT_STARTED', { timestamp: new Date().toISOString() }, req);
      
      res.json({ 
        success: true, 
        message: "Bot started successfully",
        connected: socketService.isConnected()
      });
    } catch (error) {
      console.error("Error starting bot:", sanitiseError(error));
      auditLog('BOT_START_ERROR', { error: sanitiseError(error) }, req);
      const errorResponse = createErrorResponse(error, "Failed to start bot");
      res.status(500).json(errorResponse);
    }
  });

  // Stop bot (take offline)
  app.post("/api/bot/stop", async (req, res) => {
    try {
      const socketService = getGlobalSocketModeService();
      if (socketService) {
        await socketService.stop();
      }
      
      auditLog('BOT_STOPPED', { timestamp: new Date().toISOString() }, req);
      
      res.json({ 
        success: true, 
        message: "Bot stopped successfully",
        connected: false
      });
    } catch (error) {
      console.error("Error stopping bot:", sanitiseError(error));
      auditLog('BOT_STOP_ERROR', { error: sanitiseError(error) }, req);
      const errorResponse = createErrorResponse(error, "Failed to stop bot");
      res.status(500).json(errorResponse);
    }
  });

  // Get recent search results
  app.get("/api/search-results", async (req, res) => {
    try {
      const { limit = "10" } = req.query;
      const results = await storage.getSearchResults(parseInt(limit as string));
      res.json(results);
    } catch (error) {
      console.error("Error getting search results:", sanitiseError(error));
      const errorResponse = createErrorResponse(error, "Failed to get search results");
      res.status(500).json(errorResponse);
    }
  });

  // Get recent Slack commands (Socket Mode only)
  app.get("/api/commands", async (req, res) => {
    try {
      const { limit = "10" } = req.query;
      const commands = await storage.getSlackCommands(parseInt(limit as string));
      res.json(commands);
    } catch (error) {
      console.error("Error getting Slack commands:", sanitiseError(error));
      const errorResponse = createErrorResponse(error, "Failed to get Slack commands");
      res.status(500).json(errorResponse);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
