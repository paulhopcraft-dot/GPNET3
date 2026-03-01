/**
 * PlanPreview
 * Step 4 of RTW Plan Wizard
 * Shows complete plan summary before save
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarDays, Clock, Briefcase, AlertCircle, CheckCircle2 } from "lucide-react";

interface Props {
  planType: string;
  startDate: string;
  schedule: Array<{
    weekNumber: number;
    hoursPerDay: number;
    daysPerWeek: number;
  }>;
  selectedDuties: Array<{
    dutyId: string;
    dutyName: string;
    suitability: string;
    modificationNotes: string | null;
  }>;
  excludedDuties: Array<{
    dutyId: string;
    dutyName: string;
    excludedReason: string | null;
  }>;
}

const PLAN_TYPE_LABELS: Record<string, string> = {
  normal_hours: "Normal Hours",
  partial_hours: "Partial Hours",
  graduated_return: "Graduated Return",
};

export function PlanPreview({
  planType,
  startDate,
  schedule,
  selectedDuties,
  excludedDuties,
}: Props) {
  const totalWeeks = schedule.length;
  const maxHours = schedule.length > 0 ? Math.max(...schedule.map((w) => w.hoursPerDay)) : 0;
  const totalDuties = selectedDuties.length;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Plan Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-semibold">
                {PLAN_TYPE_LABELS[planType] || planType}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-semibold">
                {totalWeeks} weeks (up to {maxHours} hrs/day)
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Duties Included
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-semibold">{totalDuties} duties</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Week-by-Week Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Week</TableHead>
                <TableHead>Hours/Day</TableHead>
                <TableHead>Days/Week</TableHead>
                <TableHead>Total Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule.map((week) => (
                <TableRow key={week.weekNumber}>
                  <TableCell className="font-medium">Week {week.weekNumber}</TableCell>
                  <TableCell>{week.hoursPerDay}</TableCell>
                  <TableCell>{week.daysPerWeek}</TableCell>
                  <TableCell className="font-medium">
                    {week.hoursPerDay * week.daysPerWeek} hours
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Duties preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Included Duties</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {selectedDuties.map((duty) => (
              <div key={duty.dutyId} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <span className="font-medium">{duty.dutyName}</span>
                  {duty.suitability === "suitable_with_modification" && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      With modification
                    </Badge>
                  )}
                  {duty.modificationNotes && (
                    <p className="text-sm text-muted-foreground">{duty.modificationNotes}</p>
                  )}
                </div>
              </div>
            ))}
            {selectedDuties.length === 0 && (
              <p className="text-sm text-muted-foreground">No duties selected</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Excluded duties (GEN-06) */}
      {excludedDuties.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="text-base text-amber-800">
              Excluded Duties ({excludedDuties.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {excludedDuties.map((duty) => (
                <div key={duty.dutyId} className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-medium">{duty.dutyName}</span>
                    {duty.excludedReason && (
                      <p className="text-sm text-muted-foreground">{duty.excludedReason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save reminder */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Ready to Save</p>
              <ul className="text-sm text-blue-800 mt-2 space-y-1">
                <li>Plan will be saved as draft</li>
                <li>Can be edited before submission</li>
                <li>Manager approval required to activate</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
