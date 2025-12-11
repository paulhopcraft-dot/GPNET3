import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Activity,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Calendar,
  User,
  Building,
  Stethoscope,
  ClipboardList,
  ArrowRight,
  ChevronRight,
  Download,
  Printer,
} from "lucide-react";
import type { WorkerCase } from "@shared/schema";
import { isLegitimateCase } from "@shared/schema";

interface RiskFlag {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  since?: string;
}

interface RecommendedAction {
  id: string;
  priority: "low" | "medium" | "high" | "urgent";
  category: "medical" | "compliance" | "communication" | "rtw" | "administrative";
  action: string;
  rationale: string;
  dueDate?: string;
}

interface CaseSummary {
  id: string;
  caseId: string;
  generatedAt: string;
  summaryType: string;
  snapshot: {
    headline: string;
    status: string;
    urgency: "routine" | "attention_needed" | "urgent" | "critical";
    keyPoints: string[];
  };
  currentSituation: {
    workStatus: string;
    capacity: string;
    restrictions: string;
    daysSinceInjury: number;
    certificateStatus: string;
  };
  risks: {
    overallRisk: string;
    activeFlags: RiskFlag[];
    complianceStatus: "compliant" | "at_risk" | "non_compliant";
    concerns: string[];
  };
  progress: {
    rtwStage: string;
    trend: "improving" | "stable" | "declining" | "unknown";
    milestones: string[];
    barriers: string[];
  };
  recommendedActions: RecommendedAction[];
  recentHighlights: string[];
  executiveSummary?: string;
}

function getUrgencyColor(urgency: string) {
  switch (urgency) {
    case "critical": return "destructive";
    case "urgent": return "destructive";
    case "attention_needed": return "default";
    default: return "secondary";
  }
}

function getUrgencyIcon(urgency: string) {
  switch (urgency) {
    case "critical": return <AlertCircle className="h-4 w-4" />;
    case "urgent": return <AlertTriangle className="h-4 w-4" />;
    case "attention_needed": return <Clock className="h-4 w-4" />;
    default: return <CheckCircle2 className="h-4 w-4" />;
  }
}

function getTrendIcon(trend: string) {
  switch (trend) {
    case "improving": return <TrendingUp className="h-4 w-4 text-green-500" />;
    case "declining": return <TrendingDown className="h-4 w-4 text-red-500" />;
    default: return <Minus className="h-4 w-4 text-gray-500" />;
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case "urgent": return "destructive";
    case "high": return "destructive";
    case "medium": return "default";
    default: return "secondary";
  }
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case "critical": return "destructive";
    case "high": return "destructive";
    case "medium": return "default";
    default: return "secondary";
  }
}

function getComplianceColor(status: string) {
  switch (status) {
    case "compliant": return "text-green-600 bg-green-50";
    case "at_risk": return "text-yellow-600 bg-yellow-50";
    case "non_compliant": return "text-red-600 bg-red-50";
    default: return "text-gray-600 bg-gray-50";
  }
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "medical": return <Stethoscope className="h-4 w-4" />;
    case "compliance": return <Shield className="h-4 w-4" />;
    case "communication": return <FileText className="h-4 w-4" />;
    case "rtw": return <Calendar className="h-4 w-4" />;
    default: return <ClipboardList className="h-4 w-4" />;
  }
}

