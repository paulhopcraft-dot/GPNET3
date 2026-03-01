import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Sparkles, X, RefreshCw } from "lucide-react";
import { CaseActionPlanCard } from "./CaseActionPlanCard";
import { RecoveryChart } from "./RecoveryChart";
import { ComplianceReportCard } from "./ComplianceReportCard";
import { fetchWithCsrf } from "../lib/queryClient";
import type { WorkerCase, CaseAction, MedicalCertificate } from "@shared/schema";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface EmployerCaseDetailViewProps {
  workerCase: WorkerCase;
  onClose: () => void;
}

interface SummaryData {
  summary: string;
  generatedAt?: string;
  model?: string;
  workStatusClassification?: string;
  actionItems?: Array<{
    description: string;
    assignedTo?: string;
    dueDate?: string;
  }>;
}

// Helper function to parse markdown summary into sections
function parseSummarySections(markdown: string) {
  const sections: Record<string, string> = {};

  // Split by ## headers
  const parts = markdown.split(/(?=^## )/gm);

  parts.forEach(part => {
    const lines = part.trim().split('\n');
    const headerMatch = lines[0]?.match(/^## (.+)$/);

    if (headerMatch) {
      const sectionName = headerMatch[1];
      const content = lines.slice(1).join('\n').trim();
      sections[sectionName] = content;
    } else if (part.trim()) {
      // Content before first header (Latest Update section)
      sections['Latest Update'] = part.trim();
    }
  });

  return sections;
}

export function EmployerCaseDetailView({ workerCase, onClose }: EmployerCaseDetailViewProps) {
  const [aiSummary, setAiSummary] = useState<string | null>(workerCase.aiSummary || null);
  const [summaryMeta, setSummaryMeta] = useState<{
    generatedAt?: string;
    model?: string;
  }>({
    generatedAt: workerCase.aiSummaryGeneratedAt,
    model: workerCase.aiSummaryModel,
  });
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const latestCaseIdRef = useRef<string>(workerCase.id);

  // Fetch pending actions for this case
  const { data: pendingActionsData, refetch: refetchActions } = useQuery<{ data: CaseAction[] }>({
    queryKey: [`/api/actions/pending`, workerCase.id],
    queryFn: async () => {
      const response = await fetchWithCsrf(`/api/actions/pending?limit=100`);
      if (!response.ok) throw new Error("Failed to fetch actions");
      return response.json();
    },
  });

  // Fetch certificates for recovery chart
  const { data: recoveryData } = useQuery<{ certificates: MedicalCertificate[] }>({
    queryKey: [`/api/cases/${workerCase.id}/recovery-timeline`],
    queryFn: async () => {
      const response = await fetchWithCsrf(`/api/cases/${workerCase.id}/recovery-timeline`);
      if (!response.ok) throw new Error("Failed to fetch recovery timeline");
      return response.json();
    },
  });

  // Filter actions for this specific case
  const caseActions = pendingActionsData?.data?.filter((action: CaseAction) =>
    action.caseId === workerCase.id && action.status === "pending"
  ) || [];

  useEffect(() => {
    latestCaseIdRef.current = workerCase.id;
  }, [workerCase.id]);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const fetchCachedSummary = async (): Promise<boolean> => {
    try {
      const response = await fetchWithCsrf(`/api/cases/${workerCase.id}/summary`);
      if (!response.ok) {
        return true;
      }
      const data = await response.json();
      if (latestCaseIdRef.current !== workerCase.id) {
        return false;
      }

      if (data.summary) {
        setAiSummary(data.summary);
        setSummaryMeta({
          generatedAt: data.generatedAt,
          model: data.model,
        });
      }

      return data.needsRefresh || !data.summary;
    } catch (error) {
      console.error("Error fetching summary:", error);
      // Don't retry on auth errors (401)
      const errorMessage = error instanceof Error ? error.message : "";
      if (errorMessage.includes("401")) {
        setSummaryError("Session expired. Please refresh the page.");
        return false; // Don't trigger generation
      }
      return true;
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

      if (!response.ok) {
        throw new Error("Failed to generate summary");
      }

      const data: SummaryData = await response.json();
      if (latestCaseIdRef.current !== caseId) {
        return;
      }

      setAiSummary(data.summary);
      setSummaryMeta({
        generatedAt: data.generatedAt,
        model: data.model,
      });

      // Refetch actions after summary generation (may create new action items)
      await refetchActions();
    } catch (error) {
      console.error("Error generating AI summary:", error);
      const errorMessage = error instanceof Error ? error.message : "";
      if (errorMessage.includes("401")) {
        setSummaryError("Session expired. Please refresh the page.");
      } else {
        setSummaryError(errorMessage || "AI summary temporarily unavailable");
      }
    } finally {
      if (latestCaseIdRef.current === caseId) {
        setLoadingSummary(false);
      }
    }
  };

  useEffect(() => {
    const initSummary = async () => {
      const needsGeneration = await fetchCachedSummary();

      if (latestCaseIdRef.current !== workerCase.id) {
        return;
      }
      if (needsGeneration) {
        void generateSummary();
      }
    };

    initSummary();
  }, [workerCase.id]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="w-full max-w-7xl max-h-[95vh] bg-background rounded-lg shadow-xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between bg-card">
          <div>
            <h2 className="text-2xl font-bold">{workerCase.workerName}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {workerCase.company} • Injury Date: {workerCase.dateOfInjury}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Status Bar */}
        <div className="border-b px-6 py-3 bg-muted/50 flex items-center gap-4">
          <Badge
            className={cn(
              workerCase.workStatus === "At work"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            )}
          >
            {workerCase.workStatus}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              workerCase.complianceIndicator === "Very High" ||
              workerCase.complianceIndicator === "High"
                ? "border-emerald-300 text-emerald-700"
                : workerCase.complianceIndicator === "Medium"
                ? "border-amber-300 text-amber-700"
                : "border-red-300 text-red-700"
            )}
          >
            Compliance: {workerCase.complianceIndicator}
          </Badge>
          {!workerCase.hasCertificate && (
            <Badge variant="destructive" className="text-xs">
              No Current Certificate
            </Badge>
          )}
          <div className="ml-auto text-sm text-muted-foreground">
            Next Step Due: <span className="font-medium">{workerCase.dueDate}</span>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full grid grid-cols-[1fr,450px] gap-0">
            {/* Left Column: Smart Summary */}
            <div className="border-r overflow-y-scroll" style={{ maxHeight: 'calc(95vh - 200px)' }}>
              <div className="p-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-primary" />
                          Smart Case Summary
                        </CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateSummary(true)}
                          disabled={loadingSummary}
                        >
                          <RefreshCw className={cn("h-4 w-4 mr-2", loadingSummary && "animate-spin")} />
                          Refresh
                        </Button>
                      </div>
                      {summaryMeta.generatedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Generated {new Date(summaryMeta.generatedAt).toLocaleString()}
                          {summaryMeta.model && ` • ${summaryMeta.model}`}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {loadingSummary && !aiSummary ? (
                        <div className="flex items-center gap-3 text-sm text-muted-foreground py-8">
                          <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                          <span>Generating intelligent case summary...</span>
                        </div>
                      ) : summaryError ? (
                        <div className="text-sm text-destructive py-4">
                          Error: {summaryError}
                        </div>
                      ) : aiSummary ? (
                        <Tabs defaultValue="summary" className="w-full">
                          <TabsList className="grid w-full grid-cols-8">
                            <TabsTrigger value="summary">Summary</TabsTrigger>
                            <TabsTrigger value="injury">Injury</TabsTrigger>
                            <TabsTrigger value="timeline">Timeline</TabsTrigger>
                            <TabsTrigger value="financial">Financial</TabsTrigger>
                            <TabsTrigger value="risk">Risk</TabsTrigger>
                            <TabsTrigger value="contacts">Contacts</TabsTrigger>
                            <TabsTrigger value="recovery">Recovery</TabsTrigger>
                            <TabsTrigger value="compliance">Compliance</TabsTrigger>
                          </TabsList>

                          {(() => {
                            const sections = parseSummarySections(aiSummary);
                            const renderMarkdown = (content: string) => (
                              <div className="prose prose-sm max-w-none dark:prose-invert text-foreground mt-4">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    table: ({children}) => (
                                      <table className="w-full border-collapse border border-border">
                                        {children}
                                      </table>
                                    ),
                                    th: ({children}) => (
                                      <th className="border border-border px-4 py-2 bg-muted font-semibold text-left">
                                        {children}
                                      </th>
                                    ),
                                    td: ({children}) => (
                                      <td className="border border-border px-4 py-2">
                                        {children}
                                      </td>
                                    ),
                                  }}
                                >
                                  {content}
                                </ReactMarkdown>
                              </div>
                            );

                            return (
                              <>
                                <TabsContent value="summary">
                                  {renderMarkdown(sections['Latest Update'] || sections['Case Overview'] || 'No data available')}
                                </TabsContent>
                                <TabsContent value="injury">
                                  {renderMarkdown(sections['Injury Details'] || 'No data available')}
                                </TabsContent>
                                <TabsContent value="timeline">
                                  {renderMarkdown(sections['Claim Timeline'] || 'No data available')}
                                </TabsContent>
                                <TabsContent value="financial">
                                  {renderMarkdown(sections['Financial Summary'] || 'No data available')}
                                </TabsContent>
                                <TabsContent value="risk">
                                  {renderMarkdown(sections['Risk Register'] || 'No data available')}
                                </TabsContent>
                                <TabsContent value="contacts">
                                  <div className="mt-4 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <Card>
                                        <CardHeader className="pb-3">
                                          <CardTitle className="text-base">Worker</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                          <div>
                                            <p className="font-medium">{workerCase.workerName}</p>
                                            <p className="text-sm text-muted-foreground">{workerCase.company}</p>
                                          </div>
                                        </CardContent>
                                      </Card>

                                      <Card>
                                        <CardHeader className="pb-3">
                                          <CardTitle className="text-base">Case Owner</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                          <div>
                                            <p className="font-medium">{workerCase.owner}</p>
                                            <p className="text-sm text-muted-foreground">Case Manager</p>
                                          </div>
                                        </CardContent>
                                      </Card>

                                      <Card>
                                        <CardHeader className="pb-3">
                                          <CardTitle className="text-base">Employer</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                          <div>
                                            <p className="font-medium">{workerCase.company}</p>
                                            <p className="text-sm text-muted-foreground">Host Employer</p>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      Additional contact details available through case manager.
                                    </div>
                                  </div>
                                </TabsContent>
                                <TabsContent value="recovery">
                                  <div className="mt-4 space-y-4">
                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="text-base">Recovery Progress</CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <RecoveryChart
                                          injuryDate={workerCase.dateOfInjury}
                                          expectedRecoveryDate={(() => {
                                            // Calculate expected recovery date as injury + 12 weeks if dueDate is not a valid date
                                            const dueDate = new Date(workerCase.dueDate);
                                            if (!isNaN(dueDate.getTime())) {
                                              return workerCase.dueDate;
                                            }
                                            // Fallback: injury date + 12 weeks
                                            const injuryDate = new Date(workerCase.dateOfInjury);
                                            if (!isNaN(injuryDate.getTime())) {
                                              const recovery = new Date(injuryDate);
                                              recovery.setDate(recovery.getDate() + 84); // 12 weeks
                                              return recovery.toISOString().split('T')[0];
                                            }
                                            return workerCase.dueDate;
                                          })()}
                                          certificates={recoveryData?.certificates}
                                        />
                                      </CardContent>
                                    </Card>
                                    {workerCase.rtwPlanStatus && (
                                      <Card>
                                        <CardHeader>
                                          <CardTitle className="text-base">Return to Work Plan</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm text-muted-foreground">Status:</span>
                                              <Badge
                                                className={cn(
                                                  workerCase.rtwPlanStatus === "working_well" ||
                                                  workerCase.rtwPlanStatus === "in_progress"
                                                    ? "bg-emerald-100 text-emerald-800"
                                                    : "bg-slate-100 text-slate-800"
                                                )}
                                              >
                                                {workerCase.rtwPlanStatus.replace(/_/g, " ")}
                                              </Badge>
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    )}
                                  </div>
                                </TabsContent>
                                <TabsContent value="compliance">
                                  <ComplianceReportCard
                                    caseId={workerCase.id}
                                    className="mt-4"
                                  />
                                </TabsContent>
                              </>
                            );
                          })()}
                        </Tabs>
                      ) : (
                        <div className="text-sm text-muted-foreground py-4">
                          No summary available yet. Click Refresh to generate.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Current Status Section */}
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-lg">Current Status Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Current Status</p>
                        <p className="text-sm">{workerCase.currentStatus}</p>
                      </div>
                      {workerCase.nextStep && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Next Step Required</p>
                          <p className="text-sm font-medium text-primary">{workerCase.nextStep}</p>
                        </div>
                      )}
                      {workerCase.rtwPlanStatus && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">RTW Plan Status</p>
                          <Badge
                            className={cn(
                              workerCase.rtwPlanStatus === "working_well" ||
                              workerCase.rtwPlanStatus === "in_progress"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-800"
                            )}
                          >
                            {workerCase.rtwPlanStatus.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                </div>
            </div>

            {/* Right Column: Action Plan */}
            <div className="overflow-hidden flex flex-col bg-muted/30">
              <ScrollArea className="flex-1">
                <div className="p-4">
                  <CaseActionPlanCard
                    caseId={workerCase.id}
                    actions={caseActions}
                    workerName={workerCase.workerName}
                    onActionUpdate={() => refetchActions()}
                  />
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
