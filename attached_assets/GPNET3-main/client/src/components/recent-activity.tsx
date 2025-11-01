import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Activity {
  id: string;
  user: string;
  action: string;
  caseId: string;
  timestamp: string;
  type: "update" | "create" | "complete" | "comment";
}

export function RecentActivity() {
  // TODO: remove mock functionality
  const activities: Activity[] = [
    {
      id: "1",
      user: "Jane Smith",
      action: "updated status to Verification Required",
      caseId: "CS-2024-002",
      timestamp: "2 hours ago",
      type: "update",
    },
    {
      id: "2",
      user: "John Doe",
      action: "completed verification",
      caseId: "CS-2024-004",
      timestamp: "4 hours ago",
      type: "complete",
    },
    {
      id: "3",
      user: "Mike Wilson",
      action: "created new case",
      caseId: "CS-2024-005",
      timestamp: "6 hours ago",
      type: "create",
    },
    {
      id: "4",
      user: "Sarah Johnson",
      action: "added comment",
      caseId: "CS-2024-001",
      timestamp: "8 hours ago",
      type: "comment",
    },
    {
      id: "5",
      user: "John Doe",
      action: "updated risk assessment",
      caseId: "CS-2024-003",
      timestamp: "1 day ago",
      type: "update",
    },
  ];

  const getTypeColor = (type: Activity["type"]) => {
    switch (type) {
      case "create": return "default";
      case "update": return "secondary";
      case "complete": return "default";
      case "comment": return "outline";
      default: return "secondary";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3" data-testid={`activity-${activity.id}`}>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {activity.user.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm" data-testid={`text-user-${activity.id}`}>
                    {activity.user}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {activity.action}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getTypeColor(activity.type)} className="text-xs" data-testid={`badge-type-${activity.id}`}>
                    {activity.caseId}
                  </Badge>
                  <span className="text-xs text-muted-foreground" data-testid={`text-timestamp-${activity.id}`}>
                    {activity.timestamp}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
