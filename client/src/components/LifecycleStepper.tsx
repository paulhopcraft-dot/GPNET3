import type { CaseLifecycleStage } from "@shared/schema";
import { LIFECYCLE_STAGE_LABELS } from "@shared/schema";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Lock } from "lucide-react";

const STAGE_ORDER: CaseLifecycleStage[] = [
  "intake",
  "assessment",
  "active_treatment",
  "rtw_transition",
  "maintenance",
];

const STAGE_COLORS: Record<CaseLifecycleStage, string> = {
  intake: "bg-slate-500",
  assessment: "bg-blue-500",
  active_treatment: "bg-amber-500",
  rtw_transition: "bg-purple-500",
  maintenance: "bg-teal-500",
  closed_rtw: "bg-green-500",
  closed_medical_retirement: "bg-gray-500",
  closed_terminated: "bg-red-500",
  closed_claim_denied: "bg-orange-500",
  closed_other: "bg-gray-500",
};

const CLOSED_STAGES = new Set<CaseLifecycleStage>([
  "closed_rtw", "closed_medical_retirement", "closed_terminated", "closed_claim_denied", "closed_other",
]);

interface LifecycleStepperProps {
  currentStage: CaseLifecycleStage;
  changedAt?: string;
  changedBy?: string;
  reason?: string;
  className?: string;
}

export function LifecycleStepper({ currentStage, changedAt, changedBy, reason, className }: LifecycleStepperProps) {
  const isClosed = CLOSED_STAGES.has(currentStage);
  const currentIdx = STAGE_ORDER.indexOf(currentStage);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Stepper */}
      {isClosed ? (
        <div className="flex items-center gap-2">
          <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", STAGE_COLORS[currentStage])} />
          <span className="text-sm font-medium">{LIFECYCLE_STAGE_LABELS[currentStage]}</span>
          <span className="text-xs text-muted-foreground ml-1">— case closed</span>
        </div>
      ) : (
        <div className="flex items-center gap-0">
          {STAGE_ORDER.map((stage, idx) => {
            const isCompleted = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const isFuture = idx > currentIdx;
            const isLast = idx === STAGE_ORDER.length - 1;

            return (
              <div key={stage} className="flex items-center flex-1 min-w-0">
                {/* Step dot + label */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                      isCompleted ? STAGE_COLORS[stage] + " text-white"
                        : isCurrent ? STAGE_COLORS[stage] + " text-white ring-4 ring-offset-1 ring-current/30"
                        : "bg-muted text-muted-foreground"
                    )}
                    title={LIFECYCLE_STAGE_LABELS[stage]}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isFuture ? (
                      <span className="text-xs font-bold">{idx + 1}</span>
                    ) : (
                      <span className="text-xs font-bold">{idx + 1}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs text-center leading-tight max-w-[70px] truncate",
                      isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {LIFECYCLE_STAGE_LABELS[stage].replace(" Transition", "").replace("Active ", "")}
                  </span>
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div className={cn("flex-1 h-0.5 mx-1 mt-[-14px]", idx < currentIdx ? "bg-primary/60" : "bg-border")} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Sub-label: changed when */}
      {changedAt && (
        <p className="text-xs text-muted-foreground">
          Stage set {new Date(changedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
          {changedBy && changedBy !== "system:migration" ? ` by ${changedBy}` : ""}
          {reason ? ` — ${reason}` : ""}
        </p>
      )}
    </div>
  );
}
