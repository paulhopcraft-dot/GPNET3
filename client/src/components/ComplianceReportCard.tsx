import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import {
  Shield,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  FileText,
  Scale,
  RefreshCw,
  Eye,
  ExternalLink,
  Zap
} from "lucide-react";
import { fetchWithCsrf } from "../lib/queryClient";
import { cn } from "@/lib/utils";

interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  isCompliant: boolean;
  lastChecked: string;
  finding?: string;
  recommendation?: string;
  documentReference?: string;
}

interface ComplianceEvaluation {
  caseId: string;
  overallStatus: "compliant" | "minor_issues" | "major_issues" | "critical";
  complianceScore: number;
  totalRules: number;
  compliantRules: number;
  evaluatedAt: string;
  rules: ComplianceRule[];
  summary?: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  nextReviewDate?: string;
}

interface ComplianceReportCardProps {
  caseId: string;
  className?: string;
}

const severityConfig = {
  low: {
    color: "bg-blue-50 text-blue-700 border-blue-200",
    icon: CheckCircle2,
    label: "Low Priority"
  },
  medium: {
    color: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Clock,
    label: "Medium Priority"
  },
  high: {
    color: "bg-orange-50 text-orange-700 border-orange-200",
    icon: AlertTriangle,
    label: "High Priority"
  },
  critical: {
    color: "bg-red-50 text-red-700 border-red-200",
    icon: AlertCircle,
    label: "Critical"
  }
};

const statusConfig = {
  compliant: {
    color: "bg-emerald-500",
    textColor: "text-emerald-700",
    bgColor: "bg-emerald-50",
    label: "Fully Compliant",
    icon: Shield
  },
  minor_issues: {
    color: "bg-amber-500",
    textColor: "text-amber-700",
    bgColor: "bg-amber-50",
    label: "Minor Issues",
    icon: Clock
  },
  major_issues: {
    color: "bg-orange-500",
    textColor: "text-orange-700",
    bgColor: "bg-orange-50",
    label: "Major Issues",
    icon: AlertTriangle
  },
  critical: {
    color: "bg-red-500",
    textColor: "text-red-700",
    bgColor: "bg-red-50",
    label: "Critical Issues",
    icon: AlertCircle
  }
};

