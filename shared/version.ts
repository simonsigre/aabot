/**
 * Centralized version management for AABot
 */
export const VERSION = "0.3.0" as const;

export const BUILD_INFO = {
  version: VERSION,
  name: "AABot",
  description: "Apache Answer Slack Integration",
  buildDate: new Date().toISOString(),
} as const;

export type VersionInfo = typeof BUILD_INFO;