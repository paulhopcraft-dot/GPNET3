import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { fetchWithCsrf } from "../lib/queryClient";
import type {
  CaseSummary,
  SummaryRisk,
  MissingInfoItem,
  RecommendedAction,
} from "@shared/schema";

interface SummaryCardProps {
  caseId: string;
}

export function SummaryCard({ caseId }: SummaryCardProps) {
  const [summary, setSummary] = useState<CaseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchSummary = async (regenerate: boolean = false) => {
    setLoading(true);
    setError(null);

    try {
      const url = `/api/cases/${caseId}/smart-summary`;
      const response = regenerate
        ? await fetchWithCsrf(url, { method: "POST" })
        : await fetch(url, { credentials: "include" });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to fetch summary");
      }

      const data = await response.json();
      if (data.success && data.data) {
        setSummary(data.data);
      } else {
        throw new Error(data.error || "Invalid response");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [caseId]);

  const riskLevelColor = (level: SummaryRisk["level"]) => {
    switch (level) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "low":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
    }
  };

  const rtwLevelColor = (level: CaseSummary["rtwReadiness"]["level"]) => {
    switch (level) {
      case "ready":
        return "bg-emerald-100 text-emerald-800";
      case "conditional":
        return "bg-amber-100 text-amber-800";
      case "not_ready":
        return "bg-red-100 text-red-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const complianceColor = (status: CaseSummary["compliance"]["status"]) => {
    switch (status) {
      case "compliant":
        return "bg-emerald-100 text-emerald-800";
      case "at_risk":
        return "bg-amber-100 text-amber-800";
      case "non_compliant":
        return "bg-red-100 text-red-800";
    }
  };

  const priorityIcon = (priority: RecommendedAction["priority"]) => {
    return priority === "urgent" ? "priority_high" : "task_alt";
  };

  const priorityColor = (priority: RecommendedAction["priority"]) => {
    return priority === "urgent" ? "text-red-600" : "text-primary";
  };

  if (loading) {
    return (
      <Card data-testid="card-smart-summary-loading">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="material-symbols-outlined animate-spin text-primary">
              progress_activity
            </span>
            <span>Analyzing case data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card data-testid="card-smart-summary-error">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="material-symbols-outlined text-warning">warning</span>
              <span>{error}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchSummary(true)}
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <Card data-testid="card-smart-summary">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="material-symbols-outlined text-primary">
              insights
            </span>
            Smart Case Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {summary.confidence}% confidence
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchSummary(true)}
              disabled={loading}
              data-testid="button-regenerate-summary"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
            </Button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Generated {new Date(summary.generatedAt).toLocaleString()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="material-symbols-outlined text-primary text-base">
            info
          </span>
          {summary.currentStatus}
        </div>

        {/* Status Badges Row */}
        <div className="flex flex-wrap gap-2">
          <Badge className={rtwLevelColor(summary.rtwReadiness.level)}>
            RTW: {summary.rtwReadiness.level.replace(/_/g, " ")}
          </Badge>
          <Badge className={complianceColor(summary.compliance.status)}>
            {summary.compliance.status.replace(/_/g, " ")}
          </Badge>
        </div>

        {/* Summary Text */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className="text-sm text-card-foreground leading-relaxed">
            {isExpanded
              ? summary.summaryText
              : summary.summaryText.length > 200
                ? `${summary.summaryText.slice(0, 200)}...`
                : summary.summaryText}
          </div>
          {summary.summaryText.length > 200 && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs p-0 h-auto mt-1">
                {isExpanded ? "Show less" : "Show more"}
              </Button>
            </CollapsibleTrigger>
          )}
        </Collapsible>

        {/* Risks */}
        {summary.risks.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Risks
            </div>
            <div className="space-y-1">
              {summary.risks.map((risk, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-sm"
                >
                  <Badge
                    variant="outline"
                    className={`text-[10px] flex-shrink-0 ${riskLevelColor(risk.level)}`}
                  >
                    {risk.level}
                  </Badge>
                  <span className="flex-1">{risk.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Missing Information */}
        {summary.missingInfo.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Missing Information
            </div>
            <div className="space-y-1">
              {summary.missingInfo.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm"
                >
                  <span
                    className={`material-symbols-outlined text-base ${
                      item.importance === "critical"
                        ? "text-red-500"
                        : "text-amber-500"
                    }`}
                  >
                    {item.importance === "critical" ? "error" : "warning"}
                  </span>
                  <span>{item.item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Actions */}
        {summary.recommendedActions.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Recommended Actions
            </div>
            <div className="space-y-2">
              {summary.recommendedActions.map((action, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-sm border-l-2 border-border pl-2"
                >
                  <span
                    className={`material-symbols-outlined text-base flex-shrink-0 ${priorityColor(action.priority)}`}
                  >
                    {priorityIcon(action.priority)}
                  </span>
                  <div>
                    <div className="font-medium">{action.action}</div>
                    <div className="text-xs text-muted-foreground">
                      {action.reason}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RTW Readiness Details */}
        {(summary.rtwReadiness.conditions.length > 0 ||
          summary.rtwReadiness.blockers.length > 0) && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Return to Work
            </div>
            {summary.rtwReadiness.blockers.length > 0 && (
              <div className="mb-2">
                <div className="text-xs text-red-600 font-medium mb-1">
                  Blockers:
                </div>
                <ul className="text-sm space-y-1">
                  {summary.rtwReadiness.blockers.map((blocker, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-red-500 text-base">
                        block
                      </span>
                      {blocker}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {summary.rtwReadiness.conditions.length > 0 && (
              <div>
                <div className="text-xs text-amber-600 font-medium mb-1">
                  Conditions:
                </div>
                <ul className="text-sm space-y-1">
                  {summary.rtwReadiness.conditions.map((condition, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-500 text-base">
                        pending
                      </span>
                      {condition}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Compliance Issues */}
        {summary.compliance.issues.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Compliance Issues
            </div>
            <ul className="text-sm space-y-1">
              {summary.compliance.issues.map((issue, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500 text-base">
                    gpp_maybe
                  </span>
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
