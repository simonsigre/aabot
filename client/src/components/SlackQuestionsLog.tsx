import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, User, MessageSquare, Hash } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SlackCommand {
  id: string;
  commandName: string;
  userId: string;
  userName: string | null;
  channelId: string;
  teamId: string | null;
  query: string;
  resultCount: number;
  responseTime: number | null;
  createdAt: string;
}

export function SlackQuestionsLog() {
  const { data: questions, isLoading } = useQuery<SlackCommand[]>({
    queryKey: ['/api/commands'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Slack Questions Log
          </CardTitle>
          <CardDescription>
            Recent questions asked via /aabot-search command
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading questions...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Slack Questions Log
          </CardTitle>
          <CardDescription>
            Recent questions asked via /aabot-search command
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No questions logged yet. Questions will appear here when users use the /aabot-search command in Slack.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Slack Questions Log
        </CardTitle>
        <CardDescription>
          Recent questions asked via /aabot-search command ({questions.length} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {questions.map((question) => (
              <div
                key={question.id}
                className="p-4 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">
                        {question.userName || question.userId}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {question.commandName}
                      </Badge>
                      {question.resultCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {question.resultCount} result{question.resultCount !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm mb-3 bg-muted/50 p-3 rounded border-l-4 border-primary/20">
                      "{question.query}"
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(question.createdAt), { addSuffix: true })}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        Channel: {question.channelId}
                      </div>
                      
                      {question.responseTime && (
                        <div className="flex items-center gap-1">
                          <span>Response: {question.responseTime}ms</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}