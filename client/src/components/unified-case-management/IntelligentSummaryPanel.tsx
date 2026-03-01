import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Activity,
  BarChart3,
  Users,
  DollarSign,
  Calendar,
  Heart,
  Briefcase,
  Shield,
  Award,
  ArrowUp,
  ArrowDown,
  Eye
} from "lucide-react";

interface IntelligentSummary {
  aiAnalysis: {
    portfolioHealth: number;
    trendDirection: "improving" | "stable" | "declining";
    keyInsights: string[];
    predictedOutcomes: Prediction[];
    optimizationOpportunities: Opportunity[];
  };
  performanceMetrics: {
    rtwSuccessRate: number;
    averageRTWDays: number;
    costSavings: number;
    complianceScore: number;
    earlyInterventionRate: number;
  };
  aiActions: {
    automatedTasks: number;
    recommendationsAccepted: number;
    interventionsPrevented: number;
    timesSaved: number;
  };
  comparisons: {
    industryBenchmark: number;
    previousPeriod: number;
    bestPracticeAlignment: number;
  };
}

interface Prediction {
  outcome: string;
  probability: number;
  timeframe: string;
  impact: "high" | "medium" | "low";
  recommendation: string;
}

interface Opportunity {
  area: string;
  potentialImprovement: string;
  estimatedSavings: string;
  effort: "low" | "medium" | "high";
  priority: number;
}

interface IntelligentSummaryPanelProps {
  showDetailed?: boolean;
}

export function IntelligentSummaryPanel({ showDetailed = false }: IntelligentSummaryPanelProps) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch intelligent summary data
  const { data: summary, isLoading } = useQuery<IntelligentSummary>({
    queryKey: ["intelligent-summary"],
    queryFn: async () => {
      const response = await fetch("/api/ai/intelligent-summary");
      if (!response.ok) throw new Error("Failed to fetch intelligent summary");
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  // Simulate AI analysis animation
  useEffect(() => {
    if (summary) {
      setIsAnalyzing(true);
      const timer = setTimeout(() => setIsAnalyzing(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [summary]);

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case "improving": return <TrendingUp className="w-4 h-4 text-green-600" />;
      case "declining": return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-blue-600" />;
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case "improving": return "text-green-600 bg-green-50";
      case "declining": return "text-red-600 bg-red-50";
      default: return "text-blue-600 bg-blue-50";
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority <= 2) return "bg-red-100 text-red-800";
    if (priority <= 4) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600 animate-pulse" />
            AI Intelligence Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <Card className="border-purple-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Brain className={`w-6 h-6 text-purple-600 ${isAnalyzing ? 'animate-pulse' : ''}`} />
              {isAnalyzing && (
                <div className="absolute -inset-1 rounded-full border-2 border-purple-600 border-t-transparent animate-spin"></div>
              )}
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                AI Intelligence Summary
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  Real-time
                </Badge>
              </CardTitle>
              <p className="text-sm text-gray-600">
                Continuous analysis and optimization of your case portfolio
              </p>
            </div>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${getTrendColor(summary.aiAnalysis.trendDirection)}`}>
                {getTrendIcon(summary.aiAnalysis.trendDirection)}
                <span className="font-semibold text-sm">
                  {summary.aiAnalysis.portfolioHealth}/100
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Portfolio health is {summary.aiAnalysis.trendDirection}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Key Performance Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <div className="flex items-center justify-between">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  <ArrowUp className="w-3 h-3 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {summary.performanceMetrics.rtwSuccessRate}%
                </p>
                <p className="text-xs text-gray-600">RTW Success Rate</p>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Above industry average of {summary.comparisons.industryBenchmark}%</p>
            </TooltipContent>
          </Tooltip>

          <div className="p-3 border rounded-lg">
            <div className="flex items-center justify-between">
              <Clock className="w-4 h-4 text-orange-600" />
              <ArrowDown className="w-3 h-3 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-orange-600">
              {summary.performanceMetrics.averageRTWDays}
            </p>
            <p className="text-xs text-gray-600">Avg RTW Days</p>
          </div>

          <div className="p-3 border rounded-lg">
            <div className="flex items-center justify-between">
              <DollarSign className="w-4 h-4 text-green-600" />
              <ArrowUp className="w-3 h-3 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">
              ${(summary.performanceMetrics.costSavings / 1000).toFixed(0)}K
            </p>
            <p className="text-xs text-gray-600">Cost Savings</p>
          </div>

          <div className="p-3 border rounded-lg">
            <div className="flex items-center justify-between">
              <Shield className="w-4 h-4 text-purple-600" />
              <CheckCircle2 className="w-3 h-3 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {summary.performanceMetrics.complianceScore}%
            </p>
            <p className="text-xs text-gray-600">Compliance</p>
          </div>
        </div>

        {/* AI Actions Impact */}
        <div className="bg-purple-50 rounded-lg p-4 space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-600" />
            AI Impact This Week
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Tasks Automated:</span>
              <span className="font-medium">{summary.aiActions.automatedTasks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Time Saved:</span>
              <span className="font-medium">{summary.aiActions.timesSaved}hrs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Recommendations Taken:</span>
              <span className="font-medium">{summary.aiActions.recommendationsAccepted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Issues Prevented:</span>
              <span className="font-medium">{summary.aiActions.interventionsPrevented}</span>
            </div>
          </div>
        </div>

        {/* Key AI Insights */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-600" />
            Key AI Insights
          </h4>
          <div className="space-y-2">
            {summary.aiAnalysis.keyInsights.map((insight, index) => (
              <Alert key={index} className="bg-blue-50 border-blue-200">
                <BarChart3 className="w-4 h-4" />
                <AlertDescription className="text-sm">{insight}</AlertDescription>
              </Alert>
            ))}
          </div>
        </div>

        {/* Predictive Analysis */}
        {summary.aiAnalysis.predictedOutcomes.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Eye className="w-4 h-4 text-green-600" />
              Predictions & Recommendations
            </h4>
            <div className="space-y-2">
              {summary.aiAnalysis.predictedOutcomes.slice(0, 2).map((prediction, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-sm">{prediction.outcome}</h5>
                    <div className="flex items-center gap-2">
                      <Badge className={getImpactColor(prediction.impact)}>
                        {prediction.impact} impact
                      </Badge>
                      <span className="text-sm font-medium text-gray-600">
                        {prediction.probability}% likely
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">{prediction.recommendation}</p>
                  <div className="text-xs text-gray-500">Timeframe: {prediction.timeframe}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Optimization Opportunities */}
        {summary.aiAnalysis.optimizationOpportunities.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-600" />
              Optimization Opportunities
            </h4>
            <div className="space-y-2">
              {summary.aiAnalysis.optimizationOpportunities.slice(0, 3).map((opportunity, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-sm">{opportunity.area}</h5>
                    <Badge className={getPriorityColor(opportunity.priority)}>
                      Priority {opportunity.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{opportunity.potentialImprovement}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-green-600 font-medium">
                      Potential: {opportunity.estimatedSavings}
                    </span>
                    <span className="text-gray-500">
                      Effort: {opportunity.effort}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-4 border-t">
          <Button className="w-full bg-purple-600 hover:bg-purple-700">
            <Brain className="w-4 h-4 mr-2" />
            Get Detailed AI Analysis
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}