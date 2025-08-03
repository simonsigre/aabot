import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronUp, ChevronDown, User, Clock, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { useSearchResults, useVote } from "@/hooks/useSearch";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function SearchResults() {
  const { data: searchData, isLoading } = useSearchResults();
  const vote = useVote();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const resultsPerPage = 3;

  const handleVote = async (questionId: string, direction: 'up' | 'down', title: string) => {
    try {
      await vote.mutateAsync({ questionId, direction });
      toast({
        title: "Vote recorded",
        description: `You ${direction === 'up' ? 'upvoted' : 'downvoted'}: ${title}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record vote. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const results = searchData?.results || [];
  const totalPages = Math.ceil(results.length / resultsPerPage);
  const startIndex = (currentPage - 1) * resultsPerPage;
  const endIndex = startIndex + resultsPerPage;
  const currentResults = results.slice(startIndex, endIndex);

  return (
    <Card>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Search Results</h2>
          <span className="text-sm text-gray-500">
            {results.length} results found
          </span>
        </div>
      </div>
      
      {results.length === 0 ? (
        <CardContent className="p-6">
          <div className="text-center py-8">
            <p className="text-gray-500">
              {searchData?.error ? (
                <>
                  <span className="text-red-600 font-medium">API Error:</span> {searchData.error}
                  {searchData.details && (
                    <span className="block mt-2 text-sm">{searchData.details}</span>
                  )}
                </>
              ) : (
                "No search results yet. Try searching above!"
              )}
            </p>
          </div>
        </CardContent>
      ) : (
        <>
          <div className="divide-y divide-gray-200">
            {currentResults.map((result, index) => (
              <div key={result.id || startIndex + index} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-2 hover:text-slack-purple cursor-pointer">
                      <a href={result.url} target="_blank" rel="noopener noreferrer">
                        {result.title}
                      </a>
                    </h3>
                    <p className="text-gray-600 mb-3 line-clamp-2">
                      {result.snippet}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4" />
                        <span>{result.author}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(result.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Eye className="w-4 h-4" />
                        <span>{result.views} views</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center space-y-2 ml-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVote(result.questionId, 'up', result.title)}
                      disabled={vote.isPending}
                      className="w-8 h-8 p-0 bg-gray-100 hover:bg-green-100 text-gray-600 hover:text-green-600"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <span className="text-lg font-semibold text-gray-900">
                      {result.votes >= 0 ? '+' : ''}{result.votes}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVote(result.questionId, 'down', result.title)}
                      disabled={vote.isPending}
                      className="w-8 h-8 p-0 bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {result.tags.map((tag, tagIndex) => (
                      <Badge key={tagIndex} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {result.answers} Answer{result.answers !== 1 ? 's' : ''}
                    </Badge>
                    {result.accepted && (
                      <Badge className="text-xs bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                        Accepted
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="text-sm"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-gray-500">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="text-sm text-slack-purple hover:text-slack-purple/80"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                <div className="text-sm text-gray-500">
                  Showing {startIndex + 1}-{Math.min(endIndex, results.length)} of {results.length} results
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
