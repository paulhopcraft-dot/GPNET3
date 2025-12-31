import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { WorkerCase, RTWPlanStatus, PaginatedCasesResponse } from "@shared/schema";
import { isLegitimateCase } from "@shared/schema";

// Valid RTW plan status transitions (PRD-3.2.3)
const VALID_TRANSITIONS: Record<RTWPlanStatus, RTWPlanStatus[]> = {
  not_planned: ["planned_not_started"],
  planned_not_started: ["in_progress", "on_hold", "not_planned"],
  in_progress: ["working_well", "failing", "on_hold", "completed"],
  working_well: ["in_progress", "completed", "on_hold"],
  failing: ["in_progress", "on_hold", "not_planned"],
  on_hold: ["planned_not_started", "in_progress", "not_planned"],
  completed: [],
};

const RTW_STATUS_LABELS: Record<RTWPlanStatus, string> = {
  not_planned: "Not Planned",
  planned_not_started: "Planned - Not Started",
  in_progress: "In Progress",
  working_well: "Working Well",
  failing: "Plan Failing",
  on_hold: "On Hold",
  completed: "Completed",
};

function rtwStatusColor(status?: string): string {
  switch (status) {
    case "completed":
    case "working_well":
      return "bg-emerald-100 text-emerald-800";
    case "in_progress":
      return "bg-blue-100 text-blue-800";
    case "planned_not_started":
      return "bg-amber-100 text-amber-800";
    case "failing":
      return "bg-red-100 text-red-800";
    case "on_hold":
      return "bg-slate-100 text-slate-800";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

interface UpdateStatusDialogProps {
  workerCase: WorkerCase;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (caseId: string, status: RTWPlanStatus, reason: string) => void;
  isUpdating: boolean;
}

function UpdateStatusDialog({
  workerCase,
  isOpen,
  onClose,
  onUpdate,
  isUpdating,
}: UpdateStatusDialogProps) {
  const currentStatus = (workerCase.rtwPlanStatus || "not_planned") as RTWPlanStatus;
  const validTransitions = VALID_TRANSITIONS[currentStatus];
  const [selectedStatus, setSelectedStatus] = useState<RTWPlanStatus | "">("");
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    if (selectedStatus && reason.trim()) {
      onUpdate(workerCase.id, selectedStatus, reason);
      setSelectedStatus("");
      setReason("");
    }
  };

  const handleClose = () => {
    setSelectedStatus("");
    setReason("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update RTW Plan Status</DialogTitle>
          <DialogDescription>
            {workerCase.workerName} - Currently: {RTW_STATUS_LABELS[currentStatus]}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="status">New Status</Label>
            {validTransitions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                This plan is completed. No further transitions are allowed.
              </p>
            ) : (
              <Select
                value={selectedStatus}
                onValueChange={(v) => setSelectedStatus(v as RTWPlanStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  {validTransitions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {RTW_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason for Change</Label>
            <Textarea
              id="reason"
              placeholder="Explain why the status is changing..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={validTransitions.length === 0}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedStatus || !reason.trim() || isUpdating}
          >
            {isUpdating ? "Updating..." : "Update Status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function RTWPlannerPage() {
  const queryClient = useQueryClient();
  const [selectedCase, setSelectedCase] = useState<WorkerCase | null>(null);

  const { data: paginatedData, isLoading } = useQuery<PaginatedCasesResponse>({
    queryKey: ["/api/gpnet2/cases"],
  });
  const cases = paginatedData?.cases ?? [];

  const updateMutation = useMutation({
    mutationFn: async ({
      caseId,
      rtwPlanStatus,
      reason,
    }: {
      caseId: string;
      rtwPlanStatus: RTWPlanStatus;
      reason: string;
    }) => {
      const response = await fetch(`/api/cases/${caseId}/rtw-plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rtwPlanStatus, reason }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update RTW status");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gpnet2/cases"] });
      setSelectedCase(null);
    },
  });

  const handleUpdateStatus = (caseId: string, status: RTWPlanStatus, reason: string) => {
    updateMutation.mutate({ caseId, rtwPlanStatus: status, reason });
  };

  const rtwCases = useMemo(() => {
    return cases.filter((c) => {
      if (!isLegitimateCase(c)) return false;
      return c.workStatus === "Off work" || c.rtwPlanStatus;
    });
  }, [cases]);

  const stats = useMemo(() => {
    const offWork = rtwCases.filter((c) => c.workStatus === "Off work");
    return {
      total: offWork.length,
      planned: offWork.filter((c) => c.rtwPlanStatus && c.rtwPlanStatus !== "not_planned").length,
      inProgress: offWork.filter((c) => c.rtwPlanStatus === "in_progress").length,
      completed: rtwCases.filter((c) => c.rtwPlanStatus === "completed").length,
    };
  }, [rtwCases]);

  const calculateRecoveryProgress = (dateOfInjury: string) => {
    const injury = new Date(dateOfInjury);
    const now = new Date();
    const weeksElapsed = Math.floor((now.getTime() - injury.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const expectedWeeks = 12;
    return Math.min(100, Math.round((weeksElapsed / expectedWeeks) * 100));
  };

  if (isLoading) {
    return (
      <PageLayout title="RTW Planner" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">
            progress_activity
          </span>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="RTW Planner" subtitle="Return to Work planning and tracking">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Off Work Cases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                With RTW Plans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.planned}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                RTW In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                RTW Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* RTW Cases List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rtwCases.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <span className="material-symbols-outlined text-4xl text-muted-foreground mb-4">
                  event_available
                </span>
                <p className="text-muted-foreground">No cases currently require RTW planning.</p>
              </CardContent>
            </Card>
          ) : (
            rtwCases.map((workerCase) => (
              <Card key={workerCase.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{workerCase.workerName}</CardTitle>
                      <p className="text-sm text-muted-foreground">{workerCase.company}</p>
                    </div>
                    <Badge className={rtwStatusColor(workerCase.rtwPlanStatus)}>
                      {RTW_STATUS_LABELS[(workerCase.rtwPlanStatus || "not_planned") as RTWPlanStatus]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Recovery Progress</span>
                      <span className="font-medium">
                        {calculateRecoveryProgress(workerCase.dateOfInjury)}%
                      </span>
                    </div>
                    <Progress value={calculateRecoveryProgress(workerCase.dateOfInjury)} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Injury Date</span>
                      <p className="font-medium">{workerCase.dateOfInjury}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Work Status</span>
                      <p className="font-medium">{workerCase.workStatus}</p>
                    </div>
                  </div>

                  {workerCase.nextStep && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Next Step</span>
                      <p className="font-medium">{workerCase.nextStep}</p>
                    </div>
                  )}

                  <div className="pt-2 border-t flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedCase(workerCase)}
                    >
                      <span className="material-symbols-outlined text-sm mr-2">edit</span>
                      Update Status
                    </Button>
                    <Link to={`/summary/${workerCase.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <span className="material-symbols-outlined text-sm mr-2">open_in_new</span>
                        View Case
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Update Status Dialog */}
      {selectedCase && (
        <UpdateStatusDialog
          workerCase={selectedCase}
          isOpen={!!selectedCase}
          onClose={() => setSelectedCase(null)}
          onUpdate={handleUpdateStatus}
          isUpdating={updateMutation.isPending}
        />
      )}
    </PageLayout>
  );
}
