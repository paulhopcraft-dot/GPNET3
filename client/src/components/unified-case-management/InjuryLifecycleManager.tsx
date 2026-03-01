import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Phone,
  FileText,
  Heart,
  Briefcase,
  Target,
  Calendar,
  Users,
  Zap,
  PlayCircle,
  Camera,
  Mic,
  MapPin,
  Timer,
  TrendingUp,
  Award,
  Home,
  Building,
  Activity
} from "lucide-react";
import { WorkerCase } from "@shared/schema";

interface LifecycleStage {
  id: string;
  title: string;
  description: string;
  timeframe: string;
  status: "not_started" | "in_progress" | "completed" | "delayed" | "blocked";
  criticalTasks: LifecycleTask[];
  automatedActions: string[];
  stakeholders: string[];
  nextStageRequirements: string[];
  icon: React.ReactNode;
  color: string;
  urgency: "immediate" | "today" | "this_week" | "routine";
}

interface LifecycleTask {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  estimatedTime: number;
  priority: "critical" | "high" | "medium" | "low";
  status: "pending" | "in_progress" | "completed" | "overdue";
  dueDate?: string;
  dependencies?: string[];
  quickActions?: QuickAction[];
  automatable?: boolean;
}

interface QuickAction {
  label: string;
  action: () => void;
  icon: React.ReactNode;
  type: "primary" | "secondary";
}

interface InjuryReport {
  injuryDate: string;
  location: string;
  description: string;
  severity: "minor" | "moderate" | "serious" | "critical";
  witnesses: string[];
  immediateActions: string[];
  photos?: File[];
  voiceNote?: Blob;
}

interface InjuryLifecycleManagerProps {
  workerCase?: WorkerCase;
  mode?: "new_injury" | "existing_case";
  onStageComplete?: (stageId: string) => void;
}

