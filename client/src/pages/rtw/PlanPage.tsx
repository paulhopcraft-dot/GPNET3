/**
 * PlanPage
 * Route: /rtw/plans/:planId
 * Full plan display page with print/PDF export
 */

import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanPrintView } from "@/components/rtw/PlanPrintView";
import { PlanDetailView } from "@/components/rtw/PlanDetailView";

export default function PlanPage(): JSX.Element {
  const { planId } = useParams<{ planId: string }>();

  if (!planId) {
    return (
      <div className="container mx-auto py-6 max-w-5xl">
        <div className="text-center text-muted-foreground">Plan ID required</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      {/* Header with back button */}
      <div className="flex items-center gap-4 mb-6 print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/rtw-planner">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to RTW Planner
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Return to Work Plan</h1>
      </div>

      {/* Print view with controls wrapping the full content */}
      {/* ManagerEmailSection within PlanDetailView has print:hidden so won't print */}
      <PlanPrintView planId={planId}>
        <PlanDetailView
          planId={planId}
          showEmailSection={true}
        />
      </PlanPrintView>
    </div>
  );
}
