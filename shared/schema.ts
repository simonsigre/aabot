import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const botConfigurations = pgTable("bot_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceName: text("workspace_name").notNull(),
  
  // Apache Answer Configuration (encrypted)
  apacheAnswerApiUrl: text("apache_answer_api_url_encrypted"),
  apacheAnswerApiKey: text("apache_answer_api_key_encrypted"),
  
  // Slack Configuration (encrypted)  
  slackBotToken: text("slack_bot_token_encrypted"),
  slackAppToken: text("slack_app_token_encrypted"),
  slackChannelId: text("slack_channel_id_encrypted"),
  slackSigningSecret: text("slack_signing_secret_encrypted"),
  
  // Non-sensitive configuration
  searchLimit: integer("search_limit").notNull().default(10),
  enableVoting: boolean("enable_voting").notNull().default(true),
  
  // Encryption metadata
  encryptionSalt: text("encryption_salt"),
  
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const searchResults = pgTable("search_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  questionId: text("question_id").notNull(),
  title: text("title").notNull(),
  snippet: text("snippet").notNull(),
  votes: integer("votes").notNull().default(0),
  answers: integer("answers").notNull().default(0),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  author: text("author").notNull(),
  views: integer("views").notNull().default(0),
  accepted: boolean("accepted").notNull().default(false),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const botAnalytics = pgTable("bot_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  totalSearches: integer("total_searches").notNull().default(0),
  totalVotes: integer("total_votes").notNull().default(0),
  activeUsers: integer("active_users").notNull().default(0),
  searchesToday: integer("searches_today").notNull().default(0),
  apiCalls: integer("api_calls").notNull().default(0),
  date: timestamp("date").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const slackCommands = pgTable("slack_commands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  commandName: text("command_name").notNull(),
  userId: text("user_id").notNull(),
  userName: text("user_name"),
  channelId: text("channel_id").notNull(),
  teamId: text("team_id"),
  query: text("query").notNull(),
  resultCount: integer("result_count").notNull().default(0),
  responseTime: integer("response_time"), // in milliseconds
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Insert schemas
export const insertBotConfigurationSchema = createInsertSchema(botConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSearchResultSchema = createInsertSchema(searchResults).omit({
  id: true,
  createdAt: true,
});

export const insertBotAnalyticsSchema = createInsertSchema(botAnalytics).omit({
  id: true,
  date: true,
});

export const insertSlackCommandSchema = createInsertSchema(slackCommands).omit({
  id: true,
  createdAt: true,
});

// Types
export type BotConfiguration = typeof botConfigurations.$inferSelect;
export type InsertBotConfiguration = z.infer<typeof insertBotConfigurationSchema>;
export type SearchResult = typeof searchResults.$inferSelect;
export type InsertSearchResult = z.infer<typeof insertSearchResultSchema>;
export type BotAnalytics = typeof botAnalytics.$inferSelect;
export type InsertBotAnalytics = z.infer<typeof insertBotAnalyticsSchema>;
export type SlackCommand = typeof slackCommands.$inferSelect;
export type InsertSlackCommand = z.infer<typeof insertSlackCommandSchema>;
