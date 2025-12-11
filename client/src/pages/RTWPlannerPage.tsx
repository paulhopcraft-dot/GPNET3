import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  User,
  Briefcase,
  FileText,
  Activity,
} from "lucide-react";
import type { WorkerCase } from "@shared/schema";

interface RTWPlan {
  id: string;
  caseId: string;
  workerName: string;
  status: string;
  currentPhase: number;
  phases: RTWPhase[];
  goalDate: string;
  safetyStatus: "safe" | "at_risk" | "unsafe" | "unknown";
  safetyNotes?: string;
  recommendations: RTWRecommendation[];
}

interface RTWPhase {
  phaseNumber: number;
  name: string;
  hoursPerDay: number;
  daysPerWeek: number;
  durationWeeks: number;
  duties: string[];
  restrictions: string[];
  startDate: string;
  endDate: string;
  reviewDate: string;
  status: "pending" | "active" | "completed" | "skipped";
}

interface RTWRecommendation {
  id: string;
  type: string;
  priority: "low" | "medium" | "high";
  message: string;
  reason: string;
  suggestedAction: string;
}

function PhaseCard({ phase, isActive }: { phase: RTWPhase; isActive: boolean }) {
  const statusColors = {
    pending: "bg-slate-100 text-slate-700",
    active: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    skipped: "bg-yellow-100 text-yellow-700",
  };

  return (
    <Card className={isActive ? "ring-2 ring-primary" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              phase.status === "completed" ? "bg-green-500 text-white" :
              phase.status === "active" ? "bg-blue-500 text-white" :
              "bg-slate-200 text-slate-600"
            }`}>
              {phase.status === "completed" ? <CheckCircle2 className="h-5 w-5" /> : phase.phaseNumber}
            </div>
            {phase.name}
          </CardTitle>
          <Badge className={statusColors[phase.status]}>
            {phase.status.charAt(0).toUpperCase() + phase.status.slice(1)}
          </Badge>
        </div>
        <CardDescription>
          {new Date(phase.startDate).toLocaleDateString()} - {new Date(phase.endDate).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">{phase.hoursPerDay}h</div>
            <div className="text-xs text-muted-foreground">per day</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{phase.daysPerWeek}d</div>
            <div className="text-xs text-muted-foreground">per week</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{phase.durationWeeks}w</div>
            <div className="text-xs text-muted-foreground">duration</div>
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="text-sm font-medium mb-2">Duties</h4>
          <div className="flex flex-wrap gap-1">
            {phase.duties.map((duty, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {duty}
              </Badge>
            ))}
          </div>
        </div>

        {phase.restrictions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 text-orange-600">Restrictions</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {phase.restrictions.map((r, i) => (
                <li key={i} className="flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3 text-orange-500" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Review Date:</span>
          <span className="font-medium">{new Date(phase.reviewDate).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function RecommendationCard({ rec }: { rec: RTWRecommendation }) {
  const priorityColors = {
    low: "bg-slate-100 text-slate-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-red-100 text-red-700",
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <Badge className={priorityColors[rec.priority]}>
            {rec.priority.toUpperCase()}
          </Badge>
          <div className="flex-1">
            <p className="font-medium">{rec.message}</p>
            <p className="text-sm text-muted-foreground mt-1">{rec.reason}</p>
            <div className="mt-2 p-2 bg-muted rounded text-sm">
              <strong>Suggested Action:</strong> {rec.suggestedAction}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RTWPlannerPage() {
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");

  // Fetch all cases
  const { data: cases = [] } = useQuery<WorkerCase[]>({
    queryKey: ["/api/gpnet2/cases"],
  });

  // Fetch RTW plan for selected case
  const { data: rtwPlan, isLoading: planLoading } = useQuery<RTWPlan>({
    queryKey: [`/api/cases/${selectedCaseId}/rtw-plan`],
    enabled: !!selectedCaseId,
  });

  const activeCases = cases.filter((c) => c.workStatus !== "At work");

  const calculateProgress = (plan: RTWPlan) => {
    if (!plan.phases.length) return 0;
    const completed = plan.phases.filter((p) => p.status === "completed").length;
    return Math.round((completed / plan.phases.length) * 100);
  };

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Return to Work Planner</h1>
          <p className="text-muted-foreground mt-2">
            Manage graduated return-to-work plans for injured workers
          </p>
        </div>

        {/* Case Selector */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Select Worker
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
              <SelectTrigger className="w-full md:w-96">
                <SelectValue placeholder="Select a case to view RTW plan" />
              </SelectTrigger>
              <SelectContent>
                {activeCases.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.workerName}</span>
                      <span className="text-muted-foreground">- {c.company}</span>
                      <Badge variant="outline" className="ml-2">
                        {c.workStatus}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* RTW Plan Content */}
        {selectedCaseId && (
          <>
            {planLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-lg text-muted-foreground">Loading RTW plan...</div>
              </div>
            ) : rtwPlan ? (
              <div className="space-y-8">
                {/* Overview Card */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{rtwPlan.workerName}</CardTitle>
                        <CardDescription>
                          Plan Status: {rtwPlan.status.replace(/_/g, " ")}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          rtwPlan.safetyStatus === "safe"
                            ? "default"
                            : rtwPlan.safetyStatus === "at_risk"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {rtwPlan.safetyStatus === "safe" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {rtwPlan.safetyStatus === "at_risk" && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {rtwPlan.safetyStatus.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Overall Progress</span>
                          <span className="text-sm font-medium">{calculateProgress(rtwPlan)}%</span>
                        </div>
                        <Progress value={calculateProgress(rtwPlan)} />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <Calendar className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                          <div className="text-sm font-medium">Goal Date</div>
                          <div className="text-xs text-muted-foreground">
                            {rtwPlan.goalDate ? new Date(rtwPlan.goalDate).toLocaleDateString() : "TBD"}
                          </div>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <Activity className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                          <div className="text-sm font-medium">Current Phase</div>
                          <div className="text-xs text-muted-foreground">
                            Phase {rtwPlan.currentPhase} of {rtwPlan.phases.length}
                          </div>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                          <div className="text-sm font-medium">Total Duration</div>
                          <div className="text-xs text-muted-foreground">
                            {rtwPlan.phases.reduce((sum, p) => sum + p.durationWeeks, 0)} weeks
                          </div>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <FileText className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                          <div className="text-sm font-medium">Recommendations</div>
                          <div className="text-xs text-muted-foreground">
                            {rtwPlan.recommendations.length} pending
                          </div>
                        </div>
                      </div>

                      {rtwPlan.safetyNotes && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">{rtwPlan.safetyNotes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Tabs for Phases and Recommendations */}
                <Tabs defaultValue="phases">
                  <TabsList>
                    <TabsTrigger value="phases">Phases ({rtwPlan.phases.length})</TabsTrigger>
                    <TabsTrigger value="recommendations">
                      Recommendations ({rtwPlan.recommendations.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="phases" className="mt-6">
                    {/* Phase Timeline */}
                    <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                      {rtwPlan.phases.map((phase, i) => (
                        <div key={i} className="flex items-center">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                              phase.status === "completed"
                                ? "bg-green-500 text-white"
                                : phase.status === "active"
                                ? "bg-blue-500 text-white"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {phase.status === "completed" ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : (
                              phase.phaseNumber
                            )}
                          </div>
                          {i < rtwPlan.phases.length - 1 && (
                            <ChevronRight className="h-5 w-5 text-muted-foreground mx-1" />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Phase Cards */}
                    <div className="grid gap-6 md:grid-cols-2">
                      {rtwPlan.phases.map((phase) => (
                        <PhaseCard
                          key={phase.phaseNumber}
                          phase={phase}
                          isActive={phase.phaseNumber === rtwPlan.currentPhase}
                        />
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="recommendations" className="mt-6">
                    {rtwPlan.recommendations.length > 0 ? (
                      <div className="space-y-4">
                        {rtwPlan.recommendations.map((rec) => (
                          <RecommendationCard key={rec.id} rec={rec} />
                        ))}
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="py-8 text-center">
                          <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                          <p className="text-lg font-medium">No Active Recommendations</p>
                          <p className="text-muted-foreground">
                            The RTW plan is proceeding as expected
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No RTW Plan Found</p>
                  <p className="text-muted-foreground mb-4">
                    This case doesn't have a return-to-work plan yet
                  </p>
                  <Button>Generate RTW Plan</Button>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {!selectedCaseId && (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Select a Worker</p>
              <p className="text-muted-foreground">
                Choose a case from the dropdown above to view their RTW plan
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
