import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, Hash, Search } from "lucide-react";
import { useState } from "react";
import { useSearch } from "@/hooks/useSearch";

export function SearchDemo() {
  const [query, setQuery] = useState("");
  const { mutate: performSearch, isPending } = useSearch();

  const handleSearch = () => {
    if (query.trim()) {
      performSearch({ query: query.trim(), limit: 10 });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Live Search Demo</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <i className="fab fa-slack"></i>
            <span>Slack Command Preview</span>
          </div>
        </div>
        
        {/* Slack Command Input Simulation */}
        <div className="bg-gray-900 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-6 h-6 bg-slack-purple rounded flex items-center justify-center">
              <Hash className="text-white text-xs w-3 h-3" />
            </div>
            <span className="text-white font-medium">general</span>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-slack-purple rounded flex items-center justify-center text-white font-medium text-sm">
              AU
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-white font-medium">AABot User</span>
                <span className="text-gray-400 text-sm">2:34 PM</span>
              </div>
              <div className="bg-gray-800 rounded px-3 py-2 inline-block">
                <code className="text-green-400">/aabot-search {query}</code>
              </div>
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Try: reset password"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isPending}
            className="pl-10 pr-12"
          />
          <Button
            onClick={handleSearch}
            disabled={isPending || !query.trim()}
            size="sm"
            className="absolute inset-y-0 right-0 mr-1 my-1 bg-slack-purple hover:bg-slack-purple/80"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
