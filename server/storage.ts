import { 
  type BotConfiguration, 
  type InsertBotConfiguration,
  type SearchResult,
  type InsertSearchResult,
  type BotAnalytics,
  type InsertBotAnalytics,
  type SlackCommand,
  type InsertSlackCommand,
  botConfigurations,
  searchResults,
  botAnalytics,
  slackCommands
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { encryptionService } from "./services/encryptionService";

// Define decrypted configuration interface
export interface DecryptedBotConfiguration extends Omit<BotConfiguration, 
  'apacheAnswerApiUrl' | 'apacheAnswerApiKey' | 'slackBotToken' | 'slackAppToken' | 'slackChannelId' | 'slackSigningSecret'> {
  apacheAnswerApiUrl: string;
  apacheAnswerApiKey: string;
  slackBotToken: string;
  slackAppToken: string;
  slackChannelId: string;
  slackSigningSecret: string;
}

export interface ConfigurationUpdate {
  workspaceName?: string;
  apacheAnswerApiUrl?: string;
  apacheAnswerApiKey?: string;
  slackBotToken?: string;
  slackAppToken?: string;
  slackChannelId?: string;
  slackSigningSecret?: string;
  searchLimit?: number;
  enableVoting?: boolean;
}

export interface IStorage {
  // Bot configuration methods (with encryption support)
  getBotConfiguration(): Promise<DecryptedBotConfiguration | undefined>;
  createBotConfiguration(config: ConfigurationUpdate): Promise<DecryptedBotConfiguration>;
  updateBotConfiguration(config: ConfigurationUpdate): Promise<DecryptedBotConfiguration>;

  // Search result methods
  getSearchResults(limit?: number): Promise<SearchResult[]>;
  createSearchResult(result: InsertSearchResult): Promise<SearchResult>;
  getSearchResultsByQuery(query: string): Promise<SearchResult[]>;

  // Analytics methods
  getBotAnalytics(): Promise<BotAnalytics | undefined>;
  updateBotAnalytics(analytics: Partial<InsertBotAnalytics>): Promise<BotAnalytics>;
  incrementSearchCount(): Promise<void>;
  incrementVoteCount(): Promise<void>;
  incrementApiCallCount(): Promise<void>;

  // Slack command methods
  logSlackQuestion(params: {
    userId: string;
    userName: string;
    query: string;
    channelId: string;
    teamId: string;
    resultCount: number;
    responseTime: number;
  }): Promise<SlackCommand>;
  getSlackCommands(limit?: number): Promise<SlackCommand[]>;
}

export class DatabaseStorage implements IStorage {
  private async decryptConfiguration(config: BotConfiguration): Promise<DecryptedBotConfiguration> {
    if (!config.encryptionSalt) {
      // Handle legacy configuration without encryption
      return {
        ...config,
        apacheAnswerApiUrl: config.apacheAnswerApiUrl || '',
        apacheAnswerApiKey: config.apacheAnswerApiKey || '',
        slackBotToken: config.slackBotToken || '',
        slackAppToken: config.slackAppToken || '',
        slackChannelId: config.slackChannelId || '',
        slackSigningSecret: config.slackSigningSecret || '',
      };
    }

    try {
      return {
        ...config,
        apacheAnswerApiUrl: config.apacheAnswerApiUrl ? encryptionService.decrypt(config.apacheAnswerApiUrl, config.encryptionSalt) : '',
        apacheAnswerApiKey: config.apacheAnswerApiKey ? encryptionService.decrypt(config.apacheAnswerApiKey, config.encryptionSalt) : '',
        slackBotToken: config.slackBotToken ? encryptionService.decrypt(config.slackBotToken, config.encryptionSalt) : '',
        slackAppToken: config.slackAppToken ? encryptionService.decrypt(config.slackAppToken, config.encryptionSalt) : '',
        slackChannelId: config.slackChannelId ? encryptionService.decrypt(config.slackChannelId, config.encryptionSalt) : '',
        slackSigningSecret: config.slackSigningSecret ? encryptionService.decrypt(config.slackSigningSecret, config.encryptionSalt) : '',
      };
    } catch (error) {
      console.error('[STORAGE] Failed to decrypt configuration:', error);
      throw new Error('Configuration decryption failed');
    }
  }

  private async encryptConfiguration(config: ConfigurationUpdate, salt: string): Promise<Partial<BotConfiguration>> {
    try {
      return {
        workspaceName: config.workspaceName,
        searchLimit: config.searchLimit,
        enableVoting: config.enableVoting,
        apacheAnswerApiUrl: config.apacheAnswerApiUrl ? encryptionService.encrypt(config.apacheAnswerApiUrl, salt) : undefined,
        apacheAnswerApiKey: config.apacheAnswerApiKey ? encryptionService.encrypt(config.apacheAnswerApiKey, salt) : undefined,
        slackBotToken: config.slackBotToken ? encryptionService.encrypt(config.slackBotToken, salt) : undefined,
        slackAppToken: config.slackAppToken ? encryptionService.encrypt(config.slackAppToken, salt) : undefined,
        slackChannelId: config.slackChannelId ? encryptionService.encrypt(config.slackChannelId, salt) : undefined,
        slackSigningSecret: config.slackSigningSecret ? encryptionService.encrypt(config.slackSigningSecret, salt) : undefined,
        encryptionSalt: salt,
      };
    } catch (error) {
      console.error('[STORAGE] Failed to encrypt configuration:', error);
      throw new Error('Configuration encryption failed');
    }
  }

  async getBotConfiguration(): Promise<DecryptedBotConfiguration | undefined> {
    const [config] = await db.select().from(botConfigurations).limit(1);
    if (!config) return undefined;
    
    return this.decryptConfiguration(config);
  }

  async createBotConfiguration(config: ConfigurationUpdate): Promise<DecryptedBotConfiguration> {
    // Generate encryption salt for first-time setup
    const salt = encryptionService.generateSalt();
    
    // Test encryption before proceeding
    if (!encryptionService.testEncryption(salt)) {
      throw new Error('Encryption test failed - cannot create configuration');
    }

    const encryptedConfig = await this.encryptConfiguration(config, salt);
    
    const configToInsert = {
      id: randomUUID(),
      workspaceName: encryptedConfig.workspaceName || "Apache Team",
      ...encryptedConfig,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [created] = await db
      .insert(botConfigurations)
      .values([configToInsert])
      .returning();
    
    return this.decryptConfiguration(created);
  }

  async updateBotConfiguration(config: ConfigurationUpdate): Promise<DecryptedBotConfiguration> {
    // Get existing config or create default
    let existing = await this.getBotConfiguration();
    
    if (!existing) {
      const defaultConfig: ConfigurationUpdate = {
        workspaceName: "Apache Team",
        apacheAnswerApiUrl: process.env.APACHE_ANSWER_API_URL || "https://meta.answer.dev",
        apacheAnswerApiKey: process.env.APACHE_ANSWER_API_KEY || "",
        slackBotToken: process.env.SLACK_BOT_TOKEN || "",
        slackAppToken: process.env.SLACK_APP_TOKEN || "",
        slackChannelId: process.env.SLACK_CHANNEL_ID || "",
        slackSigningSecret: process.env.SLACK_SIGNING_SECRET || "",
        searchLimit: parseInt(process.env.SEARCH_RESULT_LIMIT || "10"),
        enableVoting: true,
      };
      return this.createBotConfiguration(defaultConfig);
    }

    // Get the raw config to access encryption salt
    const [rawConfig] = await db.select().from(botConfigurations).limit(1);
    const salt = rawConfig?.encryptionSalt || encryptionService.generateSalt();

    const encryptedUpdate = await this.encryptConfiguration(config, salt);

    const [updated] = await db
      .update(botConfigurations)
      .set({ ...encryptedUpdate, updatedAt: new Date() })
      .where(eq(botConfigurations.id, existing.id))
      .returning();
    
    return this.decryptConfiguration(updated);
  }

  async getSearchResults(limit: number = 50): Promise<SearchResult[]> {
    return await db
      .select()
      .from(searchResults)
      .orderBy(desc(searchResults.createdAt))
      .limit(limit);
  }

  async createSearchResult(result: InsertSearchResult): Promise<SearchResult> {
    const resultToInsert = {
      id: randomUUID(),
      questionId: result.questionId,
      title: result.title,
      snippet: result.snippet,
      votes: result.votes || 0,
      answers: result.answers || 0,
      tags: result.tags ? (Array.isArray(result.tags) ? result.tags as string[] : [String(result.tags)]) : [],
      author: result.author,
      views: result.views || 0,
      accepted: result.accepted || false,
      url: result.url,
      createdAt: new Date(),
    };

    const [created] = await db
      .insert(searchResults)
      .values(resultToInsert)
      .returning();
    return created;
  }

  async getSearchResultsByQuery(query: string): Promise<SearchResult[]> {
    return await db
      .select()
      .from(searchResults)
      .where(eq(searchResults.title, query))
      .orderBy(desc(searchResults.createdAt));
  }

  async getBotAnalytics(): Promise<BotAnalytics | undefined> {
    // Calculate real analytics from slack commands
    const commands = await db.select().from(slackCommands);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayCommands = commands.filter(cmd => 
      new Date(cmd.createdAt) >= today
    );

    const uniqueUsers = new Set(commands.map(cmd => cmd.userId)).size;
    
    // Try to get existing analytics record
    const [existing] = await db.select().from(botAnalytics).limit(1);
    
    const analyticsData = {
      totalSearches: commands.length,
      totalVotes: 0, // Could be calculated from interaction logs
      activeUsers: uniqueUsers,
      searchesToday: todayCommands.length,
      apiCalls: commands.length,
    };

    if (existing) {
      const [updated] = await db
        .update(botAnalytics)
        .set(analyticsData)
        .where(eq(botAnalytics.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(botAnalytics)
        .values({
          totalSearches: analyticsData.totalSearches,
          totalVotes: analyticsData.totalVotes,
          activeUsers: analyticsData.activeUsers,
          searchesToday: analyticsData.searchesToday,
          apiCalls: analyticsData.apiCalls,
        })
        .returning();
      return created;
    }
  }

  async updateBotAnalytics(analytics: Partial<InsertBotAnalytics>): Promise<BotAnalytics> {
    const existing = await this.getBotAnalytics();
    
    if (existing) {
      const [updated] = await db
        .update(botAnalytics)
        .set(analytics)
        .where(eq(botAnalytics.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(botAnalytics)
        .values(analytics as InsertBotAnalytics)
        .returning();
      return created;
    }
  }

  async incrementSearchCount(): Promise<void> {
    const analytics = await this.getBotAnalytics();
    if (analytics) {
      await this.updateBotAnalytics({
        totalSearches: analytics.totalSearches + 1,
        apiCalls: analytics.apiCalls + 1,
      });
    }
  }

  async incrementVoteCount(): Promise<void> {
    const analytics = await this.getBotAnalytics();
    if (analytics) {
      await this.updateBotAnalytics({
        totalVotes: analytics.totalVotes + 1,
      });
    }
  }

  async incrementApiCallCount(): Promise<void> {
    const analytics = await this.getBotAnalytics();
    if (analytics) {
      await this.updateBotAnalytics({
        apiCalls: analytics.apiCalls + 1,
      });
    }
  }

  async logSlackQuestion(params: {
    userId: string;
    userName: string;
    query: string;
    channelId: string;
    teamId: string;
    resultCount: number;
    responseTime: number;
  }): Promise<SlackCommand> {
    const [command] = await db
      .insert(slackCommands)
      .values({
        commandName: '/aabot-search',
        userId: params.userId,
        userName: params.userName,
        channelId: params.channelId,
        teamId: params.teamId,
        query: params.query,
        resultCount: params.resultCount,
        responseTime: params.responseTime,
      })
      .returning();
    
    return command;
  }

  async getSlackCommands(limit: number = 50): Promise<SlackCommand[]> {
    return await db
      .select()
      .from(slackCommands)
      .orderBy(desc(slackCommands.createdAt))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();