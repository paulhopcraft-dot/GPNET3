/**
 * PlanTypeSelector
 * Step 1 of RTW Plan Wizard
 * Shows auto-recommendation with manual override options
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

interface Props {
  recommendation: {
    planType: string;
    reason: string;
    confidence: string;
    warnings: string[];
  };
  selectedType: string;
  onTypeChange: (type: string) => void;
  restrictions: {
    maxHoursPerDay: number | null;
    maxDaysPerWeek: number | null;
  };
}

const PLAN_TYPES = [
  {
    value: "normal_hours",
    label: "Normal Hours",
    description: "Full 8 hours/day, 5 days/week from start",
    icon: CheckCircle2,
  },
  {
    value: "partial_hours",
    label: "Partial Hours",
    description: "Reduced but consistent hours throughout",
    icon: Clock,
  },
  {
    value: "graduated_return",
    label: "Graduated Return",
    description: "Progressive increase: 4 -> 6 -> 8 hours/day",
    icon: Clock,
  },
];

export function PlanTypeSelector({
  recommendation,
  selectedType,
  onTypeChange,
  restrictions,
}: Props) {
  const isRecommended = (type: string) => type === recommendation.planType;

  return (
    <div className="space-y-6">
      {/* Recommendation banner */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">
                Recommended:{" "}
                {PLAN_TYPES.find((t) => t.value === recommendation.planType)?.label}
              </p>
              <p className="text-sm text-blue-700 mt-1">{recommendation.reason}</p>
              {recommendation.warnings.length > 0 && (
                <div className="mt-2 space-y-1">
                  {recommendation.warnings.map((w, i) => (
                    <p key={i} className="text-sm text-amber-700 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {w}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current restrictions */}
      {(restrictions.maxHoursPerDay || restrictions.maxDaysPerWeek) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Current Medical Restrictions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm">
              {restrictions.maxHoursPerDay && (
                <span>Max {restrictions.maxHoursPerDay} hours/day</span>
              )}
              {restrictions.maxDaysPerWeek && (
                <span>Max {restrictions.maxDaysPerWeek} days/week</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan type selection */}
      <RadioGroup value={selectedType} onValueChange={onTypeChange}>
        <div className="grid gap-4">
          {PLAN_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <Label
                key={type.value}
                htmlFor={type.value}
                className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer hover:bg-accent ${
                  selectedType === type.value ? "border-primary bg-accent" : ""
                }`}
              >
                <RadioGroupItem value={type.value} id={type.value} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{type.label}</span>
                    {isRecommended(type.value) && (
                      <Badge variant="secondary">Recommended</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                </div>
              </Label>
            );
          })}
        </div>
      </RadioGroup>
    </div>
  );
}
