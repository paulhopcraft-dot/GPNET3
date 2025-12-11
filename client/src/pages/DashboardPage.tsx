import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  AlertTriangle,
  TrendingUp,
  Clock,
  FileText,
  ArrowRight,
  CheckCircle2,
  Activity,
  Calendar,
} from "lucide-react";
import type { WorkerCase } from "@shared/schema";
import { isLegitimateCase } from "@shared/schema";

interface RiskSummary {
  totalCases: number;
  riskBreakdown: { high: number; medium: number; low: number };
  flagCounts: Record<string, number>;
  urgentCases: { id: string; workerName: string; reason: string }[];
}

export default function DashboardPage() {
  const { data: cases = [] } = useQuery<WorkerCase[]>({
    queryKey: ["/api/gpnet2/cases"],
    refetchInterval: 30000,
  });

  const { data: riskSummary } = useQuery<RiskSummary>({
    queryKey: ["/api/dashboard/risk-summary"],
    refetchInterval: 60000,
  });

  const stats = useMemo(() => {
    const legitimate = cases.filter(isLegitimateCase);
    const now = new Date();

    return {
      total: legitimate.length,
      highRisk: legitimate.filter((c) => c.riskLevel === "High").length,
      offWork: legitimate.filter((c) => c.workStatus === "Off work").length,
      atWork: legitimate.filter((c) => c.workStatus === "At work").length,
      modifiedDuties: legitimate.filter((c) => c.workStatus === "Modified duties").length,
      recentCases: legitimate.filter((c) => {
        const created = new Date(c.dateOfInjury);
        const daysDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7;
      }).length,
      averageDaysOpen: legitimate.length > 0
        ? Math.round(
            legitimate.reduce((sum, c) => {
              const created = new Date(c.dateOfInjury);
              return sum + (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
            }, 0) / legitimate.length
          )
        : 0,
    };
  }, [cases]);

  const recentHighRiskCases = useMemo(() => {
    return cases
      .filter(isLegitimateCase)
      .filter((c) => c.riskLevel === "High" || c.riskLevel === "Medium")
      .slice(0, 5);
  }, [cases]);

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Overview of your workers' compensation case management
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.recentCases} new this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">High Risk</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.highRisk}</div>
              <p className="text-xs text-muted-foreground">
                Require immediate attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Off Work</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.offWork}</div>
              <p className="text-xs text-muted-foreground">
                Workers not at work
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageDaysOpen}</div>
              <p className="text-xs text-muted-foreground">Days average</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Work Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Work Status Overview</CardTitle>
              <CardDescription>Current status of all workers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">At Work</span>
                  <span className="text-sm font-medium text-green-600">{stats.atWork}</span>
                </div>
                <Progress value={(stats.atWork / stats.total) * 100} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Modified Duties</span>
                  <span className="text-sm font-medium text-yellow-600">{stats.modifiedDuties}</span>
                </div>
                <Progress value={(stats.modifiedDuties / stats.total) * 100} className="h-2 [&>div]:bg-yellow-500" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Off Work</span>
                  <span className="text-sm font-medium text-red-600">{stats.offWork}</span>
                </div>
                <Progress value={(stats.offWork / stats.total) * 100} className="h-2 [&>div]:bg-red-500" />
              </div>
            </CardContent>
          </Card>

          {/* High Priority Cases */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Priority Cases</CardTitle>
                  <CardDescription>Cases requiring attention</CardDescription>
                </div>
                <Link to="/cases">
                  <Button variant="outline" size="sm">
                    View All
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentHighRiskCases.length > 0 ? (
                <div className="space-y-3">
                  {recentHighRiskCases.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">{c.workerName}</p>
                        <p className="text-xs text-muted-foreground">{c.company}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={c.riskLevel === "High" ? "destructive" : "secondary"}>
                          {c.riskLevel}
                        </Badge>
                        <Badge variant="outline">{c.workStatus}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No high priority cases</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and workflows</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Link to="/claims/new">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Submit New Claim
                </Button>
              </Link>
              <Link to="/rtw-planner">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  Manage RTW Plans
                </Button>
              </Link>
              <Link to="/financials">
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Financials
                </Button>
              </Link>
              <Link to="/risk">
                <Button variant="outline" className="w-full justify-start">
                  <Activity className="h-4 w-4 mr-2" />
                  Risk Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Urgent Alerts */}
          {riskSummary?.urgentCases && riskSummary.urgentCases.length > 0 && (
            <Card className="border-red-200 bg-red-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  Urgent Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {riskSummary.urgentCases.map((uc, i) => (
                    <div key={i} className="p-3 bg-white rounded-lg border border-red-200">
                      <p className="font-medium">{uc.workerName}</p>
                      <p className="text-sm text-red-600">{uc.reason}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
