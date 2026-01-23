import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, Suspense, lazy } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, RefreshCw, Sparkles } from "lucide-react";
import { fetchWithCsrf } from "@/lib/queryClient";
import type { WorkerCase, PaginatedCasesResponse } from "@shared/schema";
import { cn } from "@/lib/utils";
import { TimelineCard } from "@/components/TimelineCard";
import { CaseContactsPanel } from "@/components/CaseContactsPanel";
import { TreatmentPlanCard } from "@/components/TreatmentPlanCard";

// Heavy components - lazy load to reduce initial bundle size
const DynamicRecoveryTimeline = lazy(() => import("@/components/DynamicRecoveryTimeline").then(m => ({ default: m.DynamicRecoveryTimeline })));

// Lazy loaded markdown component with remark-gfm
const LazyMarkdownRenderer = lazy(async () => {
  const [ReactMarkdown, remarkGfm] = await Promise.all([
    import('react-markdown'),
    import('remark-gfm')
  ]);

  return {
    default: ({ children }: { children: string }) => (
      <ReactMarkdown.default remarkPlugins={[remarkGfm.default]}>
        {children}
      </ReactMarkdown.default>
    )
  };
});

// Chart loading component for better UX
const ChartLoader = () => (
  <div className="animate-pulse space-y-4 p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200/50">
    <div className="h-8 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-1/3 mb-6"></div>
    <div className="space-y-3">
      <div className="h-64 bg-gradient-to-r from-purple-100 to-blue-100 rounded"></div>
      <div className="flex space-x-4">
        <div className="h-24 w-24 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full"></div>
        <div className="h-24 w-24 bg-gradient-to-r from-blue-100 to-teal-100 rounded-full"></div>
        <div className="h-24 w-24 bg-gradient-to-r from-teal-100 to-emerald-100 rounded-full"></div>
      </div>
    </div>
  </div>
);

