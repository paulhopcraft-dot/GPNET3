import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Briefcase,
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Target,
  User,
  Building,
  Activity,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  FileText,
  MessageSquare,
  Zap
} from "lucide-react";
import { WorkerCase, RTWPlanStatus } from "@shared/schema";

interface RTWPlanningProps {
  workerCase: WorkerCase;
  onStatusUpdate?: (newStatus: RTWPlanStatus, reason: string) => void;
}

interface RTWMilestone {
  week: number;
  hoursPerDay: number;
  daysPerWeek: number;
  description: string;
  status: "pending" | "in_progress" | "completed" | "adjusted";
  actualHours?: number;
  notes?: string;
}

interface RTWRecommendation {
  type: "immediate" | "planning" | "monitoring" | "adjustment";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  actionRequired: boolean;
}

const RTW_STATUS_TRANSITIONS = {
  not_planned: ["planned_not_started"],
  planned_not_started: ["in_progress", "on_hold"],
  in_progress: ["working_well", "failing", "on_hold", "completed"],
  working_well: ["in_progress", "on_hold", "completed"],
  failing: ["in_progress", "on_hold", "not_planned"],
  on_hold: ["in_progress", "planned_not_started"],
  completed: ["in_progress"]  // Can restart if needed
};

const RTW_STATUS_LABELS = {
  not_planned: "Not Planned",
  planned_not_started: "Plan Created",
  in_progress: "In Progress",
  working_well: "Working Well",
  failing: "Plan Failing",
  on_hold: "On Hold",
  completed: "Completed"
};

const RTW_STATUS_DESCRIPTIONS = {
  not_planned: "Worker needs a structured return to work plan",
  planned_not_started: "Plan created but implementation not yet begun",
  in_progress: "Actively implementing graduated return to work",
  working_well: "RTW plan proceeding successfully as intended",
  failing: "RTW plan not achieving intended outcomes",
  on_hold: "RTW temporarily paused due to medical or other factors",
  completed: "Worker successfully returned to full duties"
};

