/**
 * PlanSummaryHeader
 * Displays worker, role, and injury details for RTW plan (OUT-01)
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Building2, Calendar, Briefcase, FileText } from "lucide-react";
import { format } from "date-fns";

interface PlanSummaryHeaderProps {
  workerName: string;
  company: string;
  dateOfInjury: string | Date;
  roleName: string;
  planType: string;
  planStatus: "draft" | "pending" | "approved" | "rejected";
  startDate: string | Date;
}

const PLAN_TYPE_LABELS: Record<string, string> = {
  normal_hours: "Normal Hours",
  partial_hours: "Partial Hours",
  graduated_return: "Graduated Return",
};

const STATUS_STYLES: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  draft: { variant: "outline", className: "text-gray-600 border-gray-300" },
  pending: { variant: "outline", className: "text-yellow-700 bg-yellow-50 border-yellow-300" },
  approved: { variant: "outline", className: "text-green-700 bg-green-50 border-green-300" },
  rejected: { variant: "destructive", className: "" },
};

export function PlanSummaryHeader({
  workerName,
  company,
  dateOfInjury,
  roleName,
  planType,
  planStatus,
  startDate,
}: PlanSummaryHeaderProps): JSX.Element {
  const injuryDate = typeof dateOfInjury === "string" ? new Date(dateOfInjury) : dateOfInjury;
  const planStartDate = typeof startDate === "string" ? new Date(startDate) : startDate;
  const statusStyle = STATUS_STYLES[planStatus] || STATUS_STYLES.draft;

  return (
    <Card className="plan-header">
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Return to Work Plan</h1>
            </div>
            <Badge
              variant={statusStyle.variant}
              className={statusStyle.className}
            >
              {planStatus.charAt(0).toUpperCase() + planStatus.slice(1)}
            </Badge>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            {/* Worker */}
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Worker</p>
                <p className="font-medium">{workerName}</p>
              </div>
            </div>

            {/* Company */}
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Company</p>
                <p className="font-medium">{company}</p>
              </div>
            </div>

            {/* Injury Date */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Date of Injury</p>
                <p className="font-medium">{format(injuryDate, "d MMM yyyy")}</p>
              </div>
            </div>

            {/* Role */}
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="font-medium">{roleName}</p>
              </div>
            </div>
          </div>

          {/* Plan type and start date row */}
          <div className="flex items-center gap-6 pt-2 border-t mt-2">
            <div>
              <span className="text-xs text-muted-foreground">Plan Type: </span>
              <span className="font-medium">{PLAN_TYPE_LABELS[planType] || planType}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Start Date: </span>
              <span className="font-medium">{format(planStartDate, "d MMM yyyy")}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
