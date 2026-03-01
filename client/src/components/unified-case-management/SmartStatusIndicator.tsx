import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Target,
  Heart,
  Wifi,
  WifiOff,
  RefreshCw,
  BarChart3
} from "lucide-react";

interface SystemHealth {
  status: "excellent" | "good" | "warning" | "critical";
  uptime: number;
  activeUsers: number;
  casesProcessedToday: number;
  pendingActions: number;
  automationRate: number;
  responseTime: number;
  lastUpdated: string;
}

interface UserProgress {
  tasksCompletedToday: number;
  tasksRemaining: number;
  averageTaskTime: number;
  productivityScore: number;
  currentStreak: number;
  achievements: Achievement[];
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  earnedAt: string;
  isNew: boolean;
}

interface SmartStatusIndicatorProps {
  showDetailed?: boolean;
  position?: "header" | "sidebar" | "floating";
}

export function SmartStatusIndicator({
  showDetailed = false,
  position = "header"
}: SmartStatusIndicatorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch system health data
  const { data: systemHealth, isLoading: healthLoading } = useQuery<SystemHealth>({
    queryKey: ["system-health"],
    queryFn: async () => {
      const response = await fetch("/api/system/health");
      if (!response.ok) throw new Error("Failed to fetch system health");
      const data = await response.json();
      setLastSyncTime(new Date());
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: isOnline,
  });

  // Fetch user progress data
  const { data: userProgress, isLoading: progressLoading } = useQuery<UserProgress>({
    queryKey: ["user-progress"],
    queryFn: async () => {
      const response = await fetch("/api/user/progress");
      if (!response.ok) throw new Error("Failed to fetch user progress");
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    enabled: isOnline,
  });

  const getHealthColor = (status: string) => {
    switch (status) {
      case "excellent": return "text-green-600 bg-green-50";
      case "good": return "text-blue-600 bg-blue-50";
      case "warning": return "text-yellow-600 bg-yellow-50";
      case "critical": return "text-red-600 bg-red-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case "excellent": return <CheckCircle2 className="w-4 h-4" />;
      case "good": return <TrendingUp className="w-4 h-4" />;
      case "warning": return <Clock className="w-4 h-4" />;
      case "critical": return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getProductivityColor = (score: number) => {
    if (score >= 85) return "text-green-600 bg-green-50";
    if (score >= 70) return "text-blue-600 bg-blue-50";
    if (score >= 50) return "text-yellow-600 bg-yellow-50";
    return "text-orange-600 bg-orange-50";
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatLastSync = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins === 0) return "Just now";
    if (diffMins === 1) return "1 min ago";
    if (diffMins < 60) return `${diffMins} mins ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return "1 hour ago";
    return `${diffHours} hours ago`;
  };

  // Compact view for header
  if (!showDetailed) {
    return (
      <div className="flex items-center gap-2">
        {/* Connection Status */}
        <Tooltip>
          <TooltipTrigger>
            <div className={`p-1 rounded-full ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {isOnline ? 'Connected' : 'Offline - changes will sync when reconnected'}
          </TooltipContent>
        </Tooltip>

        {/* System Health */}
        {!healthLoading && systemHealth && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`gap-1 ${getHealthColor(systemHealth.status)}`}
              >
                {getHealthIcon(systemHealth.status)}
                <span className="text-xs font-medium capitalize">{systemHealth.status}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">System Status</h4>
                  <Badge variant="outline" className="text-xs">
                    {formatLastSync(lastSyncTime)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Uptime</span>
                    <div className="font-medium">{formatUptime(systemHealth.uptime)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Active Users</span>
                    <div className="font-medium">{systemHealth.activeUsers}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Cases Today</span>
                    <div className="font-medium">{systemHealth.casesProcessedToday}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Pending</span>
                    <div className="font-medium">{systemHealth.pendingActions}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Automation Rate</span>
                    <span className="font-medium">{systemHealth.automationRate}%</span>
                  </div>
                  <Progress value={systemHealth.automationRate} className="h-2" />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* User Progress */}
        {!progressLoading && userProgress && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`gap-1 ${getProductivityColor(userProgress.productivityScore)}`}
              >
                <Target className="w-4 h-4" />
                <span className="text-xs font-medium">{userProgress.productivityScore}%</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Your Progress Today</h4>
                  <Badge variant="outline" className="text-xs">
                    {userProgress.currentStreak} day streak
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Completed</span>
                    <div className="font-medium">{userProgress.tasksCompletedToday} tasks</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Remaining</span>
                    <div className="font-medium">{userProgress.tasksRemaining} tasks</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Avg Time</span>
                    <div className="font-medium">{userProgress.averageTaskTime}m/task</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Efficiency</span>
                    <div className="font-medium">{userProgress.productivityScore}%</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Daily Goal Progress</span>
                    <span className="font-medium">
                      {Math.round((userProgress.tasksCompletedToday / (userProgress.tasksCompletedToday + userProgress.tasksRemaining)) * 100)}%
                    </span>
                  </div>
                  <Progress
                    value={(userProgress.tasksCompletedToday / (userProgress.tasksCompletedToday + userProgress.tasksRemaining)) * 100}
                    className="h-2"
                  />
                </div>

                {userProgress.achievements.some(a => a.isNew) && (
                  <div className="space-y-2 pt-2 border-t">
                    <h5 className="text-sm font-medium text-green-600">New Achievements!</h5>
                    {userProgress.achievements.filter(a => a.isNew).map(achievement => (
                      <div key={achievement.id} className="flex items-center gap-2 text-sm bg-green-50 p-2 rounded">
                        {achievement.icon}
                        <div>
                          <div className="font-medium">{achievement.title}</div>
                          <div className="text-xs text-gray-600">{achievement.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    );
  }

  // Detailed view for sidebar or floating
  return (
    <div className="space-y-4 p-4 bg-white rounded-lg border">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">System Status</h3>
        <Button variant="ghost" size="sm">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* System Health Details */}
      {!healthLoading && systemHealth && (
        <div className="space-y-3">
          <div className={`p-3 rounded-lg ${getHealthColor(systemHealth.status)}`}>
            <div className="flex items-center gap-2">
              {getHealthIcon(systemHealth.status)}
              <span className="font-medium capitalize">{systemHealth.status} Health</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <span className="text-gray-500">Response Time</span>
              <div className="font-medium">{systemHealth.responseTime}ms</div>
            </div>
            <div className="space-y-1">
              <span className="text-gray-500">Automation</span>
              <div className="font-medium">{systemHealth.automationRate}%</div>
            </div>
          </div>
        </div>
      )}

      {/* User Progress Details */}
      {!progressLoading && userProgress && (
        <div className="space-y-3 pt-4 border-t">
          <h4 className="font-semibold">Your Performance</h4>

          <div className={`p-3 rounded-lg ${getProductivityColor(userProgress.productivityScore)}`}>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="font-medium">{userProgress.productivityScore}% Efficiency</span>
            </div>
          </div>

          <div className="space-y-2">
            <Progress
              value={(userProgress.tasksCompletedToday / (userProgress.tasksCompletedToday + userProgress.tasksRemaining)) * 100}
              className="h-3"
            />
            <div className="text-xs text-gray-500 text-center">
              {userProgress.tasksCompletedToday} of {userProgress.tasksCompletedToday + userProgress.tasksRemaining} tasks complete
            </div>
          </div>
        </div>
      )}
    </div>
  );
}