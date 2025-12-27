import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { RiskLevel } from "@shared/schema";

interface PredictionFactor {
  description: string;
  impact: "positive" | "negative" | "neutral";
  weight: number;
}

interface CasePrediction {
  caseId: string;
  rtwProbability: number;
  expectedWeeksRemaining: number;
  weeksElapsed: number;
  costRisk: "High" | "Medium" | "Low";
  escalationRisk: "High" | "Medium" | "Low";
  factors: PredictionFactor[];
  generatedAt: string;
  // Enriched from API
  workerName?: string;
  company?: string;
  workStatus?: string;
  riskLevel?: RiskLevel;
}

interface PredictionsResponse {
  predictions: CasePrediction[];
  stats: {
    total: number;
    avgRtwProbability: number;
    highRtwProbability: number;
    lowRtwProbability: number;
    highEscalationRisk: number;
    highCostRisk: number;
  };
  generatedAt: string;
}

export default function PredictionsPage() {
  const { data, isLoading, error } = useQuery<PredictionsResponse>({
    queryKey: ["/api/predictions"],
  });

  const predictions = data?.predictions ?? [];
  const stats = data?.stats ?? {
    avgRtwProbability: 0,
    highRtwProbability: 0,
    lowRtwProbability: 0,
    highEscalationRisk: 0,
  };

  const riskColor = (risk: string) => {
    switch (risk) {
      case "High":
        return "bg-red-100 text-red-800";
      case "Medium":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-emerald-100 text-emerald-800";
    }
  };

  const impactIcon = (impact: "positive" | "negative" | "neutral") => {
    switch (impact) {
      case "positive":
        return "arrow_upward";
      case "negative":
        return "arrow_downward";
      default:
        return "remove";
    }
  };

  const impactColor = (impact: "positive" | "negative" | "neutral") => {
    switch (impact) {
      case "positive":
        return "text-emerald-600";
      case "negative":
        return "text-red-600";
      default:
        return "text-gray-500";
    }
  };

  if (isLoading) {
    return (
      <PageLayout title="ML Predictions" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">
            progress_activity
          </span>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="ML Predictions" subtitle="Error loading predictions">
        <Card>
          <CardContent className="py-12 text-center">
            <span className="material-symbols-outlined text-4xl text-red-500 mb-4">error</span>
            <p className="text-muted-foreground">Failed to load predictions. Please try again.</p>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="ML Predictions" subtitle="AI-powered case outcome predictions">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg RTW Probability
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgRtwProbability}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                High RTW Likelihood
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{stats.highRtwProbability}</div>
              <p className="text-xs text-muted-foreground">70%+ probability</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Low RTW Likelihood
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.lowRtwProbability}</div>
              <p className="text-xs text-muted-foreground">&lt;50% probability</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                High Escalation Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.highEscalationRisk}</div>
            </CardContent>
          </Card>
        </div>

        {/* Predictions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {predictions.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <span className="material-symbols-outlined text-4xl text-muted-foreground mb-4">
                  analytics
                </span>
                <p className="text-muted-foreground">No cases available for predictions.</p>
              </CardContent>
            </Card>
          ) : (
            predictions
              .sort((a, b) => a.rtwProbability - b.rtwProbability)
              .slice(0, 10)
              .map((prediction) => (
                <Card key={prediction.caseId}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{prediction.workerName}</CardTitle>
                        <CardDescription>{prediction.company}</CardDescription>
                      </div>
                      <Badge className={riskColor(prediction.riskLevel || "Medium")}>
                        {prediction.riskLevel} Risk
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">RTW Probability</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="font-medium cursor-help flex items-center gap-1">
                                {prediction.rtwProbability}%
                                <span className="material-symbols-outlined text-xs text-muted-foreground">info</span>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="font-medium mb-2">Contributing Factors:</p>
                              <ul className="space-y-1 text-xs">
                                {prediction.factors.slice(0, 5).map((factor, i) => (
                                  <li key={i} className="flex items-center gap-1">
                                    <span className={`material-symbols-outlined text-xs ${impactColor(factor.impact)}`}>
                                      {impactIcon(factor.impact)}
                                    </span>
                                    {factor.description}
                                  </li>
                                ))}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Progress
                        value={prediction.rtwProbability}
                        className={`h-2 ${
                          prediction.rtwProbability >= 70
                            ? "[&>div]:bg-emerald-500"
                            : prediction.rtwProbability >= 50
                              ? "[&>div]:bg-amber-500"
                              : "[&>div]:bg-red-500"
                        }`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Weeks Elapsed</span>
                        <p className="font-medium">{prediction.weeksElapsed} weeks</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Est. Weeks to RTW</span>
                        <p className="font-medium">{prediction.expectedWeeksRemaining} weeks</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Badge variant="outline" className={riskColor(prediction.costRisk)}>
                        Cost: {prediction.costRisk}
                      </Badge>
                      <Badge variant="outline" className={riskColor(prediction.escalationRisk)}>
                        Escalation: {prediction.escalationRisk}
                      </Badge>
                    </div>

                    <div className="pt-2 border-t">
                      <Link to={`/summary/${prediction.caseId}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          <span className="material-symbols-outlined text-sm mr-2">open_in_new</span>
                          View Case Details
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </div>

        {/* Model Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">smart_toy</span>
              About These Predictions
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Predictions are generated using a rule-based scoring engine that evaluates multiple
              case factors. Each prediction is fully explainable - hover over the probability
              score to see contributing factors.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Current work status</li>
              <li>Case risk level</li>
              <li>Time since injury</li>
              <li>Clinical evidence and treatment plans</li>
              <li>Recovery progress indicators</li>
            </ul>
            <p className="mt-4 text-xs">
              Note: These predictions are advisory only (PRD-9 compliant) and should be used
              alongside professional judgment.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
