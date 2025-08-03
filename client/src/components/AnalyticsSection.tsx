import { Card, CardContent } from "@/components/ui/card";
import { Search, ThumbsUp, Users } from "lucide-react";
import { useBotAnalytics } from "@/hooks/useBot";

export function AnalyticsSection() {
  const { data: analytics, isLoading } = useBotAnalytics();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const analyticsData = [
    {
      title: "Total Searches",
      value: analytics?.totalSearches || 0,
      icon: Search,
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "Total Votes",
      value: analytics?.totalVotes || 0,
      icon: ThumbsUp,
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      title: "Active Users",
      value: analytics?.activeUsers || 0,
      icon: Users,
      bgColor: "bg-purple-100",
      iconColor: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
      {analyticsData.map((item, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{item.title}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {item.value.toLocaleString()}
                </p>
              </div>
              <div className={`${item.bgColor} p-3 rounded-full`}>
                <item.icon className={`${item.iconColor} w-6 h-6`} />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-gray-500 text-sm">Real-time data</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
