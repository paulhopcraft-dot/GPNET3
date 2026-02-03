import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  ArrowRight,
  Calendar,
  FileText,
  Heart,
  Briefcase,
  Activity,
  Bell,
  X,
  Eye,
  ThumbsUp,
  Users,
  BarChart3
} from "lucide-react";
import { WorkerCase } from "@shared/schema";

interface ProactiveGuidance {
  id: string;
  type: "suggestion" | "warning" | "opportunity" | "insight" | "learning";
  title: string;
  message: string;
  reasoning: string;
  confidence: number;
  urgency: "low" | "medium" | "high" | "critical";
  category: "efficiency" | "risk_mitigation" | "compliance" | "best_practice" | "learning";
  triggerContext: string;
  actions?: GuidanceAction[];
  learnMore?: string;
  dismissable: boolean;
  showOnce?: boolean;
  expiresAt?: string;
  metadata?: {
    caseIds?: string[];
    patterns?: string[];
    statistics?: Record<string, number>;
  };
}

interface GuidanceAction {
  label: string;
  description: string;
  action: () => void;
  icon: React.ReactNode;
  estimatedTime?: number;
}

interface UserBehaviorPattern {
  action: string;
  frequency: number;
  timeOfDay: number;
  dayOfWeek: number;
  context: Record<string, any>;
  outcomes: string[];
}

interface ProactiveGuidanceSystemProps {
  currentCase?: WorkerCase;
  userBehavior?: UserBehaviorPattern[];
  onGuidanceInteraction?: (guidanceId: string, action: string) => void;
}

