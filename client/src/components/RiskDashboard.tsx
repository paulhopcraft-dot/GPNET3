import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  TrendingUp,
  Users,
  Building2,
  Clock,
  UserX,
  Calendar,
  Brain,
} from "lucide-react";

interface RiskSummary {
  totalCases: number;
  riskBreakdown: {
    high: number;
    medium: number;
    low: number;
  };
  workStatusBreakdown: {
    offWork: number;
    atWork: number;
  };
  flagCounts: Record<string, number>;
  urgentCases: Array<{
    id: string;
    workerName: string;
    company: string;
    flags: string[];
  }>;
  companyRisk: Record<
    string,
    { total: number; high: number; medium: number; low: number }
  >;
  generatedAt: string;
}

const FLAG_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  OVERDUE_FOLLOW_UP: { label: "Overdue Follow-ups", icon: Clock },
  WORKER_DISENGAGED: { label: "Disengaged Workers", icon: UserX },
  LONG_TAIL_CASE: { label: "Long-tail Cases", icon: Calendar },
  PSYCHOLOGICAL_INJURY_MARKER: { label: "Psych Markers", icon: Brain },
  RTW_PLAN_FAILING: { label: "RTW Failing", icon: TrendingUp },
  WORKER_NON_COMPLIANT: { label: "Non-compliant", icon: AlertTriangle },
};

export function RiskDashboard() {
  const { data: summary, isLoading, error } = useQuery<RiskSummary>({
    queryKey: ["/api/dashboard/risk-summary"],
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h2 className="text-2xl font-bold">Risk Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-24" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load risk summary</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const highRiskFlagCount = Object.entries(summary.flagCounts)
    .filter(([code]) =>
      ["OVERDUE_FOLLOW_UP", "WORKER_DISENGAGED", "LONG_TAIL_CASE", "RTW_PLAN_FAILING", "WORKER_NON_COMPLIANT"].includes(code)
    )
    .reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Risk Dashboard</h2>
        <span className="text-xs text-muted-foreground">
          Updated: {new Date(summary.generatedAt).toLocaleTimeString()}
        </span>
      </div>

      {/* Top-level metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Cases
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.totalCases}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.workStatusBreakdown.offWork} off work
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">
              High Risk
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              {summary.riskBreakdown.high}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((summary.riskBreakdown.high / summary.totalCases) * 100)}% of cases
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Medium Risk
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {summary.riskBreakdown.medium}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((summary.riskBreakdown.medium / summary.totalCases) * 100)}% of cases
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 dark:border-emerald-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Low Risk
            </CardTitle>
            <Users className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {summary.riskBreakdown.low}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((summary.riskBreakdown.low / summary.totalCases) * 100)}% of cases
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Flag summary and urgent cases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Flags */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Active Risk Flags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(FLAG_LABELS).map(([code, { label, icon: Icon }]) => {
                const count = summary.flagCounts[code] || 0;
                if (count === 0) return null;
                return (
                  <div
                    key={code}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{label}</span>
                    </div>
                    <Badge
                      variant={count >= 5 ? "destructive" : count >= 2 ? "default" : "secondary"}
                    >
                      {count}
                    </Badge>
                  </div>
                );
              })}
              {highRiskFlagCount === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No critical flags active
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Urgent Cases */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-red-500" />
              Cases Needing Urgent Action
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {summary.urgentCases.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No urgent cases
                </p>
              ) : (
                summary.urgentCases.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-lg border bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{c.workerName}</span>
                      <Badge variant="outline" className="text-xs">
                        {c.company}
                      </Badge>
                    </div>
                    <ul className="text-xs text-red-700 dark:text-red-400 space-y-0.5">
                      {c.flags.slice(0, 2).map((flag, i) => (
                        <li key={i}>• {flag}</li>
                      ))}
                      {c.flags.length > 2 && (
                        <li className="text-muted-foreground">
                          +{c.flags.length - 2} more flags
                        </li>
                      )}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Company breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-500" />
            Risk by Company
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(summary.companyRisk)
              .sort((a, b) => b[1].high - a[1].high)
              .map(([company, risk]) => (
                <div
                  key={company}
                  className="p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm truncate">{company}</span>
                    <span className="text-xs text-muted-foreground">
                      {risk.total} cases
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {risk.high > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {risk.high} High
                      </Badge>
                    )}
                    {risk.medium > 0 && (
                      <Badge className="text-xs bg-amber-500 hover:bg-amber-600">
                        {risk.medium} Med
                      </Badge>
                    )}
                    {risk.low > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {risk.low} Low
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
