import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import type { TimelineEvent } from "@shared/schema";
import { fetchWithCsrf } from "../lib/queryClient";

interface TimelineCardProps {
  caseId: string;
}

export function TimelineCard({ caseId }: TimelineCardProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchTimeline = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchWithCsrf(`/api/cases/${caseId}/timeline`);
        if (!response.ok) throw new Error("Failed to fetch timeline");
        const data = await response.json();
        if (cancelled) return;
        setEvents(data.events || []);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Timeline unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchTimeline();
    return () => { cancelled = true; };
  }, [caseId]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const severityColor = (severity?: string, isDeadline?: boolean) => {
    if (isDeadline) {
      switch (severity) {
        case "critical": return "border-red-400 bg-red-50 text-red-600";
        case "warning": return "border-amber-400 bg-amber-50 text-amber-600";
        default: return "border-blue-300 bg-blue-50 text-blue-600";
      }
    }
    switch (severity) {
      case "critical": return "border-red-300 bg-red-50 text-red-600";
      case "warning": return "border-amber-300 bg-amber-50 text-amber-600";
      default: return "border-slate-300 bg-slate-50 text-slate-600";
    }
  };

  const eventTypeLabel = (eventType: string) => {
    if (eventType === "compliance_deadline") return "Compliance";
    return eventType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <Card data-testid="card-timeline">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="material-symbols-outlined text-primary">timeline</span>
          Case Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
            <span>Loading timeline...</span>
          </div>
        )}

        {error && (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <span className="material-symbols-outlined text-warning text-base">error</span>
            {error}
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <p className="text-sm text-muted-foreground">No timeline events available yet.</p>
        )}

        {!loading && !error && events.length > 0 && (
          <div className="relative">
            <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border" />
            <div className="space-y-6">
              {events.map((event) => {
                const isDeadline = event.eventType === "compliance_deadline";
                const isOverdue = isDeadline && event.metadata?.isOverdue;
                const isFuture = isDeadline && event.metadata?.isFuture;
                return (
                  <div key={event.id} className={`relative flex gap-4 ${isDeadline ? "opacity-90" : ""}`}>
                    <div className={`relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 ${severityColor(event.severity, isDeadline)}`}>
                      <span className="material-symbols-outlined text-sm">
                        {event.icon || "circle"}
                      </span>
                    </div>
                    <div className={`flex-1 pb-2 ${isDeadline ? "border-l-2 pl-3 ml-[-1px]" + (isOverdue ? " border-red-300" : isFuture ? " border-blue-200" : " border-amber-300") : ""}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm text-card-foreground">{event.title}</p>
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase tracking-wide whitespace-nowrap ${
                            isDeadline
                              ? isOverdue
                                ? "border-red-300 bg-red-50 text-red-700"
                                : isFuture
                                ? "border-blue-200 bg-blue-50 text-blue-700"
                                : "border-amber-300 bg-amber-50 text-amber-700"
                              : ""
                          }`}
                        >
                          {eventTypeLabel(event.eventType)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isDeadline
                          ? `Deadline: ${formatTimestamp(event.timestamp)}`
                          : formatTimestamp(event.timestamp)}
                      </p>
                      {event.description && (
                        <p className="text-sm text-card-foreground mt-2 leading-relaxed">
                          {event.description}
                        </p>
                      )}
                      {isDeadline && event.metadata?.legislativeRef && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium">Ref:</span> {event.metadata.legislativeRef as string}
                        </p>
                      )}
                      {event.metadata && event.eventType === "discussion_note" && event.metadata.riskFlags && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(event.metadata.riskFlags as string[]).slice(0, 3).map((flag, idx) => (
                            <Badge key={idx} variant="outline" className="text-[10px]">
                              {flag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
