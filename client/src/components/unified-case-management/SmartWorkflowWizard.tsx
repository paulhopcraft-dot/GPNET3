import React, { useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Circle,
  AlertTriangle,
  Info,
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  Target,
  Clock,
  User,
  FileText,
  Calendar,
  Heart,
  Briefcase,
  Shield,
  Zap,
  HelpCircle
} from "lucide-react";
import { WorkerCase } from "@shared/schema";

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
  validation?: (data: any) => string | null;
  helpText?: string;
  tips?: string[];
  estimatedTime?: number;
  dependencies?: string[];
  isOptional?: boolean;
}

interface WorkflowTemplate {
  id: string;
  title: string;
  description: string;
  category: "rtw" | "medical" | "compliance" | "onboarding";
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedTime: number;
  steps: WorkflowStep[];
  icon: React.ReactNode;
  benefits: string[];
}

interface SmartWorkflowWizardProps {
  isOpen: boolean;
  onClose: () => void;
  workflowType?: string;
  workerCase?: WorkerCase;
  onComplete?: (data: any) => void;
}

// RTW Plan Creation Workflow Template
const createRTWPlanWorkflow: WorkflowTemplate = {
  id: "create-rtw-plan",
  title: "Create Return to Work Plan",
  description: "Step-by-step guided process to create an effective RTW plan",
  category: "rtw",
  difficulty: "intermediate",
  estimatedTime: 45,
  icon: <Briefcase className="w-6 h-6" />,
  benefits: [
    "Reduces average RTW time by 35%",
    "Ensures WorkSafe compliance",
    "Improves worker satisfaction",
    "Minimizes re-injury risk"
  ],
  steps: [
    {
      id: "worker-assessment",
      title: "Worker Assessment",
      description: "Gather current worker status and medical information",
      estimatedTime: 10,
      helpText: "Understanding the worker's current capacity is crucial for creating an effective plan.",
      tips: [
        "Review the most recent medical certificate",
        "Consider the worker's pre-injury role and duties",
        "Assess any psychological factors affecting RTW"
      ],
      component: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Work Capacity</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select capacity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fit">Fit for full duties</SelectItem>
                  <SelectItem value="partial">Suitable duties only</SelectItem>
                  <SelectItem value="unfit">Unfit for work</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Days Off Work</label>
              <Input type="number" placeholder="Enter days" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Current Restrictions/Limitations</label>
            <Textarea
              placeholder="List any physical, psychological, or environmental restrictions..."
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Worker's RTW Goals</label>
            <Textarea
              placeholder="What does the worker want to achieve? Any concerns or preferences..."
              className="min-h-[60px]"
            />
          </div>
        </div>
      ),
      validation: (data) => {
        if (!data.capacity) return "Work capacity is required";
        if (!data.daysOff || data.daysOff < 0) return "Valid days off work is required";
        return null;
      }
    },
    {
      id: "workplace-assessment",
      title: "Workplace Assessment",
      description: "Evaluate workplace factors and available suitable duties",
      estimatedTime: 15,
      helpText: "Identifying suitable duties is key to successful RTW outcomes.",
      tips: [
        "Focus on essential job functions the worker can perform",
        "Consider temporary modifications to the workplace",
        "Identify training opportunities for new skills"
      ],
      component: (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Available Suitable Duties</label>
            <Textarea
              placeholder="Describe specific duties the worker can perform safely..."
              className="min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Workplace Modifications Needed</label>
              <Textarea
                placeholder="Equipment, workspace changes, etc..."
                className="min-h-[60px]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Training Requirements</label>
              <Textarea
                placeholder="Any new skills or safety training needed..."
                className="min-h-[60px]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Employer Support Level</label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Rate employer cooperation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excellent">Excellent - Fully supportive</SelectItem>
                <SelectItem value="good">Good - Generally cooperative</SelectItem>
                <SelectItem value="fair">Fair - Some resistance</SelectItem>
                <SelectItem value="poor">Poor - Significant barriers</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )
    },
    {
      id: "plan-structure",
      title: "Plan Structure & Timeline",
      description: "Design the graduated RTW schedule and milestones",
      estimatedTime: 15,
      helpText: "Graduated RTW plans have higher success rates than immediate full-time return.",
      tips: [
        "Start with 2-4 hours per day and gradually increase",
        "Set weekly milestones for hours and duties",
        "Build in review points to assess progress"
      ],
      component: (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Week 1 Hours/Day</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Hours" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 hours</SelectItem>
                  <SelectItem value="4">4 hours</SelectItem>
                  <SelectItem value="6">6 hours</SelectItem>
                  <SelectItem value="8">8 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Week 2 Hours/Day</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Hours" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 hours</SelectItem>
                  <SelectItem value="6">6 hours</SelectItem>
                  <SelectItem value="8">8 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Full Hours</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Hours" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 hours</SelectItem>
                  <SelectItem value="8">8 hours</SelectItem>
                  <SelectItem value="10">10 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Success Milestones</label>
            <Textarea
              placeholder="Define specific, measurable goals for each phase..."
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Review Schedule</label>
            <div className="grid grid-cols-2 gap-4">
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Initial review" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3days">3 days</SelectItem>
                  <SelectItem value="1week">1 week</SelectItem>
                  <SelectItem value="2weeks">2 weeks</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Ongoing reviews" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "stakeholder-coordination",
      title: "Stakeholder Coordination",
      description: "Coordinate with all parties and set communication plan",
      estimatedTime: 5,
      helpText: "Clear communication among all parties prevents misunderstandings and ensures plan success.",
      tips: [
        "Include all key stakeholders from the beginning",
        "Set clear expectations for each party's role",
        "Establish regular communication channels"
      ],
      component: (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Key Stakeholders</label>
            <div className="grid grid-cols-2 gap-2">
              {['Worker', 'Employer/Supervisor', 'Treating Doctor', 'Rehabilitation Provider', 'WorkSafe', 'Union Rep'].map(stakeholder => (
                <label key={stakeholder} className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked={['Worker', 'Employer/Supervisor', 'Treating Doctor'].includes(stakeholder)} />
                  <span className="text-sm">{stakeholder}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Communication Plan</label>
            <Textarea
              placeholder="How will updates be shared? Who needs to be informed of what..."
              className="min-h-[60px]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Initial Meeting Date</label>
            <Input type="date" />
          </div>
        </div>
      )
    }
  ]
};

// Medical Certificate Review Workflow
const medicalCertReviewWorkflow: WorkflowTemplate = {
  id: "medical-cert-review",
  title: "Medical Certificate Review",
  description: "Systematic review and approval of medical certificates",
  category: "medical",
  difficulty: "beginner",
  estimatedTime: 15,
  icon: <Heart className="w-6 h-6" />,
  benefits: [
    "Ensures accurate capacity assessment",
    "Identifies inconsistencies early",
    "Maintains compliance standards",
    "Reduces processing time"
  ],
  steps: [
    {
      id: "cert-validation",
      title: "Certificate Validation",
      description: "Verify certificate authenticity and completeness",
      estimatedTime: 5,
      component: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Practitioner Registration</label>
              <Input placeholder="Verify practitioner is registered" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Certificate Date</label>
              <Input type="date" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Validation Checklist</label>
            <div className="space-y-2">
              {[
                'Practitioner signature present',
                'Official letterhead/stamp',
                'Date within valid period',
                'Worker details match case'
              ].map(item => (
                <label key={item} className="flex items-center space-x-2">
                  <input type="checkbox" />
                  <span className="text-sm">{item}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )
    }
  ]
};

const workflowTemplates: WorkflowTemplate[] = [
  createRTWPlanWorkflow,
  medicalCertReviewWorkflow
];

export function SmartWorkflowWizard({
  isOpen,
  onClose,
  workflowType = "create-rtw-plan",
  workerCase,
  onComplete
}: SmartWorkflowWizardProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [workflowData, setWorkflowData] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showHelp, setShowHelp] = useState(false);

  const workflow = workflowTemplates.find(w => w.id === workflowType) || workflowTemplates[0];
  const currentStep = workflow.steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / workflow.steps.length) * 100;

  const updateStepData = useCallback((stepId: string, data: any) => {
    setWorkflowData(prev => ({ ...prev, [stepId]: { ...prev[stepId], ...data } }));
  }, []);

  const validateCurrentStep = (): boolean => {
    if (!currentStep.validation) return true;

    const error = currentStep.validation(workflowData[currentStep.id] || {});
    if (error) {
      setValidationErrors(prev => ({ ...prev, [currentStep.id]: error }));
      return false;
    }

    setValidationErrors(prev => ({ ...prev, [currentStep.id]: "" }));
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;

    if (currentStepIndex < workflow.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      // Workflow complete
      onComplete?.(workflowData);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner": return "bg-green-100 text-green-700";
      case "intermediate": return "bg-yellow-100 text-yellow-700";
      case "advanced": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {workflow.icon}
            <div>
              <DialogTitle>{workflow.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-4 mt-1">
                <span>{workflow.description}</span>
                <Badge className={getDifficultyColor(workflow.difficulty)}>
                  {workflow.difficulty}
                </Badge>
                <span className="text-xs">~{workflow.estimatedTime}min</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Progress Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-gray-500">
              Step {currentStepIndex + 1} of {workflow.steps.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />

          {/* Step Navigation */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {workflow.steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  index === currentStepIndex
                    ? "bg-blue-50 border-blue-200"
                    : index < currentStepIndex
                    ? "bg-green-50 border-green-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                {index < currentStepIndex ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : index === currentStepIndex ? (
                  <Circle className="w-4 h-4 text-blue-600 fill-current" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-xs font-medium whitespace-nowrap">
                  {step.title}
                </span>
                {step.estimatedTime && (
                  <span className="text-xs text-gray-500">
                    {step.estimatedTime}m
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Current Step Content */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  {currentStep.title}
                  {currentStep.isOptional && (
                    <Badge variant="outline" className="text-xs">Optional</Badge>
                  )}
                </CardTitle>
                <p className="text-sm text-gray-600">{currentStep.description}</p>
              </div>

              {(currentStep.helpText || currentStep.tips) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowHelp(true)}
                    >
                      <HelpCircle className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View help and tips</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Validation Error */}
            {validationErrors[currentStep.id] && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>{validationErrors[currentStep.id]}</AlertDescription>
              </Alert>
            )}

            {/* Step Component */}
            <div className="min-h-[200px]">
              {React.cloneElement(currentStep.component as React.ReactElement, {
                data: workflowData[currentStep.id] || {},
                onChange: (data: any) => updateStepData(currentStep.id, data)
              })}
            </div>

            {/* Help Section */}
            {showHelp && (currentStep.helpText || currentStep.tips) && (
              <Alert className="bg-blue-50 border-blue-200">
                <Lightbulb className="w-4 h-4" />
                <div className="space-y-2">
                  {currentStep.helpText && (
                    <AlertDescription>{currentStep.helpText}</AlertDescription>
                  )}
                  {currentStep.tips && (
                    <div>
                      <p className="font-medium text-sm mb-2">💡 Pro Tips:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {currentStep.tips.map((tip, index) => (
                          <li key={index}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHelp(false)}
                    className="mt-2"
                  >
                    Hide Help
                  </Button>
                </div>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStepIndex === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            {currentStepIndex === workflow.steps.length - 1 ? (
              <Button onClick={handleNext} className="bg-green-600 hover:bg-green-700">
                <Target className="w-4 h-4 mr-2" />
                Complete Workflow
              </Button>
            ) : (
              <Button onClick={handleNext}>
                Next Step
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>

        {/* Workflow Benefits */}
        <div className="bg-gray-50 rounded-lg p-4 mt-4">
          <h4 className="font-semibold text-sm mb-2">Expected Benefits:</h4>
          <div className="grid grid-cols-2 gap-2">
            {workflow.benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                {benefit}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}