import type { WorkerCase } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, Info, ClipboardList } from "lucide-react";

interface CurrentCapacityCardProps {
  workerCase: WorkerCase;
  className?: string;
}

export function CurrentCapacityCard({ workerCase, className }: CurrentCapacityCardProps) {
  const constraints = workerCase.medicalConstraints ?? workerCase.clinical_status_json?.medicalConstraints;
  const capacity = workerCase.functionalCapacity ?? workerCase.clinical_status_json?.functionalCapacity;
  const cert = workerCase.latestCertificate;

  const certDate = cert?.endDate
    ? new Date(cert.endDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
    : cert?.startDate
    ? new Date(cert.startDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
    : null;

  // Build allowed/prohibited lists from constraints
  const allowed: string[] = [];
  const prohibited: string[] = [];

  if (constraints) {
    if (constraints.suitableForSeatedWork) allowed.push("Seated / desk work");
    if (constraints.suitableForLightDuties) allowed.push("Light duties");
    if (constraints.suitableForModifiedHours) allowed.push("Modified hours");
    if (constraints.noLiftingOverKg != null) prohibited.push(`No lifting over ${constraints.noLiftingOverKg}kg`);
    if (constraints.noBending) prohibited.push("No bending");
    if (constraints.noTwisting) prohibited.push("No twisting");
    if (constraints.noProlongedStanding) prohibited.push("No prolonged standing");
    if (constraints.noProlongedSitting) prohibited.push("No prolonged sitting");
    if (constraints.noDriving) prohibited.push("No driving");
    if (constraints.noClimbing) prohibited.push("No climbing");
    if (constraints.otherConstraints) prohibited.push(constraints.otherConstraints);
  }

  if (capacity) {
    if (capacity.maxWorkHoursPerDay != null && capacity.maxWorkHoursPerDay > 0) {
      allowed.push(`Up to ${capacity.maxWorkHoursPerDay}hrs/day`);
    }
    if (capacity.maxWorkDaysPerWeek != null && capacity.maxWorkDaysPerWeek > 0) {
      allowed.push(`${capacity.maxWorkDaysPerWeek} days/week`);
    }
    if (capacity.canLiftKg != null && capacity.canLiftKg > 0) {
      allowed.push(`Can lift up to ${capacity.canLiftKg}kg`);
    }
  }

  // If no structured data, try plain-language extraction from workStatus/currentStatus
  const noData = allowed.length === 0 && prohibited.length === 0;

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-semibold">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            Current Capacity
          </div>
          {certDate && (
            <span className="text-xs font-normal text-muted-foreground">Updated: {certDate}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {noData ? (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>No capacity data yet. Upload a medical certificate to populate restrictions.</span>
          </div>
        ) : (
          <>
            {allowed.length > 0 && (
              <ul className="space-y-1">
                {allowed.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
            {prohibited.length > 0 && (
              <ul className="space-y-1">
                {prohibited.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <XCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {/* Clinical flags */}
        {workerCase.clinicalEvidence?.flags && workerCase.clinicalEvidence.flags.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground leading-relaxed">
            <div className="flex items-start gap-1.5">
              <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>{workerCase.clinicalEvidence.flags.map(f => f.message).join("; ")}</span>
            </div>
          </div>
        )}

        {/* Source cert */}
        {cert && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              Source: GP Certificate
              {cert.startDate && ` dated ${new Date(cert.startDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`}
              {cert.endDate && ` (expires ${new Date(cert.endDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })})`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
