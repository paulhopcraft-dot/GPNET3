import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  User,
  Building,
  Briefcase,
  Activity,
  FileText,
  ArrowRight,
  Target,
  Heart,
  Zap
} from "lucide-react";
import { WorkerCase } from "@shared/schema";

interface CaseOverviewCardProps {
  workerCase: WorkerCase;
  onActionClick: (action: string, caseId: string) => void;
}

interface CaseHealthScore {
  score: number;
  level: "excellent" | "good" | "attention" | "urgent" | "critical";
  factors: string[];
  nextAction: {
    title: string;
    description: string;
    urgency: "immediate" | "today" | "this_week" | "routine";
    category: "medical" | "rtw" | "compliance" | "administrative";
  };
}

// Smart case health assessment algorithm
function calculateCaseHealth(workerCase: WorkerCase): CaseHealthScore {
  const factors: string[] = [];
  let score = 100;

  // Days off work impact
  const injuryDate = new Date(workerCase.dateOfInjury);
  const daysOffWork = Math.floor((Date.now() - injuryDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysOffWork > 90) {
    score -= 30;
    factors.push("Long-term absence (90+ days)");
  } else if (daysOffWork > 30) {
    score -= 15;
    factors.push("Extended absence (30+ days)");
  }

  // Risk level impact
  if (workerCase.riskLevel === "High") {
    score -= 25;
    factors.push("High risk classification");
  } else if (workerCase.riskLevel === "Medium") {
    score -= 10;
    factors.push("Medium risk classification");
  }

  // Work status impact
  if (workerCase.workStatus === "Off work") {
    score -= 20;
    factors.push("Currently off work");
  }

  // Compliance impact
  if (workerCase.complianceIndicator === "Very Low" || workerCase.complianceIndicator === "Low") {
    score -= 20;
    factors.push("Compliance concerns");
  }

  // RTW plan status impact
  if (workerCase.rtwPlanStatus === "not_planned") {
    score -= 15;
    factors.push("No RTW plan in place");
  } else if (workerCase.rtwPlanStatus === "failing") {
    score -= 25;
    factors.push("RTW plan failing");
  }

  // Determine level and next action
  let level: CaseHealthScore["level"];
  let nextAction: CaseHealthScore["nextAction"];

  if (score >= 85) {
    level = "excellent";
    nextAction = {
      title: "Monitor Progress",
      description: "Continue current treatment and monitoring schedule",
      urgency: "routine",
      category: "medical"
    };
  } else if (score >= 70) {
    level = "good";
    nextAction = {
      title: "Review Treatment Plan",
      description: "Assess current treatment effectiveness and adjust if needed",
      urgency: "this_week",
      category: "medical"
    };
  } else if (score >= 50) {
    level = "attention";
    if (workerCase.rtwPlanStatus === "not_planned") {
      nextAction = {
        title: "Create RTW Plan",
        description: "Worker needs structured return to work planning",
        urgency: "today",
        category: "rtw"
      };
    } else {
      nextAction = {
        title: "Case Review Required",
        description: "Multiple factors need attention - schedule case review",
        urgency: "today",
        category: "administrative"
      };
    }
  } else if (score >= 30) {
    level = "urgent";
    nextAction = {
      title: "Immediate Intervention",
      description: "Case requires urgent clinical attention and intervention planning",
      urgency: "immediate",
      category: "medical"
    };
  } else {
    level = "critical";
    nextAction = {
      title: "Critical Case Review",
      description: "Immediate comprehensive review with multidisciplinary team required",
      urgency: "immediate",
      category: "compliance"
    };
  }

  return { score: Math.max(0, score), level, factors, nextAction };
}

function getHealthColor(level: CaseHealthScore["level"]) {
  switch (level) {
    case "excellent": return "text-green-600 bg-green-50 border-green-200";
    case "good": return "text-blue-600 bg-blue-50 border-blue-200";
    case "attention": return "text-yellow-600 bg-yellow-50 border-yellow-200";
    case "urgent": return "text-orange-600 bg-orange-50 border-orange-200";
    case "critical": return "text-red-600 bg-red-50 border-red-200";
  }
}

function getHealthIcon(level: CaseHealthScore["level"]) {
  switch (level) {
    case "excellent": return <CheckCircle className="w-4 h-4" />;
    case "good": return <TrendingUp className="w-4 h-4" />;
    case "attention": return <Clock className="w-4 h-4" />;
    case "urgent": return <AlertCircle className="w-4 h-4" />;
    case "critical": return <Zap className="w-4 h-4" />;
  }
}

function getUrgencyColor(urgency: string) {
  switch (urgency) {
    case "immediate": return "bg-red-500";
    case "today": return "bg-orange-500";
    case "this_week": return "bg-yellow-500";
    case "routine": return "bg-green-500";
    default: return "bg-gray-500";
  }
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "medical": return <Heart className="w-4 h-4" />;
    case "rtw": return <Briefcase className="w-4 h-4" />;
    case "compliance": return <FileText className="w-4 h-4" />;
    case "administrative": return <User className="w-4 h-4" />;
    default: return <Activity className="w-4 h-4" />;
  }
}

