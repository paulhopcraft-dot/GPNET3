/**
 * Phase 5.2 — Portfolio Summary
 * Top-level employer/HR dashboard metrics bar.
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "./ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Users, ShieldAlert, AlertTriangle, FileWarning } from "lucide-react";

interface PortfolioData {
  activeClaims: number;
  newThisMonth: number;
  complianceScore: number;
  complianceDelta: number | null;
  approachingTermination: number;
  totalCases: number;
}

function TrendBadge({ value, invert = false }: { value: number | null; invert?: boolean }) {
  if (value === null) return null;
  const positive = invert ? value < 0 : value > 0;
  const negative = invert ? value > 0 : value < 0;
  return (
    <span className={cn(
      "flex items-center gap-0.5 text-xs font-medium",
      positive ? "text-green-600" : negative ? "text-red-500" : "text-muted-foreground"
    )}>
      {positive ? <TrendingUp className="h-3 w-3" /> : negative ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
      {value > 0 ? "+" : ""}{value}
    </span>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subLabel?: string;
  trend?: number | null;
  trendInvert?: boolean;
  accent?: "default" | "warning" | "danger" | "success";
}

function MetricCard({ icon, label, value, subLabel, trend, trendInvert, accent = "default" }: MetricCardProps) {
  return (
    <Card className={cn(
      "flex-1",
      accent === "danger" && "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20",
      accent === "warning" && "border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20",
      accent === "success" && "border-green-200 bg-green-50/50 dark:border-green-900/50 dark:bg-green-950/20",
    )}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className={cn(
              "text-2xl font-bold",
              accent === "danger" ? "text-red-600" : accent === "warning" ? "text-amber-600" : "text-foreground"
            )}>
              {value}
            </p>
            {(subLabel || trend !== undefined) && (
              <div className="flex items-center gap-1.5">
                {subLabel && <span className="text-xs text-muted-foreground">{subLabel}</span>}
                {trend !== undefined && <TrendBadge value={trend ?? null} invert={trendInvert} />}
              </div>
            )}
          </div>
          <div className={cn(
            "p-2 rounded-lg",
            accent === "danger" ? "bg-red-100 text-red-600" :
            accent === "warning" ? "bg-amber-100 text-amber-600" :
            accent === "success" ? "bg-green-100 text-green-600" :
            "bg-primary/10 text-primary"
          )}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PortfolioSummary() {
  const { data, isLoading } = useQuery<PortfolioData>({
    queryKey: ["/api/hr/portfolio"],
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  const complianceAccent =
    data.complianceScore >= 80 ? "success" :
    data.complianceScore >= 60 ? "default" :
    "warning";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <MetricCard
        icon={<Users className="h-5 w-5" />}
        label="Active Claims"
        value={data.activeClaims}
        subLabel={`+${data.newThisMonth} this month`}
        trend={data.newThisMonth}
        trendInvert
      />
      <MetricCard
        icon={<ShieldAlert className="h-5 w-5" />}
        label="Compliance Score"
        value={`${data.complianceScore}%`}
        subLabel="Across active cases"
        trend={data.complianceDelta}
        trendInvert={false}
        accent={complianceAccent}
      />
      <MetricCard
        icon={<AlertTriangle className="h-5 w-5" />}
        label="Approaching 52wk"
        value={data.approachingTermination}
        subLabel="≥48 weeks off work"
        accent={data.approachingTermination > 0 ? "warning" : "default"}
      />
      <MetricCard
        icon={<FileWarning className="h-5 w-5" />}
        label="Total Cases"
        value={data.totalCases}
        subLabel={`${data.activeClaims} open`}
      />
    </div>
  );
}
