import { useEffect, useMemo, useState } from "react";
import type { WorkerCase, TerminationProcess, PayStatusDuringStandDown, TerminationDecision } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface TerminationPanelProps {
  workerCase: WorkerCase;
}

const statusLabels: Record<TerminationProcess["status"], string> = {
  NOT_STARTED: "Not started",
  PREP_EVIDENCE: "Evidence & alternatives",
  AGENT_MEETING: "Agent meeting",
  CONSULTANT_CONFIRMATION: "Consultant confirmation",
  PRE_TERMINATION_INVITE_SENT: "Pre-termination invite sent",
  PRE_TERMINATION_MEETING_COMPLETED: "Pre-termination meeting completed",
  DECISION_PENDING: "Decision pending",
  TERMINATED: "Terminated",
  TERMINATION_ABORTED: "Terminated aborted",
};

function StatusBadge({ status }: { status: TerminationProcess["status"] }) {
  const color =
    status === "TERMINATED"
      ? "bg-emerald-100 text-emerald-800"
      : status === "TERMINATION_ABORTED"
        ? "bg-slate-100 text-slate-800"
        : "bg-amber-100 text-amber-800";
  return <Badge className={color}>{statusLabels[status]}</Badge>;
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export function TerminationPanel({ workerCase }: TerminationPanelProps) {
  const [process, setProcess] = useState<TerminationProcess | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [preInjuryRole, setPreInjuryRole] = useState(workerCase.summary || "");
  const [rtwAttempts, setRtwAttempts] = useState("");
  const [alternatives, setAlternatives] = useState("");
  const [hasSustainableRole, setHasSustainableRole] = useState(false);

  const [agentMeetingDate, setAgentMeetingDate] = useState("");
  const [agentMeetingNotesId, setAgentMeetingNotesId] = useState("");

  const [consultantInviteDate, setConsultantInviteDate] = useState("");
  const [consultantAppointmentDate, setConsultantAppointmentDate] = useState("");
  const [consultantReportId, setConsultantReportId] = useState("");
  const [longTermRestrictionsSummary, setLongTermRestrictionsSummary] = useState("");
  const [canReturnPreInjuryRole, setCanReturnPreInjuryRole] = useState<boolean | null>(null);

  const [preTermMeetingDate, setPreTermMeetingDate] = useState("");
  const [preTermLocation, setPreTermLocation] = useState("");
  const [workerAllowedRepresentative, setWorkerAllowedRepresentative] = useState(true);
  const [workerInstructedNotToAttendWork, setWorkerInstructedNotToAttendWork] = useState(false);
  const [payStatusDuringStandDown, setPayStatusDuringStandDown] = useState<PayStatusDuringStandDown | "">("");

  const [preTermHeld, setPreTermHeld] = useState<boolean | null>(null);
  const [preTermNotesId, setPreTermNotesId] = useState("");
  const [newMedicalInfo, setNewMedicalInfo] = useState<boolean | null>(null);
  const [newMedicalSummary, setNewMedicalSummary] = useState("");

  const [decision, setDecision] = useState<TerminationDecision>("NO_DECISION");
  const [decisionRationale, setDecisionRationale] = useState("");
  const [terminationEffectiveDate, setTerminationEffectiveDate] = useState("");
  const [terminationNoticeWeeks, setTerminationNoticeWeeks] = useState("");
  const [noticeType, setNoticeType] = useState<"WORKED" | "PAID_IN_LIEU" | "MIXED" | "">("");
  const [entitlementsSummary, setEntitlementsSummary] = useState("");
  const [ongoingCompArrangements, setOngoingCompArrangements] = useState("");

  const loadProcess = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<TerminationProcess>(`/api/termination/${workerCase.id}`);
      setProcess(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load termination process");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProcess();
  }, [workerCase.id]);

  useEffect(() => {
    if (!process) return;
    setPreInjuryRole(process.preInjuryRole || workerCase.summary || "");
    setRtwAttempts(process.rtWAttemptsSummary || "");
    setAlternatives(process.alternativeRolesConsideredSummary || "");
    setHasSustainableRole(Boolean(process.hasSustainableRole));
    setAgentMeetingDate(process.agentMeetingDate ? process.agentMeetingDate.slice(0, 16) : "");
    setAgentMeetingNotesId(process.agentMeetingNotesId || "");
    setConsultantInviteDate(process.consultantInviteDate ? process.consultantInviteDate.slice(0, 10) : "");
    setConsultantAppointmentDate(
      process.consultantAppointmentDate ? process.consultantAppointmentDate.slice(0, 10) : "",
    );
    setConsultantReportId(process.consultantReportId || "");
    setLongTermRestrictionsSummary(process.longTermRestrictionsSummary || "");
    setCanReturnPreInjuryRole(process.canReturnPreInjuryRole);
    setPreTermMeetingDate(process.preTerminationMeetingDate ? process.preTerminationMeetingDate.slice(0, 16) : "");
    setPreTermLocation(process.preTerminationMeetingLocation || "");
    setWorkerAllowedRepresentative(process.workerAllowedRepresentative ?? true);
    setWorkerInstructedNotToAttendWork(process.workerInstructedNotToAttendWork ?? false);
    setPayStatusDuringStandDown(process.payStatusDuringStandDown || "");
    setPreTermHeld(process.preTerminationMeetingHeld);
    setPreTermNotesId(process.preTerminationMeetingNotesId || "");
    setNewMedicalInfo(process.anyNewMedicalInfoProvided);
    setNewMedicalSummary(process.newMedicalDocsSummary || "");
    setDecision(process.decision);
    setDecisionRationale(process.decisionRationale || "");
    setTerminationEffectiveDate(process.terminationEffectiveDate ? process.terminationEffectiveDate.slice(0, 10) : "");
    setTerminationNoticeWeeks(process.terminationNoticeWeeks?.toString() || "");
    setNoticeType((process.noticeType as any) || "");
    setEntitlementsSummary(process.entitlementsSummary || "");
    setOngoingCompArrangements(process.ongoingCompArrangements || "");
  }, [process, workerCase.summary]);

  const actionWrapper = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    }
  };

  const initiate = () =>
    actionWrapper(async () => {
      const data = await fetchJson<TerminationProcess>(`/api/termination/${workerCase.id}/init`, {
        method: "POST",
        body: JSON.stringify({
          preInjuryRole,
          rtWAttemptsSummary: rtwAttempts,
          alternativeRolesConsideredSummary: alternatives,
          hasSustainableRole,
        }),
      });
      setProcess(data);
    });

  const updateEvidence = () =>
    actionWrapper(async () => {
      const data = await fetchJson<TerminationProcess>(`/api/termination/${workerCase.id}/evidence`, {
        method: "PUT",
        body: JSON.stringify({
          preInjuryRole,
          rtWAttemptsSummary: rtwAttempts,
          alternativeRolesConsideredSummary: alternatives,
          hasSustainableRole,
        }),
      });
      setProcess(data);
    });

  const saveAgentMeeting = () =>
    actionWrapper(async () => {
      const data = await fetchJson<TerminationProcess>(`/api/termination/${workerCase.id}/agent-meeting`, {
        method: "PUT",
        body: JSON.stringify({
          agentMeetingDate,
          agentMeetingNotesId,
        }),
      });
      setProcess(data);
    });

  const saveConsultant = () =>
    actionWrapper(async () => {
      const data = await fetchJson<TerminationProcess>(
        `/api/termination/${workerCase.id}/consultant-confirmation`,
        {
          method: "PUT",
          body: JSON.stringify({
            consultantInviteDate,
            consultantAppointmentDate,
            consultantReportId,
            longTermRestrictionsSummary,
            canReturnPreInjuryRole,
          }),
        },
      );
      setProcess(data);
    });

  const savePreInvite = () =>
    actionWrapper(async () => {
      const data = await fetchJson<TerminationProcess>(
        `/api/termination/${workerCase.id}/pre-termination-invite`,
        {
          method: "PUT",
          body: JSON.stringify({
            preTerminationMeetingDate: preTermMeetingDate,
            preTerminationMeetingLocation: preTermLocation,
            workerAllowedRepresentative,
            workerInstructedNotToAttendWork,
            payStatusDuringStandDown: payStatusDuringStandDown || null,
          }),
        },
      );
      setProcess(data);
    });

  const savePreMeeting = () =>
    actionWrapper(async () => {
      const data = await fetchJson<TerminationProcess>(
        `/api/termination/${workerCase.id}/pre-termination-meeting`,
        {
          method: "PUT",
          body: JSON.stringify({
            preTerminationMeetingHeld: preTermHeld,
            preTerminationMeetingNotesId: preTermNotesId,
            anyNewMedicalInfoProvided: newMedicalInfo,
            newMedicalDocsSummary: newMedicalSummary,
          }),
        },
      );
      setProcess(data);
    });

  const saveDecision = () =>
    actionWrapper(async () => {
      const data = await fetchJson<TerminationProcess>(`/api/termination/${workerCase.id}/decision`, {
        method: "PUT",
        body: JSON.stringify({
          decision,
          decisionRationale,
          terminationEffectiveDate,
          terminationNoticeWeeks: terminationNoticeWeeks ? Number(terminationNoticeWeeks) : null,
          noticeType: noticeType || null,
          entitlementsSummary,
          ongoingCompArrangements,
        }),
      });
      setProcess(data);
    });

  const highRisk = useMemo(() => workerCase.terminationAuditFlag === "HIGH_RISK", [workerCase.terminationAuditFlag]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Termination of Employment</CardTitle>
        {process && <StatusBadge status={process.status} />}
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <div className="text-sm text-red-600">{error}</div>}
        {loading && <div className="text-sm text-muted-foreground">Loading termination workflow…</div>}
        {!loading && process && (
          <div className="space-y-6">
            {highRisk && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                Medical evidence appears stale. Termination flagged as HIGH RISK.
              </div>
            )}

            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Evidence & Alternatives</h3>
              <textarea
                className="w-full rounded border border-border p-2 text-sm"
                placeholder="Pre-injury role"
                value={preInjuryRole}
                onChange={(e) => setPreInjuryRole(e.target.value)}
              />
              <textarea
                className="w-full rounded border border-border p-2 text-sm"
                placeholder="RTW attempts summary"
                value={rtwAttempts}
                onChange={(e) => setRtwAttempts(e.target.value)}
              />
              <textarea
                className="w-full rounded border border-border p-2 text-sm"
                placeholder="Alternatives considered"
                value={alternatives}
                onChange={(e) => setAlternatives(e.target.value)}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={hasSustainableRole}
                  onChange={(e) => setHasSustainableRole(e.target.checked)}
                />
                I confirm there are no sustainable roles available within the worker’s long-term restrictions.
              </label>
              <div className="flex gap-2">
                {process.status === "NOT_STARTED" ? (
                  <Button onClick={initiate} size="sm">
                    Initiate Termination Process
                  </Button>
                ) : (
                  <Button onClick={updateEvidence} size="sm" variant="outline">
                    Save Evidence
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Agent Meeting</h3>
              <input
                type="datetime-local"
                className="w-full rounded border border-border p-2 text-sm"
                value={agentMeetingDate}
                onChange={(e) => setAgentMeetingDate(e.target.value)}
              />
              <input
                type="text"
                className="w-full rounded border border-border p-2 text-sm"
                placeholder="Agent meeting notes ID"
                value={agentMeetingNotesId}
                onChange={(e) => setAgentMeetingNotesId(e.target.value)}
              />
              <Button onClick={saveAgentMeeting} size="sm" variant="outline">
                Save Agent Meeting
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Consultant Confirmation</h3>
              <input
                type="date"
                className="w-full rounded border border-border p-2 text-sm"
                value={consultantInviteDate}
                onChange={(e) => setConsultantInviteDate(e.target.value)}
              />
              <input
                type="date"
                className="w-full rounded border border-border p-2 text-sm"
                value={consultantAppointmentDate}
                onChange={(e) => setConsultantAppointmentDate(e.target.value)}
              />
              <input
                type="text"
                className="w-full rounded border border-border p-2 text-sm"
                placeholder="Consultant report ID"
                value={consultantReportId}
                onChange={(e) => setConsultantReportId(e.target.value)}
              />
              <textarea
                className="w-full rounded border border-border p-2 text-sm"
                placeholder="Long-term restrictions summary"
                value={longTermRestrictionsSummary}
                onChange={(e) => setLongTermRestrictionsSummary(e.target.value)}
              />
              <div className="flex items-center gap-3 text-sm">
                <span>Can return to pre-injury role?</span>
                <Button
                  type="button"
                  size="sm"
                  variant={canReturnPreInjuryRole === false ? "default" : "outline"}
                  onClick={() => setCanReturnPreInjuryRole(false)}
                >
                  No
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={canReturnPreInjuryRole === true ? "default" : "outline"}
                  onClick={() => setCanReturnPreInjuryRole(true)}
                >
                  Yes
                </Button>
              </div>
              <Button onClick={saveConsultant} size="sm" variant="outline">
                Save Consultant Confirmation
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Pre-Termination Invite</h3>
              <input
                type="datetime-local"
                className="w-full rounded border border-border p-2 text-sm"
                value={preTermMeetingDate}
                onChange={(e) => setPreTermMeetingDate(e.target.value)}
              />
              <input
                type="text"
                className="w-full rounded border border-border p-2 text-sm"
                placeholder="Meeting location"
                value={preTermLocation}
                onChange={(e) => setPreTermLocation(e.target.value)}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={workerAllowedRepresentative}
                  onChange={(e) => setWorkerAllowedRepresentative(e.target.checked)}
                />
                Worker allowed representative
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={workerInstructedNotToAttendWork}
                  onChange={(e) => setWorkerInstructedNotToAttendWork(e.target.checked)}
                />
                Worker instructed not to attend work
              </label>
              <select
                className="w-full rounded border border-border p-2 text-sm"
                value={payStatusDuringStandDown}
                onChange={(e) => setPayStatusDuringStandDown(e.target.value as PayStatusDuringStandDown | "")}
              >
                <option value="">Pay status during stand down</option>
                <option value="NORMAL">Normal</option>
                <option value="WORKCOVER_ONLY">WorkCover only</option>
                <option value="SPECIAL_PAID_LEAVE">Special paid leave</option>
              </select>
              <Button onClick={savePreInvite} size="sm" variant="outline">
                Generate Invite Letter
              </Button>
              {process.preTerminationLetterDocId && (
                <div className="text-xs text-muted-foreground">
                  Invite document ID: {process.preTerminationLetterDocId}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Pre-Termination Meeting</h3>
              <div className="flex items-center gap-3 text-sm">
                <span>Meeting held?</span>
                <Button
                  size="sm"
                  variant={preTermHeld === true ? "default" : "outline"}
                  onClick={() => setPreTermHeld(true)}
                >
                  Yes
                </Button>
                <Button
                  size="sm"
                  variant={preTermHeld === false ? "default" : "outline"}
                  onClick={() => setPreTermHeld(false)}
                >
                  No
                </Button>
              </div>
              <input
                type="text"
                className="w-full rounded border border-border p-2 text-sm"
                placeholder="Meeting notes ID"
                value={preTermNotesId}
                onChange={(e) => setPreTermNotesId(e.target.value)}
              />
              <div className="flex items-center gap-3 text-sm">
                <span>New medical info provided?</span>
                <Button
                  size="sm"
                  variant={newMedicalInfo === true ? "default" : "outline"}
                  onClick={() => setNewMedicalInfo(true)}
                >
                  Yes
                </Button>
                <Button
                  size="sm"
                  variant={newMedicalInfo === false ? "default" : "outline"}
                  onClick={() => setNewMedicalInfo(false)}
                >
                  No
                </Button>
              </div>
              <textarea
                className="w-full rounded border border-border p-2 text-sm"
                placeholder="New medical documents summary"
                value={newMedicalSummary}
                onChange={(e) => setNewMedicalSummary(e.target.value)}
              />
              <Button onClick={savePreMeeting} size="sm" variant="outline">
                Save Meeting
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Decision & Termination Letter</h3>
              <select
                className="w-full rounded border border-border p-2 text-sm"
                value={decision}
                onChange={(e) => setDecision(e.target.value as TerminationDecision)}
              >
                <option value="NO_DECISION">Select decision</option>
                <option value="TERMINATE">Terminate</option>
                <option value="DEFER">Defer</option>
                <option value="ALTERNATIVE_ROLE_FOUND">Alternative role found</option>
              </select>
              <textarea
                className="w-full rounded border border-border p-2 text-sm"
                placeholder="Decision rationale"
                value={decisionRationale}
                onChange={(e) => setDecisionRationale(e.target.value)}
              />
              {decision === "TERMINATE" && (
                <div className="space-y-2">
                  <input
                    type="date"
                    className="w-full rounded border border-border p-2 text-sm"
                    value={terminationEffectiveDate}
                    onChange={(e) => setTerminationEffectiveDate(e.target.value)}
                  />
                  <input
                    type="number"
                    className="w-full rounded border border-border p-2 text-sm"
                    placeholder="Notice weeks"
                    value={terminationNoticeWeeks}
                    onChange={(e) => setTerminationNoticeWeeks(e.target.value)}
                  />
                  <select
                    className="w-full rounded border border-border p-2 text-sm"
                    value={noticeType}
                    onChange={(e) => setNoticeType(e.target.value as "WORKED" | "PAID_IN_LIEU" | "MIXED" | "")}
                  >
                    <option value="">Notice type</option>
                    <option value="WORKED">Worked</option>
                    <option value="PAID_IN_LIEU">Paid in lieu</option>
                    <option value="MIXED">Mixed</option>
                  </select>
                  <textarea
                    className="w-full rounded border border-border p-2 text-sm"
                    placeholder="Entitlements summary"
                    value={entitlementsSummary}
                    onChange={(e) => setEntitlementsSummary(e.target.value)}
                  />
                  <textarea
                    className="w-full rounded border border-border p-2 text-sm"
                    placeholder="Ongoing compensation arrangements"
                    value={ongoingCompArrangements}
                    onChange={(e) => setOngoingCompArrangements(e.target.value)}
                  />
                </div>
              )}
              <Button onClick={saveDecision} size="sm">
                Confirm Decision
              </Button>
              {process.terminationLetterDocId && (
                <div className="text-xs text-muted-foreground">
                  Termination letter document ID: {process.terminationLetterDocId}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
