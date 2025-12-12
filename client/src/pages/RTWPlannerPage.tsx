import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { WorkerCase } from "@shared/schema";
import { isLegitimateCase } from "@shared/schema";

export default function RTWPlannerPage() {
  const { data: cases = [], isLoading } = useQuery<WorkerCase[]>({
    queryKey: ["/api/gpnet2/cases"],
  });

  const rtwCases = useMemo(() => {
    return cases.filter((c) => {
      if (!isLegitimateCase(c)) return false;
      // Focus on cases that are off work or have RTW plans
      return c.workStatus === "Off work" || c.rtwPlanStatus;
    });
  }, [cases]);

  const stats = useMemo(() => {
    const offWork = rtwCases.filter((c) => c.workStatus === "Off work");
    return {
      total: offWork.length,
      planned: offWork.filter((c) => c.rtwPlanStatus && c.rtwPlanStatus !== "not_planned").length,
      inProgress: offWork.filter((c) => c.rtwPlanStatus === "in_progress").length,
      completed: rtwCases.filter((c) => c.rtwPlanStatus === "completed").length,
    };
  }, [rtwCases]);

  const rtwStatusLabel: Record<string, string> = {
    not_planned: "Not Planned",
    planned_not_started: "Planned - Not Started",
    in_progress: "In Progress",
    working_well: "Working Well",
    failing: "Plan Failing",
    on_hold: "On Hold",
    completed: "Completed",
  };

  const rtwStatusColor = (status?: string) => {
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
  };

  const calculateRecoveryProgress = (dateOfInjury: string) => {
    const injury = new Date(dateOfInjury);
    const now = new Date();
    const weeksElapsed = Math.floor((now.getTime() - injury.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const expectedWeeks = 12;
    return Math.min(100, Math.round((weeksElapsed / expectedWeeks) * 100));
  };

  if (isLoading) {
    return (
      <PageLayout title="RTW Planner" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">
            progress_activity
          </span>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="RTW Planner" subtitle="Return to Work planning and tracking">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Off Work Cases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                With RTW Plans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.planned}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                RTW In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                RTW Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* RTW Cases List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rtwCases.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <span className="material-symbols-outlined text-4xl text-muted-foreground mb-4">
                  event_available
                </span>
                <p className="text-muted-foreground">No cases currently require RTW planning.</p>
              </CardContent>
            </Card>
          ) : (
            rtwCases.map((workerCase) => (
              <Card key={workerCase.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{workerCase.workerName}</CardTitle>
                      <p className="text-sm text-muted-foreground">{workerCase.company}</p>
                    </div>
                    <Badge className={rtwStatusColor(workerCase.rtwPlanStatus)}>
                      {rtwStatusLabel[workerCase.rtwPlanStatus || "not_planned"] || "Not Planned"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Recovery Progress</span>
                      <span className="font-medium">
                        {calculateRecoveryProgress(workerCase.dateOfInjury)}%
                      </span>
                    </div>
                    <Progress value={calculateRecoveryProgress(workerCase.dateOfInjury)} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Injury Date</span>
                      <p className="font-medium">{workerCase.dateOfInjury}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Work Status</span>
                      <p className="font-medium">{workerCase.workStatus}</p>
                    </div>
                  </div>

                  {workerCase.nextStep && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Next Step</span>
                      <p className="font-medium">{workerCase.nextStep}</p>
                    </div>
                  )}

                  <div className="pt-2 border-t">
                    <Link to={`/summary/${workerCase.id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        <span className="material-symbols-outlined text-sm mr-2">open_in_new</span>
                        View Full Case
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </PageLayout>
  );
}
