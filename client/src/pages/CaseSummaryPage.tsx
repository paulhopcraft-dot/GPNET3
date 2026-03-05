import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimelineCard } from "@/components/TimelineCard";
import { RefreshCw } from "lucide-react";
import type { WorkerCase, PaginatedCasesResponse, CaseLifecycleStage } from "@shared/schema";
import { LIFECYCLE_STAGE_LABELS } from "@shared/schema";
import { cn } from "@/lib/utils";
import { CaseContactsPanel } from "@/components/CaseContactsPanel";
import { FinancialSummaryPanel } from "@/components/FinancialSummaryPanel";
import { LifecycleStepper } from "@/components/LifecycleStepper";
import { CurrentCapacityCard } from "@/components/CurrentCapacityCard";
import { ComponentErrorBoundary } from "@/components/ErrorBoundary";
import { ContextualHelpSystem } from "@/components/unified-case-management/ContextualHelpSystem";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Lazy load the modern recovery timeline component
const DynamicRecoveryTimeline = lazy(() => import("@/components/DynamicRecoveryTimeline").then(m => ({ default: m.DynamicRecoveryTimeline })));

export default function CaseSummaryPage() {
  const { id } = useParams<{ id: string }>();

  const { data: paginatedData, isLoading } = useQuery<PaginatedCasesResponse>({
    queryKey: ["/api/gpnet2/cases"],
  });
  const cases = paginatedData?.cases ?? [];

  const workerCase = cases.find((c) => c.id === id);

  // Fetch dynamic timeline estimate
  const { data: timelineEstimate } = useQuery<{ estimatedCompletionDate?: string }>({
    queryKey: [`/api/cases/${id}/timeline-estimate`],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <PageLayout title="Case Summary" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">
            progress_activity
          </span>
        </div>
      </PageLayout>
    );
  }

  if (!workerCase) {
    return (
      <PageLayout title="Case Not Found">
        <Card>
          <CardContent className="py-8 text-center">
            <span className="material-symbols-outlined text-4xl text-muted-foreground mb-4">
              search_off
            </span>
            <p className="text-muted-foreground mb-4">
              The requested case could not be found.
            </p>
            <Link to="/cases">
              <Button>Back to Cases</Button>
            </Link>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  const riskBadgeColor = (level: string) => {
    switch (level) {
      case "High":
        return "bg-red-100 text-red-800";
      case "Medium":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-emerald-100 text-emerald-800";
    }
  };

  // Use dynamic timeline estimate if available, fallback to 12-week default
  const expectedRecoveryDate = timelineEstimate?.estimatedCompletionDate
    ? new Date(timelineEstimate.estimatedCompletionDate)
    : (() => {
        const fallback = new Date(workerCase.dateOfInjury);
        fallback.setDate(fallback.getDate() + 12 * 7);
        return fallback;
      })();

  return (
    <PageLayout
      title={workerCase.workerName}
      subtitle={`${workerCase.company} - Case ${workerCase.id}`}
    >
      <div className="space-y-6">
        {/* Back Button */}
        <div>
          <Link to="/cases">
            <Button variant="ghost" size="sm">
              <span className="material-symbols-outlined text-sm mr-1">arrow_back</span>
              Back to Cases
            </Button>
          </Link>
        </div>

        {/* Phase 11.1 — Related claims banner */}
        {workerCase.relatedCaseIds && workerCase.relatedCaseIds.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            <span className="font-semibold">
              This worker has {workerCase.relatedCaseIds.length} related claim{workerCase.relatedCaseIds.length !== 1 ? "s" : ""}:
            </span>
            {workerCase.relatedCaseIds.map((relId) => (
              <Link key={relId} to={`/cases/${relId}`} className="underline hover:text-amber-900">
                {relId.slice(0, 8)}…
              </Link>
            ))}
          </div>
        )}

        {/* Phase 11.2 — Dispute status banner */}
        {workerCase.disputeStatus && workerCase.disputeStatus !== "none" && workerCase.disputeStatus !== "resolved" && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
            <span className="font-bold">DISPUTED:</span>
            <span>{workerCase.disputeStatus.replace(/_/g, " ")}</span>
          </div>
        )}

        {/* Lifecycle Stage Stepper */}
        {workerCase.lifecycleStage && (
          <Card className="p-4">
            <LifecycleStepper
              currentStage={workerCase.lifecycleStage as CaseLifecycleStage}
              changedAt={workerCase.lifecycleStageChangedAt}
              changedBy={workerCase.lifecycleStageChangedBy}
              reason={workerCase.lifecycleStageReason}
            />
          </Card>
        )}

        {/* Status Bar */}
        <div className="border border-border rounded-lg p-4 bg-muted/50 flex items-center gap-4 flex-wrap">
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
          {workerCase.caseManagerName && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                {workerCase.caseManagerName.charAt(0).toUpperCase()}
              </div>
              <span>{workerCase.caseManagerName}</span>
            </div>
          )}
          <div className="ml-auto text-sm text-muted-foreground">
            Next Step Due: <span className="font-medium">{workerCase.dueDate}</span>
          </div>
        </div>

        {/* 7-Tab Case Detail View */}
        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList className="grid grid-cols-7 h-12">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="injury">Injury</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="risk">Risk</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="recovery">Recovery</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-4">
            <div className="space-y-6">
              {/* Three summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CurrentCapacityCard workerCase={workerCase} />

                {/* Compliance summary card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <span className="material-symbols-outlined text-lg text-primary">verified_user</span>
                      Compliance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <Badge variant="outline" className={cn(
                      "text-sm",
                      workerCase.complianceIndicator === "Very High" || workerCase.complianceIndicator === "High"
                        ? "border-green-300 text-green-700 bg-green-50"
                        : workerCase.complianceIndicator === "Medium"
                        ? "border-amber-300 text-amber-700 bg-amber-50"
                        : "border-red-300 text-red-700 bg-red-50"
                    )}>
                      {workerCase.complianceIndicator}
                    </Badge>
                    {workerCase.compliance?.reason && (
                      <p className="text-xs text-muted-foreground">{workerCase.compliance.reason}</p>
                    )}
                    <p className="text-xs text-muted-foreground">Due: {workerCase.dueDate}</p>
                  </CardContent>
                </Card>

                {/* Recovery summary card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <span className="material-symbols-outlined text-lg text-primary">trending_up</span>
                      Recovery
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <Badge className={cn(
                      workerCase.clinicalEvidence?.isImprovingOnExpectedTimeline === true
                        ? "bg-green-100 text-green-700"
                        : workerCase.clinicalEvidence?.isImprovingOnExpectedTimeline === false
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-100 text-blue-700"
                    )}>
                      {workerCase.clinicalEvidence?.isImprovingOnExpectedTimeline === true ? "On Track"
                        : workerCase.clinicalEvidence?.isImprovingOnExpectedTimeline === false ? "Needs Review"
                        : "Monitoring"}
                    </Badge>
                    {workerCase.clinicalEvidence?.flags && workerCase.clinicalEvidence.flags.length > 0 && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {workerCase.clinicalEvidence.flags.slice(0, 2).map(f => f.message).join("; ")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* AI Summary */}
              {workerCase.aiSummary && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">psychology</span>
                        AI Case Summary
                      </CardTitle>
                      <Button variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({children}) => (
                            <div className="overflow-x-auto my-4">
                              <table className="min-w-full border-collapse border border-border text-sm">
                                {children}
                              </table>
                            </div>
                          ),
                          th: ({children}) => (
                            <th className="border border-border bg-muted px-3 py-2 text-left font-medium text-foreground">
                              {children}
                            </th>
                          ),
                          td: ({children}) => (
                            <td className="border border-border px-3 py-2 text-muted-foreground">
                              {children}
                            </td>
                          ),
                        }}
                      >
                        {workerCase.aiSummary}
                      </ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Case Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">info</span>
                    Case Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground">Work Status</label>
                      <p className="text-sm font-medium">{workerCase.workStatus}</p>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Date of Injury</label>
                      <p className="text-sm font-medium">{workerCase.dateOfInjury}</p>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Owner</label>
                      <p className="text-sm font-medium">{workerCase.owner}</p>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Due Date</label>
                      <p className="text-sm font-medium">{workerCase.dueDate}</p>
                    </div>
                  </div>
                  {workerCase.summary && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Case Summary</label>
                      <p className="text-sm mt-1">{workerCase.summary}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="injury" className="mt-4">
            <div className="space-y-4">
            {/* Phase 11.3 — Mental health privacy notice */}
            {(workerCase.aiSummary?.toLowerCase().match(/stress|anxiety|depression|psychological|mental health|burnout|ptsd/)) && (
              <div className="flex items-start gap-3 rounded-lg border border-purple-200 bg-purple-50 p-3 text-sm text-purple-800">
                <span className="font-semibold flex-shrink-0">Mental Health Claim:</span>
                <span>
                  This case involves a psychological/mental health injury. Diagnosis details have
                  restricted access. Psychosocial workplace risk factors must be addressed in RTW planning.
                  Longer recovery timelines apply — see Recovery tab.
                </span>
              </div>
            )}
            <Card>
              <CardHeader>
                <CardTitle>Injury Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Date of Injury</label>
                    <p className="text-sm mt-1">{workerCase.dateOfInjury}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Company</label>
                    <p className="text-sm mt-1">{workerCase.company}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Current Status</label>
                  <p className="text-sm mt-1">{workerCase.currentStatus}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Next Step Required</label>
                  <p className="text-sm mt-1 font-medium text-primary">{workerCase.nextStep}</p>
                </div>
              </CardContent>
            </Card>
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <TimelineCard caseId={workerCase.id} />
          </TabsContent>

          <TabsContent value="financial" className="mt-4">
            <FinancialSummaryPanel caseId={workerCase.id} workerName={workerCase.workerName} />
          </TabsContent>

          <TabsContent value="risk" className="mt-4">
            <div className="space-y-4">
              {/* Overall Risk */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">shield</span>
                    Overall Risk Level
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Badge className={cn("text-sm px-3 py-1", riskBadgeColor(workerCase.riskLevel))}>
                      {workerCase.riskLevel}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {workerCase.riskLevel === "High"
                        ? "Immediate case manager attention required. Multiple risk indicators active."
                        : workerCase.riskLevel === "Medium"
                        ? "Elevated risk indicators present. Monitor closely and plan interventions."
                        : "Low risk profile. Routine follow-up schedule applies."}
                    </span>
                  </div>

                  {/* Risk Flags */}
                  {workerCase.riskFlags && workerCase.riskFlags.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active Risk Flags</p>
                      <div className="flex flex-wrap gap-2">
                        {workerCase.riskFlags.map((flag) => (
                          <Badge key={flag} variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50">
                            <span className="material-symbols-outlined text-xs mr-1">warning</span>
                            {flag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dispute alert */}
                  {workerCase.disputeStatus && workerCase.disputeStatus !== "none" && workerCase.disputeStatus !== "resolved" && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                      <span className="material-symbols-outlined text-base mt-0.5">gavel</span>
                      <span><strong>Dispute active:</strong> {workerCase.disputeStatus.replace(/_/g, " ")}. Legal risk elevated — consult insurer before major case decisions.</span>
                    </div>
                  )}

                  {/* Termination audit flag */}
                  {workerCase.terminationAuditFlag && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                      <span className="material-symbols-outlined text-base mt-0.5">flag</span>
                      <span><strong>Termination audit flag:</strong> {workerCase.terminationAuditFlag.replace(/_/g, " ")}. Employment action requires legal review.</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Functional Capacity Risk */}
              {workerCase.functionalCapacity && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">accessibility</span>
                      Functional Capacity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {workerCase.functionalCapacity.maxWorkHoursPerDay !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Max hours/day</span>
                          <span className="font-medium">{workerCase.functionalCapacity.maxWorkHoursPerDay}h</span>
                        </div>
                      )}
                      {workerCase.functionalCapacity.maxWorkDaysPerWeek !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Max days/week</span>
                          <span className="font-medium">{workerCase.functionalCapacity.maxWorkDaysPerWeek}d</span>
                        </div>
                      )}
                      {workerCase.functionalCapacity.canLiftKg !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Lifting limit</span>
                          <span className="font-medium">{workerCase.functionalCapacity.canLiftKg} kg</span>
                        </div>
                      )}
                      {workerCase.functionalCapacity.canStandMinutes !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Standing (max)</span>
                          <span className="font-medium">{workerCase.functionalCapacity.canStandMinutes} min</span>
                        </div>
                      )}
                    </div>
                    {workerCase.functionalCapacity.otherCapacityNotes && (
                      <p className="mt-3 text-sm text-muted-foreground">{workerCase.functionalCapacity.otherCapacityNotes}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Compliance */}
              {workerCase.compliance && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">verified</span>
                      Compliance Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className={riskBadgeColor(
                        workerCase.compliance.indicator === "Very High" || workerCase.compliance.indicator === "High"
                          ? "Low"
                          : workerCase.compliance.indicator === "Low" || workerCase.compliance.indicator === "Very Low"
                            ? "High"
                            : "Medium"
                      )}>
                        {workerCase.compliance.indicator}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{workerCase.compliance.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      Source: {workerCase.compliance.source} | Last checked:{" "}
                      {new Date(workerCase.compliance.lastChecked).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Mitigation strategies */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">health_and_safety</span>
                    Mitigation Strategies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {workerCase.riskLevel === "High" && (
                      <li className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-base text-red-500 mt-0.5">priority_high</span>
                        Escalate to senior case manager for review within 48 hours
                      </li>
                    )}
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-base text-blue-500 mt-0.5">calendar_month</span>
                      Schedule next clinical review and ensure RTW plan is current
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-base text-emerald-500 mt-0.5">groups</span>
                      Coordinate with employer on suitable duties availability
                    </li>
                    {workerCase.disputeStatus && workerCase.disputeStatus !== "none" && workerCase.disputeStatus !== "resolved" && (
                      <li className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-base text-amber-500 mt-0.5">gavel</span>
                        Engage insurer legal team — conciliation strategy is in progress
                      </li>
                    )}
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-base text-purple-500 mt-0.5">description</span>
                      Ensure all compliance deadlines are documented in the case timeline
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="contacts" className="mt-4">
            <div className="space-y-4">
              {/* Case Contacts Panel with clickable phone/email */}
              <CaseContactsPanel
                caseId={workerCase.id}
                workerName={workerCase.workerName}
                company={workerCase.company}
              />

              {/* Attachments */}
              {workerCase.attachments && workerCase.attachments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">attach_file</span>
                      Attachments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {workerCase.attachments.map((attachment: any) => (
                        <a
                          key={attachment.id}
                          href={attachment.url}
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span className="material-symbols-outlined text-base">description</span>
                          {attachment.name}
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="recovery" className="mt-4">
            <ComponentErrorBoundary label="Recovery Timeline">
              <Suspense fallback={
                <div className="animate-pulse space-y-4 p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200/50">
                  <div className="h-8 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-1/3 mb-6"></div>
                  <div className="h-64 bg-gradient-to-r from-purple-100 to-blue-100 rounded"></div>
                </div>
              }>
                <DynamicRecoveryTimeline caseId={id!} />
              </Suspense>
            </ComponentErrorBoundary>
          </TabsContent>
        </Tabs>
      </div>
      <ContextualHelpSystem mode="floating" showTips={true} userRole="case_manager" />
    </PageLayout>
  );
}
