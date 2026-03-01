/**
 * ScheduleEditor
 * Step 2 of RTW Plan Wizard
 * Week-by-week schedule editor with validation
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { format, addWeeks, parseISO } from "date-fns";

interface WeekSchedule {
  weekNumber: number;
  hoursPerDay: number;
  daysPerWeek: number;
}

interface Props {
  schedule: WeekSchedule[];
  onScheduleChange: (schedule: WeekSchedule[]) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  restrictions: {
    maxHoursPerDay: number | null;
    maxDaysPerWeek: number | null;
  };
  restrictionReviewDate: string | null;
}

export function ScheduleEditor({
  schedule,
  onScheduleChange,
  startDate,
  onStartDateChange,
  restrictions,
  restrictionReviewDate,
}: Props) {
  const updateWeek = (
    weekNumber: number,
    field: "hoursPerDay" | "daysPerWeek",
    value: number
  ) => {
    onScheduleChange(
      schedule.map((w) => (w.weekNumber === weekNumber ? { ...w, [field]: value } : w))
    );
  };

  const addWeekRow = () => {
    const nextWeek = schedule.length + 1;
    const lastWeek = schedule[schedule.length - 1];
    onScheduleChange([
      ...schedule,
      {
        weekNumber: nextWeek,
        hoursPerDay: lastWeek?.hoursPerDay || 4,
        daysPerWeek: lastWeek?.daysPerWeek || 3,
      },
    ]);
  };

  const removeWeek = (weekNumber: number) => {
    onScheduleChange(
      schedule
        .filter((w) => w.weekNumber !== weekNumber)
        .map((w, i) => ({ ...w, weekNumber: i + 1 }))
    );
  };

  const getWeekDates = (weekNum: number): string => {
    try {
      const start = addWeeks(parseISO(startDate), weekNum - 1);
      const end = addWeeks(start, 1);
      return `${format(start, "MMM d")} - ${format(end, "MMM d")}`;
    } catch {
      return "";
    }
  };

  const exceedsRestrictions = (week: WeekSchedule): boolean => {
    if (restrictions.maxHoursPerDay && week.hoursPerDay > restrictions.maxHoursPerDay) {
      return true;
    }
    if (restrictions.maxDaysPerWeek && week.daysPerWeek > restrictions.maxDaysPerWeek) {
      return true;
    }
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Start date */}
      <div className="grid gap-2">
        <Label htmlFor="startDate">Plan Start Date</Label>
        <Input
          id="startDate"
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="w-48"
        />
      </div>

      {/* Restriction review warning */}
      {restrictionReviewDate && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800">
              Medical restrictions review date:{" "}
              {format(parseISO(restrictionReviewDate), "MMM d, yyyy")}. Plan should not
              extend beyond this date.
            </span>
          </CardContent>
        </Card>
      )}

      {/* Schedule table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Week-by-Week Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Week</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead className="w-32">Hours/Day</TableHead>
                <TableHead className="w-32">Days/Week</TableHead>
                <TableHead className="w-24">Total</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule.map((week) => (
                <TableRow
                  key={week.weekNumber}
                  className={exceedsRestrictions(week) ? "bg-red-50" : ""}
                >
                  <TableCell className="font-medium">Week {week.weekNumber}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {getWeekDates(week.weekNumber)}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={week.hoursPerDay}
                      onChange={(e) =>
                        updateWeek(
                          week.weekNumber,
                          "hoursPerDay",
                          parseInt(e.target.value) || 1
                        )
                      }
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      max={7}
                      value={week.daysPerWeek}
                      onChange={(e) =>
                        updateWeek(
                          week.weekNumber,
                          "daysPerWeek",
                          parseInt(e.target.value) || 1
                        )
                      }
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {week.hoursPerDay * week.daysPerWeek} hrs
                  </TableCell>
                  <TableCell>
                    {schedule.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeWeek(week.weekNumber)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button variant="outline" className="mt-4" onClick={addWeekRow}>
            <Plus className="h-4 w-4 mr-2" /> Add Week
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
