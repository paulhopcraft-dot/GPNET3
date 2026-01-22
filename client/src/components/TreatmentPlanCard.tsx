import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { GlassPanel } from "./ui/glass-panel";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import type { TreatmentPlan, TreatmentIntervention, TreatmentPriority } from "@shared/schema";
import { fetchWithCsrf, getAuthHeaders } from "../lib/queryClient";

interface TreatmentPlanCardProps {
  caseId: string;
}

export function TreatmentPlanCard({ caseId }: TreatmentPlanCardProps) {
  const [plan, setPlan] = useState<TreatmentPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchPlan = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/cases/${caseId}/treatment-plan`, {
          credentials: "include",
          headers: getAuthHeaders(),
        });
        if (response.status === 404) {
          // No plan exists yet - this is expected
          if (cancelled) return;
          setPlan(null);
          setLoading(false);
          return;
        }
        if (!response.ok) {
          throw new Error("Failed to fetch treatment plan");
        }
        const data = await response.json();
        if (cancelled) return;
        setPlan(data);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Treatment plan unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPlan();
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const generatePlan = async () => {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetchWithCsrf(`/api/cases/${caseId}/treatment-plan/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ additionalContext: "" }),
      });
      const data = await response.json();
      setPlan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate treatment plan");
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const priorityBadgeClass = (priority?: TreatmentPriority) => {
    switch (priority) {
      case "critical":
        return "bg-gradient-to-r from-red-500 to-pink-500 text-white border-red-300 shadow-lg shadow-red-500/25";
      case "recommended":
        return "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-300 shadow-lg shadow-amber-500/25";
      case "optional":
        return "bg-gradient-to-r from-slate-400 to-slate-500 text-white border-slate-300 shadow-lg shadow-slate-500/25";
      default:
        return "bg-gradient-to-r from-slate-400 to-slate-500 text-white border-slate-300 shadow-lg shadow-slate-500/25";
    }
  };

  const priorityLabel = (priority?: TreatmentPriority) => {
    switch (priority) {
      case "critical":
        return "CRITICAL";
      case "recommended":
        return "RECOMMENDED";
      case "optional":
        return "OPTIONAL";
      default:
        return "";
    }
  };

  const interventionTypeIcon = (type: TreatmentIntervention["type"]) => {
    switch (type) {
      case "physiotherapy":
        return "medical_services";
      case "medication":
        return "medication";
      case "specialist":
        return "stethoscope";
      case "surgical":
        return "surgical";
      case "workplace_modification":
        return "engineering";
      case "psychological":
        return "psychology";
      default:
        return "health_and_safety";
    }
  };

  const confidenceColor = (confidence: number) => {
    if (confidence >= 75) return "text-emerald-700";
    if (confidence >= 50) return "text-amber-700";
    return "text-red-700";
  };

  return (
    <GlassPanel
      className="treatment-plan-glass-card"
      variant="gradient"
      data-testid="card-treatment-plan"
    >
      <div className="p-6">
        <div className="border-b border-white/20 pb-4 mb-6">
          <h3 className="flex items-center gap-2 text-base font-semibold text-white">
            <span className="material-symbols-outlined text-white/90">fact_check</span>
            Treatment Plan
          </h3>
        </div>
        <div>
        {loading && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
            <span>Loading treatment plan...</span>
          </div>
        )}

        {error && (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <span className="material-symbols-outlined text-warning text-base">error</span>
            {error}
          </div>
        )}

        {/* No plan exists - show generate button */}
        {!loading && !error && !plan && (
          <div className="text-center py-6">
            <span className="material-symbols-outlined text-4xl text-muted-foreground/50 mb-3 block">
              clinical_notes
            </span>
            <p className="text-sm text-muted-foreground mb-4">
              No treatment plan generated yet for this case.
            </p>
            <Button
              onClick={generatePlan}
              disabled={generating}
              className="gap-2"
              data-testid="button-generate-plan"
            >
              {generating ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                  <span>Generating with AI...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">auto_awesome</span>
                  <span>Generate Treatment Plan</span>
                </>
              )}
            </Button>
          </div>
        )}

        {/* Plan exists - show details */}
        {!loading && !error && plan && (
          <div className="space-y-4">
            {/* Disclaimer - ADVISORY ONLY */}
            <div className="rounded-md border-2 border-amber-300 bg-amber-50 p-3">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-amber-700 text-xl mt-0.5">warning</span>
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-900 uppercase tracking-wide mb-1">
                    ⚠️ Advisory Only
                  </p>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    This treatment plan is AI-generated for care coordination purposes only.
                    It does NOT constitute medical advice. All treatment decisions must be made by qualified healthcare professionals.
                  </p>
                </div>
              </div>
            </div>

            {/* Confidence & Metadata */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="material-symbols-outlined text-sm">event</span>
                <span>Generated {formatDate(plan.generatedAt)}</span>
              </div>
              <div className={`confidence-indicator animate-pulse-slow flex items-center gap-1 font-semibold ${confidenceColor(plan.confidence)}`}>
                <span className="material-symbols-outlined text-sm">insights</span>
                <span>{plan.confidence}% confidence</span>
              </div>
            </div>

            {/* Expected Duration */}
            <div className="rounded-md border border-border p-3 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">schedule</span>
                  <span className="text-sm font-medium">Expected Duration</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {plan.expectedDurationWeeks} weeks
                </Badge>
              </div>
            </div>

            {/* Interventions */}
            {plan.interventions && plan.interventions.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">medical_services</span>
                  Interventions ({plan.interventions.length})
                </h4>
                <div className="space-y-2">
                  {plan.interventions.slice(0, 5).map((intervention, idx) => (
                    <div
                      key={idx}
                      className="rounded-md border border-border p-3 bg-white"
                    >
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-primary text-lg mt-0.5">
                          {interventionTypeIcon(intervention.type)}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {intervention.priority && (
                              <motion.div
                                whileHover={{
                                  scale: 1.05,
                                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                                  transition: { duration: 0.2 }
                                }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Badge
                                  variant="outline"
                                  className={`intervention-badge ${intervention.priority} text-[10px] font-semibold ${priorityBadgeClass(intervention.priority)} transition-all duration-200 hover:shadow-md`}
                                >
                                  {priorityLabel(intervention.priority)}
                                </Badge>
                              </motion.div>
                            )}
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                              {intervention.type.replace("_", " ")}
                            </span>
                          </div>
                          <p className="text-sm text-card-foreground">{intervention.description}</p>
                          {(intervention.frequency || intervention.duration) && (
                            <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-3">
                              {intervention.frequency && (
                                <span className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs">repeat</span>
                                  {intervention.frequency}
                                </span>
                              )}
                              {intervention.duration && (
                                <span className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs">timer</span>
                                  {intervention.duration}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {plan.interventions.length > 5 && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-primary hover:bg-transparent w-full"
                        >
                          View all {plan.interventions.length} interventions
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>All Treatment Interventions</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 mt-4">
                          {plan.interventions.map((intervention, idx) => (
                            <div key={idx} className="rounded-md border border-border p-3">
                              <div className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-primary text-lg">
                                  {interventionTypeIcon(intervention.type)}
                                </span>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    {intervention.priority && (
                                      <Badge
                                        variant="outline"
                                        className={`text-[10px] ${priorityBadgeClass(intervention.priority)}`}
                                      >
                                        {priorityLabel(intervention.priority)}
                                      </Badge>
                                    )}
                                    <span className="text-[10px] text-muted-foreground uppercase">
                                      {intervention.type.replace("_", " ")}
                                    </span>
                                  </div>
                                  <p className="text-sm">{intervention.description}</p>
                                  {(intervention.frequency || intervention.duration) && (
                                    <div className="mt-1 text-xs text-muted-foreground flex gap-3">
                                      {intervention.frequency && <span>Frequency: {intervention.frequency}</span>}
                                      {intervention.duration && <span>Duration: {intervention.duration}</span>}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            )}

            {/* Milestones */}
            {plan.milestones && plan.milestones.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">flag</span>
                  Recovery Milestones ({plan.milestones.length})
                </h4>
                <div className="space-y-2">
                  {plan.milestones.slice(0, 3).map((milestone, idx) => (
                    <div
                      key={idx}
                      className="rounded-md border border-border p-3 bg-white"
                    >
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                          Week {milestone.weekNumber}
                        </Badge>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-card-foreground">
                            {milestone.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Expected: {milestone.expectedOutcome}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {plan.milestones.length > 3 && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-primary hover:bg-transparent w-full"
                        >
                          View all {plan.milestones.length} milestones
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Recovery Milestones Timeline</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 mt-4">
                          {plan.milestones.map((milestone, idx) => (
                            <div key={idx} className="rounded-md border border-border p-3">
                              <div className="flex items-start gap-2">
                                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">
                                  Week {milestone.weekNumber}
                                </Badge>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{milestone.description}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Expected: {milestone.expectedOutcome}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            )}

            {/* Expected Outcomes */}
            {plan.expectedOutcomes && plan.expectedOutcomes.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Expected Outcomes
                </h4>
                <ul className="space-y-1">
                  {plan.expectedOutcomes.map((outcome, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-card-foreground">
                      <span className="material-symbols-outlined text-emerald-600 text-base mt-0.5">task_alt</span>
                      <span>{outcome}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Specialist Referrals */}
            {plan.specialistReferrals && plan.specialistReferrals.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">stethoscope</span>
                  Specialist Referrals
                </h4>
                <div className="flex flex-wrap gap-2">
                  {plan.specialistReferrals.map((specialist, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {specialist}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Regenerate Button */}
            <div className="pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={generatePlan}
                disabled={generating}
                className="w-full gap-2"
                data-testid="button-regenerate-plan"
              >
                {generating ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                    <span>Regenerating...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">refresh</span>
                    <span>Regenerate Plan</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
        </div>
      </div>
    </GlassPanel>
  );
}
