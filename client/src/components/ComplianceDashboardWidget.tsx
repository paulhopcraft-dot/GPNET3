import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Alert, AlertDescription } from "./ui/alert";
import { Skeleton } from "./ui/skeleton";
import {
  Shield,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Building2,
  Clock,
  CheckCircle2,
  FileText
} from "lucide-react";
import { fetchWithCsrf } from "../lib/queryClient";
import { cn } from "@/lib/utils";

interface ComplianceSummary {
  totalCases: number;
  evaluatedCases: number;
  overallComplianceRate: number;
  statusDistribution: {
    compliant: number;
    minor_issues: number;
    major_issues: number;
    critical: number;
  };
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  trendData: {
    previousRate: number;
    isImproving: boolean;
    changePercentage: number;
  };
  topIssues: Array<{
    ruleName: string;
    violationCount: number;
    severity: "low" | "medium" | "high" | "critical";
  }>;
  lastUpdated: string;
}

interface ComplianceDashboardWidgetProps {
  className?: string;
}

const statusConfig = {
  compliant: { color: "bg-emerald-500", label: "Compliant" },
  minor_issues: { color: "bg-amber-500", label: "Minor Issues" },
  major_issues: { color: "bg-orange-500", label: "Major Issues" },
  critical: { color: "bg-red-500", label: "Critical Issues" }
};

export function ComplianceDashboardWidget({ className }: ComplianceDashboardWidgetProps) {
  const { data: summary, isLoading, error } = useQuery<ComplianceSummary>({
    queryKey: ['/api/compliance/dashboard/summary'],
    queryFn: async () => {
      const response = await fetchWithCsrf('/api/compliance/dashboard/summary');
      if (!response.ok) throw new Error('Failed to fetch compliance summary');
      return response.json();
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  if (isLoading) {
    return (
      <Card className={cn("col-span-2", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">WorkSafe Compliance</CardTitle>
                <p className="text-sm text-muted-foreground">Organization-wide compliance status</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-6" />
          <div className="space-y-2">
            <Skeleton className="h-4" />
            <Skeleton className="h-4" />
            <Skeleton className="h-4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("col-span-2", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-red-50">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Compliance Dashboard</CardTitle>
              <p className="text-sm text-muted-foreground">Unable to load compliance data</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load compliance summary. Please check your connection and try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  const criticalCases = summary.statusDistribution.critical;
  const majorIssueCases = summary.statusDistribution.major_issues;
  const totalIssues = criticalCases + majorIssueCases + summary.statusDistribution.minor_issues;

  return (
    <Card className={cn("col-span-2", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold tracking-tight">
                WorkSafe Compliance
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Organization compliance overview • Updated {new Date(summary.lastUpdated).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {summary.trendData.isImproving ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
            <span className={cn(
              "text-sm font-medium",
              summary.trendData.isImproving ? "text-green-600" : "text-red-600"
            )}>
              {summary.trendData.changePercentage > 0 ? "+" : ""}{summary.trendData.changePercentage.toFixed(1)}%
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="text-2xl font-bold text-primary">
              {summary.overallComplianceRate.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">
              Overall Compliance
            </div>
            <Progress value={summary.overallComplianceRate} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="text-2xl font-bold text-foreground">
              {summary.evaluatedCases}
            </div>
            <div className="text-sm text-muted-foreground">
              Cases Evaluated
            </div>
            <div className="text-xs text-muted-foreground">
              of {summary.totalCases} total cases
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-2xl font-bold text-red-600">
              {criticalCases + majorIssueCases}
            </div>
            <div className="text-sm text-muted-foreground">
              Priority Issues
            </div>
            <div className="text-xs text-muted-foreground">
              {criticalCases} critical, {majorIssueCases} high
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-2xl font-bold text-green-600">
              {summary.statusDistribution.compliant}
            </div>
            <div className="text-sm text-muted-foreground">
              Fully Compliant
            </div>
            <div className="text-xs text-muted-foreground">
              No issues found
            </div>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Compliance Status Distribution
          </h4>
          <div className="space-y-2">
            {Object.entries(summary.statusDistribution).map(([status, count]) => {
              const config = statusConfig[status as keyof typeof statusConfig];
              const percentage = (count / summary.evaluatedCases) * 100;

              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-sm", config.color)} />
                    <span className="text-sm font-medium">{config.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24">
                      <Progress value={percentage} className="h-1.5" />
                    </div>
                    <div className="text-sm text-muted-foreground w-12 text-right">
                      {count}
                    </div>
                    <div className="text-xs text-muted-foreground w-10 text-right">
                      ({percentage.toFixed(0)}%)
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Alerts */}
        {(criticalCases > 0 || majorIssueCases > 0) && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Action Required:</strong> {criticalCases + majorIssueCases} cases require immediate attention.
              {criticalCases > 0 && ` ${criticalCases} cases have critical compliance issues.`}
              {majorIssueCases > 0 && ` ${majorIssueCases} cases have high-priority issues.`}
            </AlertDescription>
          </Alert>
        )}

        {/* Top Issues */}
        {summary.topIssues.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Most Common Issues
            </h4>
            <div className="space-y-2">
              {summary.topIssues.slice(0, 3).map((issue, index) => (
                <div key={issue.ruleName} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium text-muted-foreground">
                      #{index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium truncate">{issue.ruleName}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        issue.severity === "critical" && "border-red-300 text-red-700",
                        issue.severity === "high" && "border-orange-300 text-orange-700",
                        issue.severity === "medium" && "border-amber-300 text-amber-700",
                        issue.severity === "low" && "border-blue-300 text-blue-700"
                      )}
                    >
                      {issue.severity}
                    </Badge>
                    <span className="text-sm font-medium text-muted-foreground">
                      {issue.violationCount} cases
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Perfect Compliance Message */}
        {totalIssues === 0 && summary.evaluatedCases > 0 && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Excellent!</strong> All evaluated cases are fully compliant with WorkSafe Victoria requirements.
            </AlertDescription>
          </Alert>
        )}

        {/* Trend Indicator */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="text-xs text-muted-foreground">
            Previous compliance rate: {summary.trendData.previousRate.toFixed(1)}%
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Auto-refreshes every 5 minutes
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}