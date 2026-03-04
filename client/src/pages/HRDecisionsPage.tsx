/**
 * Phase 5.1 — HR Decisions Queue Page
 *
 * Surfaces cases requiring HR/employer input, sorted by urgency.
 * Plain-English labels, rationale, and one-click actions.
 */

import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PortfolioSummary } from "@/components/PortfolioSummary";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Clock, ExternalLink, Inbox } from "lucide-react";
interface HRDecisionItem {
  id: string;
  caseId: string;
  workerName: string;
  company: string;
  injuryType?: string;
  daysOffWork: number;
  triggerCode: string;
  label: string;
  rationale: string;
  legislativeRef?: string;
  deadline?: string;
  urgency: "critical" | "high" | "medium";
  actions: Array<{ label: string; href: string }>;
}

const URGENCY_CONFIG = {
  critical: {
    badge: "bg-red-100 text-red-700 border-red-300",
    border: "border-l-red-500",
    icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
    label: "Critical",
  },
  high: {
    badge: "bg-amber-100 text-amber-700 border-amber-300",
    border: "border-l-amber-500",
    icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    label: "High Priority",
  },
  medium: {
    badge: "bg-blue-100 text-blue-700 border-blue-300",
    border: "border-l-blue-400",
    icon: <Clock className="h-4 w-4 text-blue-500" />,
    label: "Review When Able",
  },
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function DecisionCard({ item }: { item: HRDecisionItem }) {
  const cfg = URGENCY_CONFIG[item.urgency as keyof typeof URGENCY_CONFIG];
  const deadlinePast = item.deadline && new Date(item.deadline) < new Date();

  return (
    <Card className={cn("border-l-4 transition-shadow hover:shadow-md", cfg.border)}>
      <CardContent className="pt-4 pb-4">
        <div className="flex flex-col gap-3">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {cfg.icon}
                <span className="font-semibold text-foreground">{item.label}</span>
                <Badge variant="outline" className={cn("text-xs", cfg.badge)}>
                  {cfg.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {item.workerName} · {item.company} · {item.daysOffWork} days off work
              </p>
            </div>

            {item.deadline && (
              <div className={cn(
                "text-xs font-medium px-2 py-1 rounded-md",
                deadlinePast ? "bg-red-100 text-red-700" : "bg-amber-50 text-amber-700 border border-amber-200"
              )}>
                {deadlinePast ? "Overdue: " : "Due: "}
                {fmtDate(item.deadline)}
              </div>
            )}
          </div>

          {/* Rationale */}
          <p className="text-sm text-muted-foreground leading-relaxed">{item.rationale}</p>

          {/* Legislative reference */}
          {item.legislativeRef && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Legislative reference:</span> {item.legislativeRef}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {item.actions.map((action: { label: string; href: string }) => (
              <Link key={action.href} to={action.href}>
                <Button
                  variant={action.label === "View Case" ? "outline" : "default"}
                  size="sm"
                  className="h-8 gap-1.5"
                >
                  {action.label}
                  {action.label !== "View Case" && <ExternalLink className="h-3 w-3" />}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HRDecisionsPage() {
  const { data, isLoading } = useQuery<{ decisions: HRDecisionItem[]; total: number }>({
    queryKey: ["/api/hr/decisions"],
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const decisions = data?.decisions ?? [];
  const critical = decisions.filter(d => d.urgency === "critical");
  const high = decisions.filter(d => d.urgency === "high");
  const medium = decisions.filter(d => d.urgency === "medium");

  return (
    <PageLayout
      title="Decisions Required"
      subtitle="Cases requiring your review or input, sorted by urgency"
    >
      <div className="space-y-6">
        {/* Portfolio summary */}
        <PortfolioSummary />

        {/* Decision queue */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : decisions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
              <p className="font-medium text-foreground">No decisions required</p>
              <p className="text-sm text-muted-foreground mt-1">
                All cases are up to date. Check back later.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {critical.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  Requires Immediate Attention ({critical.length})
                </h2>
                <div className="space-y-3">
                  {critical.map(item => <DecisionCard key={item.id} item={item} />)}
                </div>
              </section>
            )}

            {high.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-amber-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  High Priority ({high.length})
                </h2>
                <div className="space-y-3">
                  {high.map(item => <DecisionCard key={item.id} item={item} />)}
                </div>
              </section>
            )}

            {medium.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Inbox className="h-4 w-4" />
                  Review When Able ({medium.length})
                </h2>
                <div className="space-y-3">
                  {medium.map(item => <DecisionCard key={item.id} item={item} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
