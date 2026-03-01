/**
 * DutiesSection
 * Displays included and excluded duties for RTW plan (OUT-04, OUT-06)
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Briefcase } from "lucide-react";

interface IncludedDuty {
  dutyId: string;
  dutyName: string;
  suitability: "suitable" | "suitable_with_modification";
  modificationNotes?: string | null;
}

interface ExcludedDuty {
  dutyId: string;
  dutyName: string;
  excludedReason?: string | null;
}

interface DutiesSectionProps {
  includedDuties: IncludedDuty[];
  excludedDuties: ExcludedDuty[];
}

export function DutiesSection({
  includedDuties,
  excludedDuties,
}: DutiesSectionProps): JSX.Element {
  const includedCount = includedDuties.length;
  const excludedCount = excludedDuties.length;

  return (
    <div className="plan-section space-y-4">
      {/* Included duties */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-green-600" />
              Included Duties
            </CardTitle>
            <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200">
              {includedCount} {includedCount === 1 ? "duty" : "duties"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {includedDuties.length > 0 ? (
            <div className="space-y-3">
              {includedDuties.map((duty) => (
                <div key={duty.dutyId} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{duty.dutyName}</span>
                      {duty.suitability === "suitable_with_modification" && (
                        <Badge
                          variant="outline"
                          className="text-xs text-yellow-700 bg-yellow-50 border-yellow-200"
                        >
                          With modification
                        </Badge>
                      )}
                    </div>
                    {duty.modificationNotes && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {duty.modificationNotes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No duties included</p>
          )}
        </CardContent>
      </Card>

      {/* Excluded duties */}
      {excludedDuties.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                Excluded Duties
              </CardTitle>
              <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200">
                {excludedCount} {excludedCount === 1 ? "duty" : "duties"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {excludedDuties.map((duty) => (
                <div key={duty.dutyId} className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="font-medium text-sm">{duty.dutyName}</span>
                    {duty.excludedReason && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {duty.excludedReason}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
