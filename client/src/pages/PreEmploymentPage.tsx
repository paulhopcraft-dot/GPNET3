import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Search, Activity, Users, CheckCircle, AlertCircle, FileText, XCircle, ClipboardList } from "lucide-react";
import { fetchWithCsrf } from "@/lib/queryClient";

interface PreEmploymentAssessment {
  id: string;
  candidateName: string;
  positionTitle: string;
  assessmentType: string;
  status: "pending" | "scheduled" | "in_progress" | "completed" | "failed" | "cancelled";
  clearanceLevel?: "cleared_unconditional" | "cleared_conditional" | "cleared_with_restrictions" | "not_cleared" | "pending_review" | "requires_review";
  scheduledDate?: string;
  completedDate?: string;
  createdAt: string;
  reportJson?: {
    executiveSummary: string;
    healthStatus: string;
    fitnessAssessment: string;
    flags: string[];
    clearanceRecommendation: string;
    conditions?: string | null;
    notes?: string;
  };
}

interface DashboardStats {
  totalAssessments: number;
  pendingAssessments: number;
  completedAssessments: number;
  clearedCandidates: number;
  rejectedCandidates: number;
  assessmentsByType: Record<string, number>;
  clearanceLevelBreakdown: Record<string, number>;
}

export default function PreEmploymentPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCandidateName, setNewCandidateName] = useState("");
  const [newPositionTitle, setNewPositionTitle] = useState("");
  const [newAssessmentType, setNewAssessmentType] = useState("");
  const [newJobDescription, setNewJobDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [reportModalAssessment, setReportModalAssessment] = useState<PreEmploymentAssessment | null>(null);
  const queryClient = useQueryClient();

  const approveAssessmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetchWithCsrf(`/api/pre-employment/assessments/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed", clearanceLevel: "cleared_unconditional" }),
      });
      if (!response.ok) throw new Error("Failed to approve");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pre-employment-assessments"] });
      queryClient.invalidateQueries({ queryKey: ["pre-employment-dashboard"] });
      setReportModalAssessment(null);
    },
  });

  const rejectAssessmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetchWithCsrf(`/api/pre-employment/assessments/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed", clearanceLevel: "not_cleared" }),
      });
      if (!response.ok) throw new Error("Failed to reject");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pre-employment-assessments"] });
      queryClient.invalidateQueries({ queryKey: ["pre-employment-dashboard"] });
      setReportModalAssessment(null);
    },
  });

  const createAssessmentMutation = useMutation({
    mutationFn: async (data: { candidateName: string; positionTitle: string; assessmentType: string; jobDescription?: string }) => {
      const response = await fetchWithCsrf("/api/pre-employment/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as any).message || "Failed to create assessment");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pre-employment-assessments"] });
      queryClient.invalidateQueries({ queryKey: ["pre-employment-dashboard"] });
      setDialogOpen(false);
      setNewCandidateName("");
      setNewPositionTitle("");
      setNewAssessmentType("");
      setNewJobDescription("");
      setFormError("");
    },
    onError: (err: Error) => {
      setFormError(err.message);
    },
  });

  const handleCreateAssessment = () => {
    if (!newCandidateName.trim()) { setFormError("Candidate name is required"); return; }
    if (!newPositionTitle.trim()) { setFormError("Position title is required"); return; }
    if (!newAssessmentType) { setFormError("Assessment type is required"); return; }
    setFormError("");
    createAssessmentMutation.mutate({
      candidateName: newCandidateName.trim(),
      positionTitle: newPositionTitle.trim(),
      assessmentType: newAssessmentType,
      jobDescription: newJobDescription.trim() || undefined,
    });
  };

  const { data: dashboardStats } = useQuery<{ stats: DashboardStats }>({
    queryKey: ["pre-employment-dashboard"],
    queryFn: async () => {
      const response = await fetch("/api/pre-employment/dashboard", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch dashboard stats");
      return response.json();
    }
  });

  const { data: assessments } = useQuery<{ assessments: PreEmploymentAssessment[] }>({
    queryKey: ["pre-employment-assessments", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      const response = await fetch(`/api/pre-employment/assessments?${params}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch assessments");
      return response.json();
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "in_progress": return "bg-blue-100 text-blue-800 border-blue-200";
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "scheduled": return "bg-purple-100 text-purple-800 border-purple-200";
      case "failed": return "bg-red-100 text-red-800 border-red-200";
      case "cancelled": return "bg-gray-100 text-gray-600 border-gray-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "in_progress": return "Questionnaire Received";
      case "pending": return "Awaiting Response";
      case "completed": return "Completed";
      case "scheduled": return "Scheduled";
      default: return status.replace(/_/g, " ");
    }
  };

  const getClearanceColor = (clearance?: string) => {
    switch (clearance) {
      case "cleared_unconditional": return "bg-green-100 text-green-800 border-green-200";
      case "cleared_conditional": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "cleared_with_restrictions": return "bg-orange-100 text-orange-800 border-orange-200";
      case "not_cleared": return "bg-red-100 text-red-800 border-red-200";
      case "requires_review": return "bg-orange-100 text-orange-800 border-orange-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getClearanceLabel = (clearance?: string) => {
    switch (clearance) {
      case "cleared_unconditional": return "✓ Approved";
      case "cleared_conditional": return "⏳ Awaiting Approval";
      case "cleared_with_restrictions": return "Cleared with Restrictions";
      case "not_cleared": return "✗ Not Cleared";
      case "requires_review": return "Requires Review";
      default: return clearance?.replace(/_/g, " ") ?? "";
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  };

  const hasReport = (a: PreEmploymentAssessment) => a.reportJson != null;

  const filteredAssessments = assessments?.assessments?.filter(assessment =>
    assessment.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assessment.positionTitle.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pre-Employment Health Checks</h1>
          <p className="text-gray-600 mt-2">Manage health assessments for new candidates</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="w-4 h-4 mr-2" />
              New Assessment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Pre-Employment Assessment</DialogTitle>
              <DialogDescription>
                Fill in the candidate details and attach the job description. A health questionnaire link will be generated for the candidate.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="candidateName">Candidate Name *</Label>
                <Input id="candidateName" placeholder="John Smith" value={newCandidateName} onChange={(e) => setNewCandidateName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position Title *</Label>
                <Input id="position" placeholder="Warehouse Operator" value={newPositionTitle} onChange={(e) => setNewPositionTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assessmentType">Assessment Type *</Label>
                <Select value={newAssessmentType} onValueChange={setNewAssessmentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baseline_health">Baseline Health</SelectItem>
                    <SelectItem value="functional_capacity">Functional Capacity</SelectItem>
                    <SelectItem value="medical_screening">Medical Screening</SelectItem>
                    <SelectItem value="fitness_for_duty">Fitness for Duty</SelectItem>
                    <SelectItem value="full_medical">Full Medical</SelectItem>
                    <SelectItem value="comprehensive_health_screening">Comprehensive Health Screening</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobDescription">Job Description <span className="text-gray-400 font-normal">(optional — used for AI report)</span></Label>
                <Textarea
                  id="jobDescription"
                  placeholder="Paste the job description or key physical requirements here. The AI will use this to assess the candidate's fitness for the role."
                  value={newJobDescription}
                  onChange={(e) => setNewJobDescription(e.target.value)}
                  rows={5}
                  className="text-sm"
                />
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <Button className="w-full" onClick={handleCreateAssessment} disabled={createAssessmentMutation.isPending}>
                {createAssessmentMutation.isPending ? "Creating..." : "Create & Generate Questionnaire Link"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      {dashboardStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { icon: <Users className="w-5 h-5 text-blue-600" />, value: dashboardStats.stats.totalAssessments, label: "Total" },
            { icon: <Activity className="w-5 h-5 text-yellow-600" />, value: dashboardStats.stats.pendingAssessments, label: "Pending" },
            { icon: <ClipboardList className="w-5 h-5 text-blue-600" />, value: dashboardStats.stats.completedAssessments, label: "Completed" },
            { icon: <CheckCircle className="w-5 h-5 text-green-600" />, value: dashboardStats.stats.clearedCandidates, label: "Cleared" },
            { icon: <AlertCircle className="w-5 h-5 text-red-600" />, value: dashboardStats.stats.rejectedCandidates, label: "Not Cleared" },
          ].map((stat, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  {stat.icon}
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-gray-600">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input placeholder="Search candidate or position..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Awaiting Response</SelectItem>
                <SelectItem value="in_progress">Questionnaire Received</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assessments List */}
      <Card>
        <CardHeader>
          <CardTitle>Assessments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredAssessments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No assessments found</p>
              </div>
            ) : (
              filteredAssessments.map((assessment) => (
                <div key={assessment.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{assessment.candidateName}</h3>
                      <p className="text-sm text-gray-600">{assessment.positionTitle}</p>
                      <p className="text-xs text-gray-500">
                        {assessment.assessmentType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                        {" · "}Created {formatDate(assessment.createdAt)}
                        {assessment.completedDate && ` · Completed ${formatDate(assessment.completedDate)}`}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge className={getStatusColor(assessment.status)}>
                        {getStatusLabel(assessment.status)}
                      </Badge>

                      {assessment.clearanceLevel && (
                        <Badge className={getClearanceColor(assessment.clearanceLevel)}>
                          {getClearanceLabel(assessment.clearanceLevel)}
                        </Badge>
                      )}

                      <div className="flex gap-2 mt-1">
                        {/* View Report button — shown when questionnaire is received or completed */}
                        {(assessment.status === "in_progress" || assessment.status === "completed") && hasReport(assessment) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-700 border-blue-300 hover:bg-blue-50"
                            onClick={() => setReportModalAssessment(assessment)}
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            View Report
                          </Button>
                        )}

                        {/* Approve button — only shown when not yet completed/cancelled */}
                        {assessment.status !== "completed" && assessment.status !== "cancelled" && !hasReport(assessment) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-700 border-green-300 hover:bg-green-50"
                            onClick={() => approveAssessmentMutation.mutate(assessment.id)}
                            disabled={approveAssessmentMutation.isPending}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Approve
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Modal */}
      {reportModalAssessment && (
        <Dialog open={!!reportModalAssessment} onOpenChange={(open) => !open && setReportModalAssessment(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">Pre-Employment Health Report</DialogTitle>
              <DialogDescription>
                {reportModalAssessment.candidateName} — {reportModalAssessment.positionTitle}
              </DialogDescription>
            </DialogHeader>

            {reportModalAssessment.reportJson ? (
              <div className="space-y-5 py-2">
                {/* Clearance Banner */}
                <div className={`rounded-lg p-4 border-2 ${getClearanceColor(reportModalAssessment.reportJson.clearanceRecommendation)}`}>
                  <div className="flex items-center gap-2">
                    {reportModalAssessment.reportJson.clearanceRecommendation === "cleared_unconditional" ? (
                      <CheckCircle className="w-5 h-5 text-green-700" />
                    ) : reportModalAssessment.reportJson.clearanceRecommendation === "not_cleared" ? (
                      <XCircle className="w-5 h-5 text-red-700" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-orange-700" />
                    )}
                    <span className="font-semibold text-sm uppercase tracking-wide">
                      AI Recommendation: {getClearanceLabel(reportModalAssessment.reportJson.clearanceRecommendation)}
                    </span>
                  </div>
                </div>

                {/* Executive Summary */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Summary</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{reportModalAssessment.reportJson.executiveSummary}</p>
                </div>

                {/* Health Status & Fitness */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Health Status</p>
                    <p className="text-sm text-gray-800">{reportModalAssessment.reportJson.healthStatus}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Fitness Assessment</p>
                    <p className="text-sm text-gray-800">{reportModalAssessment.reportJson.fitnessAssessment}</p>
                  </div>
                </div>

                {/* Flags */}
                {reportModalAssessment.reportJson.flags && reportModalAssessment.reportJson.flags.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4 text-orange-500" /> Flags / Concerns
                    </h3>
                    <ul className="space-y-1">
                      {reportModalAssessment.reportJson.flags.map((flag, i) => (
                        <li key={i} className="text-sm text-orange-800 bg-orange-50 rounded px-3 py-2">• {flag}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* No flags */}
                {(!reportModalAssessment.reportJson.flags || reportModalAssessment.reportJson.flags.length === 0) && (
                  <div className="text-sm text-green-700 bg-green-50 rounded px-3 py-2">
                    ✓ No health flags or concerns identified
                  </div>
                )}

                {/* Conditions */}
                {reportModalAssessment.reportJson.conditions && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Conditions / Restrictions</h3>
                    <p className="text-sm text-gray-700 bg-yellow-50 rounded px-3 py-2">{reportModalAssessment.reportJson.conditions}</p>
                  </div>
                )}

                {/* Notes */}
                {reportModalAssessment.reportJson.notes && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Notes</h3>
                    <p className="text-sm text-gray-600">{reportModalAssessment.reportJson.notes}</p>
                  </div>
                )}

                {/* Approve / Reject buttons — shown when AI has reviewed but human hasn't approved yet */}
                {(reportModalAssessment.status === "in_progress" || reportModalAssessment.clearanceLevel === "cleared_conditional") && reportModalAssessment.status !== "completed" && (
                  <div className="border-t pt-4 flex gap-3">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => approveAssessmentMutation.mutate(reportModalAssessment.id)}
                      disabled={approveAssessmentMutation.isPending || rejectAssessmentMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {approveAssessmentMutation.isPending ? "Approving..." : "Approve — Cleared to Start"}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                      onClick={() => rejectAssessmentMutation.mutate(reportModalAssessment.id)}
                      disabled={approveAssessmentMutation.isPending || rejectAssessmentMutation.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      {rejectAssessmentMutation.isPending ? "Rejecting..." : "Reject — Not Cleared"}
                    </Button>
                  </div>
                )}

                {reportModalAssessment.status === "completed" && (
                  <div className={`border-t pt-4 text-center text-sm font-medium ${
                    reportModalAssessment.clearanceLevel === "not_cleared" ? "text-red-600" : "text-green-600"
                  }`}>
                    {reportModalAssessment.clearanceLevel === "not_cleared"
                      ? "✗ This candidate was not cleared"
                      : "✓ This candidate has been approved"}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p>Report not yet generated</p>
                <p className="text-xs mt-1">The AI report is generated once the candidate submits their questionnaire</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