// Complete injury lifecycle stages
const injuryLifecycleStages: LifecycleStage[] = [
  {
    id: "immediate_response",
    title: "Immediate Response",
    description: "First 30 minutes - ensure safety and medical care",
    timeframe: "0-30 minutes",
    status: "not_started",
    urgency: "immediate",
    icon: <Heart className="w-5 h-5" />,
    color: "red",
    criticalTasks: [
      {
        id: "ensure_safety",
        title: "Ensure Worker Safety",
        description: "Remove from danger, provide first aid if trained",
        assignedTo: "supervisor",
        estimatedTime: 5,
        priority: "critical",
        status: "pending",
        automatable: false,
        quickActions: [
          {
            label: "Call Emergency Services",
            action: () => window.open("tel:000"),
            icon: <Phone className="w-4 h-4" />,
            type: "primary"
          }
        ]
      },
      {
        id: "report_injury",
        title: "Report Injury Immediately",
        description: "Submit initial injury report with photos and details",
        assignedTo: "supervisor",
        estimatedTime: 10,
        priority: "critical",
        status: "pending",
        automatable: false,
        quickActions: [
          {
            label: "Quick Report",
            action: () => console.log("Opening quick report"),
            icon: <Camera className="w-4 h-4" />,
            type: "primary"
          }
        ]
      }
    ],
    automatedActions: [
      "Send notification to safety officer",
      "Alert management team",
      "Create initial case record"
    ],
    stakeholders: ["Injured Worker", "Supervisor", "Safety Officer", "Management"],
    nextStageRequirements: ["Medical attention arranged", "Initial report submitted"]
  },
  {
    id: "initial_medical",
    title: "Initial Medical Assessment",
    description: "Medical evaluation and treatment planning",
    timeframe: "Day 1",
    status: "not_started",
    urgency: "immediate",
    icon: <Activity className="w-5 h-5" />,
    color: "orange",
    criticalTasks: [
      {
        id: "medical_assessment",
        title: "Medical Assessment",
        description: "Professional medical evaluation of injury",
        assignedTo: "medical_practitioner",
        estimatedTime: 60,
        priority: "critical",
        status: "pending",
        automatable: false
      },
      {
        id: "work_capacity_cert",
        title: "Work Capacity Certificate",
        description: "Obtain medical certificate with capacity assessment",
        assignedTo: "medical_practitioner",
        estimatedTime: 15,
        priority: "high",
        status: "pending",
        automatable: false
      }
    ],
    automatedActions: [
      "Schedule medical appointment",
      "Send medical forms to practitioner",
      "Update case with medical details"
    ],
    stakeholders: ["Injured Worker", "Medical Practitioner", "Case Manager"],
    nextStageRequirements: ["Medical certificate received", "Work capacity determined"]
  },
  {
    id: "early_intervention",
    title: "Early Intervention",
    description: "First 7 days - set foundation for recovery",
    timeframe: "Days 1-7",
    status: "not_started",
    urgency: "today",
    icon: <Target className="w-5 h-5" />,
    color: "yellow",
    criticalTasks: [
      {
        id: "initial_contact",
        title: "Worker Contact & Support",
        description: "Establish communication and provide support resources",
        assignedTo: "case_manager",
        estimatedTime: 30,
        priority: "high",
        status: "pending",
        automatable: false
      },
      {
        id: "suitable_duties_assessment",
        title: "Suitable Duties Assessment",
        description: "Identify available work within capacity",
        assignedTo: "employer",
        estimatedTime: 45,
        priority: "high",
        status: "pending",
        automatable: false
      },
      {
        id: "early_rtw_plan",
        title: "Early RTW Planning",
        description: "Create preliminary return to work plan",
        assignedTo: "case_manager",
        estimatedTime: 60,
        priority: "medium",
        status: "pending",
        automatable: true
      }
    ],
    automatedActions: [
      "Send welcome package to worker",
      "Notify employer of obligations",
      "Schedule stakeholder meeting"
    ],
    stakeholders: ["Injured Worker", "Employer", "Case Manager", "Rehabilitation Provider"],
    nextStageRequirements: ["Worker contact established", "RTW plan initiated"]
  },
  {
    id: "active_recovery",
    title: "Active Recovery",
    description: "Treatment and gradual return to work",
    timeframe: "Weeks 2-12",
    status: "not_started",
    urgency: "this_week",
    icon: <TrendingUp className="w-5 h-5" />,
    color: "blue",
    criticalTasks: [
      {
        id: "treatment_coordination",
        title: "Treatment Coordination",
        description: "Coordinate medical treatment and rehabilitation",
        assignedTo: "case_manager",
        estimatedTime: 30,
        priority: "high",
        status: "pending",
        automatable: true
      },
      {
        id: "rtw_implementation",
        title: "RTW Plan Implementation",
        description: "Execute graduated return to work plan",
        assignedTo: "employer",
        estimatedTime: 120,
        priority: "high",
        status: "pending",
        automatable: false
      },
      {
        id: "progress_monitoring",
        title: "Progress Monitoring",
        description: "Regular reviews and plan adjustments",
        assignedTo: "case_manager",
        estimatedTime: 45,
        priority: "medium",
        status: "pending",
        automatable: true
      }
    ],
    automatedActions: [
      "Schedule regular reviews",
      "Monitor certificate expiry",
      "Track RTW progress milestones"
    ],
    stakeholders: ["Injured Worker", "Employer", "Medical Practitioner", "Rehabilitation Provider"],
    nextStageRequirements: ["Sustained work capacity improvement", "RTW milestones achieved"]
  },
  {
    id: "full_recovery",
    title: "Full Recovery & Return",
    description: "Complete return to pre-injury capacity",
    timeframe: "Final phase",
    status: "not_started",
    urgency: "routine",
    icon: <Award className="w-5 h-5" />,
    color: "green",
    criticalTasks: [
      {
        id: "capacity_restoration",
        title: "Capacity Restoration",
        description: "Achieve full pre-injury work capacity",
        assignedTo: "medical_practitioner",
        estimatedTime: 30,
        priority: "medium",
        status: "pending",
        automatable: false
      },
      {
        id: "case_closure",
        title: "Case Closure",
        description: "Formal case closure with outcomes documented",
        assignedTo: "case_manager",
        estimatedTime: 60,
        priority: "medium",
        status: "pending",
        automatable: true
      },
      {
        id: "follow_up_monitoring",
        title: "Follow-up Monitoring",
        description: "3-month post-RTW sustainability check",
        assignedTo: "case_manager",
        estimatedTime: 20,
        priority: "low",
        status: "pending",
        automatable: true
      }
    ],
    automatedActions: [
      "Generate closure report",
      "Schedule follow-up check",
      "Archive case documents"
    ],
    stakeholders: ["Injured Worker", "Employer", "Case Manager"],
    nextStageRequirements: ["Full work capacity confirmed", "Successful RTW sustained"]
  }
];