export function ProactiveGuidanceSystem({
  currentCase,
  userBehavior = [],
  onGuidanceInteraction
}: ProactiveGuidanceSystemProps) {
  const location = useLocation();
  const [activeGuidances, setActiveGuidances] = useState<ProactiveGuidance[]>([]);
  const [dismissedGuidances, setDismissedGuidances] = useState<Set<string>>(new Set());
  const [userContext, setUserContext] = useState({
    currentPage: location.pathname,
    timeOnPage: 0,
    actionsPerformed: 0,
    lastActionTime: Date.now()
  });

  // Track user behavior and time on page
  useEffect(() => {
    const startTime = Date.now();
    let actionCount = 0;

    const trackActivity = () => {
      actionCount++;
      setUserContext(prev => ({
        ...prev,
        actionsPerformed: actionCount,
        lastActionTime: Date.now()
      }));
    };

    const trackTime = setInterval(() => {
      setUserContext(prev => ({
        ...prev,
        timeOnPage: Math.floor((Date.now() - startTime) / 1000)
      }));
    }, 1000);

    // Listen for user interactions
    document.addEventListener('click', trackActivity);
    document.addEventListener('keydown', trackActivity);

    return () => {
      clearInterval(trackTime);
      document.removeEventListener('click', trackActivity);
      document.removeEventListener('keydown', trackActivity);
    };
  }, [location.pathname]);

  // Fetch contextual guidances
  const { data: guidances } = useQuery<ProactiveGuidance[]>({
    queryKey: ["proactive-guidance", location.pathname, currentCase?.id, userContext],
    queryFn: async () => {
      const response = await fetch("/api/ai/proactive-guidance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: {
            currentPage: location.pathname,
            currentCase,
            userContext,
            timeOfDay: new Date().getHours(),
            dayOfWeek: new Date().getDay()
          }
        })
      });

      if (!response.ok) throw new Error("Failed to fetch guidance");
      return response.json();
    },
    refetchInterval: 30000, // Check for new guidance every 30 seconds
    enabled: true
  });

  // Process and filter guidances based on user behavior and context
  useEffect(() => {
    if (!guidances) return;

    const relevantGuidances = guidances.filter(guidance => {
      // Don't show dismissed guidances
      if (dismissedGuidances.has(guidance.id)) return false;

      // Check if guidance has expired
      if (guidance.expiresAt && new Date(guidance.expiresAt) < new Date()) return false;

      // Context-based filtering
      const isRelevantToCurrentContext = () => {
        // Show case-specific guidance only when viewing a case
        if (guidance.metadata?.caseIds && !currentCase) return false;

        // Show workspace guidance when on workspace pages
        if (guidance.triggerContext.includes("workspace") && !location.pathname.includes("workspace")) {
          return false;
        }

        return true;
      };

      return isRelevantToCurrentContext();
    });

    setActiveGuidances(relevantGuidances);
  }, [guidances, dismissedGuidances, location.pathname, currentCase]);

  const handleGuidanceAction = useCallback((guidance: ProactiveGuidance, action: GuidanceAction) => {
    action.action();
    onGuidanceInteraction?.(guidance.id, `action:${action.label}`);

    // Mark guidance as interacted with
    setDismissedGuidances(prev => new Set([...prev, guidance.id]));
  }, [onGuidanceInteraction]);

  const dismissGuidance = useCallback((guidanceId: string) => {
    setDismissedGuidances(prev => new Set([...prev, guidanceId]));
    onGuidanceInteraction?.(guidanceId, "dismissed");
  }, [onGuidanceInteraction]);

  const getGuidanceIcon = (type: string) => {
    switch (type) {
      case "suggestion": return <Lightbulb className="w-5 h-5 text-yellow-600" />;
      case "warning": return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case "opportunity": return <Target className="w-5 h-5 text-green-600" />;
      case "insight": return <Brain className="w-5 h-5 text-purple-600" />;
      case "learning": return <BarChart3 className="w-5 h-5 text-blue-600" />;
      default: return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical": return "border-red-500 bg-red-50";
      case "high": return "border-orange-500 bg-orange-50";
      case "medium": return "border-yellow-500 bg-yellow-50";
      case "low": return "border-blue-500 bg-blue-50";
      default: return "border-gray-300 bg-gray-50";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "efficiency": return "bg-blue-100 text-blue-800";
      case "risk_mitigation": return "bg-red-100 text-red-800";
      case "compliance": return "bg-purple-100 text-purple-800";
      case "best_practice": return "bg-green-100 text-green-800";
      case "learning": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Don't render if no active guidances
  if (activeGuidances.length === 0) return null;

  return (
    <div className="fixed top-20 right-6 z-40 max-w-sm space-y-3">
      {activeGuidances.slice(0, 3).map((guidance, index) => (
        <Alert
          key={guidance.id}
          className={`shadow-lg border-l-4 transition-all duration-500 ${getUrgencyColor(guidance.urgency)}`}
          style={{
            animation: `slideInRight 0.5s ease-out ${index * 0.1}s both`
          }}
        >
          <div className="flex items-start gap-3">
            <div className="p-1 rounded-full bg-white shadow-sm">
              {getGuidanceIcon(guidance.type)}
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm">{guidance.title}</h4>
                    <Badge className={`text-xs ${getCategoryColor(guidance.category)}`}>
                      {guidance.category.replace('_', ' ')}
                    </Badge>
                  </div>
                  <AlertDescription className="text-sm leading-relaxed">
                    {guidance.message}
                  </AlertDescription>
                </div>

                {guidance.dismissable && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dismissGuidance(guidance.id)}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>

              {/* Confidence Indicator */}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Brain className="w-3 h-3" />
                <span>{guidance.confidence}% confidence</span>
                <span>•</span>
                <span className="capitalize">{guidance.type}</span>
              </div>

              {/* Expert Reasoning */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-blue-600">
                    <Eye className="w-3 h-3 mr-1" />
                    Why this matters
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <p className="text-sm">{guidance.reasoning}</p>
                </TooltipContent>
              </Tooltip>

              {/* Actions */}
              {guidance.actions && guidance.actions.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  {guidance.actions.slice(0, 2).map((action, actionIndex) => (
                    <Button
                      key={actionIndex}
                      size="sm"
                      onClick={() => handleGuidanceAction(guidance, action)}
                      className="text-xs flex items-center gap-1"
                    >
                      {action.icon}
                      {action.label}
                      {action.estimatedTime && (
                        <span className="text-xs opacity-75">
                          ({action.estimatedTime}m)
                        </span>
                      )}
                    </Button>
                  ))}
                </div>
              )}

              {/* Statistics/Patterns */}
              {guidance.metadata?.statistics && (
                <div className="bg-white rounded p-2 text-xs border">
                  {Object.entries(guidance.metadata.statistics).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-600">{key}:</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Alert>
      ))}

      {/* More guidances indicator */}
      {activeGuidances.length > 3 && (
        <Alert className="shadow-lg bg-gray-100 border-gray-300">
          <Bell className="w-4 h-4" />
          <AlertDescription className="text-sm">
            {activeGuidances.length - 3} more insights available
          </AlertDescription>
          <Button size="sm" variant="outline" className="ml-2">
            View All
          </Button>
        </Alert>
      )}

      {/* Feedback prompt for high-confidence guidances */}
      {activeGuidances.some(g => g.confidence > 90) && (
        <div className="text-center">
          <Button variant="ghost" size="sm" className="text-xs text-gray-500">
            <ThumbsUp className="w-3 h-3 mr-1" />
            Helpful guidance? Let us know
          </Button>
        </div>
      )}

      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}