import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import type { CaseAction, CaseActionType } from "@shared/schema";
import { fetchWithCsrf } from "../lib/queryClient";

interface ActionQueueCardProps {
  onCaseClick?: (caseId: string) => void;
  limit?: number;
}

export function ActionQueueCard({ onCaseClick, limit = 5 }: ActionQueueCardProps) {
  const [actions, setActions] = useState<CaseAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchActions = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchWithCsrf(`/api/actions/pending?limit=${limit}`);
        if (!response.ok) {
          throw new Error("Failed to fetch actions");
        }
        const data = await response.json();
        if (cancelled) return;
        setActions(data.data || []);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Actions unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchActions();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  const actionTypeLabel = (type: CaseActionType): string => {
    switch (type) {
      case "chase_certificate":
        return "Chase certificate";
      case "review_case":
        return "Review case";
      case "follow_up":
        return "Follow up";
      default:
        return type;
    }
  };

  const actionTypeIcon = (type: CaseActionType): string => {
    switch (type) {
      case "chase_certificate":
        return "clinical_notes";
      case "review_case":
        return "fact_check";
      case "follow_up":
        return "phone_callback";
      default:
        return "task";
    }
  };

  const getDueDateInfo = (dueDate?: string): { text: string; isOverdue: boolean; urgency: "high" | "medium" | "low" } => {
    if (!dueDate) return { text: "No due date", isOverdue: false, urgency: "low" };

    const due = new Date(dueDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const overdueDays = Math.abs(diffDays);
      return {
        text: `Overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}`,
        isOverdue: true,
        urgency: "high",
      };
    } else if (diffDays === 0) {
      return { text: "Due today", isOverdue: false, urgency: "high" };
    } else if (diffDays === 1) {
      return { text: "Due tomorrow", isOverdue: false, urgency: "medium" };
    } else if (diffDays <= 3) {
      return { text: `Due in ${diffDays} days`, isOverdue: false, urgency: "medium" };
    } else {
      return { text: `Due in ${diffDays} days`, isOverdue: false, urgency: "low" };
    }
  };

  const urgencyBadgeClass = (urgency: "high" | "medium" | "low", isOverdue: boolean) => {
    if (isOverdue) {
      return "bg-red-100 text-red-800 border-red-200";
    }
    switch (urgency) {
      case "high":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const handleActionClick = (action: CaseAction) => {
    if (onCaseClick) {
      onCaseClick(action.caseId);
    }
  };

  return (
    <Card data-testid="card-action-queue" className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <span className="material-symbols-outlined text-primary text-lg">pending_actions</span>
            Action Queue
          </CardTitle>
          {actions.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {actions.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
            <span>Loading actions...</span>
          </div>
        )}

        {error && (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <span className="material-symbols-outlined text-warning text-base">error</span>
            {error}
          </div>
        )}

        {!loading && !error && actions.length === 0 && (
          <div className="text-center py-4">
            <span className="material-symbols-outlined text-3xl text-emerald-500/60 mb-2">
              check_circle
            </span>
            <p className="text-sm text-muted-foreground">
              No pending actions. All caught up!
            </p>
          </div>
        )}

        {!loading && !error && actions.length > 0 && (
          <div className="space-y-2">
            {actions.map((action) => {
              const dueInfo = getDueDateInfo(action.dueDate);
              return (
                <button
                  key={action.id}
                  onClick={() => handleActionClick(action)}
                  className={`w-full text-left rounded-lg border-2 p-3 transition-all cursor-pointer
                    hover:shadow-md hover:scale-[1.02] active:scale-[0.98]
                    ${dueInfo.isOverdue
                      ? "border-red-300 bg-red-50 hover:border-red-400"
                      : dueInfo.urgency === "high"
                      ? "border-amber-300 bg-amber-50 hover:border-amber-400"
                      : "border-slate-200 bg-slate-50 hover:border-primary/50"
                  }`}
                >
                  {/* Worker Name - Primary */}
                  <div className="font-semibold text-sm text-card-foreground mb-1">
                    {action.workerName || "Unknown Worker"}
                  </div>

                  {/* Company */}
                  <div className="text-xs text-muted-foreground mb-2">
                    {action.company || "Unknown Company"}
                  </div>

                  {/* Action Type + Due Date */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="secondary"
                      className={`text-xs font-medium ${
                        dueInfo.isOverdue
                          ? "bg-red-100 text-red-700"
                          : dueInfo.urgency === "high"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs mr-1">
                        {actionTypeIcon(action.type)}
                      </span>
                      {actionTypeLabel(action.type)}
                    </Badge>
                    <span className={`text-xs font-medium ${
                      dueInfo.isOverdue ? "text-red-600" : "text-muted-foreground"
                    }`}>
                      {dueInfo.text}
                    </span>
                  </div>

                  {/* Notes if present */}
                  {action.notes && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2 italic">
                      {action.notes}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
