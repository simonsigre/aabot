import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Square, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useBotStatus } from "@/hooks/useBot";

export function BotControlPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: status, isLoading } = useBotStatus();
  
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const startBot = useMutation({
    mutationFn: () => apiRequest('POST', '/api/bot/start', {}),
    onMutate: () => setIsStarting(true),
    onSuccess: async (response: Response) => {
      const data = await response.json();
      toast({
        title: "Bot Started",
        description: data.message || "The bot has been brought online successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bot/status'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Start Bot",
        description: error instanceof Error ? error.message : "An error occurred while starting the bot",
        variant: "destructive",
      });
    },
    onSettled: () => setIsStarting(false),
  });

  const stopBot = useMutation({
    mutationFn: () => apiRequest('POST', '/api/bot/stop', {}),
    onMutate: () => setIsStopping(true),
    onSuccess: async (response: Response) => {
      const data = await response.json();
      toast({
        title: "Bot Stopped",
        description: data.message || "The bot has been taken offline successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bot/status'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Stop Bot",
        description: error instanceof Error ? error.message : "An error occurred while stopping the bot",
        variant: "destructive",
      });
    },
    onSettled: () => setIsStopping(false),
  });

  const isSocketConnected = status?.slack?.apiWorking || false;
  const hasConfiguration = status?.slack?.credentialsConfigured || false;

  const getConnectionStatus = () => {
    if (isLoading) {
      return { text: "Checking...", color: "gray" };
    }
    
    if (isSocketConnected) {
      return { text: "Online", color: "green" };
    }
    
    if (!hasConfiguration) {
      return { text: "Not Configured", color: "red" };
    }
    
    return { text: "Offline", color: "red" };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Bot Control
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status Display */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <div 
                className={`w-3 h-3 rounded-full ${
                  connectionStatus.color === 'green' ? 'bg-green-500' :
                  connectionStatus.color === 'gray' ? 'bg-gray-400' : 'bg-red-500'
                }`}
              />
              <span className="font-medium">Bot Status:</span>
              <span className={`font-semibold ${
                connectionStatus.color === 'green' ? 'text-green-700' :
                connectionStatus.color === 'gray' ? 'text-gray-600' : 'text-red-700'
              }`}>
                {connectionStatus.text}
              </span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => startBot.mutate()}
              disabled={isStarting || isSocketConnected || !hasConfiguration}
              className="w-32 bg-green-600 hover:bg-green-700 text-white text-sm"
            >
              <Play className="h-4 w-4 mr-1" />
              {isStarting ? "Starting..." : "Online"}
            </Button>
            
            <Button
              onClick={() => stopBot.mutate()}
              disabled={isStopping || !isSocketConnected}
              variant="destructive"
              className="w-32 text-sm"
            >
              <Square className="h-4 w-4 mr-1" />
              {isStopping ? "Stopping..." : "Offline"}
            </Button>
          </div>

          {/* Help Text */}
          {!hasConfiguration && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Configuration Required</p>
                <p>Please save your Slack configuration above before starting the bot.</p>
              </div>
            </div>
          )}

          {hasConfiguration && !isSocketConnected && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Ready to Start</p>
                <p>Your bot is organised and ready to connect to Slack.</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}