import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  WorkerCase,
  MedicalCertificate,
  RecoveryTimelineSummary,
  WorkCapacity,
  CaseDiscussionNote,
  TranscriptInsight,
} from "@shared/schema";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { RecoveryChart } from "./RecoveryChart";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { TerminationPanel } from "./TerminationPanel";
import { TimelineCard } from "./TimelineCard";
import { CertificateCard } from "./CertificateCard";
import { TreatmentPlanCard } from "./TreatmentPlanCard";
import { SummaryCard } from "./SummaryCard";
import { EmailDraftButton } from "./EmailDraftButton";
import { CaseChatPanel } from "./CaseChatPanel";
import { fetchWithCsrf } from "../lib/queryClient";
import { Sparkles, CheckCircle, Phone, Mail, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "../lib/queryClient";
import { StatusHeader } from "./StatusHeader";
import { DateQualityBadge } from "./DateQualityBadge";
import { CaseActionPlanCard } from "./CaseActionPlanCard";
import { CaseContactsPanel } from "./CaseContactsPanel";
import type { CaseContact, CaseContactRole } from "@shared/schema";

interface CaseDetailPanelProps {
  workerCase: WorkerCase;
  onClose: () => void;
}

export function deriveSummaryMetaFromCase(workerCase: WorkerCase): {
  generatedAt: string | undefined;
  model: string | undefined;
  cached: boolean | undefined;
  needsRefresh: boolean | undefined;
} {
  return {
    generatedAt: workerCase.aiSummaryGeneratedAt,
    model: workerCase.aiSummaryModel,
    cached: workerCase.aiSummary ? true : undefined,
    needsRefresh: undefined,
  };
}

export function CaseDetailPanel({ workerCase, onClose }: CaseDetailPanelProps) {
  // Fetch dynamic timeline estimate
  const { data: timelineEstimate } = useQuery<{ estimatedCompletionDate?: string }>({
    queryKey: [`/api/cases/${workerCase.id}/timeline-estimate`],
  });

  // Fetch pending actions for this case
  const { data: pendingActionsData } = useQuery<{ data: any[] }>({
    queryKey: [`/api/actions/pending`, workerCase.id],
    queryFn: async () => {
      const response = await fetchWithCsrf(`/api/actions/pending?limit=100`);
      if (!response.ok) throw new Error("Failed to fetch actions");
      return response.json();
    },
  });

  // Filter actions for this specific case
  const caseActions = pendingActionsData?.data?.filter((action: any) =>
    action.caseId === workerCase.id && action.status === "pending"
  ) || [];

  // Calculate expected recovery date - use dynamic estimate if available, fallback to 12 weeks
  const injuryDate = new Date(workerCase.dateOfInjury);
  const expectedRecoveryDate = timelineEstimate?.estimatedCompletionDate
    ? new Date(timelineEstimate.estimatedCompletionDate)
    : (() => {
        const fallback = new Date(injuryDate);
        fallback.setDate(fallback.getDate() + 12 * 7);
        return fallback;
      })();

  const [aiSummary, setAiSummary] = useState<string | null>(workerCase.aiSummary || null);
  const [summaryMeta, setSummaryMeta] = useState(deriveSummaryMetaFromCase(workerCase));
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<MedicalCertificate[]>([]);
  const [timelineSummary, setTimelineSummary] = useState<RecoveryTimelineSummary | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [discussionNotes, setDiscussionNotes] = useState<CaseDiscussionNote[]>(
    workerCase.latestDiscussionNotes ?? [],
  );
  const [discussionInsights, setDiscussionInsights] = useState<TranscriptInsight[]>(
    workerCase.discussionInsights ?? [],
  );
  const [discussionLoading, setDiscussionLoading] = useState(false);
  const [discussionError, setDiscussionError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [closingCase, setClosingCase] = useState(false);
  const [overridingCompliance, setOverridingCompliance] = useState(false);
  const [mergingTickets, setMergingTickets] = useState(false);
  const [showComplianceForm, setShowComplianceForm] = useState(false);
  const [complianceValue, setComplianceValue] = useState<string>("");
  const [complianceReason, setComplianceReason] = useState("");
  const { toast } = useToast();
  const latestCaseIdRef = useRef(workerCase.id);
  useEffect(() => {
    latestCaseIdRef.current = workerCase.id;
  }, [workerCase.id]);

  useEffect(() => {
    setAiSummary(workerCase.aiSummary ?? null);
    setSummaryMeta(deriveSummaryMetaFromCase(workerCase));
    setSummaryError(null);
    setLoadingSummary(false);
  }, [workerCase.id, workerCase.aiSummary, workerCase.aiSummaryGeneratedAt, workerCase.aiSummaryModel]);

  const capacityLabel = (capacity: WorkCapacity | undefined) => {
    switch (capacity) {
      case "fit":
        return "Fit for Work";
      case "partial":
        return "Partial Capacity";
      case "unfit":
        return "No Capacity";
      default:
        return "Unknown";
    }
  };

  const capacityBadgeClass = (capacity: WorkCapacity | undefined) => {
    switch (capacity) {
      case "fit":
        return "bg-emerald-100 text-emerald-800";
      case "partial":
        return "bg-amber-100 text-amber-800";
      case "unfit":
        return "bg-red-100 text-red-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "Unknown";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatRange = (start: string, end: string) => {
    const startLabel = formatDate(start);
    const endLabel = formatDate(end);
    if (startLabel === endLabel) {
      return startLabel;
    }
    return `${startLabel} - ${endLabel}`;
  };

  const formatTimestamp = (value?: string | Date) => {
    if (!value) return "Unknown";
    const date = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleString("en-AU", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fetchCachedSummary = async (): Promise<boolean> => {
    const caseId = workerCase.id;
    try {
      const response = await fetchWithCsrf(`/api/cases/${caseId}/summary`);
      if (!response.ok) {
        throw new Error("Failed to fetch summary");
      }
      const data = await response.json();
      if (latestCaseIdRef.current !== caseId) {
        return false;
      }
      
      if (data.summary) {
        setAiSummary(data.summary);
      }
      setSummaryMeta({
        generatedAt: data.generatedAt,
        model: data.model,
        cached: data.cached,
        needsRefresh: data.needsRefresh,
      });
      if (Array.isArray(data.discussionNotes)) {
        setDiscussionNotes((prev) => {
          if (prev.length > data.discussionNotes.length) {
            return prev;
          }
          return data.discussionNotes;
        });
      }
      if (Array.isArray(data.discussionInsights)) {
        setDiscussionInsights((prev) => {
          if (prev.length > data.discussionInsights.length) {
            return prev;
          }
          return data.discussionInsights;
        });
      }
      
      // Return whether we need to generate a new summary
      return data.needsRefresh || !data.summary;
    } catch (error) {
      console.error("Error fetching summary:", error);
      return true; // On error, try to generate
    }
  };

  const generateSummary = async (force: boolean = false) => {
    const caseId = workerCase.id;
    setLoadingSummary(true);
    setSummaryError(null);

    try {
      const url = `/api/cases/${caseId}/summary${force ? '?force=true' : ''}`;
      const response = await fetchWithCsrf(url, {
        method: 'POST',
      });
      const data = await response.json();
      if (latestCaseIdRef.current !== caseId) {
        return;
      }
      setAiSummary(data.summary);
      setSummaryMeta({
        generatedAt: data.generatedAt,
        model: data.model,
        cached: data.cached,
        needsRefresh: false,
      });
      if (Array.isArray(data.discussionNotes)) {
        setDiscussionNotes((prev) => {
          if (prev.length > data.discussionNotes.length) {
            return prev;
          }
          return data.discussionNotes;
        });
      }
      if (Array.isArray(data.discussionInsights)) {
        setDiscussionInsights((prev) => {
          if (prev.length > data.discussionInsights.length) {
            return prev;
          }
          return data.discussionInsights;
        });
      }
    } catch (error) {
      console.error("Error generating AI summary:", error);
      setSummaryError(error instanceof Error ? error.message : "AI summary temporarily unavailable");
    } finally {
      if (latestCaseIdRef.current === caseId) {
        setLoadingSummary(false);
      }
    }
  };

  useEffect(() => {
    const initSummary = async () => {
      // Fetch cached summary metadata on mount
      const needsGeneration = await fetchCachedSummary();
      
      // After fetching, generate if needed
      if (latestCaseIdRef.current !== workerCase.id) {
        return;
      }
      if (needsGeneration) {
        void generateSummary();
      }
    };
    
    initSummary();
  }, [workerCase.id]);

  useEffect(() => {
    let cancelled = false;

    const loadTimeline = async () => {
      setTimelineLoading(true);
      setTimelineError(null);
      try {
        const response = await fetchWithCsrf(`/api/cases/${workerCase.id}/recovery-timeline`);
        if (!response.ok) {
          throw new Error("Failed to fetch recovery timeline");
        }
        const data = await response.json();
        if (cancelled) return;
        setTimeline(data.certificates ?? []);
        setTimelineSummary(data.summary ?? null);
      } catch (error) {
        if (cancelled) return;
        setTimelineError(error instanceof Error ? error.message : "Recovery timeline unavailable");
        setTimeline([]);
        setTimelineSummary(null);
      } finally {
        if (!cancelled) {
          setTimelineLoading(false);
        }
      }
    };

    loadTimeline();
    return () => {
      cancelled = true;
    };
  }, [workerCase.id]);

  useEffect(() => {
    setDiscussionNotes(workerCase.latestDiscussionNotes ?? []);
    setDiscussionInsights(workerCase.discussionInsights ?? []);
  }, [workerCase.id, workerCase.latestDiscussionNotes, workerCase.discussionInsights]);

  useEffect(() => {
    let cancelled = false;

    const loadDiscussionNotes = async () => {
      setDiscussionLoading(true);
      setDiscussionError(null);
      try {
        const response = await fetchWithCsrf(`/api/cases/${workerCase.id}/discussion-notes`);
        if (!response.ok) {
          throw new Error("Failed to fetch discussion notes");
        }
        const data = await response.json();
        if (!cancelled) {
          setDiscussionNotes(data.notes ?? []);
          setDiscussionInsights(data.insights ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setDiscussionError(
            error instanceof Error ? error.message : "Failed to load discussion notes",
          );
        }
      } finally {
        if (!cancelled) {
          setDiscussionLoading(false);
        }
      }
    };

    loadDiscussionNotes();

    return () => {
      cancelled = true;
    };
  }, [workerCase.id]);

  const rtwPlanLabels: Record<string, string> = {
    not_planned: "Not planned",
    planned_not_started: "Planned, not started",
    in_progress: "RTW in progress",
    working_well: "Working well",
    failing: "Plan failing",
    on_hold: "Plan on hold",
    completed: "RTW completed",
  };

  const complianceLabels: Record<string, string> = {
    unknown: "Unknown",
    compliant: "Compliant",
    partially_compliant: "Partially compliant",
    non_compliant: "Non-compliant",
  };

  const specialistLabels: Record<string, string> = {
    none: "No specialist involved",
    referred: "Referred",
    appointment_booked: "Appointment booked",
    seen_waiting_report: "Seen - report pending",
    report_received: "Report received",
    did_not_attend: "Did not attend",
    not_required: "Not required",
  };

  const handleCloseCase = async () => {
    if (!confirm("Are you sure you want to close this case? This will also close the linked Freshdesk ticket(s).")) {
      return;
    }

    setClosingCase(true);
    try {
      const response = await fetchWithCsrf(`/api/cases/${workerCase.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Closed from dashboard" }),
      });

      if (!response.ok) {
        throw new Error("Failed to close case");
      }

      toast({
        title: "Case Closed",
        description: `${workerCase.workerName}'s case has been closed successfully.`,
      });

      // Refresh the cases list
      queryClient.invalidateQueries({ queryKey: ["/api/gpnet2/cases"] });

      // Close the detail panel
      onClose();
    } catch (error) {
      console.error("Error closing case:", error);
      toast({
        title: "Error",
        description: "Failed to close the case. Please try again.",
        variant: "destructive",
      });
    } finally {
      setClosingCase(false);
    }
  };

  const handleComplianceOverride = async () => {
    if (!complianceValue || !complianceReason) {
      toast({
        title: "Missing Information",
        description: "Please select a compliance status and provide a reason.",
        variant: "destructive",
      });
      return;
    }

    setOverridingCompliance(true);
    try {
      const response = await fetchWithCsrf(`/api/cases/${workerCase.id}/compliance-override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complianceValue, reason: complianceReason }),
      });

      if (!response.ok) {
        throw new Error("Failed to override compliance");
      }

      toast({
        title: "Compliance Updated",
        description: `Compliance status set to ${complianceValue}.`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/gpnet2/cases"] });
      setShowComplianceForm(false);
      setComplianceValue("");
      setComplianceReason("");
    } catch (error) {
      console.error("Error overriding compliance:", error);
      toast({
        title: "Error",
        description: "Failed to update compliance status.",
        variant: "destructive",
      });
    } finally {
      setOverridingCompliance(false);
    }
  };

  const handleMergeTickets = async () => {
    if (!workerCase.ticketIds || workerCase.ticketIds.length < 2) {
      toast({
        title: "Cannot Merge",
        description: "This case only has one ticket.",
        variant: "destructive",
      });
      return;
    }

    setMergingTickets(true);
    try {
      // Use the first ticket as master
      const masterTicketId = workerCase.ticketIds[0];

      const response = await fetchWithCsrf(`/api/cases/${workerCase.id}/merge-tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterTicketId, closeOthers: true }),
      });

      if (!response.ok) {
        throw new Error("Failed to merge tickets");
      }

      const result = await response.json();

      toast({
        title: "Tickets Merged",
        description: `Master ticket: ${masterTicketId}. Closed ${result.closedTickets?.length || 0} other ticket(s).`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/gpnet2/cases"] });
    } catch (error) {
      console.error("Error merging tickets:", error);
      toast({
        title: "Error",
        description: "Failed to merge tickets.",
        variant: "destructive",
      });
    } finally {
      setMergingTickets(false);
    }
  };

  // Calculate certificate status for StatusHeader
  const getCertificateStatus = (): {
    status: "active" | "expiring_soon" | "expired" | "missing" | "invalid";
    message: string;
  } | undefined => {
    if (!timeline || timeline.length === 0) {
      return {
        status: "missing",
        message: "No medical certificates on file",
      };
    }

    const latestCert = timeline[timeline.length - 1];
    const today = new Date();
    const endDate = new Date(latestCert.endDate);
    const startDate = new Date(latestCert.startDate);

    // Check if certificate dates are in the future (data error)
    if (startDate > today) {
      return {
        status: "invalid",
        message: `Certificate dates are in the future (${startDate.toLocaleDateString()}) - possible data error`,
      };
    }

    // Check if expired
    if (endDate < today) {
      const daysExpired = Math.floor((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        status: "expired",
        message: `Certificate expired ${daysExpired} day${daysExpired > 1 ? 's' : ''} ago`,
      };
    }

    // Check if expiring soon (within 7 days)
    const daysUntilExpiry = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 7) {
      return {
        status: "expiring_soon",
        message: `Certificate expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}`,
      };
    }

    // Active certificate
    return undefined; // Don't show certificate status if everything is fine
  };

  const certificateStatus = getCertificateStatus();

  const hasClinicalStatus =
    workerCase.rtwPlanStatus ||
    workerCase.complianceStatus ||
    workerCase.specialistStatus ||
    workerCase.specialistReportSummary;

  return (
    <aside className="w-96 flex-shrink-0 bg-card border-l border-border p-6">
      <div className="flex justify-between items-start mb-6">
        <h2
          className="text-xl font-bold text-card-foreground"
          data-testid="case-detail-worker-name"
        >
          {workerCase.workerName}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant={showChat ? "default" : "outline"}
            size="sm"
            onClick={() => setShowChat(!showChat)}
            data-testid="button-toggle-chat"
            className="gap-1"
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Ask AI</span>
          </Button>
          <EmailDraftButton caseId={workerCase.id} workerName={workerCase.workerName} />
          <Button
            variant="outline"
            size="sm"
            onClick={handleCloseCase}
            disabled={closingCase || workerCase.caseStatus === "closed"}
            data-testid="button-close-case"
            className="gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
          >
            <CheckCircle className="h-4 w-4" />
            <span className="hidden sm:inline">
              {closingCase ? "Closing..." : workerCase.caseStatus === "closed" ? "Closed" : "Close Case"}
            </span>
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-panel">
            <span className="material-symbols-outlined">close</span>
          </Button>
        </div>
      </div>

      {/* Chat Panel - conditionally shown */}
      {showChat && (
        <div className="h-[400px] mb-4">
          <CaseChatPanel
            caseId={workerCase.id}
            workerName={workerCase.workerName}
            onClose={() => setShowChat(false)}
          />
        </div>
      )}

      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="space-y-6">
          {/* Status Header - Shows compliance status and next actions */}
          <StatusHeader
            workerCase={workerCase}
            pendingActions={caseActions}
            certificateStatus={certificateStatus}
          />

          {/* Interactive Action Plan - WHO does WHAT by WHEN */}
          <CaseActionPlanCard
            caseId={workerCase.id}
            actions={caseActions}
            workerName={workerCase.workerName}
            onActionUpdate={() => {
              queryClient.invalidateQueries({ queryKey: [`/api/actions/pending`, workerCase.id] });
            }}
          />

          {/* Date of Injury with Quality Indicator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="material-symbols-outlined text-primary">event</span>
                Key Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Date of Injury:</span>
                <DateQualityBadge
                  source={(workerCase as any).dateOfInjurySource || "unknown"}
                  confidence={(workerCase as any).dateOfInjuryConfidence || "low"}
                  date={new Date(workerCase.dateOfInjury).toLocaleDateString("en-AU", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Days off work:</span>
                <span className="font-medium">
                  {Math.floor((new Date().getTime() - injuryDate.getTime()) / (1000 * 60 * 60 * 24))} days
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Expected RTW:</span>
                <span className="font-medium">
                  {expectedRecoveryDate.toLocaleDateString("en-AU", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Smart Summary Card - Structured Analysis */}
          <SummaryCard caseId={workerCase.id} />

          {loadingSummary && (
            <Card data-testid="card-summary-loading">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="material-symbols-outlined animate-spin text-primary">autorenew</span>
                  <span>Generating AI case summary with Claude Sonnet 4...</span>
                </div>
              </CardContent>
            </Card>
          )}

          {aiSummary && (
            <Card data-testid="card-ai-summary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="material-symbols-outlined text-primary">psychology</span>
                    AI Case Summary
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateSummary(true)}
                    disabled={loadingSummary}
                    data-testid="button-refresh-summary"
                    className="text-xs"
                  >
                    {loadingSummary ? (
                      <span className="material-symbols-outlined animate-spin text-sm">autorenew</span>
                    ) : (
                      <span className="material-symbols-outlined text-sm">refresh</span>
                    )}
                    Refresh
                  </Button>
                </div>
                {summaryMeta.generatedAt && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                    {summaryMeta.needsRefresh && (
                      <span className="material-symbols-outlined text-warning text-sm">warning</span>
                    )}
                    <span>
                      {summaryMeta.cached && "Cached • "}
                      Generated {new Date(summaryMeta.generatedAt).toLocaleString()}
                      {summaryMeta.model && ` • ${summaryMeta.model}`}
                    </span>
                  </div>
                )}
                {summaryMeta.needsRefresh && (
                  <div className="text-xs text-warning mt-1">
                    Ticket updated since summary generation - click Refresh for latest analysis
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{aiSummary}</div>
              </CardContent>
            </Card>
          )}

          {summaryError && (
            <Card data-testid="card-summary-error">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="material-symbols-outlined">info</span>
                  {summaryError}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="material-symbols-outlined text-primary">fact_check</span>
                Clinical Status
              </CardTitle>
            </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {workerCase.rtwPlanStatus && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              RTW Plan
                  </Badge>
                  <span>{rtwPlanLabels[workerCase.rtwPlanStatus] ?? workerCase.rtwPlanStatus}</span>
                </div>
              )}
              {workerCase.complianceStatus && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                    Compliance
                  </Badge>
                  <span>
                    {complianceLabels[workerCase.complianceStatus] ?? workerCase.complianceStatus}
                  </span>
                </div>
              )}
              {workerCase.specialistStatus && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                    Specialist
                  </Badge>
                  <span>
                    {specialistLabels[workerCase.specialistStatus] ?? workerCase.specialistStatus}
                  </span>
                </div>
              )}
              {workerCase.specialistReportSummary?.diagnosisSummary && (
                <p className="text-xs text-muted-foreground">
                  Latest specialist note: {workerCase.specialistReportSummary.diagnosisSummary}
                </p>
              )}
              {!hasClinicalStatus && (
                <p className="text-sm text-muted-foreground">No clinical status captured yet.</p>
              )}
      </CardContent>
    </Card>

          {workerCase.clinicalEvidence && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="material-symbols-outlined text-primary">gavel</span>
                  Duty Safety & Evidence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase tracking-wide ${
                      workerCase.clinicalEvidence.dutySafetyStatus === "unsafe"
                        ? "border-red-300 text-red-700"
                        : workerCase.clinicalEvidence.dutySafetyStatus === "safe"
                        ? "border-emerald-300 text-emerald-700"
                        : "border-slate-300 text-slate-700"
                    }`}
                  >
                    Duty Safety: {workerCase.clinicalEvidence.dutySafetyStatus.toUpperCase()}
                  </Badge>
                  {workerCase.clinicalEvidence.dutySafetyStatus !== "safe" && (
                    <span className="text-muted-foreground">
                      Review flags before assigning duties.
                    </span>
                  )}
                </div>
                {workerCase.clinicalEvidence.flags.filter((f) => f.severity === "high_risk").length >
                  0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      High-Risk Flags
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      {workerCase.clinicalEvidence.flags
                        .filter((f) => f.severity === "high_risk")
                        .map((flag) => (
                          <li key={flag.code} className="text-sm text-red-700">
                            {flag.message}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
                {workerCase.clinicalEvidence.recommendedActions &&
                  workerCase.clinicalEvidence.recommendedActions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Recommended Actions
                      </p>
                      <ul className="space-y-1">
                        {workerCase.clinicalEvidence.recommendedActions.slice(0, 3).map((action) => (
                          <li key={action.id} className="text-sm text-card-foreground">
                            <span className="font-medium">{action.label}</span>{" "}
                            <span className="text-muted-foreground">({action.target})</span>
                            <div className="text-xs text-muted-foreground">{action.explanation}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </CardContent>
            </Card>
          )}

          <Card data-testid="card-discussion-notes">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="material-symbols-outlined text-primary">forum</span>
                Latest Discussion Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {discussionInsights.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Transcript Risk Insights
                  </p>
                  <div className="space-y-2">
                    {discussionInsights.slice(0, 4).map((insight) => (
                      <div
                        key={insight.id}
                        className="flex items-start gap-2 rounded-md border border-border p-2"
                      >
                        <Badge className={`text-[10px] ${severityBadgeStyle(insight.severity)}`}>
                          {insight.area} · {insight.severity}
                        </Badge>
                        <div className="text-sm text-card-foreground leading-snug">
                          <p>{insight.summary}</p>
                          {insight.detail && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {insight.detail}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {discussionLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                  Loading transcript insights...
                </div>
              )}

              {discussionError && (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="material-symbols-outlined text-warning text-base">error</span>
                  {discussionError}
                </div>
              )}

              {!discussionLoading && !discussionError && discussionNotes.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No transcript discussions have been ingested for this case yet.
                </p>
              )}

              {!discussionLoading && discussionNotes.length > 0 && (
                <div className="space-y-4">
                  {discussionNotes.slice(0, 4).map((note) => (
                    <div key={note.id} className="rounded-md border border-border p-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatTimestamp(note.timestamp)}</span>
                        <div className="flex gap-2">
                          {note.updatesCompliance && (
                            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                              Compliance
                            </Badge>
                          )}
                          {note.updatesRecoveryTimeline && (
                            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                              Recovery
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-card-foreground">{note.summary}</p>

                      {note.riskFlags && note.riskFlags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {note.riskFlags.map((flag) => (
                            <Badge key={`${note.id}-${flag}`} variant="outline" className="text-xs">
                              {flag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {note.nextSteps && note.nextSteps.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium uppercase text-muted-foreground">
                            Next Steps
                          </p>
                          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-card-foreground">
                            {note.nextSteps.map((step, index) => (
                              <li key={`${note.id}-step-${index}`}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <TimelineCard caseId={workerCase.id} />

          <CertificateCard caseId={workerCase.id} />

          <TreatmentPlanCard caseId={workerCase.id} />

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Company</h3>
            <p className="text-card-foreground">{workerCase.company}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Date of Injury</h3>
            <p className="text-card-foreground">{workerCase.dateOfInjury}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Next Step</h3>
            <p className="text-card-foreground">{workerCase.nextStep}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Due Date</h3>
            <p className="text-card-foreground">{workerCase.dueDate}</p>
          </div>

          {/* Compliance Override Section */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Compliance Status</h3>
                {workerCase.complianceOverride && (
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                    Override Active
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Badge
                  className={`${
                    workerCase.complianceIndicator === "Very High" || workerCase.complianceIndicator === "High"
                      ? "bg-emerald-100 text-emerald-800"
                      : workerCase.complianceIndicator === "Medium"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {workerCase.complianceIndicator}
                </Badge>
                {workerCase.compliance?.reason && (
                  <span className="text-xs text-muted-foreground">{workerCase.compliance.reason}</span>
                )}
              </div>
              {!showComplianceForm ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowComplianceForm(true)}
                  className="w-full text-xs"
                >
                  Override Compliance
                </Button>
              ) : (
                <div className="space-y-2">
                  <select
                    value={complianceValue}
                    onChange={(e) => setComplianceValue(e.target.value)}
                    className="w-full p-2 text-sm border rounded-md bg-background"
                  >
                    <option value="">Select status...</option>
                    <option value="Very High">Very High (Fully Compliant)</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low (Non-Compliant)</option>
                    <option value="Very Low">Very Low (Non-Compliant)</option>
                  </select>
                  <input
                    type="text"
                    value={complianceReason}
                    onChange={(e) => setComplianceReason(e.target.value)}
                    placeholder="Reason for override..."
                    className="w-full p-2 text-sm border rounded-md bg-background"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleComplianceOverride}
                      disabled={overridingCompliance}
                      className="flex-1 text-xs"
                    >
                      {overridingCompliance ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowComplianceForm(false);
                        setComplianceValue("");
                        setComplianceReason("");
                      }}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ticket Merge Section - only show if multiple tickets */}
          {workerCase.ticketIds && workerCase.ticketIds.length > 1 && !workerCase.masterTicketId && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">Linked Tickets</h3>
                  <Badge variant="secondary" className="text-xs">
                    {workerCase.ticketIds.length} tickets
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mb-3">
                  {workerCase.ticketIds.slice(0, 3).join(", ")}
                  {workerCase.ticketIds.length > 3 && ` +${workerCase.ticketIds.length - 3} more`}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMergeTickets}
                  disabled={mergingTickets}
                  className="w-full text-xs"
                >
                  {mergingTickets ? "Merging..." : "Merge Tickets (Keep First)"}
                </Button>
                <p className="text-[10px] text-muted-foreground mt-2">
                  This will close duplicate tickets in Freshdesk and keep {workerCase.ticketIds[0]} as master.
                </p>
              </CardContent>
            </Card>
          )}

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Recovery Timeline</h3>
            <RecoveryChart
              injuryDate={workerCase.dateOfInjury}
              expectedRecoveryDate={expectedRecoveryDate.toISOString()}
              certificates={timeline}
            />
          </div>

          <TerminationPanel workerCase={workerCase} />

          {/* Quick Contacts Section */}
          <CaseContactsPanel
            caseId={workerCase.id}
            workerName={workerCase.workerName}
            company={workerCase.company}
            compact={true}
          />

          {workerCase.attachments && workerCase.attachments.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Attachments</h3>
              <div className="space-y-2">
                {workerCase.attachments.map((attachment: any) => (
                  <a
                    key={attachment.id}
                    href={attachment.url}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`link-attachment-${attachment.id}`}
                  >
                    <span className="material-symbols-outlined text-base">attach_file</span>
                    <span>{attachment.name}</span>
                    <span className="text-muted-foreground">({attachment.type})</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
  const severityBadgeStyle = (severity: TranscriptInsight["severity"]) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "warning":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };
