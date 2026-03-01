/**
 * CurrentRestrictionsPanel - Displays current medical restrictions for RTW planning
 * MED-09: Shows restrictions from current medical certificate(s) on planning screen
 */

import { useState, useEffect } from "react";
import { Check, X, AlertTriangle, Minus, HelpCircle } from "lucide-react";
import type { FunctionalRestrictionsExtracted, RestrictionCapability } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCapabilityColor,
  getCapabilityBgColor,
  formatRestrictionLabel,
  restrictionCategories,
  getCategoryLabel,
  formatWeightLimit,
  formatTimeLimit,
} from "@/lib/restrictionUtils";
import { fetchWithCsrf } from "@/lib/queryClient";

interface CurrentRestrictionsPanelProps {
  caseId: string;
}

interface RestrictionsResponse {
  restrictions: FunctionalRestrictionsExtracted;
  maxWorkHoursPerDay: number | null;
  maxWorkDaysPerWeek: number | null;
  source: "single_certificate" | "combined";
  certificateCount: number;
  retrievedAt: string;
}

/**
 * Icon component for capability levels
 */
function CapabilityIcon({ capability }: { capability: RestrictionCapability }): JSX.Element {
  const className = `h-4 w-4 ${getCapabilityColor(capability)}`;
  switch (capability) {
    case "can":
      return <Check className={className} />;
    case "with_modifications":
      return <AlertTriangle className={className} />;
    case "cannot":
      return <X className={className} />;
    case "not_assessed":
      return <Minus className={className} />;
    default:
      return <HelpCircle className={className} />;
  }
}

/**
 * Loading skeleton for the panel
 */
function LoadingSkeleton(): JSX.Element {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-20" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((j) => (
                <Skeleton key={j} className="h-8 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Empty state when no restrictions are found
 */
function EmptyState(): JSX.Element {
  return (
    <div className="text-center py-6">
      <span className="material-symbols-outlined text-3xl text-muted-foreground/50 mb-2">
        medical_information
      </span>
      <p className="text-sm text-muted-foreground">
        No medical restrictions on file.
      </p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        Upload a medical certificate to see restrictions.
      </p>
    </div>
  );
}

/**
 * Error state component
 */
function ErrorState({ message }: { message: string }): JSX.Element {
  return (
    <div className="text-center py-6">
      <span className="material-symbols-outlined text-3xl text-red-400 mb-2">
        error
      </span>
      <p className="text-sm text-muted-foreground">
        Unable to load restrictions
      </p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        {message}
      </p>
    </div>
  );
}

/**
 * Single restriction item display
 */
function RestrictionItem({
  restrictionKey,
  capability,
  restrictions,
}: {
  restrictionKey: string;
  capability: RestrictionCapability;
  restrictions: FunctionalRestrictionsExtracted;
}): JSX.Element {
  // Check for weight limits on lifting/carrying
  const weightLimit =
    restrictionKey === "lifting"
      ? formatWeightLimit(restrictions.liftingMaxKg)
      : restrictionKey === "carrying"
        ? formatWeightLimit(restrictions.carryingMaxKg)
        : null;

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2">
        <CapabilityIcon capability={capability} />
        <span className="text-sm">{formatRestrictionLabel(restrictionKey)}</span>
        {weightLimit && (
          <span className="text-xs text-muted-foreground ml-1">({weightLimit})</span>
        )}
      </div>
      <Badge
        variant="outline"
        className={`text-[10px] font-medium ${getCapabilityBgColor(capability)}`}
      >
        {capability === "can" && "Can"}
        {capability === "with_modifications" && "Modified"}
        {capability === "cannot" && "Cannot"}
        {capability === "not_assessed" && "N/A"}
      </Badge>
    </div>
  );
}

/**
 * Category section with grouped restrictions
 */
