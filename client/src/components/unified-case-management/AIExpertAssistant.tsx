import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Brain,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  Zap,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  Activity,
  BarChart3,
  Calendar,
  FileText,
  Heart,
  Briefcase,
  User,
  Eye
} from "lucide-react";
import { WorkerCase } from "@shared/schema";

interface AIInsight {
  id: string;
  type: "prediction" | "pattern" | "recommendation" | "alert" | "opportunity";
  title: string;
  description: string;
  reasoning: string;
  confidence: number;
  evidence: string[];
  suggestedActions: AIAction[];
  urgency: "low" | "medium" | "high" | "critical";
  category: "medical" | "rtw" | "compliance" | "financial" | "predictive";
  caseIds?: string[];
  createdAt: string;
  isRead: boolean;
  userFeedback?: "helpful" | "not_helpful";
}

interface AIAction {
  label: string;
  description: string;
  estimatedImpact: string;
  action: () => void;
}

interface ExpertAnalysis {
  caseId: string;
  workerName: string;
  riskFactors: RiskFactor[];
  predictions: Prediction[];
  recommendations: ExpertRecommendation[];
  similarCases: SimilarCase[];
  expertNote: string;
}

interface RiskFactor {
  factor: string;
  severity: "low" | "medium" | "high";
  explanation: string;
  mitigation: string;
}

interface Prediction {
  outcome: string;
  probability: number;
  timeframe: string;
  factors: string[];
}

interface ExpertRecommendation {
  action: string;
  rationale: string;
  priority: number;
  evidence: string;
}

interface SimilarCase {
  caseId: string;
  workerName: string;
  similarity: number;
  outcome: string;
  keyLearnings: string;
}

interface AIExpertAssistantProps {
  workerCase?: WorkerCase;
  mode?: "workspace" | "case-specific";
}

