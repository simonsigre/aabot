import { BotStatusCard } from "@/components/BotStatusCard";
import { ConfigurationPanel } from "@/components/ConfigurationPanel";
import { SearchDemo } from "@/components/SearchDemo";
import { SearchResults } from "@/components/SearchResults";
import { AnalyticsSection } from "@/components/AnalyticsSection";
import { SlackQuestionsLog } from "@/components/SlackQuestionsLog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Bot } from "lucide-react";
import { useBotStatus } from "@/hooks/useBot";
import { VERSION } from "@shared/version";

export default function Dashboard() {
  const { data: status } = useBotStatus();

  const getHeaderStatus = () => {
    if (!status) {
      return (
        <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1 rounded-full">
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          <span className="text-sm text-gray-600 font-medium">Checking...</span>
        </div>
      );
    }

    if (status.overall) {
      return (
        <div className="flex items-center space-x-2 bg-green-50 px-3 py-1 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm text-green-700 font-medium">Connected</span>
        </div>
      );
    }

    const hasPartialConnection = status.slack.apiWorking || status.apacheAnswer.connected;
    if (hasPartialConnection) {
      return (
        <div className="flex items-center space-x-2 bg-yellow-50 px-3 py-1 rounded-full">
          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
          <span className="text-sm text-yellow-700 font-medium">Partial</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2 bg-red-50 px-3 py-1 rounded-full">
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        <span className="text-sm text-red-700 font-medium">Disconnected</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="bg-slack-purple p-2 rounded-lg">
                <Bot className="text-white text-xl w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">AABot</h1>
                <p className="text-sm text-gray-500">Apache Answer Slack Integration v{VERSION}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {getHeaderStatus()}
              <Button className="bg-slack-purple text-white hover:bg-slack-purple/90">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Bot Configuration */}
          <div className="lg:col-span-1 space-y-6">
            <BotStatusCard />
            <ConfigurationPanel />
          </div>

          {/* Right Column: Live Demo & Search Results */}
          <div className="lg:col-span-2 space-y-6">
            <SearchDemo />
            <SearchResults />
          </div>
        </div>

        {/* Analytics Section */}
        <AnalyticsSection />
        
        {/* Slack Questions Log */}
        <SlackQuestionsLog />

        {/* Installation Instructions */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Bot Installation & Setup</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-3">1. Install to Slack Workspace</h3>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <code className="text-sm text-gray-800">/slack/oauth/authorize?client_id=your_app_id&scope=commands</code>
                </div>
                <Button className="bg-slack-purple text-white hover:bg-slack-purple/90 w-full">
                  <i className="fab fa-slack mr-2"></i>Add to Slack
                </Button>
              </div>
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-3">2. Configure API Connection</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>• Set Apache Answer API URL in configuration</p>
                  <p>• Configure authentication credentials</p>
                  <p>• Test connection with API endpoints</p>
                  <p>• Enable desired features (search, voting)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-slack-purple p-2 rounded-lg">
                <Bot className="text-white w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">AABot</p>
                <p className="text-xs text-gray-500">Apache Answer Slack Integration v{VERSION}</p>
              </div>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <a href="#" className="hover:text-gray-700">Documentation</a>
              <a href="#" className="hover:text-gray-700">Support</a>
              <a href="https://answer.apache.org/" className="hover:text-gray-700">Apache Answer</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