function CategorySection({
  category,
  restrictions,
}: {
  category: keyof typeof restrictionCategories;
  restrictions: FunctionalRestrictionsExtracted;
}): JSX.Element {
  const items = restrictionCategories[category];

  return (
    <div className="space-y-1">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {getCategoryLabel(category)}
      </h4>
      <div className="bg-card/50 rounded-md p-2">
        {items.map((key) => {
          const capability = restrictions[key as keyof FunctionalRestrictionsExtracted] as RestrictionCapability | undefined;
          if (!capability || typeof capability !== "string") return null;
          return (
            <RestrictionItem
              key={key}
              restrictionKey={key}
              capability={capability}
              restrictions={restrictions}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * Time limits section
 */
function TimeLimitsSection({
  maxHoursPerDay,
  maxDaysPerWeek,
}: {
  maxHoursPerDay: number | null;
  maxDaysPerWeek: number | null;
}): JSX.Element | null {
  const hoursLimit = formatTimeLimit(maxHoursPerDay, "hours");
  const daysLimit = formatTimeLimit(maxDaysPerWeek, "days");

  if (!hoursLimit && !daysLimit) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 mb-4">
      <h4 className="text-xs font-medium text-amber-800 dark:text-amber-200 uppercase tracking-wide mb-2 flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Time Restrictions
      </h4>
      <div className="space-y-1">
        {hoursLimit && (
          <div className="text-sm text-amber-900 dark:text-amber-100">
            <span className="font-medium">Max hours:</span> {hoursLimit}
          </div>
        )}
        {daysLimit && (
          <div className="text-sm text-amber-900 dark:text-amber-100">
            <span className="font-medium">Max days:</span> {daysLimit}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Source indicator badge
 */
function SourceBadge({
  source,
  certificateCount,
}: {
  source: "single_certificate" | "combined";
  certificateCount: number;
}): JSX.Element {
  if (source === "combined" && certificateCount > 1) {
    return (
      <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
        Combined from {certificateCount} certs
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] bg-gray-50 text-gray-600 border-gray-200">
      From certificate
    </Badge>
  );
}

/**
 * Main component: CurrentRestrictionsPanel
 */
export function CurrentRestrictionsPanel({ caseId }: CurrentRestrictionsPanelProps): JSX.Element {
  const [data, setData] = useState<RestrictionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchRestrictions = async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchWithCsrf(`/api/cases/${caseId}/current-restrictions`);

        if (!response.ok) {
          if (response.status === 404) {
            // No restrictions found - this is a valid state
            if (!cancelled) {
              setData(null);
              setLoading(false);
            }
            return;
          }
          throw new Error(`Failed to fetch restrictions: ${response.status}`);
        }

        const responseData = await response.json();
        if (!cancelled) {
          setData(responseData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load restrictions");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchRestrictions();

    return () => {
      cancelled = true;
    };
  }, [caseId]);

  return (
    <Card data-testid="current-restrictions-panel">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">accessibility_new</span>
            Current Restrictions
          </span>
          {data && (
            <SourceBadge source={data.source} certificateCount={data.certificateCount} />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <LoadingSkeleton />}

        {error && <ErrorState message={error} />}

        {!loading && !error && !data && <EmptyState />}

        {!loading && !error && data && (
          <div className="space-y-4">
            {/* Time limits section */}
            <TimeLimitsSection
              maxHoursPerDay={data.maxWorkHoursPerDay}
              maxDaysPerWeek={data.maxWorkDaysPerWeek}
            />

            {/* Physical demands by category */}
            {(Object.keys(restrictionCategories) as Array<keyof typeof restrictionCategories>).map(
              (category) => (
                <CategorySection
                  key={category}
                  category={category}
                  restrictions={data.restrictions}
                />
              )
            )}

            {/* Footer with extraction info */}
            {data.restrictions.extractedAt && (
              <p className="text-xs text-muted-foreground/60 text-right pt-2">
                Last updated: {new Date(data.restrictions.extractedAt).toLocaleDateString("en-AU")}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CurrentRestrictionsPanel;
