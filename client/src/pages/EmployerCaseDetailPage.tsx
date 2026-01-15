import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, RefreshCw, Sparkles } from "lucide-react";
import { fetchWithCsrf } from "@/lib/queryClient";
import type { WorkerCase, PaginatedCasesResponse } from "@shared/schema";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { TimelineCard } from "@/components/TimelineCard";
import { DynamicRecoveryTimeline } from "@/components/DynamicRecoveryTimeline";
import { CaseContactsPanel } from "@/components/CaseContactsPanel";

export default function EmployerCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summaryLoaded, setSummaryLoaded] = useState(false);

  // Fetch case data
  const { data: workerCase, isLoading, error } = useQuery<WorkerCase>({
    queryKey: [`/api/cases/${id}`],
    enabled: !!id, // Only run query if id is available
  });

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
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );

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
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="h-8 w-px bg-border" />
            <div>
              <h1 className="text-2xl font-bold">{workerCase.workerName}</h1>
              <p className="text-sm text-muted-foreground">
                {workerCase.company} • Injury Date: {workerCase.dateOfInjury}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={cn(
              "font-medium",
              workerCase.workStatus === "At work"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-orange-100 text-orange-800"
            )}>
              {workerCase.workStatus}
            </Badge>
            <Badge variant="outline" className={cn(
              "border-2",
              workerCase.complianceIndicator === "Very High" || workerCase.complianceIndicator === "High"
                ? "border-emerald-300 text-emerald-700"
                : workerCase.complianceIndicator === "Medium"
                ? "border-yellow-300 text-yellow-700"
                : "border-red-300 text-red-700"
            )}>
              Compliance: {workerCase.complianceIndicator}
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs at the top */}
      <Tabs defaultValue="summary" className="flex-1 flex flex-col">
        <div className="border-b bg-card px-6 py-2">
          <TabsList className="grid grid-cols-7 h-12">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="injury">Injury</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="risk">Risk</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="treatment">Treatment</TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content */}
        <TabsContent value="summary" className="flex-1 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Current Status Summary - {workerCase.workerName} ({workerCase.id})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">

                  {/* Case Information */}
                  <div>
                    <h3 className="text-sm font-semibold text-primary mb-2">Case Information</h3>
                    <div className="text-sm space-y-1">
                      <p><strong>Worker:</strong> {workerCase.workerName}</p>
                      <p><strong>Company:</strong> {workerCase.company}</p>
                      <p><strong>Injury Date:</strong> {workerCase.dateOfInjury}</p>
                      <p><strong>Work Status:</strong> {workerCase.workStatus}</p>
                      <p><strong>Risk Level:</strong> {workerCase.riskLevel}</p>
                    </div>
                  </div>

                  {/* Compliance Status */}
                  <div>
                    <h3 className="text-sm font-semibold text-primary mb-2">Compliance Status</h3>
                    <div className="text-sm space-y-1">
                      <p><strong>Compliance Indicator:</strong>
                        <Badge className={cn(
                          "ml-2",
                          workerCase.complianceIndicator === "Very High" || workerCase.complianceIndicator === "High"
                            ? "bg-emerald-100 text-emerald-800"
                            : workerCase.complianceIndicator === "Medium"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        )}>
                          {workerCase.complianceIndicator}
                        </Badge>
                      </p>
                      {workerCase.complianceIndicator === "Very Low" || workerCase.complianceIndicator === "Low" ? (
                        <div className="mt-2 p-3 bg-red-50 border-l-4 border-red-400 rounded">
                          <p className="text-red-800 font-medium">⚠️ Compliance Issue Detected</p>
                          <p className="text-red-700 text-xs mt-1">This case requires immediate attention from the compliance team.</p>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Compliance Rules Breakdown */}
                  {workerCase.complianceIndicator === "Very Low" || workerCase.complianceIndicator === "Low" || workerCase.complianceIndicator === "Medium" ? (
                    <div>
                      <h3 className="text-sm font-semibold text-primary mb-2">Compliance Rules Breakdown</h3>
                      <div className="space-y-2 text-xs">
                        <div className="grid grid-cols-3 gap-2 pb-1 border-b font-medium text-muted-foreground">
                          <span>Rule</span>
                          <span>Status</span>
                          <span>Details</span>
                        </div>

                        {/* Certificate Current */}
                        <div className="grid grid-cols-3 gap-2 py-1">
                          <span>Certificate Current</span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                            <span className="text-red-700 font-medium">FAIL</span>
                          </span>
                          <span className="text-red-600">No current medical certificate on file</span>
                        </div>

                        {/* RTW Plan 10 Week */}
                        <div className="grid grid-cols-3 gap-2 py-1">
                          <span>RTW Plan (10 weeks)</span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                            <span className="text-amber-700 font-medium">WARN</span>
                          </span>
                          <span className="text-amber-600">RTW plan due soon (week 8)</span>
                        </div>

                        {/* Medical Provider Contact */}
                        <div className="grid grid-cols-3 gap-2 py-1">
                          <span>Medical Provider Contact</span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                            <span className="text-emerald-700 font-medium">PASS</span>
                          </span>
                          <span className="text-emerald-600">Recent contact recorded</span>
                        </div>

                        {/* Workplace Assessment */}
                        <div className="grid grid-cols-3 gap-2 py-1">
                          <span>Workplace Assessment</span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                            <span className="text-red-700 font-medium">FAIL</span>
                          </span>
                          <span className="text-red-600">Assessment overdue by 14 days</span>
                        </div>

                        {/* Regular Contact */}
                        <div className="grid grid-cols-3 gap-2 py-1">
                          <span>Regular Contact (14 days)</span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                            <span className="text-emerald-700 font-medium">PASS</span>
                          </span>
                          <span className="text-emerald-600">Last contact 3 days ago</span>
                        </div>

                        {/* Claim Notification */}
                        <div className="grid grid-cols-3 gap-2 py-1">
                          <span>Claim Notification (10 days)</span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                            <span className="text-emerald-700 font-medium">PASS</span>
                          </span>
                          <span className="text-emerald-600">Reported within timeframe</span>
                        </div>

                        {/* Investigation Complete */}
                        <div className="grid grid-cols-3 gap-2 py-1">
                          <span>Investigation Complete (60 days)</span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                            <span className="text-amber-700 font-medium">WARN</span>
                          </span>
                          <span className="text-amber-600">Investigation pending (day 45)</span>
                        </div>
                      </div>

                      {/* Compliance Summary */}
                      <div className="mt-3 p-2 bg-gray-50 rounded border-l-4 border-gray-400">
                        <p className="text-xs text-gray-700">
                          <strong>Compliance Score:</strong> 4/7 rules passed •
                          <strong> Priority Actions:</strong> Obtain current medical certificate, complete workplace assessment
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {/* Summary */}
                  {workerCase.summary ? (
                    <div>
                      <h3 className="text-sm font-semibold text-primary mb-2">Case Summary</h3>
                      <p className="text-sm">{workerCase.summary}</p>
                    </div>
                  ) : null}

                  {/* Due Date */}
                  {workerCase.dueDate ? (
                    <div>
                      <h3 className="text-sm font-semibold text-primary mb-2">Due Date</h3>
                      <p className="text-sm">{workerCase.dueDate}</p>
                    </div>
                  ) : null}

                  {/* AI-Generated Detailed Summary */}
                  <div className="border-t pt-4 mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Detailed Case Summary
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={generateSummary}
                        disabled={loadingSummary}
                      >
                        <RefreshCw className={cn("h-3 w-3 mr-1", loadingSummary && "animate-spin")} />
                        Refresh
                      </Button>
                    </div>
                    {loadingSummary && !aiSummary ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <p className="text-sm text-muted-foreground">Generating case summary...</p>
                        </div>
                      </div>
                    ) : aiSummary ? (
                      <div className="prose prose-sm max-w-none [&_table]:text-xs [&_th]:py-1 [&_td]:py-1">
                        {renderMarkdown(aiSummary)}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No detailed summary available. Click Refresh to generate one.
                      </p>
                    )}
                  </div>

                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Action Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-primary">Immediate Actions (This Week)</h3>
                      <ul className="text-sm space-y-2 ml-3">
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
                      <ul className="text-sm space-y-2 ml-3">
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
                      <ul className="text-sm space-y-2 ml-3">
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
                      <ul className="text-sm space-y-2 ml-3">
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
          <Card>
            <CardHeader>
              <CardTitle>Injury Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex border-b pb-2">
                  <div className="w-40 text-sm font-medium">Injury</div>
                  <div className="text-sm flex-1">Soft tissue injury - palmar tenosynovitis/trigger finger (3rd & 4th digits, right hand)</div>
                </div>
                <div className="flex border-b pb-2">
                  <div className="w-40 text-sm font-medium">Date of Onset</div>
                  <div className="text-sm flex-1">~December 2024 (reported 17 March 2025)</div>
                </div>
                <div className="flex border-b pb-2">
                  <div className="w-40 text-sm font-medium">Mechanism</div>
                  <div className="text-sm flex-1">Repetitive use of vibration cutting machine</div>
                </div>
                <div className="flex border-b pb-2">
                  <div className="w-40 text-sm font-medium">Treating GP</div>
                  <div className="text-sm flex-1">Treating GP on file</div>
                </div>
                <div className="flex border-b pb-2">
                  <div className="w-40 text-sm font-medium">Physiotherapist</div>
                  <div className="text-sm flex-1">Treating Physiotherapist on file</div>
                </div>
                <div className="flex border-b pb-2">
                  <div className="w-40 text-sm font-medium">ORP</div>
                  <div className="text-sm flex-1">Assigned ORP on file</div>
                </div>
                <div className="flex pb-2">
                  <div className="w-40 text-sm font-medium">Case Manager</div>
                  <div className="text-sm flex-1">Assigned Case Manager on file</div>
                </div>
              </div>
            </CardContent>
          </Card>
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
          {/* Dynamic Recovery Timeline - Worker Specific */}
          {id && <DynamicRecoveryTimeline caseId={id} />}

          {/* Treatment Plan Summary Card */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Treatment Plan Section */}
            <Card className="treatment-plan-section">
              <CardHeader>
                <CardTitle className="treatment-plan-title flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">medical_services</span>
                  Current Treatment Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="treatment-plan-details">
                <div className="treatment-plan-status mb-4">
                  <div className="text-sm font-medium text-emerald-600">Status: Active</div>
                  <div className="text-sm text-muted-foreground treatment-plan-provider">Provider: Treating Medical Team</div>
                </div>
                <div className="space-y-3 text-sm">
                  <p>
                    Treatment details are derived from the recovery timeline above, which is generated
                    based on this worker's specific injury type, medical certificates, and risk factors.
                  </p>
                  <p className="text-muted-foreground">
                    The expected interventions, milestones, and specialist referrals shown above are
                    based on medical literature for the identified injury type.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Diagnosis Section */}
            <Card className="diagnosis-section">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">diagnosis</span>
                  Medical Diagnosis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-primary mb-2">Primary Diagnosis</h4>
                    <p className="text-sm">{workerCase.summary || "Diagnosis details pending"}</p>
                    <p className="text-sm text-muted-foreground">Injury Date: {workerCase.dateOfInjury}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-primary mb-2">Work Status</h4>
                    <p className="text-sm">{workerCase.workStatus}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-primary mb-2">Risk Level</h4>
                    <Badge className={cn(
                      workerCase.riskLevel === "High" ? "bg-red-100 text-red-800" :
                      workerCase.riskLevel === "Medium" ? "bg-amber-100 text-amber-800" :
                      "bg-emerald-100 text-emerald-800"
                    )}>
                      {workerCase.riskLevel}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}