function generateRTWRecommendations(
  workerCase: WorkerCase,
  daysOffWork: number,
  hasCurrentCertificate: boolean,
  certificateCapacity?: string
): RTWRecommendation[] {
  const recommendations: RTWRecommendation[] = [];
  const currentStatus = workerCase.rtwPlanStatus || "not_planned";

  // Immediate actions based on status
  if (currentStatus === "not_planned" && daysOffWork > 7) {
    recommendations.push({
      type: "immediate",
      title: "Create RTW Plan Urgently",
      description: `Worker has been off work for ${daysOffWork} days without RTW planning. Early intervention is critical for successful outcomes.`,
      priority: daysOffWork > 30 ? "high" : "medium",
      actionRequired: true
    });
  }

  if (currentStatus === "failing") {
    recommendations.push({
      type: "immediate",
      title: "RTW Plan Intervention Required",
      description: "Current plan is not working. Immediate review and adjustment needed to prevent extended absence.",
      priority: "high",
      actionRequired: true
    });
  }

  // Medical certificate alignment
  if (hasCurrentCertificate && certificateCapacity) {
    if (certificateCapacity === "fit" && currentStatus !== "completed") {
      recommendations.push({
        type: "planning",
        title: "Worker Cleared for Full Duties",
        description: "Medical certificate shows fit for work - plan completion or role transition.",
        priority: "high",
        actionRequired: true
      });
    } else if (certificateCapacity === "partial" && currentStatus === "not_planned") {
      recommendations.push({
        type: "planning",
        title: "Partial Capacity Available",
        description: "Medical certificate shows partial work capacity - create suitable duties plan.",
        priority: "medium",
        actionRequired: true
      });
    } else if (certificateCapacity === "unfit" && currentStatus === "in_progress") {
      recommendations.push({
        type: "adjustment",
        title: "Medical Capacity Changed",
        description: "New certificate shows unfit for work - consider placing plan on hold.",
        priority: "high",
        actionRequired: true
      });
    }
  } else if (!hasCurrentCertificate && currentStatus !== "not_planned") {
    recommendations.push({
      type: "immediate",
      title: "Current Medical Certificate Required",
      description: "RTW planning requires current medical certificate to assess work capacity.",
      priority: "high",
      actionRequired: true
    });
  }

  // Duration-based recommendations
  if (daysOffWork > 90 && currentStatus !== "completed") {
    recommendations.push({
      type: "monitoring",
      title: "Long-term Absence Review",
      description: "Worker has been off work for over 90 days. Consider multidisciplinary review and alternative strategies.",
      priority: "medium",
      actionRequired: false
    });
  }

  // Risk-based recommendations
  if (workerCase.riskLevel === "High" && currentStatus === "in_progress") {
    recommendations.push({
      type: "monitoring",
      title: "High-Risk Case Monitoring",
      description: "High-risk case requires more frequent monitoring and support during RTW process.",
      priority: "medium",
      actionRequired: false
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

export function SmartRTWPlanning({ workerCase, onStatusUpdate }: RTWPlanningProps) {
  const [selectedNewStatus, setSelectedNewStatus] = useState<RTWPlanStatus | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [showStatusDialog, setShowStatusDialog] = useState(false);

  const queryClient = useQueryClient();

  const injuryDate = new Date(workerCase.dateOfInjury);
  const daysOffWork = Math.floor((Date.now() - injuryDate.getTime()) / (1000 * 60 * 60 * 24));
  const currentStatus = workerCase.rtwPlanStatus || "not_planned";

  // Mock data for current certificate (would be fetched in real implementation)
  const hasCurrentCertificate = true;
  const certificateCapacity = "partial"; // Would come from actual certificate data

  const recommendations = generateRTWRecommendations(
    workerCase,
    daysOffWork,
    hasCurrentCertificate,
    certificateCapacity
  );

  const availableTransitions = RTW_STATUS_TRANSITIONS[currentStatus] || [];

  const getStatusColor = (status: RTWPlanStatus) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "working_well": return "bg-blue-100 text-blue-800 border-blue-200";
      case "in_progress": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "failing": return "bg-red-100 text-red-800 border-red-200";
      case "on_hold": return "bg-gray-100 text-gray-800 border-gray-200";
      case "planned_not_started": return "bg-purple-100 text-purple-800 border-purple-200";
      case "not_planned": return "bg-orange-100 text-orange-800 border-orange-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: RTWPlanStatus) => {
    switch (status) {
      case "completed": return <CheckCircle className="w-4 h-4" />;
      case "working_well": return <TrendingUp className="w-4 h-4" />;
      case "in_progress": return <Activity className="w-4 h-4" />;
      case "failing": return <AlertTriangle className="w-4 h-4" />;
      case "on_hold": return <Pause className="w-4 h-4" />;
      case "planned_not_started": return <FileText className="w-4 h-4" />;
      case "not_planned": return <Clock className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-red-600 bg-red-50 border-red-200";
      case "medium": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "low": return "text-green-600 bg-green-50 border-green-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedNewStatus || !statusReason.trim()) return;

    try {
      // API call would go here
      if (onStatusUpdate) {
        onStatusUpdate(selectedNewStatus, statusReason);
      }

      setShowStatusDialog(false);
      setSelectedNewStatus(null);
      setStatusReason("");

      queryClient.invalidateQueries({ queryKey: ["cases-workspace"] });
    } catch (error) {
      console.error("Failed to update RTW status:", error);
    }
  };

  // Calculate RTW progress (mock implementation)
  const calculateProgress = () => {
    switch (currentStatus) {
      case "not_planned": return 0;
      case "planned_not_started": return 15;
      case "in_progress": return 45;
      case "working_well": return 75;
      case "failing": return 25;
      case "on_hold": return 30;
      case "completed": return 100;
      default: return 0;
    }
  };

  const progress = calculateProgress();
  const needsAttention = recommendations.some(r => r.actionRequired && r.priority === "high");

  return (
    <Card className={needsAttention ? "border-red-200 bg-red-50/30" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              Return to Work Planning
            </CardTitle>
            <p className="text-sm text-gray-600">
              Guided RTW management for {workerCase.workerName}
            </p>
          </div>
          <div className="text-right space-y-1">
            <Badge className={getStatusColor(currentStatus)}>
              {getStatusIcon(currentStatus)}
              <span className="ml-1">{RTW_STATUS_LABELS[currentStatus]}</span>
            </Badge>
            <div className="text-xs text-gray-500">
              {daysOffWork} days off work
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Status Overview */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">RTW Progress</h4>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3" />
          <p className="text-sm text-gray-600">
            {RTW_STATUS_DESCRIPTIONS[currentStatus]}
          </p>
        </div>

        {/* Smart Recommendations */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Target className="w-4 h-4" />
            Smart Recommendations
          </h4>

          {recommendations.length === 0 ? (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="w-4 h-4" />
              <AlertDescription>
                RTW planning is on track. Continue monitoring progress and worker feedback.
              </AlertDescription>
            </Alert>
          ) : (
            recommendations.map((rec, index) => (
              <Alert
                key={index}
                className={`border-l-4 ${
                  rec.priority === "high" ? "border-l-red-500 bg-red-50" :
                  rec.priority === "medium" ? "border-l-yellow-500 bg-yellow-50" :
                  "border-l-blue-500 bg-blue-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-1 rounded-full ${
                    rec.priority === "high" ? "bg-red-100" :
                    rec.priority === "medium" ? "bg-yellow-100" :
                    "bg-blue-100"
                  }`}>
                    {rec.type === "immediate" ? <Zap className="w-4 h-4" /> :
                     rec.type === "planning" ? <FileText className="w-4 h-4" /> :
                     rec.type === "monitoring" ? <Activity className="w-4 h-4" /> :
                     <Target className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h5 className="font-semibold text-sm">{rec.title}</h5>
                      <Badge className={getPriorityColor(rec.priority)}>
                        {rec.priority} priority
                      </Badge>
                    </div>
                    <AlertDescription className="text-sm">
                      {rec.description}
                    </AlertDescription>
                  </div>
                  {rec.actionRequired && (
                    <Button size="sm" onClick={() => setShowStatusDialog(true)}>
                      Take Action
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
              </Alert>
            ))
          )}
        </div>

        {/* Status Transition Options */}
        {availableTransitions.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold">Available Status Updates</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableTransitions.map(status => (
                <Button
                  key={status}
                  variant="outline"
                  onClick={() => {
                    setSelectedNewStatus(status);
                    setShowStatusDialog(true);
                  }}
                  className="justify-start"
                >
                  {getStatusIcon(status)}
                  <span className="ml-2">{RTW_STATUS_LABELS[status]}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" className="flex-1">
            <FileText className="w-4 h-4 mr-2" />
            View Plan Details
          </Button>
          <Button variant="outline" className="flex-1">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Review
          </Button>
          <Button variant="outline" className="flex-1">
            <MessageSquare className="w-4 h-4 mr-2" />
            Contact Employer
          </Button>
        </div>

        {/* Status Update Dialog */}
        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update RTW Status</DialogTitle>
              <DialogDescription>
                Update the return to work status for {workerCase.workerName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">New Status</label>
                <Select value={selectedNewStatus || ""} onValueChange={(value) => setSelectedNewStatus(value as RTWPlanStatus)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTransitions.map(status => (
                      <SelectItem key={status} value={status}>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(status)}
                          {RTW_STATUS_LABELS[status]}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Reason for Change *</label>
                <Textarea
                  placeholder="Explain the reason for this status change..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleStatusUpdate}
                  disabled={!selectedNewStatus || !statusReason.trim()}
                  className="flex-1"
                >
                  Update Status
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowStatusDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}