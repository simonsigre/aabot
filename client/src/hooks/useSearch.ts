import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface SearchParams {
  query: string;
  limit?: number;
}

interface SearchResult {
  id: string;
  questionId: string;
  title: string;
  snippet: string;
  votes: number;
  answers: number;
  tags: string[];
  author: string;
  views: number;
  accepted: boolean;
  url: string;
  createdAt: string;
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  count: number;
  error?: string;
  details?: string;
  apiUrl?: string;
}

interface VoteParams {
  questionId: string;
  direction: 'up' | 'down';
}

export function useSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ query, limit = 10 }: SearchParams): Promise<SearchResponse> => {
      const params = new URLSearchParams({
        q: query,
        limit: limit.toString(),
      });
      
      const response = await apiRequest("GET", `/api/search?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw errorData;
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Update the search results cache
      queryClient.setQueryData(["/api/search-results"], data);
    },
    onError: (error: any) => {
      // Store error in cache so UI can display it
      queryClient.setQueryData(["/api/search-results"], {
        query: '',
        results: [],
        count: 0,
        error: error.error || error.message || 'Search failed',
        details: error.details,
        apiUrl: error.apiUrl
      });
    },
  });
}

export function useSearchResults() {
  return useQuery<SearchResponse>({
    queryKey: ["/api/search-results"],
    enabled: false, // Only fetch when explicitly triggered
  });
}

export function useVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ questionId, direction }: VoteParams) => {
      const response = await apiRequest("POST", "/api/vote", {
        questionId,
        direction,
      });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate search results to refresh vote counts
      queryClient.invalidateQueries({ queryKey: ["/api/search-results"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bot/analytics"] });
    },
  });
}