export default function CaseSummaryPage() {
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");

  // Fetch all cases for the selector
  const { data: cases = [] } = useQuery<WorkerCase[]>({
    queryKey: ["/api/gpnet2/cases"],
  });

  const legitimateCases = useMemo(() => {
    return cases.filter(isLegitimateCase).sort((a, b) => a.workerName.localeCompare(b.workerName));
  }, [cases]);

  // Fetch summary for selected case
  const {
    data: summary,
    isLoading,
    refetch,
    isFetching,
  } = useQuery<CaseSummary>({
    queryKey: [`/api/cases/${selectedCaseId}/summary`],
    enabled: !!selectedCaseId,
  });

  const selectedCase = useMemo(() => {
    return cases.find((c) => c.id === selectedCaseId);
  }, [cases, selectedCaseId]);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    if (!summary) return;
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `case-summary-${selectedCaseId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Case Summary</h1>
            <p className="text-muted-foreground">
              Comprehensive case overview and recommended actions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select a case..." />
              </SelectTrigger>
              <SelectContent>
                {legitimateCases.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.workerName} - {c.company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCaseId && (
              <>
                <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </>
            )}
          </div>
        </div>

        {!selectedCaseId && (
          <Card className="py-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a Case</h3>
              <p className="text-muted-foreground max-w-md">
                Choose a case from the dropdown above to view its comprehensive summary,
                including risk assessment, progress tracking, and recommended actions.
              </p>
            </CardContent>
          </Card>
        )}

        {selectedCaseId && isLoading && (
          <Card className="py-12">
            <CardContent className="flex flex-col items-center justify-center">
              <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin mb-4" />
              <p className="text-muted-foreground">Loading case summary...</p>
            </CardContent>
          </Card>
        )}

        {summary && selectedCase && (
          <>
            {/* Snapshot Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-xl">{selectedCase.workerName}</CardTitle>
                      <Badge variant={getUrgencyColor(summary.snapshot.urgency)} className="ml-2">
                        {getUrgencyIcon(summary.snapshot.urgency)}
                        <span className="ml-1 capitalize">{summary.snapshot.urgency.replace("_", " ")}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building className="h-4 w-4" />
                        {selectedCase.company}
                      </span>
                      <span className="flex items-center gap-1">
                        <Stethoscope className="h-4 w-4" />
                        {selectedCase.diagnosis || "Not specified"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {summary.currentSituation.daysSinceInjury} days
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Generated: {new Date(summary.generatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-lg mb-2">{summary.snapshot.headline}</h4>
                  {summary.executiveSummary && (
                    <p className="text-muted-foreground">{summary.executiveSummary}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <h5 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Key Points</h5>
                  <ul className="space-y-1">
                    {summary.snapshot.keyPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Main Content Tabs */}
            <Tabs defaultValue="situation" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="situation">Current Situation</TabsTrigger>
                <TabsTrigger value="risks">Risks & Compliance</TabsTrigger>
                <TabsTrigger value="progress">Progress</TabsTrigger>
                <TabsTrigger value="actions">Actions ({summary.recommendedActions.length})</TabsTrigger>
              </TabsList>

              {/* Current Situation Tab */}
              <TabsContent value="situation" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Work Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{summary.currentSituation.workStatus}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Current Capacity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-semibold">{summary.currentSituation.capacity}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Certificate Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-semibold">{summary.currentSituation.certificateStatus}</p>
                    </CardContent>
                  </Card>
                </div>
                {summary.currentSituation.restrictions && summary.currentSituation.restrictions !== "None specified" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Restrictions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{summary.currentSituation.restrictions}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Risks & Compliance Tab */}
              <TabsContent value="risks" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Overall Risk Level
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge variant={summary.risks.overallRisk === "High" ? "destructive" : summary.risks.overallRisk === "Medium" ? "default" : "secondary"} className="text-lg px-3 py-1">
                        {summary.risks.overallRisk}
                      </Badge>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Compliance Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <span className={`inline-flex items-center px-3 py-1 rounded-md font-medium ${getComplianceColor(summary.risks.complianceStatus)}`}>
                        {summary.risks.complianceStatus === "compliant" && <CheckCircle2 className="h-4 w-4 mr-2" />}
                        {summary.risks.complianceStatus === "at_risk" && <AlertTriangle className="h-4 w-4 mr-2" />}
                        {summary.risks.complianceStatus === "non_compliant" && <AlertCircle className="h-4 w-4 mr-2" />}
                        {summary.risks.complianceStatus.replace("_", " ").charAt(0).toUpperCase() + summary.risks.complianceStatus.slice(1).replace("_", " ")}
                      </span>
                    </CardContent>
                  </Card>
                </div>

                {summary.risks.activeFlags.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Active Risk Flags ({summary.risks.activeFlags.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {summary.risks.activeFlags.map((flag, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                            <Badge variant={getSeverityColor(flag.severity)} className="mt-0.5">
                              {flag.severity}
                            </Badge>
                            <div className="flex-1">
                              <p className="font-medium">{flag.type.replace(/_/g, " ")}</p>
                              <p className="text-sm text-muted-foreground">{flag.message}</p>
                              {flag.since && (
                                <p className="text-xs text-muted-foreground mt-1">Since: {new Date(flag.since).toLocaleDateString()}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {summary.risks.concerns.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Concerns</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {summary.risks.concerns.map((concern, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-500 flex-shrink-0" />
                            {concern}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Progress Tab */}
              <TabsContent value="progress" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">RTW Stage</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xl font-semibold">{summary.progress.rtwStage}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Progress Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        {getTrendIcon(summary.progress.trend)}
                        <span className="text-xl font-semibold capitalize">{summary.progress.trend}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {summary.progress.milestones.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Upcoming Milestones</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {summary.progress.milestones.map((milestone, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <ArrowRight className="h-4 w-4 text-blue-500" />
                            {milestone}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {summary.progress.barriers.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Barriers to Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {summary.progress.barriers.map((barrier, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            {barrier}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {summary.recentHighlights.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Recent Highlights</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {summary.recentHighlights.map((highlight, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Clock className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                            {highlight}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Actions Tab */}
              <TabsContent value="actions" className="space-y-4">
                {summary.recommendedActions.length === 0 ? (
                  <Card className="py-8">
                    <CardContent className="flex flex-col items-center justify-center text-center">
                      <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
                      <p className="text-muted-foreground">No recommended actions at this time</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {summary.recommendedActions.map((action) => (
                      <Card key={action.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 mt-0.5">
                              {getCategoryIcon(action.category)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={getPriorityColor(action.priority)}>
                                  {action.priority}
                                </Badge>
                                <Badge variant="outline" className="capitalize">
                                  {action.category}
                                </Badge>
                              </div>
                              <p className="font-medium">{action.action}</p>
                              <p className="text-sm text-muted-foreground mt-1">{action.rationale}</p>
                              {action.dueDate && (
                                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Due: {new Date(action.dueDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </MainLayout>
  );
}
