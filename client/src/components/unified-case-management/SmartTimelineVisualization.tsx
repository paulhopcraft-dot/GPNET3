import React, { useState, useMemo } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
  Heart,
  Briefcase,
  Target,
  Award,
  Users,
  FileText,
  Phone,
  Zap,
  Eye,
  PlayCircle,
  Flag
} from "lucide-react";
import { WorkerCase } from "@shared/schema";

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: "injury" | "medical" | "rtw" | "communication" | "milestone" | "setback" | "success";
  status: "completed" | "in_progress" | "upcoming" | "overdue" | "cancelled";
  stakeholder: "worker" | "employer" | "medical" | "case_manager" | "system";
  impact: "positive" | "neutral" | "negative" | "critical";
  documents?: string[];
  nextSteps?: string[];
  estimatedDuration?: number;
  actualDuration?: number;
  automated?: boolean;
}

interface TimelineMilestone {
  id: string;
  title: string;
  targetDate: string;
  actualDate?: string;
  status: "achieved" | "delayed" | "at_risk" | "upcoming";
  criteria: string[];
  impact: string;
  dependencies: string[];
}

interface PredictedOutcome {
  type: "full_rtw" | "partial_rtw" | "extended_leave" | "termination";
  probability: number;
  targetDate: string;
  factors: string[];
  recommendations: string[];
}

interface SmartTimelineVisualizationProps {
  workerCase: WorkerCase;
  showPredictions?: boolean;
  interactive?: boolean;
}

