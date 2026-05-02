/**
 * Phase 8.1 — RTW Assessment Wizard
 *
 * Replaces the broken ComprehensiveRTWForm (1246 lines, wrong endpoint,
 * 129 blank fields, no pre-population).
 *
 * 5-step guided wizard:
 *   Step 1: Current Status Review (pre-populated from case)
 *   Step 2: Pathway Selection (Phase 8.3)
 *   Step 3: Schedule & Goals
 *   Step 4: Duties & Workplace
 *   Step 5: Consent & Submit (Phase 8.2)
 *
 * Route: /cases/:id/rtw-wizard
 * Submits to: PUT /api/cases/:id/rtw-plan (status update) +
 *             PATCH /api/cases/:id/rtw-assessment (full assessment data)
 */

import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { WorkerCase } from "@shared/schema";
import type { RTWPathway, RTWConsentStatus, RTWConsentMethod } from "@shared/schema";
import { RTW_PATHWAY_LABELS } from "@shared/schema";
import {
  ArrowLeft, ArrowRight, CheckCircle2, User, ClipboardList,
  Calendar, Briefcase, FileCheck, AlertTriangle
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface WizardState {
  // Step 1: Current Status (verified from case)
  workerName: string;
  dateOfInjury: string;
  injuryType: string;
  treatmentStatus: string;
  currentRestrictions: string;
  hoursPerDay: number;
  daysPerWeek: number;
  liftingLimitKg: number | null;

  // Step 2: Pathway
  pathway: RTWPathway | "";
  pathwayRationale: string;

  // Step 3: Schedule & Goals
  targetStartDate: string;
  targetEndDate: string;
  initialHoursPerDay: number;
  initialDaysPerWeek: number;
  goalStatement: string;
  reviewDate: string;

  // Step 4: Duties
  availableDuties: string[];
  excludedDuties: string;
  workplaceModifications: string;
  supervisorName: string;
  supervisorPhone: string;

  // Step 5: Consent
  consentStatus: RTWConsentStatus;
  consentMethod: RTWConsentMethod;
  consentConditions: string;
  consentRefusalReason: string;
  consentNotes: string;
}

const AVAILABLE_DUTY_OPTIONS = [
  "Seated office work",
  "Light filing / administration",
  "Phone-based work",
  "Computer data entry",
  "Customer service (seated)",
  "Supervision / coordination",
  "Light assembly (seated)",
  "Packing / sorting (modified)",
  "Driving (short distances)",
  "Training / mentoring others",
];

const STEPS = [
  { id: 1, label: "Current Status", icon: User },
  { id: 2, label: "Pathway", icon: ClipboardList },
  { id: 3, label: "Schedule", icon: Calendar },
  { id: 4, label: "Duties", icon: Briefcase },
  { id: 5, label: "Consent & Submit", icon: FileCheck },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, idx) => {
        const done = currentStep > step.id;
        const active = currentStep === step.id;
        const Icon = step.icon;
        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={`
                flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all
                ${done ? "bg-primary border-primary text-primary-foreground" : ""}
                ${active ? "border-primary bg-primary/10 text-primary" : ""}
                ${!done && !active ? "border-muted bg-muted/40 text-muted-foreground" : ""}
              `}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={`text-xs font-medium whitespace-nowrap ${active ? "text-primary" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-2 mt-[-1rem] ${currentStep > step.id ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step Components ───────────────────────────────────────────────────────────

function Step1CurrentStatus({ state, onChange, workerCase }: {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
  workerCase?: WorkerCase;
}) {
  const mc = workerCase?.medicalConstraints;
  const fc = workerCase?.functionalCapacity;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground mb-4">
          Verify the worker's current status below. Data has been pre-filled from the case record — update any details that have changed.
        </p>
        {workerCase && (
          <Card className="border-blue-200 bg-blue-50/50 mb-4">
            <CardContent className="py-3 text-sm text-blue-700 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              Pre-populated from case record. Verify all fields before proceeding.
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Worker Name</Label>
          <Input value={state.workerName} onChange={e => onChange({ workerName: e.target.value })} />
        </div>
        <div>
          <Label>Date of Injury</Label>
          <Input type="date" value={state.dateOfInjury} onChange={e => onChange({ dateOfInjury: e.target.value })} />
        </div>
      </div>

      <div>
        <Label>Injury / Condition Type</Label>
        <Input
          placeholder="e.g. Lumbar strain, right shoulder impingement"
          value={state.injuryType}
          onChange={e => onChange({ injuryType: e.target.value })}
        />
      </div>

      <div>
        <Label>Current Treatment Status</Label>
        <Select value={state.treatmentStatus} onValueChange={v => onChange({ treatmentStatus: v })}>
          <SelectTrigger><SelectValue placeholder="Select treatment status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ongoing_gp">Ongoing GP / specialist treatment</SelectItem>
            <SelectItem value="physio">Physiotherapy / allied health</SelectItem>
            <SelectItem value="surgery_planned">Surgery planned</SelectItem>
            <SelectItem value="post_surgery">Post-surgery recovery</SelectItem>
            <SelectItem value="stable_no_treatment">Stable — no active treatment</SelectItem>
            <SelectItem value="discharged">Discharged from treatment</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Current Medical Restrictions (summary)</Label>
        <Textarea
          rows={3}
          placeholder="Summarise key restrictions from medical certificate..."
          value={state.currentRestrictions}
          onChange={e => onChange({ currentRestrictions: e.target.value })}
        />
        {mc && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {mc.noLiftingOverKg && <Badge variant="outline" className="text-xs">No lifting &gt;{mc.noLiftingOverKg}kg</Badge>}
            {mc.noBending && <Badge variant="outline" className="text-xs">No bending</Badge>}
            {mc.noProlongedStanding && <Badge variant="outline" className="text-xs">No prolonged standing</Badge>}
            {mc.noDriving && <Badge variant="outline" className="text-xs">No driving</Badge>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Max Hours / Day</Label>
          <Input
            type="number" min={1} max={8}
            value={state.hoursPerDay}
            onChange={e => onChange({ hoursPerDay: parseInt(e.target.value) || 0 })}
          />
          {fc?.maxWorkHoursPerDay && (
            <p className="text-xs text-muted-foreground mt-1">Certificate: {fc.maxWorkHoursPerDay}h/day</p>
          )}
        </div>
        <div>
          <Label>Max Days / Week</Label>
          <Input
            type="number" min={1} max={5}
            value={state.daysPerWeek}
            onChange={e => onChange({ daysPerWeek: parseInt(e.target.value) || 0 })}
          />
          {fc?.maxWorkDaysPerWeek && (
            <p className="text-xs text-muted-foreground mt-1">Certificate: {fc.maxWorkDaysPerWeek} days/week</p>
          )}
        </div>
        <div>
          <Label>Lifting Limit (kg)</Label>
          <Input
            type="number" min={0} max={50} placeholder="No limit"
            value={state.liftingLimitKg ?? ""}
            onChange={e => onChange({ liftingLimitKg: e.target.value ? parseInt(e.target.value) : null })}
          />
        </div>
      </div>
    </div>
  );
}

function Step2Pathway({ state, onChange }: { state: WizardState; onChange: (patch: Partial<WizardState>) => void }) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Select the most appropriate RTW pathway based on the worker's capacity, restrictions, and available options.
      </p>

      <div>
        <Label className="mb-3 block">RTW Pathway</Label>
        <RadioGroup
          value={state.pathway}
          onValueChange={v => onChange({ pathway: v as RTWPathway })}
          className="space-y-3"
        >
          {(Object.entries(RTW_PATHWAY_LABELS) as [RTWPathway, string][]).map(([value, label]) => (
            <label
              key={value}
              className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-all ${
                state.pathway === value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
            >
              <RadioGroupItem value={value} className="mt-0.5" />
              <div>
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {PATHWAY_DESCRIPTIONS[value]}
                </p>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div>
        <Label>Pathway Rationale</Label>
        <Textarea
          rows={3}
          placeholder="Explain why this pathway was selected, considering worker capacity and employer options..."
          value={state.pathwayRationale}
          onChange={e => onChange({ pathwayRationale: e.target.value })}
        />
      </div>
    </div>
  );
}

const PATHWAY_DESCRIPTIONS: Record<RTWPathway, string> = {
  same_role_full_duties: "Worker returns to their pre-injury role with no task modifications required.",
  same_role_modified_duties: "Worker returns to their pre-injury role with modified tasks to accommodate restrictions.",
  same_employer_different_role: "Worker performs a different role with the same employer that suits their current capacity.",
  different_employer: "Worker is placed with a host employer or labour hire company while restrictions persist.",
  retraining: "Worker undergoes vocational retraining to develop new skills for an alternative career.",
  self_employment: "Worker is supported to transition into self-employment suited to their capacity.",
};

function Step3Schedule({ state, onChange }: { state: WizardState; onChange: (patch: Partial<WizardState>) => void }) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Define the initial schedule and overall plan timeline. The schedule should start conservatively and build up gradually.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Target Start Date</Label>
          <Input type="date" value={state.targetStartDate} onChange={e => onChange({ targetStartDate: e.target.value })} />
        </div>
        <div>
          <Label>Target End Date (full duties)</Label>
          <Input type="date" value={state.targetEndDate} onChange={e => onChange({ targetEndDate: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Initial Hours / Day</Label>
          <Input
            type="number" min={1} max={8}
            value={state.initialHoursPerDay}
            onChange={e => onChange({ initialHoursPerDay: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <Label>Initial Days / Week</Label>
          <Input
            type="number" min={1} max={5}
            value={state.initialDaysPerWeek}
            onChange={e => onChange({ initialDaysPerWeek: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div>
        <Label>Medical Review Date</Label>
        <Input type="date" value={state.reviewDate} onChange={e => onChange({ reviewDate: e.target.value })} />
        <p className="text-xs text-muted-foreground mt-1">
          Date for the next medical review to assess capacity for schedule progression.
        </p>
      </div>

      <div>
        <Label>RTW Goal Statement</Label>
        <Textarea
          rows={3}
          placeholder="e.g. Progress to full pre-injury hours within 8 weeks, return to all pre-injury duties within 12 weeks..."
          value={state.goalStatement}
          onChange={e => onChange({ goalStatement: e.target.value })}
        />
      </div>
    </div>
  );
}

function Step4Duties({ state, onChange }: { state: WizardState; onChange: (patch: Partial<WizardState>) => void }) {
  const toggle = (duty: string) => {
    const cur = state.availableDuties;
    onChange({ availableDuties: cur.includes(duty) ? cur.filter(d => d !== duty) : [...cur, duty] });
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Select which duties are available and appropriate for this worker based on their restrictions.
      </p>

      <div>
        <Label className="mb-3 block">Available Suitable Duties</Label>
        <div className="grid grid-cols-2 gap-2">
          {AVAILABLE_DUTY_OPTIONS.map(duty => (
            <label key={duty} className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
              <Checkbox
                checked={state.availableDuties.includes(duty)}
                onCheckedChange={() => toggle(duty)}
              />
              <span className="text-sm">{duty}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label>Excluded Duties / Restrictions Detail</Label>
        <Textarea
          rows={3}
          placeholder="Describe duties the worker cannot perform and why..."
          value={state.excludedDuties}
          onChange={e => onChange({ excludedDuties: e.target.value })}
        />
      </div>

      <div>
        <Label>Workplace Modifications Required</Label>
        <Textarea
          rows={2}
          placeholder="e.g. Ergonomic chair, height-adjustable desk, parking close to entry..."
          value={state.workplaceModifications}
          onChange={e => onChange({ workplaceModifications: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Supervisor / Contact Name</Label>
          <Input value={state.supervisorName} onChange={e => onChange({ supervisorName: e.target.value })} />
        </div>
        <div>
          <Label>Supervisor Phone</Label>
          <Input type="tel" value={state.supervisorPhone} onChange={e => onChange({ supervisorPhone: e.target.value })} />
        </div>
      </div>
    </div>
  );
}

function Step5Consent({ state, onChange }: { state: WizardState; onChange: (patch: Partial<WizardState>) => void }) {
  return (
    <div className="space-y-5">
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="py-3 text-sm text-amber-800 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          Under the RTW Code of Practice, worker participation and agreement is required before commencing an RTW plan.
        </CardContent>
      </Card>

      <div>
        <Label className="mb-3 block">Worker Consent Status</Label>
        <RadioGroup
          value={state.consentStatus}
          onValueChange={v => onChange({ consentStatus: v as RTWConsentStatus })}
          className="space-y-2"
        >
          <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${state.consentStatus === "agreed" ? "border-green-400 bg-green-50" : "border-border"}`}>
            <RadioGroupItem value="agreed" />
            <div>
              <p className="font-medium text-sm">Agreed</p>
              <p className="text-xs text-muted-foreground">Worker has accepted the RTW plan as presented.</p>
            </div>
          </label>
          <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${state.consentStatus === "agreed_with_conditions" ? "border-amber-400 bg-amber-50" : "border-border"}`}>
            <RadioGroupItem value="agreed_with_conditions" />
            <div>
              <p className="font-medium text-sm">Agreed with Conditions</p>
              <p className="text-xs text-muted-foreground">Worker agrees subject to specific modifications.</p>
            </div>
          </label>
          <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${state.consentStatus === "refused" ? "border-red-400 bg-red-50" : "border-border"}`}>
            <RadioGroupItem value="refused" />
            <div>
              <p className="font-medium text-sm">Refused</p>
              <p className="text-xs text-muted-foreground">Worker has declined the RTW plan. A compliance action will be created.</p>
            </div>
          </label>
          <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${state.consentStatus === "pending" ? "border-blue-300 bg-blue-50" : "border-border"}`}>
            <RadioGroupItem value="pending" />
            <div>
              <p className="font-medium text-sm">Pending (not yet recorded)</p>
              <p className="text-xs text-muted-foreground">Consent will be recorded separately.</p>
            </div>
          </label>
        </RadioGroup>
      </div>

      {state.consentStatus === "agreed_with_conditions" && (
        <div>
          <Label>Conditions Specified by Worker</Label>
          <Textarea
            rows={3}
            placeholder="Describe the worker's conditions for agreeing to the plan..."
            value={state.consentConditions}
            onChange={e => onChange({ consentConditions: e.target.value })}
          />
        </div>
      )}

      {state.consentStatus === "refused" && (
        <div>
          <Label>Reason for Refusal</Label>
          <Textarea
            rows={3}
            placeholder="Document the worker's stated reason for refusing the plan..."
            value={state.consentRefusalReason}
            onChange={e => onChange({ consentRefusalReason: e.target.value })}
          />
        </div>
      )}

      <div>
        <Label>How was consent recorded?</Label>
        <Select value={state.consentMethod} onValueChange={v => onChange({ consentMethod: v as RTWConsentMethod })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="verbal">Verbal (in person or phone)</SelectItem>
            <SelectItem value="written">Written / signed document</SelectItem>
            <SelectItem value="email">Email</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Additional Notes</Label>
        <Textarea
          rows={2}
          placeholder="Any additional context about the consent conversation..."
          value={state.consentNotes}
          onChange={e => onChange({ consentNotes: e.target.value })}
        />
      </div>
    </div>
  );
}

// ── Main Wizard ───────────────────────────────────────────────────────────────

function defaultState(workerCase?: WorkerCase): WizardState {
  const mc = workerCase?.medicalConstraints;
  const fc = workerCase?.functionalCapacity;
  return {
    workerName: workerCase?.workerName ?? "",
    dateOfInjury: workerCase?.dateOfInjury ?? "",
    injuryType: workerCase?.clinical_status_json?.treatmentPlan?.injuryType ?? "",
    treatmentStatus: "",
    currentRestrictions: "",
    hoursPerDay: fc?.maxWorkHoursPerDay ?? 4,
    daysPerWeek: fc?.maxWorkDaysPerWeek ?? 3,
    liftingLimitKg: mc?.noLiftingOverKg ?? null,

    pathway: "",
    pathwayRationale: "",

    targetStartDate: "",
    targetEndDate: "",
    initialHoursPerDay: fc?.maxWorkHoursPerDay ?? 2,
    initialDaysPerWeek: fc?.maxWorkDaysPerWeek ?? 2,
    goalStatement: "",
    reviewDate: "",

    availableDuties: [],
    excludedDuties: "",
    workplaceModifications: "",
    supervisorName: "",
    supervisorPhone: "",

    consentStatus: "pending",
    consentMethod: "verbal",
    consentConditions: "",
    consentRefusalReason: "",
    consentNotes: "",
  };
}

export default function RTWAssessmentWizard(): React.JSX.Element {
  const { id: caseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);

  // Load case data for pre-population
  const { data: workerCase, isLoading } = useQuery<WorkerCase>({
    queryKey: [`/api/cases/${caseId}`],
    enabled: !!caseId,
  });

  const [wizardState, setWizardState] = useState<WizardState>(() => defaultState(workerCase));

  // Re-populate when case data loads
  const [populated, setPopulated] = useState(false);
  if (workerCase && !populated) {
    setWizardState(defaultState(workerCase));
    setPopulated(true);
  }

  const patch = (p: Partial<WizardState>) => setWizardState(prev => ({ ...prev, ...p }));

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!caseId) throw new Error("No case ID");

      // 1. Update RTW plan status on the case to planned_not_started
      await apiRequest("PUT", `/api/cases/${caseId}/rtw-plan`, {
        rtwPlanStatus: "planned_not_started",
        reason: `RTW assessment completed via wizard. Pathway: ${wizardState.pathway}. Goal: ${wizardState.goalStatement}`,
      });

      // 2. Record the full assessment as a note / action
      await apiRequest("POST", `/api/cases/${caseId}/rtw-assessment`, {
        pathway: wizardState.pathway,
        pathwayRationale: wizardState.pathwayRationale,
        targetStartDate: wizardState.targetStartDate,
        targetEndDate: wizardState.targetEndDate,
        initialHoursPerDay: wizardState.initialHoursPerDay,
        initialDaysPerWeek: wizardState.initialDaysPerWeek,
        goalStatement: wizardState.goalStatement,
        reviewDate: wizardState.reviewDate,
        availableDuties: wizardState.availableDuties,
        excludedDuties: wizardState.excludedDuties,
        workplaceModifications: wizardState.workplaceModifications,
        supervisorName: wizardState.supervisorName,
        supervisorPhone: wizardState.supervisorPhone,
        currentRestrictions: wizardState.currentRestrictions,
        hoursPerDay: wizardState.hoursPerDay,
        daysPerWeek: wizardState.daysPerWeek,
        liftingLimitKg: wizardState.liftingLimitKg,
        // Consent
        consentStatus: wizardState.consentStatus,
        consentMethod: wizardState.consentMethod,
        consentConditions: wizardState.consentConditions,
        consentRefusalReason: wizardState.consentRefusalReason,
        consentNotes: wizardState.consentNotes,
      });

      return true;
    },
    onSuccess: () => {
      toast({ title: "RTW Assessment Submitted", description: "The return-to-work plan has been recorded." });
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
      navigate(`/employer/case/${caseId}`);
    },
    onError: (err: Error) => {
      toast({ title: "Submission Failed", description: err.message, variant: "destructive" });
    },
  });

  if (!caseId) {
    return (
      <PageLayout title="RTW Assessment" subtitle="Case ID required">
        <Card><CardContent className="py-8 text-center text-muted-foreground">
          No case selected. <Link to="/" className="text-primary underline">Go to dashboard</Link>
        </CardContent></Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Return to Work Assessment"
      subtitle={workerCase ? `${workerCase.workerName} · ${workerCase.company}` : "Loading..."}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back link */}
        <Link to={`/employer/case/${caseId}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Case
        </Link>

        {/* Progress */}
        <Progress value={(step / STEPS.length) * 100} className="h-1.5" />
        <StepIndicator currentStep={step} />

        {/* Step card */}
        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step - 1].label}</CardTitle>
            <CardDescription>Step {step} of {STEPS.length}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && step === 1 && (
              <div className="text-sm text-muted-foreground animate-pulse mb-4">Loading case data...</div>
            )}
            {step === 1 && <Step1CurrentStatus state={wizardState} onChange={patch} workerCase={workerCase} />}
            {step === 2 && <Step2Pathway state={wizardState} onChange={patch} />}
            {step === 3 && <Step3Schedule state={wizardState} onChange={patch} />}
            {step === 4 && <Step4Duties state={wizardState} onChange={patch} />}
            {step === 5 && <Step5Consent state={wizardState} onChange={patch} />}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
          </Button>

          {step < STEPS.length ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 2 && !wizardState.pathway}
            >
              Next <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          ) : (
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className="min-w-[140px]"
            >
              {submitMutation.isPending ? "Submitting..." : "Submit RTW Plan"}
            </Button>
          )}
        </div>

        {/* Consent warning */}
        {step === 5 && wizardState.consentStatus === "refused" && (
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="py-3 text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              Worker has refused the RTW plan. Submitting will create a compliance action to review plan suitability and consider conciliation.
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
