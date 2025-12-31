/**
 * CaseNarrative - Charter-Compliant Case View
 *
 * This component follows the Post-Frontend Architecture Charter:
 * - Narrative-first display (no complex workflows)
 * - Minimal controls (actions link to separate pages)
 * - No business logic in UI
 * - Explains what, why, and what's next
 *
 * Replaces: CaseDetailPanel (39K → ~200 lines)
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  MessageSquare,
  RefreshCw,
  X,
  ChevronRight,
} from "lucide-react";

interface CaseNarrativeProps {
  caseId: string;
  workerName: string;
  onClose: () => void;
  onAction?: (actionType: string) => void;
}

interface NarrativeResponse {
  caseId: string;
  workerName: string;
  company: string;
  generatedAt: string;
  confidence: number;
  summary: string;
  currentStatus: string;
  compliance: {
    status: string;
    indicator: string;
    narrative: string;
    issues: string[];
  };
  risk: {
    level: string;
    narrative: string;
    items: Array<{ level: string; description: string; source: string }>;
  };
  returnToWork: {
    status: string;
    narrative: string;
    conditions: string[];
    blockers: string[];
    planStatus?: string;
  };
  clinicalEvidence?: {
    dutySafetyStatus: string;
    highRiskFlags: string[];
    recommendations: Array<{ action: string; explanation: string }>;
  };
  nextActions: Array<{
    id: string;
    description: string;
    rationale: string;
    priority: string;
    endpoint: string;
  }>;
  missingInfo: Array<{ item: string; importance: string }>;
  timeline: string;
}

export function CaseNarrative({ caseId, workerName, onClose, onAction }: CaseNarrativeProps) {
  const {
    data: narrative,
    isLoading,
    error,
    refetch,
  } = useQuery<NarrativeResponse>({
    queryKey: [`/api/cases/${caseId}/narrative`],
    staleTime: 60000, // 1 minute
  });

  if (isLoading) {
    return (
      <aside className="w-96 flex-shrink-0 bg-card border-l border-border p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">{workerName}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center justify-center h-48">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading case narrative...</span>
        </div>
      </aside>
    );
  }

  if (error || !narrative) {
    return (
      <aside className="w-96 flex-shrink-0 bg-card border-l border-border p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">{workerName}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">Unable to load case narrative.</p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </aside>
    );
  }

  const complianceColor =
    narrative.compliance.status === "compliant"
      ? "bg-emerald-100 text-emerald-800"
      : narrative.compliance.status === "non_compliant"
        ? "bg-red-100 text-red-800"
        : "bg-amber-100 text-amber-800";

  const riskColor =
    narrative.risk.level === "Low"
      ? "bg-emerald-100 text-emerald-800"
      : narrative.risk.level === "High"
        ? "bg-red-100 text-red-800"
        : "bg-amber-100 text-amber-800";

  const rtwIcon =
    narrative.returnToWork.status === "ready" ? (
      <CheckCircle className="h-4 w-4 text-emerald-600" />
    ) : narrative.returnToWork.status === "not_ready" ? (
      <AlertTriangle className="h-4 w-4 text-red-600" />
    ) : (
      <Clock className="h-4 w-4 text-amber-600" />
    );

  return (
    <aside className="w-96 flex-shrink-0 bg-card border-l border-border p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-bold text-card-foreground">{narrative.workerName}</h2>
          <p className="text-sm text-muted-foreground">{narrative.company}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => refetch()} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="space-y-4 pr-2">
          {/* Primary Narrative */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Case Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{narrative.summary}</p>
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground">{narrative.timeline}</p>
              </div>
            </CardContent>
          </Card>

          {/* Status Indicators - Compact */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <Badge className={complianceColor} variant="secondary">
                {narrative.compliance.indicator}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">Compliance</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <Badge className={riskColor} variant="secondary">
                {narrative.risk.level}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">Risk</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center flex flex-col items-center">
              {rtwIcon}
              <p className="text-xs text-muted-foreground mt-1">RTW Status</p>
            </div>
          </div>

          {/* Compliance Explanation */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Why This Compliance Status?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{narrative.compliance.narrative}</p>
              {narrative.compliance.issues.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {narrative.compliance.issues.map((issue, i) => (
                    <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                      <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      {issue}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Risk Explanation */}
          {narrative.risk.items.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{narrative.risk.narrative}</p>
              </CardContent>
            </Card>
          )}

          {/* RTW Explanation */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Return to Work Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{narrative.returnToWork.narrative}</p>
              {narrative.returnToWork.blockers.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                    Current Blockers
                  </p>
                  <ul className="space-y-1">
                    {narrative.returnToWork.blockers.map((blocker, i) => (
                      <li key={i} className="text-sm text-amber-700">
                        {blocker}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clinical Evidence Flags */}
          {narrative.clinicalEvidence && narrative.clinicalEvidence.highRiskFlags.length > 0 && (
            <Card className="border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-red-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Clinical Evidence Flags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {narrative.clinicalEvidence.highRiskFlags.map((flag, i) => (
                    <li key={i} className="text-sm text-red-700">
                      {flag}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Missing Information */}
          {narrative.missingInfo.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Missing Information</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {narrative.missingInfo.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Badge
                        variant="outline"
                        className={
                          item.importance === "critical"
                            ? "border-red-300 text-red-700"
                            : "border-amber-300 text-amber-700"
                        }
                      >
                        {item.importance}
                      </Badge>
                      {item.item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Next Actions - With Rationale */}
          {narrative.nextActions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">What Should I Do Next?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {narrative.nextActions.slice(0, 3).map((action) => (
                  <div
                    key={action.id}
                    className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{action.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{action.rationale}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAction?.(action.id)}
                        className="flex-shrink-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    {action.priority === "urgent" && (
                      <Badge className="mt-2 bg-red-100 text-red-800">Urgent</Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Meta */}
          <div className="text-xs text-muted-foreground text-center pt-4 pb-8">
            Generated {new Date(narrative.generatedAt).toLocaleString()} • Confidence:{" "}
            {narrative.confidence}%
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
