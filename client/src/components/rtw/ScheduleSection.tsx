/**
 * ScheduleSection
 * Displays week-by-week schedule for RTW plan (OUT-05)
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "lucide-react";
import { format, addWeeks } from "date-fns";

interface ScheduleWeek {
  weekNumber: number;
  hoursPerDay: number;
  daysPerWeek: number;
}

interface ScheduleSectionProps {
  schedule: ScheduleWeek[];
  startDate: string | Date;
}

export function ScheduleSection({
  schedule,
  startDate,
}: ScheduleSectionProps): JSX.Element {
  const planStartDate = typeof startDate === "string" ? new Date(startDate) : startDate;

  // Calculate date ranges for each week
  const scheduleWithDates = schedule.map((week) => {
    const weekStartDate = addWeeks(planStartDate, week.weekNumber - 1);
    const weekEndDate = addWeeks(weekStartDate, 1);
    return {
      ...week,
      startDate: weekStartDate,
      endDate: weekEndDate,
      totalHours: week.hoursPerDay * week.daysPerWeek,
    };
  });

  // Calculate totals
  const totalHoursAllWeeks = scheduleWithDates.reduce((sum, week) => sum + week.totalHours, 0);
  const totalWeeks = schedule.length;

  return (
    <Card className="plan-section avoid-break">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          Week-by-Week Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        {schedule.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Week</TableHead>
                  <TableHead className="w-[100px]">Hours/Day</TableHead>
                  <TableHead className="w-[100px]">Days/Week</TableHead>
                  <TableHead className="w-[100px]">Total Hours</TableHead>
                  <TableHead>Date Range</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduleWithDates.map((week) => (
                  <TableRow key={week.weekNumber}>
                    <TableCell className="font-medium">Week {week.weekNumber}</TableCell>
                    <TableCell>{week.hoursPerDay}</TableCell>
                    <TableCell>{week.daysPerWeek}</TableCell>
                    <TableCell className="font-medium">{week.totalHours} hrs</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(week.startDate, "d MMM")} - {format(week.endDate, "d MMM yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Summary row */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t text-sm">
              <span className="text-muted-foreground">
                Total Duration: <span className="font-medium text-foreground">{totalWeeks} weeks</span>
              </span>
              <span className="text-muted-foreground">
                Total Scheduled Hours: <span className="font-medium text-foreground">{totalHoursAllWeeks} hrs</span>
              </span>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground italic">No schedule defined</p>
        )}
      </CardContent>
    </Card>
  );
}
