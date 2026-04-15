/**
 * NotificationBell
 * BUG-03: Notification bell with dropdown showing recent system alerts
 * Polls /api/notifications/recent every 60 seconds
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "./ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  priority: "low" | "medium" | "high" | "critical";
  subject: string;
  status: "pending" | "sent" | "failed" | "skipped";
  sentAt: string | null;
  caseId: string | null;
  createdAt: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: "text-red-600 bg-red-50 border-red-200",
  high: "text-orange-600 bg-orange-50 border-orange-200",
  medium: "text-yellow-700 bg-yellow-50 border-yellow-200",
  low: "text-muted-foreground bg-muted/50 border-transparent",
};

const STATUS_DOT: Record<string, string> = {
  sent: "bg-green-500",
  failed: "bg-red-500",
  pending: "bg-yellow-500",
  skipped: "bg-gray-400",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);

  const { data: notifications = [] } = useQuery<NotificationItem[]>({
    queryKey: ["notifications-recent"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/recent", { credentials: "include" });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data ?? [];
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const failedCount = notifications.filter((n) => n.status === "failed").length;
  const badgeCount = failedCount || (notifications.length > 0 ? notifications.length : 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" title="Notifications">
          <Bell className="w-4 h-4" />
          {badgeCount > 0 && (
            <span
              className={cn(
                "absolute -top-1 -right-1 flex items-center justify-center rounded-full text-white text-[10px] font-bold min-w-[16px] h-4 px-1",
                failedCount > 0 ? "bg-red-500" : "bg-primary"
              )}
            >
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b">
          <h3 className="text-sm font-semibold">Recent Notifications</h3>
          <p className="text-xs text-muted-foreground">Last 24 hours</p>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No recent notifications
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "px-4 py-3 text-sm border-l-2",
                    PRIORITY_COLORS[n.priority] ?? PRIORITY_COLORS.low
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-1.5 w-2 h-2 rounded-full flex-shrink-0",
                        STATUS_DOT[n.status] ?? "bg-gray-400"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium leading-snug truncate">{n.subject}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        <span className="capitalize">{n.status}</span>
                        <span>·</span>
                        <span>{timeAgo(n.sentAt ?? n.createdAt)}</span>
                        {n.priority === "critical" && (
                          <>
                            <span>·</span>
                            <span className="font-semibold text-red-600">CRITICAL</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {notifications.length > 0 && (
          <div className="px-4 py-2 border-t text-center">
            <span className="text-xs text-muted-foreground">
              {notifications.length} notification{notifications.length !== 1 ? "s" : ""} in the last 24 hours
            </span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