export function CaseOverviewCard({ workerCase, onActionClick }: CaseOverviewCardProps) {
  const caseHealth = calculateCaseHealth(workerCase);
  const injuryDate = new Date(workerCase.dateOfInjury);
  const daysOffWork = Math.floor((Date.now() - injuryDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-gray-600" />
              {workerCase.workerName}
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Building className="w-4 h-4" />
                {workerCase.company}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Injured: {injuryDate.toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {daysOffWork} days
              </div>
            </div>
          </div>

          {/* Case Health Score */}
          <div className="text-right">
            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${getHealthColor(caseHealth.level)}`}>
              {getHealthIcon(caseHealth.level)}
              <div>
                <div className="font-semibold">{caseHealth.score}/100</div>
                <div className="text-xs capitalize">{caseHealth.level.replace('_', ' ')}</div>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Status Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase">Work Status</label>
            <Badge
              className={workerCase.workStatus === "At work"
                ? "bg-green-100 text-green-800 border-green-200"
                : "bg-red-100 text-red-800 border-red-200"
              }
            >
              {workerCase.workStatus}
            </Badge>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase">Risk Level</label>
            <Badge
              className={
                workerCase.riskLevel === "High" ? "bg-red-100 text-red-800 border-red-200" :
                workerCase.riskLevel === "Medium" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                "bg-green-100 text-green-800 border-green-200"
              }
            >
              {workerCase.riskLevel}
            </Badge>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase">RTW Status</label>
            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
              {(workerCase.rtwPlanStatus || "not_planned").replace(/_/g, " ")}
            </Badge>
          </div>
        </div>

        {/* Recovery Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Recovery Progress</label>
            <span className="text-sm text-gray-500">
              {Math.max(0, Math.min(100, 100 - (daysOffWork * 1.2)))}%
            </span>
          </div>
          <Progress
            value={Math.max(0, Math.min(100, 100 - (daysOffWork * 1.2)))}
            className="h-2"
          />
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {workerCase.workStatus === "At work" ? (
              <TrendingUp className="w-3 h-3 text-green-600" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-600" />
            )}
            {workerCase.workStatus === "At work"
              ? "Positive recovery trajectory"
              : daysOffWork > 30
                ? "Extended absence - review required"
                : "Early intervention opportunity"
            }
          </div>
        </div>

        {/* Smart Next Action Alert */}
        <Alert className={`border-l-4 ${
          caseHealth.nextAction.urgency === "immediate" ? "border-l-red-500 bg-red-50" :
          caseHealth.nextAction.urgency === "today" ? "border-l-orange-500 bg-orange-50" :
          caseHealth.nextAction.urgency === "this_week" ? "border-l-yellow-500 bg-yellow-50" :
          "border-l-blue-500 bg-blue-50"
        }`}>
          <div className="flex items-start gap-3">
            <div className={`p-1 rounded-full ${
              caseHealth.nextAction.urgency === "immediate" ? "bg-red-100" :
              caseHealth.nextAction.urgency === "today" ? "bg-orange-100" :
              caseHealth.nextAction.urgency === "this_week" ? "bg-yellow-100" :
              "bg-blue-100"
            }`}>
              {getCategoryIcon(caseHealth.nextAction.category)}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-sm">{caseHealth.nextAction.title}</h4>
                <div className={`w-2 h-2 rounded-full ${getUrgencyColor(caseHealth.nextAction.urgency)}`} />
                <span className="text-xs font-medium capitalize">
                  {caseHealth.nextAction.urgency.replace('_', ' ')}
                </span>
              </div>
              <AlertDescription className="text-sm">
                {caseHealth.nextAction.description}
              </AlertDescription>
            </div>
            <Button
              size="sm"
              onClick={() => onActionClick(caseHealth.nextAction.category, workerCase.id)}
              className="shrink-0"
            >
              Take Action
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </Alert>

        {/* Health Factors */}
        {caseHealth.factors.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-500 uppercase">Attention Areas</label>
            <div className="flex flex-wrap gap-2">
              {caseHealth.factors.map((factor, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs bg-gray-50"
                >
                  {factor}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onActionClick("view_full", workerCase.id)}
            className="flex-1"
          >
            <FileText className="w-4 h-4 mr-2" />
            Full Details
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onActionClick("timeline", workerCase.id)}
            className="flex-1"
          >
            <Activity className="w-4 h-4 mr-2" />
            Timeline
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onActionClick("contact", workerCase.id)}
            className="flex-1"
          >
            <Target className="w-4 h-4 mr-2" />
            Update
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}