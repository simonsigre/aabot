import { SearchResultBlock } from "./slackService";

export interface ApacheAnswerQuestion {
  id: string;
  title: string;
  original_text: string;
  excerpt: string;
  vote_count: number;
  answer_count: number;
  view_count: number;
  tags: { slug_name: string; display_name: string }[];
  user_info: { display_name: string; username: string };
  accepted_answer_id?: string;
  status: number;
  created_at: number;
  updated_at: number;
}

export interface ApacheAnswerSearchResponse {
  list: ApacheAnswerQuestion[];
  count: number;
}

export interface ApacheAnswerVoteRequest {
  object_id: string;
  is_cancel: boolean;
}

export class ApacheAnswerService {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey;
  }

  /**
   * Mask sensitive headers for logging
   */
  private maskHeaders(headers: Record<string, string>): Record<string, string> {
    const masked: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(headers)) {
      if (key === 'Authorization' && value) {
        masked[key] = value.substring(0, 15) + '***';
      } else if (key === 'X-API-Key' && value) {
        masked[key] = value.substring(0, 8) + '***';
      } else {
        masked[key] = value;
      }
    }
    
    return masked;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'AABot/0.2.0',
    };

    if (this.apiKey) {
      // Try different authentication methods
      if (this.apiKey.startsWith('Bearer ')) {
        headers['Authorization'] = this.apiKey;
      } else if (this.apiKey.includes('|') || this.apiKey.length > 50) {
        // Looks like a token, use Bearer
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      } else {
        // Try as API key header (some instances use this)
        headers['X-API-Key'] = this.apiKey;
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }
    }

    return headers;
  }

  /**
   * Search questions on Apache Answer
   */
  async searchQuestions(
    query: string, 
    page: number = 1, 
    pageSize: number = 10
  ): Promise<SearchResultBlock[]> {
    console.log(`[API] Searching for: "${query}" on ${this.baseUrl}`);
    console.log(`[API] Using API key: ${this.apiKey ? 'Yes' : 'No'}`);
    
    try {
      // Try the proper search endpoint first if we have an API key
      if (this.apiKey) {
        try {
          const searchUrl = new URL('/answer/api/v1/search', this.baseUrl);
          searchUrl.searchParams.append('q', query);
          searchUrl.searchParams.append('page', page.toString());
          searchUrl.searchParams.append('size', pageSize.toString());
          searchUrl.searchParams.append('order', 'score');

          const requestHeaders = this.getHeaders();
          console.log(`[API] Trying authenticated search: ${searchUrl.toString()}`);
          const maskedHeaders = this.maskHeaders(requestHeaders);
          console.log(`[API] Request headers:`, maskedHeaders);

          const searchResponse = await fetch(searchUrl.toString(), {
            method: 'GET',
            headers: requestHeaders,
          });

          if (searchResponse.ok) {
            const contentType = searchResponse.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const searchData = await searchResponse.json();
              console.log(`[API] Search endpoint succeeded with ${searchData.data?.list?.length || 0} results`);
              
              if (searchData.data && searchData.data.list) {
                return this.transformQuestions(searchData.data.list);
              }
            } else {
              console.log(`[API] Search endpoint returned HTML instead of JSON (content-type: ${contentType})`);
            }
          }
          
          console.log(`[API] Search endpoint failed (${searchResponse.status}), falling back to question listing`);
        } catch (searchError) {
          console.log(`[API] Search endpoint error, falling back:`, searchError);
        }
      }

      // Fall back to question listing endpoint and filter results
      const url = new URL('/answer/api/v1/question/page', this.baseUrl);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('page_size', pageSize.toString());
      url.searchParams.append('order', 'newest');

      console.log(`[API] Fetching from: ${url.toString()}`);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        console.log(`[API] Response not OK: ${response.status} ${response.statusText}`);
        throw new Error(`Apache Answer API error: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.log(`[API] Non-JSON response: ${contentType}`);
        console.log(`[API] Response body preview:`, await response.text().then(t => t.substring(0, 200)));
        throw new Error('Apache Answer API returned HTML instead of JSON - endpoint may not be publicly accessible');
      }

      const data = await response.json();
      console.log(`[API] Raw response structure:`, Object.keys(data));
      
      if (!data.data || !data.data.list) {
        console.log(`[API] No data.list found in response`);
        return [];
      }

      console.log(`[API] Found ${data.data.list.length} total questions`);

      // Filter results by query if provided
      let filteredResults = data.data.list;
      if (query && query.trim()) {
        const queryLower = query.toLowerCase();
        filteredResults = data.data.list.filter((item: any) => 
          item.title?.toLowerCase().includes(queryLower) ||
          item.excerpt?.toLowerCase().includes(queryLower) ||
          item.tags?.some((tag: any) => tag.slug_name?.toLowerCase().includes(queryLower))
        );
        console.log(`[API] After filtering by "${query}": ${filteredResults.length} results`);
      }

      return this.transformQuestions(filteredResults);
    } catch (error) {
      console.error('[API] Error searching Apache Answer:', error);
      throw new Error(`Failed to search Apache Answer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get question details by ID
   */
  async getQuestionDetails(questionId: string): Promise<ApacheAnswerQuestion | null> {
    try {
      const url = new URL('/answer/api/v1/question/info', this.baseUrl);
      url.searchParams.append('id', questionId);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Apache Answer API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error getting question details:', error);
      throw new Error(`Failed to get question details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Vote up on a question or answer
   */
  async voteUp(objectId: string): Promise<boolean> {
    return this.vote(objectId, 'up');
  }

  /**
   * Vote down on a question or answer
   */
  async voteDown(objectId: string): Promise<boolean> {
    return this.vote(objectId, 'down');
  }

  private async vote(objectId: string, direction: 'up' | 'down'): Promise<boolean> {
    try {
      const endpoint = direction === 'up' ? '/answer/api/v1/vote/up' : '/answer/api/v1/vote/down';
      const url = new URL(endpoint, this.baseUrl);

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          object_id: objectId,
          is_cancel: false
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Vote ${direction} failed:`, response.status, errorText);
        
        if (response.status === 401) {
          throw new Error('Authentication required for voting. Please configure API credentials.');
        }
        
        throw new Error(`Failed to vote ${direction}: ${response.status} ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error(`Error voting ${direction}:`, error);
      throw error;
    }
  }

  /**
   * Transform Apache Answer search results to SearchResultBlocks
   */
  private transformQuestions(searchResults: any[]): SearchResultBlock[] {
    return searchResults.map(result => {
      // Handle the nested object structure from search API
      const question = result.object_type === 'question' ? result.object : result;
      
      // Ensure all required fields have valid values
      return {
        title: question.title || 'Untitled Question',
        snippet: question.excerpt || question.description || 'No description available',
        votes: question.vote_count || 0,
        answers: question.answer_count || 0,
        author: question.user_info?.display_name || question.user_info?.username || 'Unknown Author',
        tags: question.tags ? question.tags.map((tag: any) => tag.display_name || tag.slug_name || 'Unknown Tag').filter(Boolean) : [],
        url: `${this.baseUrl}/questions/${question.question_id || question.id}/${question.url_title || ''}`,
        accepted: question.accepted || false,
      };
    }).filter(result => result.title && result.title !== 'Untitled Question'); // Filter out results with no real title
  }

  /**
   * Test connection to Apache Answer API
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try different possible API paths
      const possiblePaths = [
        '/api/v1/question/page',  // Standard Apache Answer API path
        '/answer/api/v1/question/page',  // If deployed with /answer prefix
        '/api/v1/search',  // Alternative endpoint
        '/question/page'  // Fallback
      ];

      for (const path of possiblePaths) {
        try {
          const url = new URL(path, this.baseUrl);
          url.searchParams.append('page', '1');
          url.searchParams.append('page_size', '1');

          const response = await fetch(url.toString(), {
            method: 'GET',
            headers: this.getHeaders(),
          });

          if (response.ok) {
            console.log(`[API] Connection successful using path: ${path}`);
            return true;
          }
        } catch (pathError) {
          console.log(`[API] Path ${path} failed:`, pathError);
          continue;
        }
      }

      console.log('[API] All connection paths failed');
      return false;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }


}
