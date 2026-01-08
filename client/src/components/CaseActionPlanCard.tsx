import { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Clock, CheckCircle2, XCircle, Plus } from "lucide-react";
import type { CaseAction } from "@shared/schema";
import { fetchWithCsrf } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CaseActionPlanCardProps {
  caseId: string;
  actions: CaseAction[];
  workerName: string;
  onActionUpdate?: () => void;
}

export function CaseActionPlanCard({ caseId, actions, workerName, onActionUpdate }: CaseActionPlanCardProps) {
  const { toast } = useToast();
  const [processingActionId, setProcessingActionId] = useState<string | null>(null);

  // Sort actions: pending first, then by priority, then by due date
  const sortedActions = [...actions].sort((a, b) => {
    // Completed/failed last
    if (a.status === 'done' && b.status !== 'done') return 1;
    if (a.status !== 'done' && b.status === 'done') return -1;
    if (a.failed && !b.failed) return 1;
    if (!a.failed && b.failed) return -1;

    // Blockers first
    if (a.isBlocker && !b.isBlocker) return -1;
    if (!a.isBlocker && b.isBlocker) return 1;

    // By priority
    if (a.priority !== b.priority) return (a.priority || 99) - (b.priority || 99);

    // By due date (overdue first)
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;

    return 0;
  });

  const handleToggleComplete = async (action: CaseAction) => {
    if (processingActionId) return;

    setProcessingActionId(action.id);

    try {
      const endpoint = action.status === 'done'
        ? `/api/cases/${caseId}/actions/${action.id}/uncomplete`
        : `/api/cases/${caseId}/actions/${action.id}/complete`;

      const response = await fetchWithCsrf(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Failed to update action');
      }

      toast({
        title: action.status === 'done' ? "Action marked as pending" : "Action completed",
        description: action.notes || "Action status updated",
      });

      onActionUpdate?.();
    } catch (error) {
      console.error('Failed to toggle action:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update action status",
      });
    } finally {
      setProcessingActionId(null);
    }
  };

  const formatDueDate = (dueDate?: string): { text: string; isOverdue: boolean } => {
    if (!dueDate) return { text: "No due date", isOverdue: false };

    const due = new Date(dueDate);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''} ago`, isOverdue: true };
    } else if (diffDays === 0) {
      return { text: "Today", isOverdue: false };
    } else if (diffDays === 1) {
      return { text: "Tomorrow", isOverdue: false };
    } else if (diffDays <= 7) {
      return { text: `In ${diffDays} days`, isOverdue: false };
    } else {
      return { text: due.toLocaleDateString(), isOverdue: false };
    }
  };

  const formatCompletedDate = (completedAt?: string): string => {
    if (!completedAt) return "";
    return new Date(completedAt).toLocaleDateString();
  };

  const getPriorityLabel = (priority: number): { text: string; color: string } => {
    if (priority === 1) return { text: "High", color: "text-red-600" };
    if (priority === 2) return { text: "Medium", color: "text-yellow-600" };
    return { text: "Low", color: "text-gray-600" };
  };

  if (actions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Case Plan - {workerName}</h3>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground opacity-70">
            No action plan yet. Generate an AI summary to create one.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Case Plan - {workerName}</h3>
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add Action
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="space-y-2">
          {sortedActions.map((action) => {
            const dueInfo = formatDueDate(action.dueDate);
            const priorityInfo = getPriorityLabel(action.priority);
            const isCompleted = action.status === 'done';
            const isFailed = action.failed;
            const isProcessing = processingActionId === action.id;

            return (
              <div
                key={action.id}
                className={cn(
                  "border-l-4 pl-3 py-1.5 space-y-1 bg-card",
                  action.isBlocker ? "border-red-500" :
                  isCompleted ? "border-green-500" :
                  isFailed ? "border-gray-400" :
                  dueInfo.isOverdue ? "border-orange-500" :
                  "border-blue-500"
                )}
              >
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={isCompleted}
                    disabled={isFailed || isProcessing}
                    onCheckedChange={() => handleToggleComplete(action)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-0.5">
                    <div className={cn(
                      "font-medium text-foreground",
                      isCompleted && "line-through opacity-60",
                      isFailed && "line-through opacity-60"
                    )}>
                      {action.notes || "No description"}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-foreground opacity-80">
                      {/* WHO does what */}
                      {action.assignedToName && (
                        <span className="font-medium text-foreground">
                          WHO: {action.assignedToName}
                        </span>
                      )}

                      {/* BY WHEN */}
                      {action.dueDate && !isCompleted && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          BY WHEN: {dueInfo.text}
                          {dueInfo.isOverdue && <span className="text-red-600 font-semibold">⚠️ OVERDUE</span>}
                        </span>
                      )}

                      {/* Blocker indicator */}
                      {action.isBlocker && !isCompleted && (
                        <span className="flex items-center gap-1 text-red-600 font-semibold">
                          <AlertTriangle className="w-3 h-3" />
                          🚫 BLOCKER
                        </span>
                      )}

                      {/* Completion info */}
                      {isCompleted && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="w-3 h-3" />
                          COMPLETED: {formatCompletedDate(action.completedAt)}
                          {action.autoCompleted && <span className="text-xs">(auto-detected)</span>}
                        </span>
                      )}

                      {/* Failed info */}
                      {isFailed && (
                        <span className="flex items-center gap-1 text-gray-600">
                          <XCircle className="w-3 h-3" />
                          FAILED: {action.failureReason || "No reason provided"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
