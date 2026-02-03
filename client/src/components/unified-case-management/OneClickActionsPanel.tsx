import React, { useState } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Phone,
  Mail,
  FileText,
  Calendar,
  Camera,
  Mic,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  Briefcase,
  Heart,
  Upload,
  Download,
  PrinterIcon,
  Send,
  Zap,
  Target,
  Activity
} from "lucide-react";
import { WorkerCase } from "@shared/schema";

interface OneClickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: "communication" | "documentation" | "medical" | "rtw" | "compliance";
  urgency: "immediate" | "today" | "routine";
  estimatedTime: number;
  action: () => Promise<void> | void;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  contextual?: boolean;
  conditions?: (workerCase: WorkerCase) => boolean;
}

interface OneClickActionsPanelProps {
  workerCase: WorkerCase;
  currentContext?: "injury_report" | "medical_review" | "rtw_planning" | "case_closure";
}

export function OneClickActionsPanel({
  workerCase,
  currentContext = "case_closure"
}: OneClickActionsPanelProps) {
  const [isExecuting, setIsExecuting] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState<OneClickAction | null>(null);

  // Define all possible one-click actions
  const allActions: OneClickAction[] = [
    // Communication Actions
    {
      id: "call_worker",
      title: "Call Worker",
      description: "Quick call to check progress and answer questions",
      icon: <Phone className="w-5 h-5" />,
      category: "communication",
      urgency: "today",
      estimatedTime: 10,
      action: () => {
        window.open(`tel:${workerCase.contactPhone || ""}`);
      }
    },
    {
      id: "email_update",
      title: "Send Progress Update",
      description: "Auto-generated progress email to all stakeholders",
      icon: <Mail className="w-5 h-5" />,
      category: "communication",
      urgency: "routine",
      estimatedTime: 2,
      action: async () => {
        // Generate and send automated progress update
        const response = await fetch(`/api/cases/${workerCase.id}/progress-email`, {
          method: 'POST'
        });
      },
      requiresConfirmation: true,
      confirmationMessage: "Send progress update to worker, employer, and medical team?"
    },
    {
      id: "schedule_meeting",
      title: "Schedule Review Meeting",
      description: "Auto-coordinate meeting with all stakeholders",
      icon: <Calendar className="w-5 h-5" />,
      category: "communication",
      urgency: "routine",
      estimatedTime: 5,
      action: async () => {
        // Integration with calendar system
        console.log("Scheduling review meeting");
      }
    },

    // Documentation Actions
    {
      id: "generate_rtw_plan",
      title: "Generate RTW Plan",
      description: "AI-powered RTW plan based on current capacity",
      icon: <Briefcase className="w-5 h-5" />,
      category: "rtw",
      urgency: "today",
      estimatedTime: 3,
      action: async () => {
        const response = await fetch(`/api/cases/${workerCase.id}/generate-rtw-plan`, {
          method: 'POST'
        });
      },
      conditions: (workerCase) => workerCase.rtwPlanStatus === "not_planned",
      contextual: true
    },
    {
      id: "request_medical_cert",
      title: "Request Medical Certificate",
      description: "Send automated request to treating practitioner",
      icon: <Heart className="w-5 h-5" />,
      category: "medical",
      urgency: "today",
      estimatedTime: 2,
      action: async () => {
        const response = await fetch(`/api/cases/${workerCase.id}/request-certificate`, {
          method: 'POST'
        });
      },
      conditions: (workerCase) => !workerCase.currentCertificateEnd ||
        new Date(workerCase.currentCertificateEnd) < new Date(),
      contextual: true
    },
    {
      id: "generate_reports",
      title: "Generate All Reports",
      description: "Create required WorkSafe and internal reports",
      icon: <FileText className="w-5 h-5" />,
      category: "compliance",
      urgency: "routine",
      estimatedTime: 5,
      action: async () => {
        const response = await fetch(`/api/cases/${workerCase.id}/generate-reports`, {
          method: 'POST'
        });
      }
    },

    // Quick Medical Actions
    {
      id: "book_ime",
      title: "Book Independent Medical Exam",
      description: "Schedule IME with approved practitioners",
      icon: <Activity className="w-5 h-5" />,
      category: "medical",
      urgency: "today",
      estimatedTime: 8,
      action: async () => {
        console.log("Booking IME");
      },
      conditions: (workerCase) => workerCase.riskLevel === "High",
      contextual: true
    },
    {
      id: "approve_treatment",
      title: "Pre-approve Treatment",
      description: "Auto-approve standard treatment based on guidelines",
      icon: <CheckCircle2 className="w-5 h-5" />,
      category: "medical",
      urgency: "immediate",
      estimatedTime: 3,
      action: async () => {
        const response = await fetch(`/api/cases/${workerCase.id}/approve-treatment`, {
          method: 'POST'
        });
      }
    },

    // RTW Actions
    {
      id: "suitable_duties_search",
      title: "Find Suitable Duties",
      description: "AI-powered matching of duties to worker capacity",
      icon: <Target className="w-5 h-5" />,
      category: "rtw",
      urgency: "today",
      estimatedTime: 5,
      action: async () => {
        const response = await fetch(`/api/cases/${workerCase.id}/find-suitable-duties`, {
          method: 'POST'
        });
      },
      conditions: (workerCase) => workerCase.workStatus === "Off work"
    },
    {
      id: "start_graduated_rtw",
      title: "Start Graduated RTW",
      description: "Initiate graduated return to work program",
      icon: <TrendingUp className="w-5 h-5" />,
      category: "rtw",
      urgency: "today",
      estimatedTime: 10,
      action: async () => {
        console.log("Starting graduated RTW");
      },
      conditions: (workerCase) => workerCase.rtwPlanStatus === "planned_not_started",
      requiresConfirmation: true,
      confirmationMessage: "Start graduated RTW program now?"
    },

    // Emergency Actions
    {
      id: "escalate_case",
      title: "Escalate to Senior CM",
      description: "Flag case for immediate senior review",
      icon: <AlertTriangle className="w-5 h-5" />,
      category: "compliance",
      urgency: "immediate",
      estimatedTime: 2,
      action: async () => {
        const response = await fetch(`/api/cases/${workerCase.id}/escalate`, {
          method: 'POST'
        });
      },
      requiresConfirmation: true,
      confirmationMessage: "Escalate this case to senior case manager for immediate review?"
    },
    {
      id: "emergency_contact",
      title: "Emergency Contact",
      description: "Immediate contact for urgent situations",
      icon: <Zap className="w-5 h-5" />,
      category: "communication",
      urgency: "immediate",
      estimatedTime: 1,
      action: () => {
        window.open("tel:000");
      }
    }
  ];

  // Filter actions based on context and conditions
  const getRelevantActions = () => {
    return allActions.filter(action => {
      // Check if action has conditions and if they're met
      if (action.conditions && !action.conditions(workerCase)) {
        return false;
      }

      // Context-based filtering
      if (currentContext === "injury_report") {
        return ["emergency_contact", "generate_reports", "email_update"].includes(action.id);
      }
      if (currentContext === "medical_review") {
        return action.category === "medical" || action.id === "email_update";
      }
      if (currentContext === "rtw_planning") {
        return action.category === "rtw" || action.category === "communication";
      }

      // Show all relevant actions for general case management
      return true;
    }).sort((a, b) => {
      // Sort by urgency, then category
      const urgencyOrder = { immediate: 0, today: 1, routine: 2 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
  };

  const handleActionClick = async (action: OneClickAction) => {
    if (action.requiresConfirmation) {
      setShowConfirmation(action);
      return;
    }

    await executeAction(action);
  };

  const executeAction = async (action: OneClickAction) => {
    setIsExecuting(action.id);
    try {
      await action.action();
      // Show success feedback
    } catch (error) {
      console.error(`Failed to execute action ${action.id}:`, error);
    } finally {
      setIsExecuting(null);
      setShowConfirmation(null);
    }
  };

  const getActionColor = (urgency: string, category: string) => {
    if (urgency === "immediate") return "bg-red-600 hover:bg-red-700 text-white";
    if (urgency === "today") return "bg-orange-600 hover:bg-orange-700 text-white";
    if (category === "medical") return "bg-blue-600 hover:bg-blue-700 text-white";
    if (category === "rtw") return "bg-green-600 hover:bg-green-700 text-white";
    return "bg-gray-600 hover:bg-gray-700 text-white";
  };

  const relevantActions = getRelevantActions();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-600" />
            One-Click Actions
            <Badge variant="outline" className="ml-2">
              {relevantActions.length} available
            </Badge>
          </CardTitle>
          <p className="text-sm text-gray-600">
            Common tasks made simple - execute with a single click
          </p>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {relevantActions.map(action => (
              <Tooltip key={action.id}>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => handleActionClick(action)}
                    disabled={isExecuting === action.id}
                    className={`h-auto p-4 flex flex-col items-start gap-2 ${getActionColor(action.urgency, action.category)}`}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {isExecuting === action.id ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        action.icon
                      )}
                      <span className="font-medium text-left flex-1">{action.title}</span>
                    </div>

                    <p className="text-xs text-left opacity-90 leading-tight">
                      {action.description}
                    </p>

                    <div className="flex items-center justify-between w-full">
                      <Badge
                        variant="outline"
                        className="text-xs bg-white/20 border-white/30 text-white"
                      >
                        {action.estimatedTime}min
                      </Badge>

                      {action.urgency === "immediate" && (
                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                      )}
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="font-medium">{action.title}</p>
                    <p className="text-sm">{action.description}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span>Category: {action.category.replace('_', ' ')}</span>
                      <span>•</span>
                      <span>Urgency: {action.urgency}</span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* Quick Stats */}
          <div className="mt-6 pt-4 border-t">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {relevantActions.filter(a => a.urgency === "immediate").length}
                </p>
                <p className="text-xs text-gray-600">Immediate</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {relevantActions.filter(a => a.urgency === "today").length}
                </p>
                <p className="text-xs text-gray-600">Today</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {relevantActions.filter(a => a.category === "medical").length}
                </p>
                <p className="text-xs text-gray-600">Medical</p>
              </div>
            </div>
          </div>

          {/* Time Savings Estimate */}
          <Alert className="mt-4 bg-green-50 border-green-200">
            <CheckCircle2 className="w-4 h-4" />
            <AlertDescription>
              <strong>Time Savings:</strong> These one-click actions save an average of{" "}
              <span className="font-bold text-green-700">
                {Math.round(relevantActions.reduce((sum, action) => sum + action.estimatedTime, 0) * 0.7)} minutes
              </span>{" "}
              per case compared to manual processes.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <Dialog open={!!showConfirmation} onOpenChange={() => setShowConfirmation(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {showConfirmation.icon}
                Confirm Action: {showConfirmation.title}
              </DialogTitle>
              <DialogDescription>
                {showConfirmation.confirmationMessage}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200">
                <Clock className="w-4 h-4" />
                <AlertDescription>
                  This action will take approximately {showConfirmation.estimatedTime} minutes to complete.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => executeAction(showConfirmation)}
                  className="flex-1"
                  disabled={isExecuting === showConfirmation.id}
                >
                  {isExecuting === showConfirmation.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    showConfirmation.icon
                  )}
                  Execute Action
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmation(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}