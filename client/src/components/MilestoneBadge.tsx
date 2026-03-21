import { cn } from "@/lib/utils";

const MILESTONES = [
  { day: 91,  label: "Day 91" },
  { day: 364, label: "Day 364" },
  { day: 910, label: "Day 910" },
];

function getNextMilestone(dateOfInjury: string) {
  const daysSince = Math.floor((Date.now() - new Date(dateOfInjury).getTime()) / 86_400_000);
  const next = MILESTONES.find(m => m.day > daysSince) ?? null;
  const daysRemaining = next ? next.day - daysSince : null;
  return { daysSince, next, daysRemaining };
}

function badgeClass(daysRemaining: number | null): string {
  if (daysRemaining === null) return "text-emerald-600";
  if (daysRemaining <= 14) return "text-red-500";
  if (daysRemaining <= 30) return "text-amber-500";
  return "text-muted-foreground";
}

interface MilestoneBadgeProps {
  dateOfInjury: string | Date;
}

export function MilestoneBadge({ dateOfInjury }: MilestoneBadgeProps) {
  const { next, daysRemaining } = getNextMilestone(dateOfInjury as string);

  if (!next) {
    return (
      <span className="text-xs text-emerald-600">all passed</span>
    );
  }

  return (
    <span className={cn("text-xs", badgeClass(daysRemaining))}>
      → {next.label}
      {daysRemaining !== null && daysRemaining <= 30 && (
        <span className="ml-1">({daysRemaining}d)</span>
      )}
    </span>
  );
}
