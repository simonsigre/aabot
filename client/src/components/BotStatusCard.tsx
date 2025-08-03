import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBotAnalytics, useBotStatus } from "@/hooks/useBot";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";

export function BotStatusCard() {
  const { data: analytics, isLoading: analyticsLoading } = useBotAnalytics();
  const { data: status, isLoading: statusLoading, error: statusError } = useBotStatus();

  if (analyticsLoading || statusLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = () => {
    if (statusError) {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Error</Badge>;
    }
    
    if (!status) {
      return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Unknown</Badge>;
    }

    if (status.overall) {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Connected</Badge>;
    }

    const hasSlack = status.slack.credentialsConfigured && status.slack.apiWorking;
    const hasApache = status.apacheAnswer.connected;

    if (hasSlack || hasApache) {
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Partial</Badge>;
    }

    return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Disconnected</Badge>;
  };

  const getConnectionIcon = (connected: boolean, warning: boolean = false) => {
    if (connected) {
      return <CheckCircle className="w-3 h-3 text-green-500" />;
    }
    if (warning) {
      return <AlertCircle className="w-3 h-3 text-yellow-500" />;
    }
    return <XCircle className="w-3 h-3 text-red-500" />;
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Bot Status</h2>
          {getStatusBadge()}
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Workspace</span>
            <span className="text-sm font-medium text-gray-900">
              {status?.workspace || "Not configured"}
            </span>
          </div>
          
          {/* Apache Answer Status */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              {getConnectionIcon(status?.apacheAnswer?.connected || false)}
              <span className="text-sm text-gray-600">Apache Answer</span>
            </div>
            <span className="text-xs text-gray-500">
              {status?.apacheAnswer?.connected ? "Connected" : "Disconnected"}
            </span>
          </div>

          {/* Slack Status */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              {getConnectionIcon(
                status?.slack?.apiWorking || false,
                status?.slack?.credentialsConfigured && !status?.slack?.apiWorking
              )}
              <span className="text-sm text-gray-600">Slack Integration</span>
            </div>
            <span className="text-xs text-gray-500">
              {!status?.slack?.credentialsConfigured 
                ? "No credentials" 
                : status?.slack?.apiWorking 
                  ? "Connected" 
                  : "Auth failed"
              }
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Searches Today</span>
            <span className="text-sm font-medium text-gray-900">
              {analytics?.searchesToday || 0}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">API Calls</span>
            <span className="text-sm font-medium text-gray-900">
              {analytics?.apiCalls || 0}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