export function AIExpertAssistant({ workerCase, mode = "workspace" }: AIExpertAssistantProps) {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  // Fetch AI insights and recommendations
  const { data: aiInsights, isLoading } = useQuery<AIInsight[]>({
    queryKey: ["ai-insights", mode, workerCase?.id],
    queryFn: async () => {
      const endpoint = mode === "case-specific" && workerCase
        ? `/api/ai/insights/case/${workerCase.id}`
        : "/api/ai/insights/workspace";

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error("Failed to fetch AI insights");
      return response.json();
    },
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  });

  // Generate expert analysis for specific case
  const expertAnalysisMutation = useMutation({
    mutationFn: async (caseId: string) => {
      setIsThinking(true);
      const response = await fetch(`/api/ai/expert-analysis/${caseId}`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to generate analysis");
      return response.json();
    },
    onSuccess: () => {
      setIsThinking(false);
      setShowDetailedAnalysis(true);
    },
    onError: () => {
      setIsThinking(false);
    }
  });

  // Provide feedback on AI recommendations
  const feedbackMutation = useMutation({
    mutationFn: async ({ insightId, feedback }: { insightId: string; feedback: "helpful" | "not_helpful" }) => {
      const response = await fetch(`/api/ai/insights/${insightId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback }),
      });
      if (!response.ok) throw new Error("Failed to submit feedback");
      return response.json();
    },
    onSuccess: (_, { insightId, feedback }) => {
      setInsights(prev => prev.map(insight =>
        insight.id === insightId ? { ...insight, userFeedback: feedback } : insight
      ));
    }
  });

  useEffect(() => {
    if (aiInsights) {
      setInsights(aiInsights);
    }
  }, [aiInsights]);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "prediction": return <Brain className="w-5 h-5 text-purple-600" />;
      case "pattern": return <BarChart3 className="w-5 h-5 text-blue-600" />;
      case "recommendation": return <Lightbulb className="w-5 h-5 text-yellow-600" />;
      case "alert": return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case "opportunity": return <Target className="w-5 h-5 text-green-600" />;
      default: return <Brain className="w-5 h-5 text-gray-600" />;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical": return "border-red-500 bg-red-50";
      case "high": return "border-orange-500 bg-orange-50";
      case "medium": return "border-yellow-500 bg-yellow-50";
      case "low": return "border-blue-500 bg-blue-50";
      default: return "border-gray-500 bg-gray-50";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return "text-green-600 bg-green-50";
    if (confidence >= 70) return "text-blue-600 bg-blue-50";
    if (confidence >= 50) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const handleInsightClick = (insight: AIInsight) => {
    setSelectedInsight(insight);
    // Mark as read
    setInsights(prev => prev.map(i =>
      i.id === insight.id ? { ...i, isRead: true } : i
    ));
  };

  const handleFeedback = (insightId: string, feedback: "helpful" | "not_helpful") => {
    feedbackMutation.mutate({ insightId, feedback });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            AI Expert Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-purple-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="border-2 border-purple-200">
                <AvatarImage src="/ai-assistant-avatar.png" alt="AI Assistant" />
                <AvatarFallback className="bg-purple-100 text-purple-700">
                  <Brain className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="flex items-center gap-2">
                  AI Expert Assistant
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    Active
                  </Badge>
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Analyzing patterns and providing expert guidance
                </p>
              </div>
            </div>

            {mode === "case-specific" && workerCase && (
              <Button
                onClick={() => expertAnalysisMutation.mutate(workerCase.id)}
                disabled={isThinking}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isThinking ? (
                  <>
                    <Activity className="w-4 h-4 mr-2 animate-pulse" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Deep Analysis
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {insights.length === 0 ? (
            <Alert className="bg-purple-50 border-purple-200">
              <Brain className="w-4 h-4" />
              <AlertDescription>
                I'm analyzing your cases and patterns. Check back in a few minutes for intelligent insights and recommendations.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {insights.slice(0, mode === "case-specific" ? 5 : 3).map((insight) => (
                <Alert
                  key={insight.id}
                  className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${getUrgencyColor(insight.urgency)} ${
                    !insight.isRead ? "ring-2 ring-purple-200" : ""
                  }`}
                  onClick={() => handleInsightClick(insight)}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-white shadow-sm">
                      {getInsightIcon(insight.type)}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-semibold text-sm">{insight.title}</h4>
                          <AlertDescription className="text-sm">
                            {insight.description}
                          </AlertDescription>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${getConfidenceColor(insight.confidence)}`}>
                            {insight.confidence}% confident
                          </Badge>
                          {!insight.isRead && (
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="capitalize">{insight.type}</span>
                        <span>•</span>
                        <span className="capitalize">{insight.category}</span>
                        <span>•</span>
                        <span>{new Date(insight.createdAt).toLocaleTimeString()}</span>
                      </div>

                      {insight.suggestedActions.length > 0 && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              insight.suggestedActions[0].action();
                            }}
                          >
                            {insight.suggestedActions[0].label}
                            <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      )}

                      {/* Feedback buttons for read insights */}
                      {insight.isRead && !insight.userFeedback && (
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <span className="text-xs text-gray-500">Was this helpful?</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFeedback(insight.id, "helpful");
                            }}
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFeedback(insight.id, "not_helpful");
                            }}
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </Button>
                        </div>
                      )}

                      {insight.userFeedback && (
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <span className="text-xs text-gray-500">
                            Thank you for your feedback! I'm learning to serve you better.
                          </span>
                          {insight.userFeedback === "helpful" ? (
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-3 h-3 text-orange-600" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Alert>
              ))}

              {insights.length > (mode === "case-specific" ? 5 : 3) && (
                <Button variant="outline" className="w-full">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  View All {insights.length} Insights
                </Button>
              )}
            </div>
          )}

          {/* Quick Expert Actions */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-600" />
              Expert Actions Available
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost" size="sm" className="justify-start h-8">
                <BarChart3 className="w-3 h-3 mr-2" />
                Portfolio Analysis
              </Button>
              <Button variant="ghost" size="sm" className="justify-start h-8">
                <TrendingUp className="w-3 h-3 mr-2" />
                Trend Prediction
              </Button>
              <Button variant="ghost" size="sm" className="justify-start h-8">
                <Target className="w-3 h-3 mr-2" />
                Risk Assessment
              </Button>
              <Button variant="ghost" size="sm" className="justify-start h-8">
                <Calendar className="w-3 h-3 mr-2" />
                Plan Optimization
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Insight Dialog */}
      {selectedInsight && (
        <Dialog open={!!selectedInsight} onOpenChange={() => setSelectedInsight(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getInsightIcon(selectedInsight.type)}
                {selectedInsight.title}
              </DialogTitle>
              <DialogDescription>
                Expert AI analysis with {selectedInsight.confidence}% confidence
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Main Description */}
              <div className="space-y-2">
                <h4 className="font-semibold">Analysis</h4>
                <p className="text-sm text-gray-700">{selectedInsight.description}</p>
              </div>

              {/* Expert Reasoning */}
              <div className="bg-purple-50 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-sm text-purple-800">Expert Reasoning</h4>
                <p className="text-sm text-purple-700">{selectedInsight.reasoning}</p>
              </div>

              {/* Supporting Evidence */}
              {selectedInsight.evidence.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Supporting Evidence</h4>
                  <ul className="space-y-1">
                    {selectedInsight.evidence.map((evidence, index) => (
                      <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                        <CheckCircle2 className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                        {evidence}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggested Actions */}
              {selectedInsight.suggestedActions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold">Recommended Actions</h4>
                  {selectedInsight.suggestedActions.map((action, index) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h5 className="font-medium text-sm">{action.label}</h5>
                          <p className="text-xs text-gray-600 mt-1">{action.description}</p>
                        </div>
                        <Button size="sm" onClick={action.action}>
                          Execute
                        </Button>
                      </div>
                      <div className="text-xs text-green-600 font-medium">
                        Expected impact: {action.estimatedImpact}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}