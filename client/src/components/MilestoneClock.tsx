import type { WorkerCase } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { cn } from "@/lib/utils";

const MILESTONES = [
  { day: 91,  label: "Day 91",  short: "13wk",  description: "80% payment step-down (s114)" },
  { day: 364, label: "Day 364", short: "52wk",  description: "75% step-down + termination protection expires (s114(2), s242)" },
  { day: 910, label: "Day 910", short: "130wk", description: "Payment cessation risk (s114(3))" },
];

function getMilestoneState(dateOfInjury: string) {
  const today = Date.now();
  const start = new Date(dateOfInjury).getTime();
  const daysSince = Math.floor((today - start) / 86_400_000);
  const next = MILESTONES.find(m => m.day > daysSince) ?? null;
  const prev = [...MILESTONES].reverse().find(m => m.day <= daysSince) ?? null;
  const rangeStart = prev?.day ?? 0;
  const rangeEnd = next?.day ?? MILESTONES[MILESTONES.length - 1].day;
  const progressPct = next
    ? Math.round(((daysSince - rangeStart) / (rangeEnd - rangeStart)) * 100)
    : 100;
  const passed = MILESTONES.filter(m => m.day <= daysSince);
  return { daysSince, next, prev, progressPct, passed };
}

function urgencyClass(daysRemaining: number | null): string {
  if (daysRemaining === null) return "text-emerald-600";
  if (daysRemaining <= 14) return "text-red-600 font-semibold";
  if (daysRemaining <= 30) return "text-amber-600 font-semibold";
  return "text-slate-600";
}

function pillClass(daysRemaining: number | null): string {
  if (daysRemaining === null) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (daysRemaining <= 14) return "bg-red-50 text-red-700 border-red-200";
  if (daysRemaining <= 30) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function progressBarClass(daysRemaining: number | null): string {
  if (daysRemaining === null) return "[&>div]:bg-emerald-500";
  if (daysRemaining <= 14) return "[&>div]:bg-red-500";
  if (daysRemaining <= 30) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-blue-500";
}

interface MilestoneClockProps {
  workerCase: WorkerCase;
}

export function MilestoneClock({ workerCase }: MilestoneClockProps) {
  const { daysSince, next, passed, progressPct } = getMilestoneState(
    workerCase.dateOfInjury as string
  );

  const daysRemaining = next ? next.day - daysSince : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="material-symbols-outlined text-primary">schedule</span>
          Compliance Milestone Clock
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Current day + next milestone pill */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-card-foreground">Day {daysSince}</span>
          {next ? (
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-full border",
                pillClass(daysRemaining)
              )}
            >
              {daysRemaining !== null && daysRemaining <= 0
                ? `${next.label} overdue`
                : `${daysRemaining}d to ${next.label}`}
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
              All major milestones passed
            </span>
          )}
        </div>

        {/* Progress bar */}
        <Progress
          value={progressPct}
          className={cn("h-2", progressBarClass(daysRemaining))}
        />

        {/* Milestone markers */}
        <div className="space-y-1">
          {MILESTONES.map(m => {
            const isPassed = daysSince >= m.day;
            const isNext = next?.day === m.day;
            return (
              <div key={m.day} className="flex items-start gap-2 text-xs">
                <span className={cn(
                  "mt-0.5 flex-shrink-0",
                  isPassed ? "text-emerald-500" : isNext ? urgencyClass(daysRemaining) : "text-slate-300"
                )}>
                  {isPassed ? "●" : isNext ? "◑" : "○"}
                </span>
                <div className="flex-1 min-w-0">
                  <span className={cn(
                    "font-medium",
                    isPassed ? "text-emerald-600" : isNext ? urgencyClass(daysRemaining) : "text-slate-400"
                  )}>
                    {m.label}
                  </span>
                  <span className={cn(
                    "ml-1",
                    isPassed ? "text-emerald-500" : isNext ? "text-muted-foreground" : "text-slate-300"
                  )}>
                    — {m.description}
                  </span>
                </div>
                {isPassed && (
                  <span className="flex-shrink-0 text-emerald-500 text-xs">✓</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Next milestone description */}
        {next && daysRemaining !== null && (
          <p className={cn("text-xs border-t pt-2", urgencyClass(daysRemaining))}>
            {daysRemaining <= 0
              ? `Overdue: ${next.description}`
              : `In ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}: ${next.description}`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
