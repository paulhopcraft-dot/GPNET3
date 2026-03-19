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
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import type { WorkerCase, RTWPlanStatus, PaginatedCasesResponse } from "@shared/schema";
import { isLegitimateCase } from "@shared/schema";
import {
  Briefcase,
  Activity,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Mail,
  Send,
  FileText,
  ChevronRight,
  ChevronLeft,
  Wrench,
  Layers,
} from "lucide-react";

// Valid RTW plan status transitions (PRD-3.2.3)
const VALID_TRANSITIONS: Record<RTWPlanStatus, RTWPlanStatus[]> = {
  not_planned: ["planned_not_started"],
  pending_employer_review: ["planned_not_started", "not_planned"],
  planned_not_started: ["in_progress", "on_hold", "not_planned"],
  in_progress: ["working_well", "failing", "on_hold", "completed"],
  working_well: ["in_progress", "completed", "on_hold"],
  failing: ["in_progress", "on_hold", "not_planned"],
  on_hold: ["planned_not_started", "in_progress", "not_planned"],
  completed: [],
};

const RTW_STATUS_LABELS: Record<RTWPlanStatus, string> = {
  not_planned: "Not Planned",
  pending_employer_review: "Pending Employer Review",
  planned_not_started: "Planned — Not Started",
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

// ─── Create Plan Wizard ────────────────────────────────────────────────────

type PlanOption = "option_a" | "option_b";

interface CreatePlanWizardProps {
  workerCase: WorkerCase;
  isOpen: boolean;
  onClose: () => void;
}

function CreatePlanWizard({ workerCase, isOpen, onClose }: CreatePlanWizardProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedOption, setSelectedOption] = useState<PlanOption | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7); // Default: start in 1 week
    return d.toISOString().split("T")[0];
  });
  const [durationWeeks, setDurationWeeks] = useState("6");
  const [coordinatorNotes, setCoordinatorNotes] = useState("");
  const [planId, setPlanId] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  // Try to get AI recommendation from backend
  const { data: recommendation, isLoading: loadingRecommendation } = useQuery({
    queryKey: ["rtw-recommend", workerCase.id],
    queryFn: () =>
      fetch(`/api/rtw-plans/recommend?caseId=${workerCase.id}&roleId=default`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    enabled: isOpen,
    retry: false,
  });

  const createPlanMutation = useMutation({
    mutationFn: async () => {
      // If we have full recommendation data, use the full plan API
      if (recommendation?.success && recommendation.data?.duties) {
        const planType =
          selectedOption === "option_a" ? "normal_hours" : "partial_hours";
        const resp = await apiRequest("POST", "/api/rtw-plans", {
          caseId: workerCase.id,
          roleId: recommendation.data.roleId || "default",
          planType,
          startDate,
          schedule: Array.from({ length: parseInt(durationWeeks) }, (_, i) => ({
            weekNumber: i + 1,
            hoursPerDay: selectedOption === "option_a" ? 8 : 4,
            daysPerWeek: selectedOption === "option_a" ? 5 : 5,
          })),
          selectedDutyIds: recommendation.data.duties
            .filter((d: any) => d.suitability !== "not_suitable")
            .map((d: any) => d.dutyId),
        });
        const json = await resp.json();
        if (json.planId) return json.planId as string;
      }
      // Fallback: update status to planned_not_started
      await apiRequest("PUT", `/api/cases/${workerCase.id}/rtw-plan`, {
        rtwPlanStatus: "planned_not_started",
        reason: `Option ${selectedOption === "option_a" ? "A (modified role)" : "B (light duties)"} selected. Start: ${startDate}. Duration: ${durationWeeks} weeks. Notes: ${coordinatorNotes || "None"}`,
      });
      return null;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/gpnet2/cases"] });
      if (id) setPlanId(id);
      setStep(3);
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      if (!planId) return;
      await apiRequest("POST", `/api/rtw-plans/${planId}/email/send`, {});
    },
    onSuccess: () => {
      setEmailSent(true);
    },
  });

  const handleClose = () => {
    setStep(1);
    setSelectedOption(null);
    setPlanId(null);
    setEmailSent(false);
    setCoordinatorNotes("");
    onClose();
  };

  const weeksSinceInjury = workerCase.dateOfInjury
    ? Math.floor(
        (Date.now() - new Date(workerCase.dateOfInjury).getTime()) /
          (7 * 24 * 60 * 60 * 1000)
      )
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Create RTW Plan — {workerCase.workerName}
          </DialogTitle>
          <DialogDescription>
            {workerCase.company}
            {weeksSinceInjury !== null && ` · ${weeksSinceInjury} weeks since injury`}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs font-medium mb-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${step === s ? "bg-blue-600 text-white" : step > s ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}
              >
                {step > s ? "✓" : s}
              </div>
              <span className={step === s ? "text-slate-800" : "text-slate-400"}>
                {s === 1 ? "Choose Path" : s === 2 ? "Plan Details" : "Confirm & Send"}
              </span>
              {s < 3 && <ChevronRight className="w-3 h-3 text-slate-300" />}
            </div>
          ))}
        </div>

        {/* ── Step 1: Choose Path ─────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Select the type of return-to-work pathway for this worker.
            </p>

            {loadingRecommendation && (
              <div className="text-sm text-slate-500 flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Checking medical constraints...
              </div>
            )}

            {recommendation?.recommendedPlanType && (
              <div className="text-xs bg-blue-50 border border-blue-200 rounded px-3 py-2 text-blue-800">
                AI recommendation based on current restrictions:{" "}
                <strong>
                  {recommendation.recommendedPlanType === "normal_hours"
                    ? "Option A — Modified Role"
                    : "Option B — Light Duties"}
                </strong>
              </div>
            )}

            {/* Option A */}
            <button
              onClick={() => setSelectedOption("option_a")}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                selectedOption === "option_a"
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                  <Wrench className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">Option A — Modified Role</p>
                    {recommendation?.recommendedPlanType === "normal_hours" && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    Worker returns to their normal role with temporary modifications or restrictions.
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Best for: partial restrictions, temporary limitations, shorter recovery
                  </p>
                </div>
                {selectedOption === "option_a" && (
                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 ml-auto" />
                )}
              </div>
            </button>

            {/* Option B */}
            <button
              onClick={() => setSelectedOption("option_b")}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                selectedOption === "option_b"
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg flex-shrink-0">
                  <Layers className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">Option B — Light Duties</p>
                    {recommendation?.recommendedPlanType !== "normal_hours" &&
                      recommendation?.recommendedPlanType && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                          Recommended
                        </span>
                      )}
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    Worker returns to alternative or lighter duties while recovering.
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Best for: significant restrictions, longer recovery, limited capacity
                  </p>
                </div>
                {selectedOption === "option_b" && (
                  <CheckCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 ml-auto" />
                )}
              </div>
            </button>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedOption}
              >
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ── Step 2: Plan Details ─────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg border text-sm flex items-center gap-2">
              {selectedOption === "option_a" ? (
                <Wrench className="w-4 h-4 text-blue-600" />
              ) : (
                <Layers className="w-4 h-4 text-indigo-600" />
              )}
              <span className="font-medium text-slate-700">
                {selectedOption === "option_a" ? "Option A — Modified Role" : "Option B — Light Duties"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="startDate">Plan Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="duration">Estimated Duration</Label>
                <Select value={durationWeeks} onValueChange={setDurationWeeks}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 4, 6, 8, 12, 16, 26].map((w) => (
                      <SelectItem key={w} value={String(w)}>
                        {w} weeks
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes">Coordinator Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any specific modifications, duties excluded, or notes for the worker and employer..."
                value={coordinatorNotes}
                onChange={(e) => setCoordinatorNotes(e.target.value)}
                rows={3}
              />
            </div>

            {selectedOption === "option_a" ? (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 space-y-1">
                <p className="font-medium">Modified Role — What happens next</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Worker returns to normal role with temporary restrictions applied</li>
                  <li>Employer confirms suitable duties are available</li>
                  <li>Plan is distributed to all parties for review</li>
                  <li>Medical constraints can be varied within the review window</li>
                </ul>
              </div>
            ) : (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-800 space-y-1">
                <p className="font-medium">Light Duties — What happens next</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Worker is placed in alternative or reduced duties</li>
                  <li>Employer provides list of available suitable duties</li>
                  <li>Plan is distributed to all parties for review</li>
                  <li>Graduated hours increase as worker recovers</li>
                </ul>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => createPlanMutation.mutate()}
                disabled={createPlanMutation.isPending}
              >
                {createPlanMutation.isPending ? "Creating..." : "Create Plan"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ── Step 3: Confirm & Send ───────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <CheckCircle className="w-8 h-8 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-emerald-800">RTW Plan Created</p>
                <p className="text-sm text-emerald-700">
                  {selectedOption === "option_a" ? "Option A (Modified Role)" : "Option B (Light Duties)"} — {durationWeeks} weeks from {startDate}
                </p>
              </div>
            </div>

            {/* Distribution panel */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">Distribute Plan to All Parties</p>
              <p className="text-sm text-slate-600">
                The RTW plan will be emailed to the worker, treating doctor, insurer, and employer.
                Each party has a time-limited window to vary medical constraints only.
              </p>

              {planId ? (
                emailSent ? (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
                    <Mail className="w-4 h-4" />
                    <span>Plan distributed to all parties.</span>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => sendEmailMutation.mutate()}
                    disabled={sendEmailMutation.isPending}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {sendEmailMutation.isPending ? "Sending..." : "Send Plan to All Parties"}
                  </Button>
                )
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  <p className="font-medium mb-1">Email distribution requires full plan setup</p>
                  <p className="text-xs">
                    To enable automated distribution, ensure this case has: a medical certificate
                    with extracted restrictions, and an RTW role with duties configured.
                    Contact your administrator if these are missing.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" asChild>
                <Link to={`/summary/${workerCase.id}`}>View Case</Link>
              </Button>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Update Status Dialog (for in-progress plans) ─────────────────────────

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
            {workerCase.workerName} — Currently:{" "}
            {RTW_STATUS_LABELS[currentStatus]}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="status">New Status</Label>
            {validTransitions.length === 0 ? (
              <p className="text-sm text-slate-600">
                This plan is completed. No further transitions allowed.
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

// ─── Recovery Progress ─────────────────────────────────────────────────────

function recoveryProgress(workerCase: WorkerCase): { pct: number; weeks: number; label: string } {
  if (!workerCase.dateOfInjury) return { pct: 0, weeks: 0, label: "Unknown" };

  const injury = new Date(workerCase.dateOfInjury);
  const now = new Date();
  const weeksElapsed = Math.floor(
    (now.getTime() - injury.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );

  // Use RTW plan target end date if available, else estimate from status
  const rtwStatus = workerCase.rtwPlanStatus;
  let expectedWeeks = 12; // conservative default
  if (rtwStatus === "working_well") expectedWeeks = Math.max(weeksElapsed + 2, 8);
  if (rtwStatus === "in_progress") expectedWeeks = Math.max(weeksElapsed + 4, 8);
  if (workerCase.rtwPlanStatus === "completed") return { pct: 100, weeks: weeksElapsed, label: "Completed" };

  const pct = Math.min(99, Math.round((weeksElapsed / expectedWeeks) * 100));
  return { pct, weeks: weeksElapsed, label: `Week ${weeksElapsed}` };
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function RTWPlannerPage() {
  const queryClient = useQueryClient();
  const [createPlanCase, setCreatePlanCase] = useState<WorkerCase | null>(null);
  const [updateStatusCase, setUpdateStatusCase] = useState<WorkerCase | null>(null);

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
      const response = await apiRequest("PUT", `/api/cases/${caseId}/rtw-plan`, {
        rtwPlanStatus,
        reason,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gpnet2/cases"] });
      setUpdateStatusCase(null);
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

  const notPlanned = rtwCases.filter(
    (c) => !c.rtwPlanStatus || c.rtwPlanStatus === "not_planned"
  );
  const inProgress = rtwCases.filter(
    (c) => c.rtwPlanStatus && c.rtwPlanStatus !== "not_planned" && c.rtwPlanStatus !== "completed"
  );
  const completed = rtwCases.filter((c) => c.rtwPlanStatus === "completed");

  const stats = {
    needPlan: notPlanned.length,
    planned: inProgress.length,
    failing: rtwCases.filter((c) => c.rtwPlanStatus === "failing").length,
    completed: completed.length,
  };

  if (isLoading) {
    return (
      <PageLayout title="RTW Planner" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="RTW Planner" subtitle="Return to Work planning and case management">
      <div className="space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-600">Need Plan</p>
                <p className="text-2xl font-bold text-amber-700">{stats.needPlan}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-700">{stats.planned}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-slate-600">Failing</p>
                <p className="text-2xl font-bold text-red-700">{stats.failing}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-600">Completed</p>
                <p className="text-2xl font-bold text-emerald-700">{stats.completed}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cases needing a plan — highest priority */}
        {notPlanned.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Need RTW Plan ({notPlanned.length})
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {notPlanned.map((workerCase) => {
                const { pct, weeks } = recoveryProgress(workerCase);
                return (
                  <Card
                    key={workerCase.id}
                    className="border border-amber-200 shadow-md hover:shadow-lg transition-shadow"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{workerCase.workerName}</CardTitle>
                          <p className="text-sm text-slate-600">{workerCase.company}</p>
                        </div>
                        <Badge className="bg-amber-100 text-amber-800 border-0">No Plan</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-600">
                          <span>Recovery timeline</span>
                          <span className="font-medium">Week {weeks} off work</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-xs text-slate-500">Injury Date</span>
                          <p className="font-medium text-slate-800">{workerCase.dateOfInjury || "—"}</p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500">Work Status</span>
                          <p className="font-medium text-slate-800">{workerCase.workStatus}</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t flex gap-2">
                        <Button
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                          size="sm"
                          onClick={() => setCreatePlanCase(workerCase)}
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          Create RTW Plan
                        </Button>
                        <Link to={`/summary/${workerCase.id}`}>
                          <Button variant="outline" size="sm">
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Cases with plans in progress */}
        {inProgress.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              Plans In Progress ({inProgress.length})
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {inProgress.map((workerCase) => {
                const { pct, weeks } = recoveryProgress(workerCase);
                const isFailing = workerCase.rtwPlanStatus === "failing";
                return (
                  <Card
                    key={workerCase.id}
                    className={`shadow-md hover:shadow-lg transition-shadow border ${
                      isFailing ? "border-red-200" : "border-slate-200"
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{workerCase.workerName}</CardTitle>
                          <p className="text-sm text-slate-600">{workerCase.company}</p>
                        </div>
                        <Badge className={rtwStatusColor(workerCase.rtwPlanStatus)}>
                          {RTW_STATUS_LABELS[(workerCase.rtwPlanStatus || "not_planned") as RTWPlanStatus]}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-600">
                          <span>Recovery progress</span>
                          <span className="font-medium">Week {weeks}</span>
                        </div>
                        <Progress
                          value={pct}
                          className={`h-2 ${isFailing ? "[&>div]:bg-red-500" : ""}`}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-xs text-slate-500">Injury Date</span>
                          <p className="font-medium text-slate-800">{workerCase.dateOfInjury || "—"}</p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500">Work Status</span>
                          <p className="font-medium text-slate-800">{workerCase.workStatus}</p>
                        </div>
                      </div>
                      {workerCase.nextStep && (
                        <div className="text-sm bg-slate-50 rounded p-2">
                          <span className="text-xs text-slate-500">Next Step</span>
                          <p className="font-medium text-slate-800">{workerCase.nextStep}</p>
                        </div>
                      )}
                      <div className="pt-2 border-t flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setUpdateStatusCase(workerCase)}
                        >
                          <Briefcase className="w-4 h-4 mr-1" />
                          Update Status
                        </Button>
                        <Link to={`/summary/${workerCase.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            View Case <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Completed ({completed.length})
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {completed.map((workerCase) => (
                <Card key={workerCase.id} className="border-0 shadow-sm bg-slate-50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">{workerCase.workerName}</p>
                      <p className="text-sm text-slate-600">{workerCase.company}</p>
                    </div>
                    <Link to={`/summary/${workerCase.id}`}>
                      <Button variant="ghost" size="sm">
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {rtwCases.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No cases currently require RTW planning.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Plan Wizard */}
      {createPlanCase && (
        <CreatePlanWizard
          workerCase={createPlanCase}
          isOpen={!!createPlanCase}
          onClose={() => setCreatePlanCase(null)}
        />
      )}

      {/* Update Status Dialog */}
      {updateStatusCase && (
        <UpdateStatusDialog
          workerCase={updateStatusCase}
          isOpen={!!updateStatusCase}
          onClose={() => setUpdateStatusCase(null)}
          onUpdate={handleUpdateStatus}
          isUpdating={updateMutation.isPending}
        />
      )}
    </PageLayout>
  );
}