export function ComplianceReportCard({ caseId, className }: ComplianceReportCardProps) {
  const [refreshing, setRefreshing] = useState(false);

  const { data: compliance, isLoading, error, refetch } = useQuery<ComplianceEvaluation>({
    queryKey: [`/api/cases/${caseId}/compliance/evaluate`],
    queryFn: async () => {
      const response = await fetchWithCsrf(`/api/cases/${caseId}/compliance/evaluate`);
      if (!response.ok) throw new Error("Failed to evaluate compliance");
      return response.json();
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="space-y-0 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold">WorkSafe Compliance</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Evaluating compliance requirements...</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Analyzing case against WorkSafe Victoria requirements</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-red-50">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold">Compliance Evaluation Failed</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Unable to evaluate compliance requirements</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : "Failed to load compliance data"}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!compliance) return null;

  const status = statusConfig[compliance.overallStatus];
  const StatusIcon = status.icon;

  const criticalRules = compliance.rules.filter(r => !r.isCompliant && r.severity === "critical");
  const highRules = compliance.rules.filter(r => !r.isCompliant && r.severity === "high");
  const mediumRules = compliance.rules.filter(r => !r.isCompliant && r.severity === "medium");
  const lowRules = compliance.rules.filter(r => !r.isCompliant && r.severity === "low");
  const compliantRules = compliance.rules.filter(r => r.isCompliant);

  return (
    <Card className={cn("w-full border-0 shadow-sm", className)}>
      <CardHeader className="space-y-0 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={cn("p-3 rounded-xl", status.bgColor)}>
              <StatusIcon className={cn("h-6 w-6", status.textColor)} />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold tracking-tight">
                WorkSafe Compliance
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Last evaluated: {new Date(compliance.evaluatedAt).toLocaleString()}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Compliance Score and Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-2 border-dashed border-border/40">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-primary">
                  {compliance.complianceScore}%
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  Compliance Score
                </p>
                <Progress
                  value={compliance.complianceScore}
                  className="h-2 mt-2"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-dashed border-border/40">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-primary">
                  {compliance.compliantRules}/{compliance.totalRules}
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  Rules Passed
                </p>
                <Badge
                  className={cn("mt-2", status.color)}
                >
                  {status.label}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-dashed border-border/40">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <TrendingUp className="h-8 w-8 mx-auto text-primary" />
                <p className="text-sm font-medium text-muted-foreground">
                  Risk Level
                </p>
                <Badge
                  variant="outline"
                  className={cn(
                    compliance.riskLevel === "low" && "border-green-300 text-green-700",
                    compliance.riskLevel === "medium" && "border-yellow-300 text-yellow-700",
                    compliance.riskLevel === "high" && "border-orange-300 text-orange-700",
                    compliance.riskLevel === "critical" && "border-red-300 text-red-700"
                  )}
                >
                  {compliance.riskLevel.toUpperCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Alert */}
        {compliance.summary && (
          <Alert className={cn(status.bgColor, "border-l-4", status.color.replace("bg-", "border-"))}>
            <StatusIcon className="h-4 w-4" />
            <AlertTitle>Compliance Summary</AlertTitle>
            <AlertDescription className="mt-2">
              {compliance.summary}
            </AlertDescription>
          </Alert>
        )}

        {/* Detailed Rules Analysis */}
        <Tabs defaultValue="violations" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="violations" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Issues ({compliance.totalRules - compliance.compliantRules})
            </TabsTrigger>
            <TabsTrigger value="compliant" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Compliant ({compliance.compliantRules})
            </TabsTrigger>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Overview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="violations" className="mt-6">
            <ScrollArea className="h-[400px] w-full">
              <div className="space-y-4">
                {/* Critical Issues */}
                {criticalRules.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <h4 className="font-semibold text-red-700">Critical Issues ({criticalRules.length})</h4>
                    </div>
                    {criticalRules.map((rule) => (
                      <Card key={rule.id} className="border-l-4 border-l-red-500 bg-red-50/50">
                        <CardContent className="pt-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <h5 className="font-medium text-red-900">{rule.name}</h5>
                                <p className="text-sm text-red-700">{rule.description}</p>
                              </div>
                              <Badge className={severityConfig[rule.severity].color}>
                                {severityConfig[rule.severity].label}
                              </Badge>
                            </div>
                            {rule.finding && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-red-800">Finding:</p>
                                <p className="text-sm text-red-700 pl-3 border-l-2 border-red-300">
                                  {rule.finding}
                                </p>
                              </div>
                            )}
                            {rule.recommendation && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-red-800 flex items-center gap-2">
                                  <Zap className="h-4 w-4" />
                                  Recommended Action:
                                </p>
                                <p className="text-sm text-red-700 pl-3 border-l-2 border-red-300">
                                  {rule.recommendation}
                                </p>
                              </div>
                            )}
                            {rule.documentReference && (
                              <div className="flex items-center gap-2 text-xs text-red-600">
                                <FileText className="h-3 w-3" />
                                <span>Reference: {rule.documentReference}</span>
                                <ExternalLink className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* High Priority Issues */}
                {highRules.length > 0 && (
                  <div className="space-y-3">
                    <Separator className="my-4" />
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                      <h4 className="font-semibold text-orange-700">High Priority ({highRules.length})</h4>
                    </div>
                    {highRules.map((rule) => (
                      <Card key={rule.id} className="border-l-4 border-l-orange-500 bg-orange-50/50">
                        <CardContent className="pt-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <h5 className="font-medium text-orange-900">{rule.name}</h5>
                                <p className="text-sm text-orange-700">{rule.description}</p>
                              </div>
                              <Badge className={severityConfig[rule.severity].color}>
                                {severityConfig[rule.severity].label}
                              </Badge>
                            </div>
                            {rule.finding && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-orange-800">Finding:</p>
                                <p className="text-sm text-orange-700 pl-3 border-l-2 border-orange-300">
                                  {rule.finding}
                                </p>
                              </div>
                            )}
                            {rule.recommendation && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-orange-800 flex items-center gap-2">
                                  <Zap className="h-4 w-4" />
                                  Recommended Action:
                                </p>
                                <p className="text-sm text-orange-700 pl-3 border-l-2 border-orange-300">
                                  {rule.recommendation}
                                </p>
                              </div>
                            )}
                            {rule.documentReference && (
                              <div className="flex items-center gap-2 text-xs text-orange-600">
                                <FileText className="h-3 w-3" />
                                <span>Reference: {rule.documentReference}</span>
                                <ExternalLink className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Medium Priority Issues */}
                {mediumRules.length > 0 && (
                  <div className="space-y-3">
                    <Separator className="my-4" />
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-amber-600" />
                      <h4 className="font-semibold text-amber-700">Medium Priority ({mediumRules.length})</h4>
                    </div>
                    {mediumRules.map((rule) => (
                      <Card key={rule.id} className="border-l-4 border-l-amber-500 bg-amber-50/50">
                        <CardContent className="pt-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <h5 className="font-medium text-amber-900">{rule.name}</h5>
                                <p className="text-sm text-amber-700">{rule.description}</p>
                              </div>
                              <Badge className={severityConfig[rule.severity].color}>
                                {severityConfig[rule.severity].label}
                              </Badge>
                            </div>
                            {rule.finding && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-amber-800">Finding:</p>
                                <p className="text-sm text-amber-700 pl-3 border-l-2 border-amber-300">
                                  {rule.finding}
                                </p>
                              </div>
                            )}
                            {rule.recommendation && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
                                  <Zap className="h-4 w-4" />
                                  Recommended Action:
                                </p>
                                <p className="text-sm text-amber-700 pl-3 border-l-2 border-amber-300">
                                  {rule.recommendation}
                                </p>
                              </div>
                            )}
                            {rule.documentReference && (
                              <div className="flex items-center gap-2 text-xs text-amber-600">
                                <FileText className="h-3 w-3" />
                                <span>Reference: {rule.documentReference}</span>
                                <ExternalLink className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {compliance.totalRules === compliance.compliantRules && (
                  <div className="text-center py-8 space-y-3">
                    <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
                    <h3 className="text-lg font-semibold text-green-700">No Compliance Issues</h3>
                    <p className="text-sm text-green-600">All WorkSafe requirements are being met.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="compliant" className="mt-6">
            <ScrollArea className="h-[400px] w-full">
              <div className="space-y-3">
                {compliantRules.map((rule) => (
                  <Card key={rule.id} className="border-l-4 border-l-green-500 bg-green-50/50">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <h5 className="font-medium text-green-900">{rule.name}</h5>
                          </div>
                          <p className="text-sm text-green-700">{rule.description}</p>
                          {rule.documentReference && (
                            <div className="flex items-center gap-2 text-xs text-green-600 mt-2">
                              <FileText className="h-3 w-3" />
                              <span>Reference: {rule.documentReference}</span>
                            </div>
                          )}
                        </div>
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          Compliant
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="overview" className="mt-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="text-center p-4">
                  <div className="text-2xl font-bold text-red-600">{criticalRules.length}</div>
                  <div className="text-sm text-muted-foreground">Critical</div>
                </Card>
                <Card className="text-center p-4">
                  <div className="text-2xl font-bold text-orange-600">{highRules.length}</div>
                  <div className="text-sm text-muted-foreground">High</div>
                </Card>
                <Card className="text-center p-4">
                  <div className="text-2xl font-bold text-amber-600">{mediumRules.length}</div>
                  <div className="text-sm text-muted-foreground">Medium</div>
                </Card>
                <Card className="text-center p-4">
                  <div className="text-2xl font-bold text-green-600">{compliantRules.length}</div>
                  <div className="text-sm text-muted-foreground">Compliant</div>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="h-5 w-5" />
                    Compliance Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Array.from(new Set(compliance.rules.map(r => r.category))).map(category => {
                      const categoryRules = compliance.rules.filter(r => r.category === category);
                      const compliantCount = categoryRules.filter(r => r.isCompliant).length;
                      const percentage = (compliantCount / categoryRules.length) * 100;

                      return (
                        <div key={category} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">{category}</span>
                            <span className="text-sm text-muted-foreground">
                              {compliantCount}/{categoryRules.length} ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {compliance.nextReviewDate && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertTitle>Next Review Scheduled</AlertTitle>
                  <AlertDescription>
                    Compliance review scheduled for {new Date(compliance.nextReviewDate).toLocaleDateString()}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}