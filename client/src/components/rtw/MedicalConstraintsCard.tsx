/**
 * MedicalConstraintsCard
 * Displays medical restrictions and constraints for RTW plan (OUT-02)
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, X, Check, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface Constraint {
  category: string;
  capability: "can" | "cannot" | "with_modifications" | "not_assessed";
  notes?: string | null;
}

interface MedicalConstraintsCardProps {
  constraints: Constraint[] | null;
  restrictionReviewDate?: string | Date | null;
  weightLimits?: {
    liftingMaxKg?: number | null;
    carryingMaxKg?: number | null;
  } | null;
  timeRestrictions?: {
    standingMaxMins?: number | null;
    sittingMaxMins?: number | null;
    walkingMaxMins?: number | null;
  } | null;
}

function formatCategory(category: string): string {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function MedicalConstraintsCard({
  constraints,
  restrictionReviewDate,
  weightLimits,
  timeRestrictions,
}: MedicalConstraintsCardProps): JSX.Element {
  const reviewDate = restrictionReviewDate
    ? typeof restrictionReviewDate === "string"
      ? new Date(restrictionReviewDate)
      : restrictionReviewDate
    : null;

  const daysUntilReview = reviewDate ? differenceInDays(reviewDate, new Date()) : null;
  const isReviewSoon = daysUntilReview !== null && daysUntilReview <= 7;

  // Separate constraints by capability
  const cannotPerform = constraints?.filter((c) => c.capability === "cannot") || [];
  const withModifications = constraints?.filter((c) => c.capability === "with_modifications") || [];
  const canPerform = constraints?.filter((c) => c.capability === "can") || [];

  const hasWeightLimits = weightLimits && (weightLimits.liftingMaxKg || weightLimits.carryingMaxKg);
  const hasTimeRestrictions = timeRestrictions &&
    (timeRestrictions.standingMaxMins || timeRestrictions.sittingMaxMins || timeRestrictions.walkingMaxMins);

  return (
    <Card className="plan-section avoid-break">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          Medical Constraints
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Review date warning */}
        {reviewDate && (
          <div
            className={`flex items-center gap-2 p-3 rounded-md ${
              isReviewSoon ? "bg-amber-50 border border-amber-200" : "bg-blue-50 border border-blue-200"
            }`}
          >
            <Clock className={`h-4 w-4 ${isReviewSoon ? "text-amber-600" : "text-blue-600"}`} />
            <div>
              <span className={`text-sm font-medium ${isReviewSoon ? "text-amber-800" : "text-blue-800"}`}>
                Restriction Review Date:{" "}
              </span>
              <span className={`text-sm ${isReviewSoon ? "text-amber-700" : "text-blue-700"}`}>
                {format(reviewDate, "d MMM yyyy")}
                {daysUntilReview !== null && (
                  <span className="ml-1">
                    ({daysUntilReview <= 0 ? "overdue" : `${daysUntilReview} days remaining`})
                  </span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Cannot perform section */}
        {cannotPerform.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-red-700 mb-2">Cannot Perform</h4>
            <div className="space-y-1">
              {cannotPerform.map((c) => (
                <div key={c.category} className="flex items-start gap-2">
                  <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-sm font-medium">{formatCategory(c.category)}</span>
                    {c.notes && <p className="text-xs text-muted-foreground">{c.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* With modifications section */}
        {withModifications.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-yellow-700 mb-2">With Modifications</h4>
            <div className="space-y-1">
              {withModifications.map((c) => (
                <div key={c.category} className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-sm font-medium">{formatCategory(c.category)}</span>
                    {c.notes && <p className="text-xs text-muted-foreground">{c.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weight limits */}
        {hasWeightLimits && (
          <div>
            <h4 className="text-sm font-medium text-amber-700 mb-2">Weight Limits</h4>
            <div className="flex gap-4">
              {weightLimits?.liftingMaxKg && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Lifting: </span>
                  <span className="font-medium">{weightLimits.liftingMaxKg} kg max</span>
                </div>
              )}
              {weightLimits?.carryingMaxKg && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Carrying: </span>
                  <span className="font-medium">{weightLimits.carryingMaxKg} kg max</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Time restrictions */}
        {hasTimeRestrictions && (
          <div>
            <h4 className="text-sm font-medium text-amber-700 mb-2">Time Limits</h4>
            <div className="flex flex-wrap gap-4">
              {timeRestrictions?.standingMaxMins && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Standing: </span>
                  <span className="font-medium">{timeRestrictions.standingMaxMins} mins max</span>
                </div>
              )}
              {timeRestrictions?.sittingMaxMins && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Sitting: </span>
                  <span className="font-medium">{timeRestrictions.sittingMaxMins} mins max</span>
                </div>
              )}
              {timeRestrictions?.walkingMaxMins && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Walking: </span>
                  <span className="font-medium">{timeRestrictions.walkingMaxMins} mins max</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Can perform section */}
        {canPerform.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-green-700 mb-2">Can Perform</h4>
            <div className="space-y-1">
              {canPerform.map((c) => (
                <div key={c.category} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{formatCategory(c.category)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No constraints */}
        {(!constraints || constraints.length === 0) && !hasWeightLimits && !hasTimeRestrictions && (
          <p className="text-sm text-muted-foreground italic">No medical constraints recorded</p>
        )}
      </CardContent>
    </Card>
  );
}
