/**
 * usePlanDraft Hook
 *
 * Persists RTW plan form data to sessionStorage for recovery after
 * accidental navigation or page refresh. Data cleared on successful save.
 *
 * sessionStorage vs localStorage:
 * - sessionStorage: Cleared when tab closes (prevents stale drafts)
 * - Perfect for in-progress form data
 * - Survives page refresh but not tab close
 */

import { useEffect, useState, useCallback } from "react";

export interface PlanDraftData {
  caseId: string;
  roleId: string;
  planType: "normal_hours" | "partial_hours" | "graduated_return";
  startDate: string;
  schedule: Array<{
    weekNumber: number;
    hoursPerDay: number;
    daysPerWeek: number;
  }>;
  selectedDutyIds: string[];
  lastSaved: string;
}

export function usePlanDraft(caseId: string) {
  const storageKey = `rtw-plan-draft-${caseId}`;
  const [draft, setDraft] = useState<PlanDraftData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load draft on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as PlanDraftData;
        // Verify draft is for this case
        if (parsed.caseId === caseId) {
          setDraft(parsed);
        }
      }
    } catch (err) {
      console.error("Failed to parse draft:", err);
      sessionStorage.removeItem(storageKey);
    }
    setIsLoaded(true);
  }, [storageKey, caseId]);

  // Save draft
  const saveDraft = useCallback(
    (data: Partial<PlanDraftData>) => {
      const updated: PlanDraftData = {
        caseId,
        roleId: data.roleId || draft?.roleId || "",
        planType: data.planType || draft?.planType || "graduated_return",
        startDate: data.startDate || draft?.startDate || new Date().toISOString(),
        schedule: data.schedule || draft?.schedule || [],
        selectedDutyIds: data.selectedDutyIds || draft?.selectedDutyIds || [],
        lastSaved: new Date().toISOString(),
      };

      sessionStorage.setItem(storageKey, JSON.stringify(updated));
      setDraft(updated);
    },
    [storageKey, caseId, draft]
  );

  // Clear draft (after successful save)
  const clearDraft = useCallback(() => {
    sessionStorage.removeItem(storageKey);
    setDraft(null);
  }, [storageKey]);

  // Check if draft exists and is recent (< 24 hours)
  const hasDraft = draft !== null && isLoaded;
  const draftAge = draft?.lastSaved
    ? Date.now() - new Date(draft.lastSaved).getTime()
    : Infinity;
  const isRecentDraft = draftAge < 24 * 60 * 60 * 1000; // 24 hours

  return {
    draft,
    isLoaded,
    hasDraft,
    isRecentDraft,
    saveDraft,
    clearDraft,
  };
}
