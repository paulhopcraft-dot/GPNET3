import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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

export default function EmployerCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  // Fetch case data
  const { data: paginatedData } = useQuery<PaginatedCasesResponse>({
    queryKey: ["/api/gpnet2/cases"],
  });
  const workerCase = paginatedData?.cases?.find(c => c.id === id);

  const generateSummary = async () => {
    if (!id) return;
    setLoadingSummary(true);
    try {
      const response = await fetchWithCsrf(`/api/cases/${id}/summary/generate`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        setAiSummary(data.summary);
      }
    } catch (error) {
      console.error("Error generating summary:", error);
    } finally {
      setLoadingSummary(false);
    }
  };

  const renderMarkdown = (content: string) => (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );

  if (!workerCase) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading case details...</div>
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
              workerCase.workStatus === "At work"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            )}>
              {workerCase.workStatus}
            </Badge>
            <Badge variant="outline">
              Compliance: {workerCase.complianceIndicator}
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs at the top */}
      <Tabs defaultValue="worker" className="flex-1 flex flex-col">
        <div className="border-b bg-card px-6 py-2">
          <TabsList className="grid grid-cols-8 h-12">
            <TabsTrigger value="worker">Worker</TabsTrigger>
            <TabsTrigger value="injury">Injury</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="risk">Risk</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="recovery">Recovery</TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content */}
        <TabsContent value="worker" className="flex-1 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <CardTitle>Case Summary</CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateSummary}
                    disabled={loadingSummary}
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-2", loadingSummary && "animate-spin")} />
                    {loadingSummary ? "Generating..." : "Refresh Summary"}
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingSummary ? (
                    <div className="flex items-center gap-3 py-8">
                      <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                      <span>Generating intelligent case summary...</span>
                    </div>
                  ) : aiSummary ? (
                    renderMarkdown(aiSummary)
                  ) : (
                    <div className="text-muted-foreground py-8 text-center">
                      Click "Refresh Summary" to generate AI-powered case analysis
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Action Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  {aiSummary ? (
                    <div className="space-y-3">
                      <div className="text-sm font-medium">Recommended Actions:</div>
                      <ul className="text-sm space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Review case status and progress</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Check medical certificate validity</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Follow up on return-to-work planning</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Update compliance documentation</span>
                        </li>
                      </ul>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Action plan will appear after generating summary
                    </div>
                  )}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Date of Injury</label>
                  <div className="text-sm">{workerCase.dateOfInjury}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Work Status</label>
                  <div className="text-sm">{workerCase.workStatus}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Company</label>
                  <div className="text-sm">{workerCase.company}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Compliance</label>
                  <div className="text-sm">{workerCase.complianceIndicator}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="flex-1 p-6">
          <TimelineCard caseId={id!} />
        </TabsContent>

        <TabsContent value="status" className="flex-1 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Work Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">work</span>
                  Work Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Current Status</span>
                  <Badge className={cn(
                    workerCase.workStatus === "At work"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  )}>
                    {workerCase.workStatus}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Employment Status</span>
                  <Badge variant="outline">
                    ACTIVE
                  </Badge>
                </div>
                {workerCase.rtwPlanStatus && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">RTW Plan</span>
                    <Badge variant="outline" className={cn(
                      workerCase.rtwPlanStatus === "working_well" || workerCase.rtwPlanStatus === "in_progress"
                        ? "border-emerald-300 text-emerald-700"
                        : workerCase.rtwPlanStatus === "failing"
                        ? "border-red-300 text-red-700"
                        : "border-slate-300 text-slate-700"
                    )}>
                      {workerCase.rtwPlanStatus.replace(/_/g, " ")}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Compliance Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">verified</span>
                  Compliance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Compliance Level</span>
                  <Badge className={cn(
                    workerCase.complianceIndicator === "Very High" || workerCase.complianceIndicator === "High"
                      ? "bg-emerald-100 text-emerald-800"
                      : workerCase.complianceIndicator === "Medium"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800"
                  )}>
                    {workerCase.complianceIndicator}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Certificate Status</span>
                  <Badge variant={workerCase.hasCertificate ? "outline" : "destructive"}>
                    {workerCase.hasCertificate ? "Valid Certificate" : "No Certificate"}
                  </Badge>
                </div>
                {workerCase.compliance?.reason && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">{workerCase.compliance.reason}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Key Dates Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">calendar_month</span>
                  Key Dates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Date of Injury</p>
                    <p className="text-sm font-medium">{workerCase.dateOfInjury}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Next Step Due</p>
                    <p className="text-sm font-medium">{workerCase.dueDate}</p>
                  </div>
                  {workerCase.clcLastFollowUp && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Last Follow-up</p>
                      <p className="text-sm font-medium">{workerCase.clcLastFollowUp}</p>
                    </div>
                  )}
                  {workerCase.clcNextFollowUp && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Next Follow-up</p>
                      <p className="text-sm font-medium">{workerCase.clcNextFollowUp}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="flex-1 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Financial data will be displayed here</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="flex-1 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Risk Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Risk analysis will be displayed here</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="flex-1 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Worker Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">person</span>
                  Worker
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{workerCase.workerName}</p>
                <p className="text-sm text-muted-foreground mt-1">{workerCase.company}</p>
              </CardContent>
            </Card>

            {/* Case Owner Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">assignment_ind</span>
                  Case Owner
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{workerCase.owner || "Unassigned"}</p>
                <p className="text-sm text-muted-foreground mt-1">Case Manager</p>
              </CardContent>
            </Card>

            {/* Employer Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">business</span>
                  Employer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{workerCase.company}</p>
                <p className="text-sm text-muted-foreground mt-1">Host Employer</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardContent className="py-6">
              <div className="text-center text-muted-foreground">
                <span className="material-symbols-outlined text-3xl mb-2">contact_page</span>
                <p className="text-sm">
                  Additional contact details are available through your case management system.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recovery" className="flex-1 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Recovery Planning</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Recovery plan will be displayed here</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}