export function InjuryLifecycleManager({
  workerCase,
  mode = "existing_case",
  onStageComplete
}: InjuryLifecycleManagerProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [showNewInjuryDialog, setShowNewInjuryDialog] = useState(mode === "new_injury");
  const [injuryReport, setInjuryReport] = useState<Partial<InjuryReport>>({});
  const [selectedTask, setSelectedTask] = useState<LifecycleTask | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  // Calculate overall progress
  const completedStages = injuryLifecycleStages.filter(stage => stage.status === "completed").length;
  const totalProgress = (completedStages / injuryLifecycleStages.length) * 100;

  // Determine current stage based on case data
  useEffect(() => {
    if (workerCase) {
      // Logic to determine current stage based on case status
      const daysOffWork = Math.floor((Date.now() - new Date(workerCase.dateOfInjury).getTime()) / (1000 * 60 * 60 * 24));

      if (daysOffWork === 0) {
        setCurrentStage(0); // Immediate response
      } else if (daysOffWork <= 1) {
        setCurrentStage(1); // Initial medical
      } else if (daysOffWork <= 7) {
        setCurrentStage(2); // Early intervention
      } else if (workerCase.workStatus === "Off work") {
        setCurrentStage(3); // Active recovery
      } else {
        setCurrentStage(4); // Full recovery
      }
    }
  }, [workerCase]);

  const getStageColor = (stage: LifecycleStage, index: number) => {
    if (stage.status === "completed") return "bg-green-500 text-white";
    if (index === currentStage) return "bg-blue-500 text-white";
    if (stage.status === "delayed") return "bg-red-500 text-white";
    if (stage.status === "blocked") return "bg-gray-500 text-white";
    return "bg-gray-200 text-gray-700";
  };

  const getTaskPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "border-red-500 bg-red-50";
      case "high": return "border-orange-500 bg-orange-50";
      case "medium": return "border-yellow-500 bg-yellow-50";
      case "low": return "border-blue-500 bg-blue-50";
      default: return "border-gray-500 bg-gray-50";
    }
  };

  const handleQuickInjuryReport = async () => {
    try {
      // Quick injury report with voice note and photo capability
      const reportData = {
        ...injuryReport,
        timestamp: new Date().toISOString(),
        reportedBy: "supervisor", // Would come from auth
        location: injuryReport.location || "Unknown"
      };

      // API call to create immediate injury report
      // This would integrate with the existing case creation system
      console.log("Creating immediate injury report:", reportData);

      setShowNewInjuryDialog(false);

      // Move to next stage
      setCurrentStage(1);
    } catch (error) {
      console.error("Failed to submit injury report:", error);
    }
  };

  const handleTaskComplete = (taskId: string) => {
    // Mark task as completed and check if stage is complete
    const currentStageData = injuryLifecycleStages[currentStage];
    const updatedTasks = currentStageData.criticalTasks.map(task =>
      task.id === taskId ? { ...task, status: "completed" as const } : task
    );

    // Check if all critical tasks are completed
    const allCriticalCompleted = updatedTasks.every(task =>
      task.priority !== "critical" || task.status === "completed"
    );

    if (allCriticalCompleted) {
      onStageComplete?.(currentStageData.id);

      // Auto-advance to next stage if conditions met
      if (currentStage < injuryLifecycleStages.length - 1) {
        setTimeout(() => setCurrentStage(prev => prev + 1), 1000);
      }
    }
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Injury Lifecycle Management
                {workerCase && (
                  <Badge variant="outline">{workerCase.workerName}</Badge>
                )}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Complete journey from injury to full recovery
              </p>
            </div>

            {mode === "existing_case" && (
              <Button
                onClick={() => setShowNewInjuryDialog(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                <Zap className="w-4 h-4 mr-2" />
                Report New Injury
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress Overview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Overall Progress</span>
              <span className="text-sm text-gray-600">
                Stage {currentStage + 1} of {injuryLifecycleStages.length}
              </span>
            </div>
            <Progress value={totalProgress} className="h-3" />
            <div className="text-xs text-gray-500 text-center">
              {completedStages} of {injuryLifecycleStages.length} stages completed
            </div>
          </div>

          {/* Lifecycle Stages */}
          <div className="space-y-4">
            <h3 className="font-semibold">Lifecycle Stages</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {injuryLifecycleStages.map((stage, index) => (
                <Tooltip key={stage.id}>
                  <TooltipTrigger asChild>
                    <div
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        index === currentStage ? "ring-2 ring-blue-500" : ""
                      }`}
                      onClick={() => setCurrentStage(index)}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${getStageColor(stage, index)}`}>
                        {stage.icon}
                      </div>
                      <h4 className="font-medium text-sm">{stage.title}</h4>
                      <p className="text-xs text-gray-600 mt-1">{stage.timeframe}</p>
                      <Badge
                        variant="outline"
                        className={`mt-2 text-xs ${
                          stage.urgency === "immediate" ? "border-red-500 text-red-700" :
                          stage.urgency === "today" ? "border-orange-500 text-orange-700" :
                          "border-blue-500 text-blue-700"
                        }`}
                      >
                        {stage.urgency}
                      </Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      <p className="font-medium">{stage.title}</p>
                      <p className="text-sm">{stage.description}</p>
                      <p className="text-xs">Stakeholders: {stage.stakeholders.join(", ")}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          {/* Current Stage Details */}
          {injuryLifecycleStages[currentStage] && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  {injuryLifecycleStages[currentStage].icon}
                  <div>
                    <h3 className="font-semibold">{injuryLifecycleStages[currentStage].title}</h3>
                    <p className="text-sm text-gray-600">{injuryLifecycleStages[currentStage].description}</p>
                  </div>
                </div>

                {/* Critical Tasks */}
                <div className="space-y-3">
                  <h4 className="font-medium">Critical Tasks</h4>
                  {injuryLifecycleStages[currentStage].criticalTasks.map(task => (
                    <Alert
                      key={task.id}
                      className={`border-l-4 cursor-pointer hover:shadow-md transition-all ${getTaskPriorityColor(task.priority)}`}
                      onClick={() => setSelectedTask(task)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-medium text-sm">{task.title}</h5>
                            <Badge className={getTaskPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {task.estimatedTime}min
                            </Badge>
                          </div>
                          <AlertDescription className="text-sm mt-1">
                            {task.description}
                          </AlertDescription>
                          <div className="text-xs text-gray-500 mt-1">
                            Assigned to: {task.assignedTo.replace('_', ' ')}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {task.quickActions?.map((action, actionIndex) => (
                            <Button
                              key={actionIndex}
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                action.action();
                              }}
                              variant={action.type === "primary" ? "default" : "outline"}
                            >
                              {action.icon}
                              {action.label}
                            </Button>
                          ))}

                          {task.status !== "completed" && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTaskComplete(task.id);
                              }}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Alert>
                  ))}
                </div>

                {/* Automated Actions */}
                {injuryLifecycleStages[currentStage].automatedActions.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-medium text-sm">Automated System Actions</h4>
                    <div className="space-y-1">
                      {injuryLifecycleStages[currentStage].automatedActions.map((action, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                          {action}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Injury Report Dialog */}
      <Dialog open={showNewInjuryDialog} onOpenChange={setShowNewInjuryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Quick Injury Report
            </DialogTitle>
            <DialogDescription>
              Report workplace injury immediately - every second counts
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <Timer className="w-4 h-4" />
              <AlertDescription>
                <strong>Critical First 30 Minutes:</strong> Ensure worker safety, provide first aid, and report immediately.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Injury Location</label>
                <Input
                  placeholder="e.g., Workshop floor, loading dock"
                  value={injuryReport.location || ""}
                  onChange={(e) => setInjuryReport(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Severity Assessment</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={injuryReport.severity || ""}
                  onChange={(e) => setInjuryReport(prev => ({ ...prev, severity: e.target.value as any }))}
                >
                  <option value="">Select severity</option>
                  <option value="minor">Minor - First aid only</option>
                  <option value="moderate">Moderate - Medical attention needed</option>
                  <option value="serious">Serious - Emergency treatment required</option>
                  <option value="critical">Critical - Life threatening</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">What Happened?</label>
              <Textarea
                placeholder="Brief description of the injury incident..."
                value={injuryReport.description || ""}
                onChange={(e) => setInjuryReport(prev => ({ ...prev, description: e.target.value }))}
                className="min-h-[80px]"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1">
                <Camera className="w-4 h-4 mr-2" />
                Take Photo
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsRecordingVoice(!isRecordingVoice)}
              >
                <Mic className={`w-4 h-4 mr-2 ${isRecordingVoice ? 'text-red-500' : ''}`} />
                {isRecordingVoice ? 'Stop Recording' : 'Voice Note'}
              </Button>
              <Button variant="outline" className="flex-1">
                <MapPin className="w-4 h-4 mr-2" />
                Location GPS
              </Button>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={handleQuickInjuryReport}
                disabled={!injuryReport.location || !injuryReport.severity}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                <Zap className="w-4 h-4 mr-2" />
                Submit Emergency Report
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowNewInjuryDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}