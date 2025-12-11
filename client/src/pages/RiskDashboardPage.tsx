import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  Clock,
  Activity,
  FileWarning,
  RefreshCw,
  ArrowRight,
  Flag,
} from "lucide-react";
import type { WorkerCase } from "@shared/schema";
import { isLegitimateCase } from "@shared/schema";

interface RiskSummary {
  totalCases: number;
  riskBreakdown: { high: number; medium: number; low: number };
  flagCounts: Record<string, number>;
  urgentCases: { id: string; workerName: string; company: string; reason: string; riskLevel: string }[];
  companyRisks: { company: string; totalCases: number; highRisk: number; avgDaysOpen: number }[];
}

export default function RiskDashboardPage() {
  const { data: cases = [], refetch, isRefetching } = useQuery<WorkerCase[]>({
    queryKey: ["/api/gpnet2/cases"],
    refetchInterval: 60000,
  });

  const { data: riskSummary } = useQuery<RiskSummary>({
    queryKey: ["/api/dashboard/risk-summary"],
    refetchInterval: 60000,
  });

  const stats = useMemo(() => {
    const legitimate = cases.filter(isLegitimateCase);
    const now = new Date();

    const highRisk = legitimate.filter((c) => c.riskLevel === "High");
    const mediumRisk = legitimate.filter((c) => c.riskLevel === "Medium");
    const lowRisk = legitimate.filter((c) => c.riskLevel === "Low");

    const offWork = legitimate.filter((c) => c.workStatus === "Off work");
    const modifiedDuties = legitimate.filter((c) => c.workStatus === "Modified duties");

    // Calculate average days
    const avgDays = legitimate.length > 0
      ? Math.round(
          legitimate.reduce((sum, c) => {
            const created = new Date(c.dateOfInjury);
            return sum + (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          }, 0) / legitimate.length
        )
      : 0;

    // Cases over 90 days
    const longTail = legitimate.filter((c) => {
      const created = new Date(c.dateOfInjury);
      return (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24) > 90;
    });

    // Flag counts
    const flagCounts: Record<string, number> = {};
    legitimate.forEach((c) => {
      c.flags?.forEach((flag) => {
        flagCounts[flag.type] = (flagCounts[flag.type] || 0) + 1;
      });
    });

    return {
      total: legitimate.length,
      highRisk: highRisk.length,
      mediumRisk: mediumRisk.length,
      lowRisk: lowRisk.length,
      offWork: offWork.length,
      modifiedDuties: modifiedDuties.length,
      avgDays,
      longTail: longTail.length,
      flagCounts,
      highRiskCases: highRisk.slice(0, 10),
    };
  }, [cases]);

  const companyStats = useMemo(() => {
    const legitimate = cases.filter(isLegitimateCase);
    const companies: Record<string, { total: number; high: number; medium: number; offWork: number }> = {};

    legitimate.forEach((c) => {
      if (!companies[c.company]) {
        companies[c.company] = { total: 0, high: 0, medium: 0, offWork: 0 };
      }
      companies[c.company].total++;
      if (c.riskLevel === "High") companies[c.company].high++;
      if (c.riskLevel === "Medium") companies[c.company].medium++;
      if (c.workStatus === "Off work") companies[c.company].offWork++;
    });

    return Object.entries(companies)
      .map(([company, stats]) => ({
        company,
        ...stats,
        riskScore: Math.round((stats.high * 3 + stats.medium * 2 + stats.offWork) / stats.total * 33),
      }))
      .sort((a, b) => b.riskScore - a.riskScore);
  }, [cases]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case "High": return "bg-red-500";
      case "Medium": return "bg-yellow-500";
      case "Low": return "bg-green-500";
      default: return "bg-slate-500";
    }
  };

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Risk Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Executive overview of portfolio risk and urgent cases
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.offWork} off work, {stats.modifiedDuties} modified
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-red-700">High Risk</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.highRisk}</div>
              <Progress value={(stats.highRisk / stats.total) * 100} className="h-2 mt-2 [&>div]:bg-red-500" />
            </CardContent>
          </Card>

          <Card className="border-yellow-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700">Medium Risk</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.mediumRisk}</div>
              <Progress value={(stats.mediumRisk / stats.total) * 100} className="h-2 mt-2 [&>div]:bg-yellow-500" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Long-tail Cases</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.longTail}</div>
              <p className="text-xs text-muted-foreground">Over 90 days</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          {/* Risk Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Distribution</CardTitle>
              <CardDescription>Breakdown of cases by risk level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span>High Risk</span>
                    </div>
                    <span className="font-medium">{stats.highRisk} ({Math.round((stats.highRisk / stats.total) * 100)}%)</span>
                  </div>
                  <Progress value={(stats.highRisk / stats.total) * 100} className="h-3 [&>div]:bg-red-500" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span>Medium Risk</span>
                    </div>
                    <span className="font-medium">{stats.mediumRisk} ({Math.round((stats.mediumRisk / stats.total) * 100)}%)</span>
                  </div>
                  <Progress value={(stats.mediumRisk / stats.total) * 100} className="h-3 [&>div]:bg-yellow-500" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span>Low Risk</span>
                    </div>
                    <span className="font-medium">{stats.lowRisk} ({Math.round((stats.lowRisk / stats.total) * 100)}%)</span>
                  </div>
                  <Progress value={(stats.lowRisk / stats.total) * 100} className="h-3 [&>div]:bg-green-500" />
                </div>
              </div>

              {/* Visual bar */}
              <div className="mt-6 h-8 rounded-lg overflow-hidden flex">
                <div className="bg-red-500" style={{ width: `${(stats.highRisk / stats.total) * 100}%` }} />
                <div className="bg-yellow-500" style={{ width: `${(stats.mediumRisk / stats.total) * 100}%` }} />
                <div className="bg-green-500" style={{ width: `${(stats.lowRisk / stats.total) * 100}%` }} />
              </div>
            </CardContent>
          </Card>

          {/* Active Flags */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5" />
                Active Flags
              </CardTitle>
              <CardDescription>Warning signals across all cases</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(stats.flagCounts).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(stats.flagCounts)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 8)
                    .map(([flag, count]) => (
                      <div key={flag} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileWarning className="h-4 w-4 text-orange-500" />
                          <span className="text-sm">{flag.replace(/_/g, " ")}</span>
                        </div>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p>No active flags</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* High Risk Cases */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-red-700">High Risk Cases</CardTitle>
                <CardDescription>Cases requiring immediate attention</CardDescription>
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
            {stats.highRiskCases.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Flags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.highRiskCases.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.workerName}</TableCell>
                      <TableCell>{c.company}</TableCell>
                      <TableCell className="max-w-48 truncate">{c.diagnosis || "Not specified"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{c.workStatus}</Badge>
                      </TableCell>
                      <TableCell>
                        {c.flags && c.flags.length > 0 ? (
                          <div className="flex gap-1">
                            {c.flags.slice(0, 2).map((f, i) => (
                              <Badge key={i} variant="destructive" className="text-xs">
                                {f.type.replace(/_/g, " ").slice(0, 15)}
                              </Badge>
                            ))}
                            {c.flags.length > 2 && (
                              <Badge variant="secondary">+{c.flags.length - 2}</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <p className="text-lg font-medium">No High Risk Cases</p>
                <p className="text-muted-foreground">All cases are within acceptable risk levels</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Company Risk Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Risk Analysis
            </CardTitle>
            <CardDescription>Risk distribution by employer</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">High</TableHead>
                  <TableHead className="text-center">Medium</TableHead>
                  <TableHead className="text-center">Off Work</TableHead>
                  <TableHead>Risk Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companyStats.slice(0, 10).map((company) => (
                  <TableRow key={company.company}>
                    <TableCell className="font-medium">{company.company}</TableCell>
                    <TableCell className="text-center">{company.total}</TableCell>
                    <TableCell className="text-center">
                      <span className={company.high > 0 ? "text-red-600 font-medium" : ""}>
                        {company.high}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={company.medium > 0 ? "text-yellow-600" : ""}>
                        {company.medium}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{company.offWork}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={company.riskScore} className="w-20 h-2" />
                        <span className="text-sm font-medium">{company.riskScore}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
