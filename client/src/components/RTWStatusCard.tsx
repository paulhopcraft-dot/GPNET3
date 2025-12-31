/**
 * RTWStatusCard - Charter-Compliant RTW Status Display
 *
 * This component follows the Post-Frontend Architecture Charter:
 * - Displays RTW status narrative (no state machine in UI)
 * - Backend determines valid transitions
 * - Simple update action with rationale
 *
 * Replaces: Complex RTW state machine in RTWPlannerPage
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { fetchWithCsrf } from "../lib/queryClient";
import { CheckCircle, AlertTriangle, Clock, TrendingUp, ChevronRight } from "lucide-react";

interface RTWStatusCardProps {
  caseId: string;
  workerName: string;
  currentStatus?: string;
  planStatus?: string;
  narrative?: string;
  conditions?: string[];
  blockers?: string[];
  onUpdate?: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  not_planned: "Not Planned",
  planned_not_started: "Planned - Not Started",
  in_progress: "In Progress",
  working_well: "Working Well",
  failing: "Plan Failing",
  on_hold: "On Hold",
  completed: "Completed",
};

const STATUS_COLORS: Record<string, string> = {
  not_planned: "bg-slate-100 text-slate-800",
  planned_not_started: "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-800",
  working_well: "bg-emerald-100 text-emerald-800",
  failing: "bg-red-100 text-red-800",
  on_hold: "bg-slate-100 text-slate-800",
  completed: "bg-emerald-100 text-emerald-800",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  not_planned: <Clock className="h-4 w-4" />,
  planned_not_started: <Clock className="h-4 w-4" />,
  in_progress: <TrendingUp className="h-4 w-4" />,
  working_well: <CheckCircle className="h-4 w-4" />,
  failing: <AlertTriangle className="h-4 w-4" />,
  on_hold: <Clock className="h-4 w-4" />,
  completed: <CheckCircle className="h-4 w-4" />,
};

export function RTWStatusCard({
  caseId,
  workerName,
  currentStatus,
  planStatus,
  narrative,
  conditions,
  blockers,
  onUpdate,
}: RTWStatusCardProps) {
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updateReason, setUpdateReason] = useState("");
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async ({ newStatus, reason }: { newStatus: string; reason: string }) => {
      const response = await fetchWithCsrf(`/api/cases/${caseId}/rtw-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, reason }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/narrative`] });
      queryClient.invalidateQueries({ queryKey: ["/api/gpnet2/cases"] });
      setShowUpdateForm(false);
      setUpdateReason("");
      onUpdate?.();
    },
  });

  const status = planStatus || "not_planned";
  const statusLabel = STATUS_LABELS[status] || status;
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.not_planned;
  const StatusIcon = STATUS_ICONS[status] || STATUS_ICONS.not_planned;

  // Determine next logical status based on current (simplified - backend validates)
  const getNextStatus = (): string | null => {
    switch (status) {
      case "not_planned":
        return "planned_not_started";
      case "planned_not_started":
        return "in_progress";
      case "in_progress":
        return "working_well";
      case "failing":
        return "in_progress";
      case "on_hold":
        return "in_progress";
      default:
        return null;
    }
  };

  const nextStatus = getNextStatus();
  const nextLabel = nextStatus ? STATUS_LABELS[nextStatus] : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Return to Work Plan</CardTitle>
          <Badge className={statusColor}>
            {StatusIcon}
            <span className="ml-1">{statusLabel}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Narrative */}
        {narrative && <p className="text-sm text-muted-foreground">{narrative}</p>}

        {/* Conditions */}
        {conditions && conditions.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground mb-1">Conditions</p>
            <ul className="space-y-1">
              {conditions.map((condition, i) => (
                <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                  <Clock className="h-3 w-3 mt-1 flex-shrink-0" />
                  {condition}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Blockers */}
        {blockers && blockers.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground mb-1">
              Current Blockers
            </p>
            <ul className="space-y-1">
              {blockers.map((blocker, i) => (
                <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                  <AlertTriangle className="h-3 w-3 mt-1 flex-shrink-0" />
                  {blocker}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Update Form */}
        {showUpdateForm ? (
          <div className="space-y-3 pt-2 border-t">
            <p className="text-sm font-medium">
              Update status to: <Badge variant="outline">{nextLabel}</Badge>
            </p>
            <Textarea
              placeholder="Reason for update (required)..."
              value={updateReason}
              onChange={(e) => setUpdateReason(e.target.value)}
              rows={2}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() =>
                  nextStatus && updateMutation.mutate({ newStatus: nextStatus, reason: updateReason })
                }
                disabled={!updateReason.trim() || updateMutation.isPending}
              >
                {updateMutation.isPending ? "Updating..." : "Confirm Update"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowUpdateForm(false);
                  setUpdateReason("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          nextStatus &&
          status !== "completed" && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowUpdateForm(true)}
            >
              Update to {nextLabel}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )
        )}

        {/* Completed state */}
        {status === "completed" && (
          <div className="flex items-center gap-2 text-emerald-700 text-sm">
            <CheckCircle className="h-4 w-4" />
            Return to work completed successfully
          </div>
        )}
      </CardContent>
    </Card>
  );
}
