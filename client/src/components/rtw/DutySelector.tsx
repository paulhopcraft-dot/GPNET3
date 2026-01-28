/**
 * DutySelector
 * Step 3 of RTW Plan Wizard
 * Duty selection with suitability indicators
 */

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  getSuitabilityColor,
  getSuitabilityBgColor,
  formatSuitability,
} from "@/lib/suitabilityUtils";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface Duty {
  dutyId: string;
  dutyName: string;
  suitability: string;
  isIncluded: boolean;
  modificationNotes: string | null;
  excludedReason: string | null;
}

interface Props {
  duties: Duty[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

const SUITABILITY_ICONS: Record<string, typeof CheckCircle2> = {
  suitable: CheckCircle2,
  suitable_with_modification: AlertTriangle,
  not_suitable: XCircle,
};

export function DutySelector({ duties, selectedIds, onSelectionChange }: Props) {
  const includableDuties = duties.filter((d) => d.suitability !== "not_suitable");
  const excludedDuties = duties.filter((d) => d.suitability === "not_suitable");

  const toggleDuty = (dutyId: string) => {
    if (selectedIds.includes(dutyId)) {
      onSelectionChange(selectedIds.filter((id) => id !== dutyId));
    } else {
      onSelectionChange([...selectedIds, dutyId]);
    }
  };

  const selectAll = () => {
    onSelectionChange(includableDuties.map((d) => d.dutyId));
  };

  const selectNone = () => {
    onSelectionChange([]);
  };

  return (
    <div className="space-y-6">
      {/* Selection actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={selectAll}
          className="text-sm text-blue-600 hover:underline"
        >
          Select all suitable
        </button>
        <span className="text-muted-foreground">|</span>
        <button
          type="button"
          onClick={selectNone}
          className="text-sm text-blue-600 hover:underline"
        >
          Clear selection
        </button>
      </div>

      {/* Includable duties */}
      <div className="space-y-2">
        <h3 className="font-medium">Available Duties ({includableDuties.length})</h3>
        <div className="grid gap-2">
          {includableDuties.map((duty) => {
            const Icon = SUITABILITY_ICONS[duty.suitability] || CheckCircle2;
            const colorClass = getSuitabilityColor(
              duty.suitability as "suitable" | "suitable_with_modification" | "not_suitable"
            );

            return (
              <Label
                key={duty.dutyId}
                htmlFor={duty.dutyId}
                className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent ${
                  selectedIds.includes(duty.dutyId) ? "border-primary bg-accent" : ""
                }`}
              >
                <Checkbox
                  id={duty.dutyId}
                  checked={selectedIds.includes(duty.dutyId)}
                  onCheckedChange={() => toggleDuty(duty.dutyId)}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${colorClass}`} />
                    <span className="font-medium">{duty.dutyName}</span>
                    <Badge
                      variant="outline"
                      className={getSuitabilityBgColor(
                        duty.suitability as
                          | "suitable"
                          | "suitable_with_modification"
                          | "not_suitable"
                      )}
                    >
                      {formatSuitability(
                        duty.suitability as
                          | "suitable"
                          | "suitable_with_modification"
                          | "not_suitable"
                      )}
                    </Badge>
                  </div>
                  {duty.modificationNotes && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {duty.modificationNotes}
                    </p>
                  )}
                </div>
              </Label>
            );
          })}
        </div>
      </div>

      {/* Excluded duties */}
      {excludedDuties.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-muted-foreground">
            Excluded Duties ({excludedDuties.length})
          </h3>
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="space-y-2">
                {excludedDuties.map((duty) => (
                  <div key={duty.dutyId} className="flex items-start gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                    <div>
                      <span className="font-medium">{duty.dutyName}</span>
                      {duty.excludedReason && (
                        <p className="text-muted-foreground">{duty.excludedReason}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
