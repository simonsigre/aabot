import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Settings, Eye, EyeOff, Save, AlertCircle } from "lucide-react";

interface BotConfiguration {
  id: string;
  workspaceName: string;
  apacheAnswerApiUrl: string;
  apacheAnswerApiKey: string;
  slackBotToken: string;
  slackAppToken: string;
  slackChannelId: string;
  slackSigningSecret: string;
  searchLimit: number;
  enableVoting: boolean;
}

interface ConfigurationUpdate {
  workspaceName?: string;
  apacheAnswerApiUrl?: string;
  apacheAnswerApiKey?: string;
  slackBotToken?: string;
  slackAppToken?: string;
  slackChannelId?: string;
  slackSigningSecret?: string;
  searchLimit?: number;
  enableVoting?: boolean;
}

export function ConfigurationPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for form data and visibility toggles
  const [formData, setFormData] = useState<ConfigurationUpdate>({});
  const [showSecrets, setShowSecrets] = useState({
    apiKey: false,
    botToken: false,
    appToken: false,
    signingSecret: false,
  });

  // Fetch current configuration
  const { data: config, isLoading } = useQuery<BotConfiguration>({
    queryKey: ["/api/bot/config"],
  });

  // Update configuration mutation
  const updateConfig = useMutation({
    mutationFn: async (updates: ConfigurationUpdate) => {
      const response = await fetch("/api/bot/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to update configuration");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuration Updated",
        description: "Your settings have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bot/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bot/status"] });
      setFormData({});
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only send changed values
    const updates = Object.entries(formData).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== "") {
        acc[key as keyof ConfigurationUpdate] = value;
      }
      return acc;
    }, {} as ConfigurationUpdate);

    if (Object.keys(updates).length === 0) {
      toast({
        title: "No Changes",
        description: "Please modify at least one field to update configuration.",
        variant: "destructive",
      });
      return;
    }

    updateConfig.mutate(updates);
  };

  const toggleSecretVisibility = (field: keyof typeof showSecrets) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const maskSecret = (value: string) => {
    if (!value) return "";
    return "••••••••••••••••" + value.slice(-4);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>Bot Configuration</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">General Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="workspaceName">Workspace Name</Label>
                <Input
                  id="workspaceName"
                  placeholder={config?.workspaceName || "Enter workspace name"}
                  value={formData.workspaceName ?? ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, workspaceName: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="searchLimit">Search Result Limit</Label>
                <Input
                  id="searchLimit"
                  type="number"
                  min="1"
                  max="50"
                  placeholder={config?.searchLimit?.toString() || "10"}
                  value={formData.searchLimit ?? ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, searchLimit: parseInt(e.target.value) || undefined }))}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="enableVoting"
                checked={formData.enableVoting ?? config?.enableVoting ?? true}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enableVoting: checked }))}
              />
              <Label htmlFor="enableVoting">Enable voting on search results</Label>
            </div>
          </div>

          <Separator />

          {/* Apache Answer Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Apache Answer Integration</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apacheAnswerApiUrl">Apache Answer API URL</Label>
                <Input
                  id="apacheAnswerApiUrl"
                  type="url"
                  placeholder={config?.apacheAnswerApiUrl || "https://your-apache-answer-instance.com"}
                  value={formData.apacheAnswerApiUrl ?? ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, apacheAnswerApiUrl: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="apacheAnswerApiKey">Apache Answer API Key</Label>
                <div className="relative">
                  <Input
                    id="apacheAnswerApiKey"
                    type={showSecrets.apiKey ? "text" : "password"}
                    placeholder={config?.apacheAnswerApiKey ? maskSecret(config.apacheAnswerApiKey) : "Enter API key"}
                    value={formData.apacheAnswerApiKey ?? ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, apacheAnswerApiKey: e.target.value }))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => toggleSecretVisibility('apiKey')}
                  >
                    {showSecrets.apiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Slack Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Slack Integration</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="slackBotToken">Slack Bot Token</Label>
                <div className="relative">
                  <Input
                    id="slackBotToken"
                    type={showSecrets.botToken ? "text" : "password"}
                    placeholder={config?.slackBotToken ? maskSecret(config.slackBotToken) : "xoxb-your-bot-token"}
                    value={formData.slackBotToken ?? ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, slackBotToken: e.target.value }))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => toggleSecretVisibility('botToken')}
                  >
                    {showSecrets.botToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="slackAppToken">Slack App Token</Label>
                <div className="relative">
                  <Input
                    id="slackAppToken"
                    type={showSecrets.appToken ? "text" : "password"}
                    placeholder={config?.slackAppToken ? maskSecret(config.slackAppToken) : "xapp-your-app-token"}
                    value={formData.slackAppToken ?? ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, slackAppToken: e.target.value }))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => toggleSecretVisibility('appToken')}
                  >
                    {showSecrets.appToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="slackChannelId">Default Slack Channel ID</Label>
                <Input
                  id="slackChannelId"
                  placeholder={config?.slackChannelId || "C1234567890"}
                  value={formData.slackChannelId ?? ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, slackChannelId: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="slackSigningSecret">Slack Signing Secret</Label>
                <div className="relative">
                  <Input
                    id="slackSigningSecret"
                    type={showSecrets.signingSecret ? "text" : "password"}
                    placeholder={config?.slackSigningSecret ? maskSecret(config.slackSigningSecret) : "Enter signing secret"}
                    value={formData.slackSigningSecret ?? ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, slackSigningSecret: e.target.value }))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => toggleSecretVisibility('signingSecret')}
                  >
                    {showSecrets.signingSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Security Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Security Notice</p>
                <p className="mt-1">
                  All sensitive configuration values are encrypted before storage in the database.
                  Your API keys and tokens are protected with AES-256-GCM encryption.
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updateConfig.isPending}
              className="bg-slack-purple text-white hover:bg-slack-purple/90"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateConfig.isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}