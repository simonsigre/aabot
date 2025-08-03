import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface BotConfiguration {
  id: string;
  workspaceName: string;
  apacheAnswerApiUrl: string;
  searchLimit: number;
  enableVoting: boolean;
  slackBotToken?: string;
  slackChannelId?: string;
  createdAt: string;
  updatedAt: string;
}

interface BotAnalytics {
  id: string;
  totalSearches: number;
  totalVotes: number;
  activeUsers: number;
  searchesToday: number;
  apiCalls: number;
  date: string;
}

export function useBotConfig() {
  return useQuery<BotConfiguration>({
    queryKey: ["/api/bot/config"],
  });
}

export function useUpdateBotConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Partial<BotConfiguration>): Promise<BotConfiguration> => {
      const response = await apiRequest("PUT", "/api/bot/config", config);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/bot/config"], data);
    },
  });
}

export function useBotAnalytics() {
  return useQuery<BotAnalytics>({
    queryKey: ["/api/bot/analytics"],
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: async (): Promise<{ connected: boolean; apiUrl: string; message?: string }> => {
      const response = await apiRequest("GET", "/api/test-connection");
      return response.json();
    },
  });
}

interface BotStatus {
  overall: boolean;
  apacheAnswer: {
    connected: boolean;
    url: string;
  };
  slack: {
    credentialsConfigured: boolean;
    apiWorking: boolean;
    channelId: string | null;
  };
  workspace: string;
}

export function useBotStatus() {
  return useQuery<BotStatus>({
    queryKey: ["/api/bot/status"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
