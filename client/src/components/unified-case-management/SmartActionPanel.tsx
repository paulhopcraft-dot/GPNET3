import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle,
  Target,
  ArrowRight,
  Calendar,
  Phone,
  FileText,
  Heart,
  Briefcase,
  User,
  Activity,
  TrendingUp
} from "lucide-react";
import { WorkerCase } from "@shared/schema";

interface SmartAction {
  id: string;
  title: string;
  description: string;
  urgency: "immediate" | "today" | "this_week" | "routine";
  category: "medical" | "rtw" | "compliance" | "administrative" | "communication";
  impact: "high" | "medium" | "low";
  caseId: string;
  workerName: string;
  estimatedMinutes: number;
  suggestedNextSteps: string[];
  reasoning: string;
}

interface SmartActionPanelProps {
  onActionTaken?: (actionId: string) => void;
}

export function SmartActionPanel({ onActionTaken }: SmartActionPanelProps) {
  const [selectedAction, setSelectedAction] = useState<SmartAction | null>(null);
  const [showActionDialog, setShowActionDialog] = useState(false);

  // Fetch smart actions from API
  const { data: actions, isLoading } = useQuery<SmartAction[]>({
    queryKey: ["smart-actions"],
    queryFn: async () => {
      const response = await fetch("/api/smart-actions");
      if (!response.ok) throw new Error("Failed to fetch smart actions");
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "immediate": return "bg-red-500 text-white";
      case "today": return "bg-orange-500 text-white";
      case "this_week": return "bg-yellow-500 text-black";
      case "routine": return "bg-green-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "medical": return <Heart className="w-4 h-4" />;
      case "rtw": return <Briefcase className="w-4 h-4" />;
      case "compliance": return <FileText className="w-4 h-4" />;
      case "administrative": return <User className="w-4 h-4" />;
      case "communication": return <Phone className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high": return "text-red-600 bg-red-50 border-red-200";
      case "medium": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "low": return "text-green-600 bg-green-50 border-green-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const handleActionClick = (action: SmartAction) => {
    setSelectedAction(action);
    setShowActionDialog(true);
  };

  const handleActionComplete = () => {
    if (selectedAction && onActionTaken) {
      onActionTaken(selectedAction.id);
    }
    setShowActionDialog(false);
    setSelectedAction(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Smart Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!actions || actions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Smart Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="w-4 h-4" />
            <AlertDescription>
              Excellent work! All priority actions are complete. The system will notify you of new recommendations as cases evolve.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Sort actions by urgency and impact
  const sortedActions = [...actions].sort((a, b) => {
    const urgencyOrder = { immediate: 0, today: 1, this_week: 2, routine: 3 };
    const impactOrder = { high: 0, medium: 1, low: 2 };

    const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (urgencyDiff !== 0) return urgencyDiff;

    return impactOrder[a.impact] - impactOrder[b.impact];
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Smart Actions
              <Badge variant="outline" className="ml-2">
                {actions.length} pending
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <TrendingUp className="w-4 h-4" />
              AI-powered recommendations
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedActions.slice(0, 5).map((action) => (
            <Alert
              key={action.id}
              className={`border-l-4 cursor-pointer transition-all hover:shadow-md ${
                action.urgency === "immediate" ? "border-l-red-500 bg-red-50/50" :
                action.urgency === "today" ? "border-l-orange-500 bg-orange-50/50" :
                action.urgency === "this_week" ? "border-l-yellow-500 bg-yellow-50/50" :
                "border-l-blue-500 bg-blue-50/50"
              }`}
              onClick={() => handleActionClick(action)}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full ${
                  action.urgency === "immediate" ? "bg-red-100" :
                  action.urgency === "today" ? "bg-orange-100" :
                  action.urgency === "this_week" ? "bg-yellow-100" :
                  "bg-blue-100"
                }`}>
                  {getCategoryIcon(action.category)}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-sm">{action.title}</h4>
                    <Badge className={getUrgencyColor(action.urgency)}>
                      {action.urgency.replace('_', ' ')}
                    </Badge>
                    <Badge className={getImpactColor(action.impact)}>
                      {action.impact} impact
                    </Badge>
                    <span className="text-xs text-gray-500">
                      ~{action.estimatedMinutes}min
                    </span>
                  </div>

                  <AlertDescription className="text-sm">
                    {action.description}
                  </AlertDescription>

                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <User className="w-3 h-3" />
                    {action.workerName}
                  </div>
                </div>

                <Button size="sm" onClick={(e) => {
                  e.stopPropagation();
                  handleActionClick(action);
                }}>
                  Take Action
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </Alert>
          ))}

          {actions.length > 5 && (
            <div className="text-center pt-2">
              <Button variant="outline">
                View All {actions.length} Actions
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Detail Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAction && getCategoryIcon(selectedAction.category)}
              {selectedAction?.title}
            </DialogTitle>
            <DialogDescription>
              Recommended action for {selectedAction?.workerName}
            </DialogDescription>
          </DialogHeader>

          {selectedAction && (
            <div className="space-y-4">
              {/* Action Summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={getUrgencyColor(selectedAction.urgency)}>
                    {selectedAction.urgency.replace('_', ' ')} priority
                  </Badge>
                  <Badge className={getImpactColor(selectedAction.impact)}>
                    {selectedAction.impact} impact
                  </Badge>
                  <span className="text-sm text-gray-600">
                    Estimated time: {selectedAction.estimatedMinutes} minutes
                  </span>
                </div>
                <p className="text-sm">{selectedAction.description}</p>
              </div>

              {/* AI Reasoning */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Why this action is recommended:</h4>
                <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500">
                  {selectedAction.reasoning}
                </p>
              </div>

              {/* Suggested Next Steps */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Suggested approach:</h4>
                <div className="space-y-2">
                  {selectedAction.suggestedNextSteps.map((step, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                        {index + 1}
                      </span>
                      <span className="text-gray-700">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={handleActionComplete} className="flex-1">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark Complete
                </Button>
                <Button variant="outline" className="flex-1">
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Later
                </Button>
                <Button variant="outline" onClick={() => setShowActionDialog(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}