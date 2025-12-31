/**
 * TerminationStatus - Charter-Compliant Termination View
 *
 * This component follows the Post-Frontend Architecture Charter:
 * - Status display only (no form fields)
 * - Narrative explanations for each stage
 * - Single action button leads to focused page
 * - No business logic in UI
 *
 * Replaces: TerminationPanel (24K → ~150 lines)
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { CheckCircle, AlertTriangle, ChevronRight, Clock, FileText } from "lucide-react";

interface TerminationStatusProps {
  caseId: string;
  workerName: string;
  onContinue?: () => void;
}

interface TerminationNarrative {
  caseId: string;
  workerName: string;
  hasProcess: boolean;
  currentStage?: string;
  stageLabel?: string;
  stageDescription?: string;
  narrative?: string;
  completedSteps?: Array<{
    stage: string;
    summary: string;
    completedAt?: string;
  }>;
  nextStep?: {
    description: string;
    rationale: string;
    action: string;
  };
  warnings?: string[];
  documents?: {
    preTerminationLetter?: string;
    terminationLetter?: string;
  };
  dates?: {
    initiated?: string;
    lastUpdated?: string;
    preTerminationMeeting?: string;
    terminationEffective?: string;
  };
}

const STAGE_PROGRESS: Record<string, number> = {
  NOT_STARTED: 0,
  PREP_EVIDENCE: 1,
  AGENT_MEETING: 2,
  CONSULTANT_CONFIRMATION: 3,
  PRE_TERMINATION_INVITE_SENT: 4,
  PRE_TERMINATION_MEETING_COMPLETED: 5,
  DECISION_PENDING: 6,
  TERMINATED: 7,
  TERMINATION_ABORTED: -1,
};

export function TerminationStatus({ caseId, workerName, onContinue }: TerminationStatusProps) {
  const { data: narrative, isLoading } = useQuery<TerminationNarrative>({
    queryKey: [`/api/termination/${caseId}/narrative`],
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 animate-pulse" />
            <span>Loading capacity review status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!narrative) {
    return null;
  }

  const progress = narrative.currentStage ? STAGE_PROGRESS[narrative.currentStage] : 0;
  const totalSteps = 7;
  const progressPercent = narrative.hasProcess ? Math.round((progress / totalSteps) * 100) : 0;

  const statusColor =
    narrative.currentStage === "TERMINATED"
      ? "bg-emerald-100 text-emerald-800"
      : narrative.currentStage === "TERMINATION_ABORTED"
        ? "bg-slate-100 text-slate-800"
        : "bg-amber-100 text-amber-800";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Employment Capacity Review</CardTitle>
        {narrative.hasProcess && narrative.stageLabel && (
          <Badge className={statusColor}>{narrative.stageLabel}</Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Warnings */}
        {narrative.warnings && narrative.warnings.length > 0 && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3">
            {narrative.warnings.map((warning, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-red-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                {warning}
              </div>
            ))}
          </div>
        )}

        {/* Stage Description - What's happening now */}
        <div>
          <p className="text-sm text-muted-foreground">
            {narrative.stageDescription || narrative.narrative}
          </p>
        </div>

        {/* Progress Indicator */}
        {narrative.hasProcess && progress >= 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Completed Steps */}
        {narrative.completedSteps && narrative.completedSteps.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">Completed Steps</p>
            <div className="space-y-2">
              {narrative.completedSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">{step.stage}</span>
                    <p className="text-xs text-muted-foreground">{step.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next Step - With Rationale */}
        {narrative.nextStep && narrative.currentStage !== "TERMINATED" && (
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Next: {narrative.nextStep.description}</p>
                <p className="text-xs text-muted-foreground mt-1">{narrative.nextStep.rationale}</p>
              </div>
            </div>
          </div>
        )}

        {/* Documents */}
        {narrative.documents &&
          (narrative.documents.preTerminationLetter || narrative.documents.terminationLetter) && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">Documents</p>
              <div className="flex flex-wrap gap-2">
                {narrative.documents.preTerminationLetter && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Pre-termination Letter
                  </Badge>
                )}
                {narrative.documents.terminationLetter && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Termination Letter
                  </Badge>
                )}
              </div>
            </div>
          )}

        {/* Action Button */}
        {narrative.nextStep && narrative.currentStage !== "TERMINATED" && onContinue && (
          <Button onClick={onContinue} className="w-full" variant="outline">
            {narrative.hasProcess ? "Continue Process" : "Start Capacity Review"}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