export default function EmployerCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summaryLoaded, setSummaryLoaded] = useState(false);

  // Fetch case data - use same approach as CaseSummaryPage
  const { data: paginatedData, isLoading, error } = useQuery<PaginatedCasesResponse>({
    queryKey: ["/api/gpnet2/cases"],
  });
  const cases = paginatedData?.cases ?? [];
  const workerCase = cases.find((c) => c.id === id);

  const generateSummary = async () => {
    if (!id) return;
    setLoadingSummary(true);
    try {
      const response = await fetchWithCsrf(`/api/cases/${id}/summary`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        setAiSummary(data.summary);
        setSummaryLoaded(true);
      }
    } catch (error) {
      console.error("Error generating summary:", error);
    } finally {
      setLoadingSummary(false);
    }
  };

  // Auto-load summary when case data is available
  useEffect(() => {
    if (workerCase && id && !summaryLoaded && !loadingSummary) {
      generateSummary();
    }
  }, [workerCase, id, summaryLoaded, loadingSummary]);

  const renderMarkdown = (content: string) => (
    <Suspense fallback={<div className="animate-pulse h-32 bg-gray-100 rounded"></div>}>
      <LazyMarkdownRenderer>
        {content}
      </LazyMarkdownRenderer>
    </Suspense>
  );

  // Parse injury details from AI summary markdown tables
  const parseInjuryFromSummary = (summary: string | null | undefined) => {
    if (!summary) return {};

    const result: Record<string, string> = {};

    // Find the Injury Details section
    const injurySection = summary.match(/## Injury Details[\s\S]*?(?=\n---|\n##|$)/i);
    if (!injurySection) return {};

    // Parse table rows: | Field | Value |
    const tableRows = injurySection[0].match(/\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/g);
    if (!tableRows) return {};

    for (const row of tableRows) {
      const match = row.match(/\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/);
      if (match) {
        const field = match[1].trim().toLowerCase();
        const value = match[2].trim();
        // Skip header rows and insufficient data
        if (field !== 'field' && field !== '-------' && value !== 'Value' &&
            value.toLowerCase() !== 'insufficient data' && value !== '-------') {
          result[field] = value;
        }
      }
    }

    return result;
  };

  const injuryFromSummary = parseInjuryFromSummary(aiSummary || workerCase?.aiSummary);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading case details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-red-600">Error loading case details. Please try again.</div>
      </div>
    );
  }

  if (!workerCase) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Case not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate">{workerCase.workerName}</h1>
              <p className="text-xs text-muted-foreground truncate">
                {workerCase.company} • {workerCase.dateOfInjury}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={cn(
              "text-xs",
              workerCase.workStatus === "At work"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-orange-100 text-orange-800"
            )}>
              {workerCase.workStatus}
            </Badge>
            <Badge variant="outline" className={cn(
              "text-xs border",
              workerCase.complianceIndicator === "Very High" || workerCase.complianceIndicator === "High"
                ? "border-emerald-300 text-emerald-700"
                : workerCase.complianceIndicator === "Medium"
                ? "border-yellow-300 text-yellow-700"
                : "border-red-300 text-red-700"
            )}>
              {workerCase.complianceIndicator}
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs at the top */}
      <Tabs defaultValue="summary" className="flex-1 flex flex-col">
        {/* Ultra-Modern Tabs with Glassmorphism */}
        <div className="relative border-b bg-gradient-to-r from-slate-50 via-white to-slate-50 px-4 py-3 overflow-x-auto backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-blue-500/5 to-teal-500/5 pointer-events-none"></div>
          <TabsList className="relative inline-flex h-12 w-max gap-2 bg-white/40 backdrop-blur-md p-1 rounded-xl border border-white/20 shadow-2xl">
            <TabsTrigger
              value="summary"
              className="relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300
                         data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500
                         data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/25
                         hover:bg-white/60 hover:shadow-md text-slate-700"
            >
              Summary
            </TabsTrigger>
            <TabsTrigger
              value="injury"
              className="relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300
                         data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500
                         data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/25
                         hover:bg-white/60 hover:shadow-md text-slate-700"
            >
              Injury & Diagnosis
            </TabsTrigger>
            <TabsTrigger
              value="treatment"
              className="relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300
                         data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-rose-500
                         data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-pink-500/25
                         hover:bg-white/60 hover:shadow-md text-slate-700"
            >
              Treatment & Recovery
            </TabsTrigger>
            <TabsTrigger
              value="timeline"
              className="relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300
                         data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500
                         data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-500/25
                         hover:bg-white/60 hover:shadow-md text-slate-700"
            >
              Timeline
            </TabsTrigger>
            <TabsTrigger
              value="financial"
              className="relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300
                         data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500
                         data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/25
                         hover:bg-white/60 hover:shadow-md text-slate-700"
            >
              Financial
            </TabsTrigger>
            <TabsTrigger
              value="risk"
              className="relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300
                         data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-pink-500
                         data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-red-500/25
                         hover:bg-white/60 hover:shadow-md text-slate-700"
            >
              Risk
            </TabsTrigger>
            <TabsTrigger
              value="contacts"
              className="relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300
                         data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-500 data-[state=active]:to-gray-500
                         data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-slate-500/25
                         hover:bg-white/60 hover:shadow-md text-slate-700"
            >
              Contacts
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content */}
        <TabsContent value="summary" className="flex-1 p-3 overflow-hidden">
          <div className="grid grid-cols-[1fr_minmax(350px,450px)] gap-4 h-full w-full max-w-full">
            <div className="space-y-2 min-w-0 overflow-hidden">
              {/* Latest Update - Prominent at top */}
              {workerCase.ticketLastUpdatedAt && (
                <Card className="border-l-4 border-l-primary bg-primary/5">
                  <CardContent className="py-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-semibold text-primary">
                          Status as at {new Date(workerCase.ticketLastUpdatedAt).toLocaleDateString('en-AU', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <Badge className={cn(
                        "text-sm",
                        workerCase.workStatus === "At work"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      )}>
                        {workerCase.workStatus}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  {loadingSummary && !aiSummary ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-sm text-muted-foreground">Generating case summary...</p>
                      </div>
                    </div>
                  ) : aiSummary ? (
                    <div className="p-3 text-sm [&_strong]:font-semibold [&_table]:text-xs [&_th]:py-1 [&_td]:py-1 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-primary [&_h2]:mt-3 [&_h2]:mb-2 [&_h2:first-child]:mt-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_p]:my-2 [&_p:first-of-type]:mt-0">
                      {renderMarkdown(
                        aiSummary
                          .replace(/Case Summary\s*[-–—:]\s*[A-Za-z\s]+\n*/gi, '')
                          .replace(/\*\*Case Summary\s*[-–—:]\s*[A-Za-z\s]+\*\*\n*/gi, '')
                          .replace(/^#+\s*Case Summary.*\n*/gim, '')
                          .replace(/^#+\s*Latest Update.*\n*/gim, '')
                          .replace(/\*\*Latest Update.*?\*\*\n*/gi, '')
                          .replace(/Latest Update\s*\(\d{4}-\d{2}-\d{2}\)\s*\n*/gi, '')
                          .replace(/^Latest Update\s*\n/gim, '')
                          .replace(/^\s*\n+/g, '') // Remove leading empty lines
                          .trim()
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground mb-4">
                        No summary available yet.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={generateSummary}
                        disabled={loadingSummary}
                      >
                        Generate Summary
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="min-w-0 overflow-hidden">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Action Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-primary">Immediate Actions (This Week)</h3>
                      <ul className="text-xs space-y-1.5 ml-2">
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Follow up with {workerCase.workerName} after physio appointment re: clearance certificate</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Request {workerCase.workerName} provide written update on symptom status post-physio</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Confirm with employer whether wage top-up has been processed for first fortnight</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Request copy of {workerCase.workerName}'s first payslip for records if not already received</span>
                        </li>
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-primary">Short-Term Actions (Next 2 Weeks)</h3>
                      <ul className="text-xs space-y-1.5 ml-2">
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Conduct welfare check-in with {workerCase.workerName} (week commencing 13 Jan)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>If symptoms stable, request GP/physio issue formal clearance certificate</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Confirm {workerCase.workerName} has attended physio appointment and document feedback</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Liaise with employer re: ongoing wage top-up process and payslip submissions</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Update DXC if any concerns arise or if clearance certificate obtained</span>
                        </li>
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-primary">Medium-Term Actions (Jan-Feb 2026)</h3>
                      <ul className="text-xs space-y-1.5 ml-2">
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Continue fortnightly welfare monitoring until 3-month stability period reached</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Track symptom reports - escalate to DXC if deterioration reported</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Ensure {workerCase.workerName} continues physio until discharged by treating practitioner</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Document all welfare contacts and symptom updates in ticket</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Prepare for 3-month review (due ~8 March 2026)</span>
                        </li>
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-primary">Milestone: 3-Month Stability Review (Target: 8 March 2026)</h3>
                      <ul className="text-xs space-y-1.5 ml-2">
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Confirm {workerCase.workerName} has sustained employment for 3 months</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Obtain final clearance certificate if not already provided</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Confirm with DXC claim is considered stable</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Close active monitoring if no ongoing concerns</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Final update to Symmetry confirming case closure</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="injury" className="flex-1 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Injury Details Section */}
            <Card>
              <CardHeader>
                <CardTitle>Injury Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex border-b pb-2">
                    <div className="w-40 text-sm font-medium">Injury</div>
                    <div className="text-sm flex-1">
                      {workerCase.clinical_status_json?.treatmentPlan?.injuryType ||
                       injuryFromSummary['injury'] ||
                       "Not specified"}
                    </div>
                  </div>
                  <div className="flex border-b pb-2">
                    <div className="w-40 text-sm font-medium">Date of Onset</div>
                    <div className="text-sm flex-1">
                      {injuryFromSummary['date of onset'] || workerCase.dateOfInjury || "Not recorded"}
                    </div>
                  </div>
                  {(workerCase.medicalConstraints?.mechanism || injuryFromSummary['mechanism']) && (
                    <div className="flex border-b pb-2">
                      <div className="w-40 text-sm font-medium">Mechanism</div>
                      <div className="text-sm flex-1">
                        {workerCase.medicalConstraints?.mechanism || injuryFromSummary['mechanism']}
                      </div>
                    </div>
                  )}
                  {(workerCase.medicalConstraints?.treatingGp || injuryFromSummary['treating gp']) && (
                    <div className="flex border-b pb-2">
                      <div className="w-40 text-sm font-medium">Treating GP</div>
                      <div className="text-sm flex-1">
                        {workerCase.medicalConstraints?.treatingGp || injuryFromSummary['treating gp']}
                      </div>
                    </div>
                  )}
                  {(workerCase.medicalConstraints?.physiotherapist || injuryFromSummary['physiotherapist']) && (
                    <div className="flex border-b pb-2">
                      <div className="w-40 text-sm font-medium">Physiotherapist</div>
                      <div className="text-sm flex-1">
                        {workerCase.medicalConstraints?.physiotherapist || injuryFromSummary['physiotherapist']}
                      </div>
                    </div>
                  )}
                  {(injuryFromSummary['orp'] || injuryFromSummary['specialists']) && (
                    <div className="flex border-b pb-2">
                      <div className="w-40 text-sm font-medium">ORP/Specialist</div>
                      <div className="text-sm flex-1">
                        {injuryFromSummary['orp'] || injuryFromSummary['specialists']}
                      </div>
                    </div>
                  )}
                  {(injuryFromSummary['case manager'] || workerCase.owner) && (
                    <div className="flex border-b pb-2">
                      <div className="w-40 text-sm font-medium">Case Manager</div>
                      <div className="text-sm flex-1">
                        {injuryFromSummary['case manager'] || workerCase.owner}
                      </div>
                    </div>
                  )}
                  <div className="flex pb-2">
                    <div className="w-40 text-sm font-medium">Work Status</div>
                    <div className="text-sm flex-1">{workerCase.workStatus}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Diagnosis Section */}
            <Card>
              <CardHeader>
                <CardTitle>Diagnosis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Medical Diagnosis */}
                  <div>
                    <h4 className="text-sm font-semibold text-primary mb-2">Medical Diagnosis</h4>
                    <p className="text-sm">
                      {workerCase.clinical_status_json?.treatmentPlan?.diagnosisSummary ||
                       workerCase.clinical_status_json?.treatmentPlan?.injuryType ||
                       "Diagnosis details not yet recorded"}
                    </p>
                  </div>

                  {/* Scans & Imaging - Only show actual attachments */}
                  <div>
                    <h4 className="text-sm font-semibold text-primary mb-2">Scans & Imaging</h4>
                    {(() => {
                      const imagingAttachments = workerCase.attachments?.filter(att =>
                        ['x-ray', 'xray', 'mri', 'ct', 'ultrasound', 'scan', 'imaging'].some(term =>
                          att.name.toLowerCase().includes(term) || att.type.toLowerCase().includes(term)
                        )
                      ) || [];

                      if (imagingAttachments.length > 0) {
                        return (
                          <div className="space-y-2">
                            {imagingAttachments.map(att => (
                              <div key={att.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                                <span>{att.name}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => window.open(att.url, '_blank')}
                                >
                                  View
                                </Button>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded text-sm">
                          <p className="text-amber-800 dark:text-amber-200">No imaging results on file</p>
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            Consider requesting X-ray or ultrasound if clinically indicated
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Test Results - Only show actual attachments */}
                  <div>
                    <h4 className="text-sm font-semibold text-primary mb-2">Test Results</h4>
                    {(() => {
                      const testAttachments = workerCase.attachments?.filter(att =>
                        ['blood', 'pathology', 'lab', 'test', 'nerve', 'conduction', 'emg', 'ecg'].some(term =>
                          att.name.toLowerCase().includes(term) || att.type.toLowerCase().includes(term)
                        )
                      ) || [];

                      if (testAttachments.length > 0) {
                        return (
                          <div className="space-y-2">
                            {testAttachments.map(att => (
                              <div key={att.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                                <span>{att.name}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => window.open(att.url, '_blank')}
                                >
                                  View
                                </Button>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return (
                        <div className="p-3 bg-muted rounded text-sm text-muted-foreground">
                          No test results on file
                        </div>
                      );
                    })()}
                  </div>

                  {/* Medical Certificates */}
                  <div>
                    <h4 className="text-sm font-semibold text-primary mb-2">Medical Certificates</h4>
                    {(() => {
                      const certAttachments = workerCase.attachments?.filter(att =>
                        ['certificate', 'cert', 'medical cert', 'worksafe'].some(term =>
                          att.name.toLowerCase().includes(term) || att.type.toLowerCase().includes(term)
                        )
                      ) || [];

                      if (certAttachments.length > 0 || workerCase.latestCertificate) {
                        return (
                          <div className="space-y-2">
                            {workerCase.latestCertificate && (
                              <div className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded text-sm">
                                <div>
                                  <span className="font-medium">Current Certificate</span>
                                  <p className="text-xs text-muted-foreground">
                                    Valid: {workerCase.latestCertificate.startDate} to {workerCase.latestCertificate.endDate}
                                  </p>
                                </div>
                                <Badge className="bg-emerald-100 text-emerald-800">Active</Badge>
                              </div>
                            )}
                            {certAttachments.map(att => (
                              <div key={att.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                                <span>{att.name}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => window.open(att.url, '_blank')}
                                >
                                  View
                                </Button>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return (
                        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded text-sm">
                          <p className="text-red-800 dark:text-red-200 font-medium">No medical certificate on file</p>
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            Action required: Request current medical certificate
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="flex-1 p-6">
          <TimelineCard caseId={id!} />
        </TabsContent>


        <TabsContent value="financial" className="flex-1 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex border-b pb-2">
                  <div className="w-48 text-sm font-medium">Pre-injury weekly earnings</div>
                  <div className="text-sm flex-1">$1,346.63</div>
                </div>
                <div className="flex border-b pb-2">
                  <div className="w-48 text-sm font-medium">Current weekly earnings (IKON)</div>
                  <div className="text-sm flex-1">$1,211.62</div>
                </div>
                <div className="flex border-b pb-2">
                  <div className="w-48 text-sm font-medium">Weekly shortfall</div>
                  <div className="text-sm flex-1">$135.01</div>
                </div>
                <div className="flex border-b pb-2">
                  <div className="w-48 text-sm font-medium">PIAWE entitlement</div>
                  <div className="text-sm flex-1">$1,074/week</div>
                </div>
                <div className="flex pb-2">
                  <div className="w-48 text-sm font-medium">Top-up required if below PIAWE</div>
                  <div className="text-sm flex-1">Yes - Symmetry to pay difference</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="flex-1 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Risk Register</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 p-2 border-b-2 border-primary text-sm font-semibold text-primary">
                  <div>Risk</div>
                  <div>Likelihood</div>
                  <div>Impact</div>
                  <div>Mitigation</div>
                </div>
                <div className="grid grid-cols-4 gap-4 p-2 border-b text-sm">
                  <div>Symptom exacerbation leading to claim reopening</div>
                  <div><span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs">Medium</span></div>
                  <div><span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">High</span></div>
                  <div>Welfare monitoring, physio continuation</div>
                </div>
                <div className="grid grid-cols-4 gap-4 p-2 border-b text-sm">
                  <div>Worker disengages from new role (long commute, difficult manager)</div>
                  <div><span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs">Medium</span></div>
                  <div><span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">High</span></div>
                  <div>Regular check-ins, early intervention</div>
                </div>
                <div className="grid grid-cols-4 gap-4 p-2 border-b text-sm">
                  <div>No formal clearance obtained</div>
                  <div><span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs">Medium</span></div>
                  <div><span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">Low</span></div>
                  <div>Request clearance from physio/GP</div>
                </div>
                <div className="grid grid-cols-4 gap-4 p-2 text-sm">
                  <div>Employer liability if employment ends due to injury</div>
                  <div><span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Low</span></div>
                  <div><span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">High</span></div>
                  <div>Monitor 3-month stability period</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="flex-1 p-6">
          <CaseContactsPanel
            caseId={id!}
            workerName={workerCase.workerName}
            company={workerCase.company}
          />
        </TabsContent>

        <TabsContent value="treatment" className="flex-1 p-6">
          <div className="treatment-tab-container space-y-6">
            {/* Hero Section - Full-Width Recovery Dashboard */}
            <div className="recovery-hero-section">
              {id && (
                <Suspense fallback={<ChartLoader />}>
                  <DynamicRecoveryTimeline caseId={id} />
                </Suspense>
              )}
            </div>

            {/* Supporting Information - Treatment Plan & Diagnosis Grid */}
            <div className="treatment-supporting-info grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Treatment Plan Section */}
              <div className="treatment-left-column">
                {id && <TreatmentPlanCard caseId={id} />}
              </div>

              {/* Diagnosis Section */}
              <div className="treatment-right-column">
                <GlassPanel className="diagnosis-glass-card h-full" variant="gradient">
                  <div className="p-6">
                    <div className="border-b border-white/20 pb-4 mb-6">
                      <h3 className="flex items-center gap-2 text-base font-semibold text-white">
                        <span className="material-symbols-outlined text-white/90">diagnosis</span>
                        Medical Diagnosis
                      </h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-white/90 mb-2">Primary Diagnosis</h4>
                        <p className="text-sm text-white/80">{workerCase.summary || "Diagnosis details pending"}</p>
                        <p className="text-sm text-white/60">Injury Date: {workerCase.dateOfInjury}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white/90 mb-2">Work Status</h4>
                        <p className="text-sm text-white/80">{workerCase.workStatus}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white/90 mb-2">Risk Level</h4>
                        <Badge className={cn(
                          workerCase.riskLevel === "High" ? "bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg shadow-red-500/25" :
                          workerCase.riskLevel === "Medium" ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25" :
                          "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/25"
                        )}>
                          {workerCase.riskLevel}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </GlassPanel>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}