export function SmartTimelineVisualization({
  workerCase,
  showPredictions = true,
  interactive = true
}: SmartTimelineVisualizationProps) {
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [viewMode, setViewMode] = useState<"timeline" | "milestones" | "predictions">("timeline");

  // Calculate timeline based on case data
  const timelineEvents = useMemo<TimelineEvent[]>(() => {
    const events: TimelineEvent[] = [];
    const injuryDate = new Date(workerCase.dateOfInjury);
    const now = new Date();

    // Injury event
    events.push({
      id: "injury_occurrence",
      date: workerCase.dateOfInjury,
      title: "Workplace Injury",
      description: `${workerCase.injuryDescription || "Injury occurred at workplace"}`,
      type: "injury",
      status: "completed",
      stakeholder: "worker",
      impact: "critical"
    });

    // Initial medical assessment (typically same day or next day)
    const initialMedicalDate = new Date(injuryDate);
    initialMedicalDate.setDate(initialMedicalDate.getDate() + 1);
    events.push({
      id: "initial_medical",
      date: initialMedicalDate.toISOString(),
      title: "Initial Medical Assessment",
      description: "First medical evaluation and capacity assessment",
      type: "medical",
      status: workerCase.currentCertificateStart ? "completed" : "overdue",
      stakeholder: "medical",
      impact: workerCase.currentCertificateStart ? "positive" : "negative",
      estimatedDuration: 60,
      nextSteps: workerCase.currentCertificateStart ? [] : ["Schedule medical appointment", "Obtain work capacity certificate"]
    });

    // Case creation and assignment
    const caseCreationDate = new Date(injuryDate);
    caseCreationDate.setDate(caseCreationDate.getDate() + 1);
    events.push({
      id: "case_creation",
      date: caseCreationDate.toISOString(),
      title: "Case Assigned",
      description: "Case created and assigned to case manager",
      type: "communication",
      status: "completed",
      stakeholder: "case_manager",
      impact: "positive",
      automated: true
    });

    // Early intervention (week 1)
    const earlyInterventionDate = new Date(injuryDate);
    earlyInterventionDate.setDate(earlyInterventionDate.getDate() + 3);
    events.push({
      id: "early_intervention",
      date: earlyInterventionDate.toISOString(),
      title: "Early Intervention Contact",
      description: "Initial contact with worker to establish support",
      type: "communication",
      status: "completed",
      stakeholder: "case_manager",
      impact: "positive",
      estimatedDuration: 30
    });

    // RTW planning
    if (workerCase.rtwPlanStatus !== "not_planned") {
      const rtwPlanDate = new Date(injuryDate);
      rtwPlanDate.setDate(rtwPlanDate.getDate() + 7);
      events.push({
        id: "rtw_planning",
        date: rtwPlanDate.toISOString(),
        title: "RTW Plan Created",
        description: "Return to work plan developed and agreed upon",
        type: "rtw",
        status: workerCase.rtwPlanStatus === "not_planned" ? "upcoming" : "completed",
        stakeholder: "case_manager",
        impact: "positive",
        estimatedDuration: 90,
        nextSteps: workerCase.rtwPlanStatus === "not_planned" ? ["Create RTW plan", "Coordinate with employer"] : []
      });
    }

    // Medical reviews (every 2-4 weeks)
    const daysOffWork = Math.floor((now.getTime() - injuryDate.getTime()) / (1000 * 60 * 60 * 24));
    for (let week = 2; week <= Math.min(Math.ceil(daysOffWork / 7), 12); week += 2) {
      const reviewDate = new Date(injuryDate);
      reviewDate.setDate(reviewDate.getDate() + (week * 7));

      events.push({
        id: `medical_review_${week}`,
        date: reviewDate.toISOString(),
        title: `Medical Review (Week ${week})`,
        description: "Progress review and capacity assessment",
        type: "medical",
        status: reviewDate < now ? "completed" : "upcoming",
        stakeholder: "medical",
        impact: "neutral",
        estimatedDuration: 45
      });
    }

    // Graduated RTW attempts
    if (workerCase.rtwPlanStatus === "working_well" || workerCase.workStatus === "At work") {
      const rtwStartDate = new Date(injuryDate);
      rtwStartDate.setDate(rtwStartDate.getDate() + 14);
      events.push({
        id: "graduated_rtw_start",
        date: rtwStartDate.toISOString(),
        title: "Graduated RTW Started",
        description: "Worker began graduated return to work program",
        type: "rtw",
        status: "completed",
        stakeholder: "employer",
        impact: "positive",
        nextSteps: ["Monitor progress", "Weekly check-ins", "Adjust hours as needed"]
      });
    }

    // Current status milestone
    if (workerCase.workStatus === "At work") {
      events.push({
        id: "current_rtw_success",
        date: new Date().toISOString(),
        title: "Successfully at Work",
        description: "Worker has successfully returned to work",
        type: "success",
        status: "completed",
        stakeholder: "worker",
        impact: "positive"
      });
    }

    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [workerCase]);

  // Generate milestones
  const milestones = useMemo<TimelineMilestone[]>(() => {
    const injuryDate = new Date(workerCase.dateOfInjury);

    return [
      {
        id: "initial_medical",
        title: "Medical Assessment Complete",
        targetDate: new Date(injuryDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        actualDate: workerCase.currentCertificateStart,
        status: workerCase.currentCertificateStart ? "achieved" : "delayed",
        criteria: ["Medical certificate obtained", "Work capacity assessed"],
        impact: "Establishes foundation for case management",
        dependencies: []
      },
      {
        id: "early_intervention",
        title: "Early Intervention Complete",
        targetDate: new Date(injuryDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: "achieved",
        criteria: ["Worker contact established", "Support resources provided"],
        impact: "Reduces risk of long-term disability",
        dependencies: ["initial_medical"]
      },
      {
        id: "rtw_plan",
        title: "RTW Plan Established",
        targetDate: new Date(injuryDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        status: workerCase.rtwPlanStatus !== "not_planned" ? "achieved" : "delayed",
        criteria: ["Suitable duties identified", "Graduated plan created", "Stakeholder agreement"],
        impact: "Structured path to recovery",
        dependencies: ["early_intervention"]
      },
      {
        id: "sustained_rtw",
        title: "Sustained RTW",
        targetDate: new Date(injuryDate.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        status: workerCase.workStatus === "At work" ? "achieved" : "upcoming",
        criteria: ["4+ weeks at work", "Full capacity restored", "Worker satisfaction"],
        impact: "Successful case closure",
        dependencies: ["rtw_plan"]
      }
    ];
  }, [workerCase]);

  // AI-generated predictions
  const predictions = useMemo<PredictedOutcome[]>(() => {
    const daysOffWork = Math.floor((Date.now() - new Date(workerCase.dateOfInjury).getTime()) / (1000 * 60 * 60 * 24));

    const outcomes: PredictedOutcome[] = [];

    if (workerCase.workStatus === "At work") {
      outcomes.push({
        type: "full_rtw",
        probability: 95,
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        factors: ["Currently working", "Positive progress", "Good stakeholder engagement"],
        recommendations: ["Continue monitoring", "Plan case closure"]
      });
    } else {
      let fullRTWProbability = 85;
      if (workerCase.riskLevel === "High") fullRTWProbability -= 25;
      if (daysOffWork > 30) fullRTWProbability -= 20;
      if (workerCase.rtwPlanStatus === "not_planned") fullRTWProbability -= 15;

      outcomes.push({
        type: "full_rtw",
        probability: Math.max(30, fullRTWProbability),
        targetDate: new Date(Date.now() + (45 + daysOffWork * 0.5) * 24 * 60 * 60 * 1000).toISOString(),
        factors: [
          `${daysOffWork} days off work`,
          `${workerCase.riskLevel} risk level`,
          `RTW plan: ${workerCase.rtwPlanStatus || "not_planned"}`
        ],
        recommendations: fullRTWProbability > 70
          ? ["Continue current approach", "Monitor progress weekly"]
          : ["Immediate intervention required", "Consider specialist referral"]
      });
    }

    return outcomes;
  }, [workerCase]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case "injury": return <AlertTriangle className="w-4 h-4" />;
      case "medical": return <Heart className="w-4 h-4" />;
      case "rtw": return <Briefcase className="w-4 h-4" />;
      case "communication": return <Phone className="w-4 h-4" />;
      case "milestone": return <Flag className="w-4 h-4" />;
      case "success": return <Award className="w-4 h-4" />;
      case "setback": return <TrendingDown className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getEventColor = (status: string, impact: string) => {
    if (status === "overdue") return "border-red-500 bg-red-50";
    if (status === "completed" && impact === "positive") return "border-green-500 bg-green-50";
    if (status === "completed" && impact === "negative") return "border-red-500 bg-red-50";
    if (status === "in_progress") return "border-blue-500 bg-blue-50";
    if (status === "upcoming") return "border-gray-300 bg-gray-50";
    return "border-gray-300 bg-white";
  };

  const getMilestoneStatus = (milestone: TimelineMilestone) => {
    switch (milestone.status) {
      case "achieved": return "text-green-600 bg-green-100";
      case "delayed": return "text-red-600 bg-red-100";
      case "at_risk": return "text-orange-600 bg-orange-100";
      case "upcoming": return "text-blue-600 bg-blue-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Recovery Timeline
                <Badge variant="outline">{workerCase.workerName}</Badge>
              </CardTitle>
              <p className="text-sm text-gray-600">
                Complete journey from injury to full recovery
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "timeline" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("timeline")}
              >
                Timeline
              </Button>
              <Button
                variant={viewMode === "milestones" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("milestones")}
              >
                Milestones
              </Button>
              {showPredictions && (
                <Button
                  variant={viewMode === "predictions" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("predictions")}
                >
                  Predictions
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Timeline View */}
          {viewMode === "timeline" && (
            <div className="space-y-4">
              {/* Progress Overview */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Recovery Progress</span>
                  <span className="text-sm text-gray-600">
                    {timelineEvents.filter(e => e.status === "completed").length} of {timelineEvents.length} events
                  </span>
                </div>
                <Progress
                  value={(timelineEvents.filter(e => e.status === "completed").length / timelineEvents.length) * 100}
                  className="h-3"
                />
              </div>

              {/* Timeline Events */}
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300"></div>

                <div className="space-y-6">
                  {timelineEvents.map((event, index) => (
                    <div key={event.id} className="relative flex items-start gap-4">
                      {/* Timeline dot */}
                      <div className={`relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                        event.status === "completed" ? "bg-green-500 border-green-500" :
                        event.status === "overdue" ? "bg-red-500 border-red-500" :
                        event.status === "in_progress" ? "bg-blue-500 border-blue-500" :
                        "bg-gray-200 border-gray-300"
                      }`}>
                        <div className="text-white">
                          {getEventIcon(event.type)}
                        </div>
                      </div>

                      {/* Event content */}
                      <div
                        className={`flex-1 p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${getEventColor(event.status, event.impact)}`}
                        onClick={() => interactive && setSelectedEvent(event)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-sm">{event.title}</h4>
                              <Badge variant="outline" className="text-xs">
                                {formatDate(event.date)}
                              </Badge>
                              {event.automated && (
                                <Badge className="bg-purple-100 text-purple-700 text-xs">
                                  Auto
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{event.description}</p>

                            {event.nextSteps && event.nextSteps.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-700">Next Steps:</p>
                                <ul className="text-xs text-gray-600 space-y-0.5">
                                  {event.nextSteps.slice(0, 2).map((step, stepIndex) => (
                                    <li key={stepIndex} className="flex items-center gap-1">
                                      <ArrowRight className="w-3 h-3 text-blue-600" />
                                      {step}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          <div className="text-right space-y-1">
                            <Badge className={`text-xs ${
                              event.impact === "positive" ? "bg-green-100 text-green-700" :
                              event.impact === "negative" ? "bg-red-100 text-red-700" :
                              event.impact === "critical" ? "bg-red-100 text-red-700" :
                              "bg-gray-100 text-gray-700"
                            }`}>
                              {event.impact}
                            </Badge>

                            {event.estimatedDuration && (
                              <div className="text-xs text-gray-500">
                                ~{event.estimatedDuration}min
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Milestones View */}
          {viewMode === "milestones" && (
            <div className="space-y-4">
              {milestones.map((milestone) => (
                <div key={milestone.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{milestone.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{milestone.impact}</p>
                    </div>
                    <Badge className={getMilestoneStatus(milestone)}>
                      {milestone.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700">Target Date:</p>
                      <p>{formatDate(milestone.targetDate)}</p>
                    </div>
                    {milestone.actualDate && (
                      <div>
                        <p className="font-medium text-gray-700">Actual Date:</p>
                        <p>{formatDate(milestone.actualDate)}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <p className="font-medium text-gray-700 mb-2">Success Criteria:</p>
                    <ul className="space-y-1">
                      {milestone.criteria.map((criterion, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                          {criterion}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Predictions View */}
          {viewMode === "predictions" && (
            <div className="space-y-4">
              {predictions.map((prediction, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold capitalize">
                      {prediction.type.replace('_', ' ')} Prediction
                    </h3>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {prediction.probability}%
                      </div>
                      <div className="text-xs text-gray-500">Probability</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="font-medium text-gray-700">Predicted Date:</p>
                      <p className="text-sm">{formatDate(prediction.targetDate)}</p>
                    </div>

                    <div>
                      <p className="font-medium text-gray-700 mb-2">Key Factors:</p>
                      <ul className="space-y-1">
                        {prediction.factors.map((factor, factorIndex) => (
                          <li key={factorIndex} className="flex items-center gap-2 text-sm">
                            <TrendingUp className="w-3 h-3 text-blue-600" />
                            {factor}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="font-medium text-gray-700 mb-2">Recommendations:</p>
                      <ul className="space-y-1">
                        {prediction.recommendations.map((rec, recIndex) => (
                          <li key={recIndex} className="flex items-center gap-2 text-sm">
                            <Target className="w-3 h-3 text-green-600" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Detail Dialog */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getEventIcon(selectedEvent.type)}
                {selectedEvent.title}
              </DialogTitle>
              <DialogDescription>
                {formatDate(selectedEvent.date)} • {selectedEvent.stakeholder.replace('_', ' ')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <p className="text-sm">{selectedEvent.description}</p>

              {selectedEvent.nextSteps && selectedEvent.nextSteps.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Next Steps:</h4>
                  <ul className="space-y-1">
                    {selectedEvent.nextSteps.map((step, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <ArrowRight className="w-3 h-3 text-blue-600 mt-0.5" />
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedEvent.documents && (
                <div>
                  <h4 className="font-semibold mb-2">Related Documents:</h4>
                  <div className="space-y-1">
                    {selectedEvent.documents.map((doc, index) => (
                      <Button key={index} variant="outline" size="sm" className="mr-2">
                        <FileText className="w-3 h-3 mr-1" />
                        {doc}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}