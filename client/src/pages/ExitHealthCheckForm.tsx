import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchWithCsrf } from '@/lib/queryClient';
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, ArrowRight, ArrowLeft } from "lucide-react";

interface ExitHealthCheckData {
  // Section 1: Employee Details & Exit Information
  firstName: string;
  lastName: string;
  email: string;
  employer: string;
  jobTitle: string;
  department: string;
  startDate: string;
  lastWorkingDay: string;
  exitReason: string;
  exitReasonDetails: string;
  yearsOfService: string;

  // Section 2: Health Baseline at Exit
  overallHealthAtExit: string;
  healthChangedDuringEmployment: string;
  healthChangeDetails: string;
  currentMedicalConditions: string;
  workRelatedConditions: string;
  workRelatedConditionDetails: string;
  ongoingTreatment: string;
  treatmentDetails: string;
  currentMedications: string;
  openWorkersCompClaim: string;
  claimDetails: string;

  // Section 3: Occupational Exposure & Hazard History
  exposedToHazards: string;
  hazardTypes: string[];
  hazardDetails: string;
  ppeUsed: string;
  healthSurveillanceCompleted: string;
  lastHealthSurveillanceDate: string;
  abnormalResults: string;
  abnormalResultsDetails: string;
  noiseExposure: string;
  audiometryDone: string;
  lastAudiometryDate: string;
  respiratoryExposure: string;
  lungFunctionDone: string;
  skinExposure: string;
  chemicalExposure: string;

  // Section 4: Functional Status & Outstanding Needs
  currentFunctionalStatus: string;
  physicalLimitations: string;
  mentalHealthStatus: string;
  outstandingMedicalAppointments: string;
  appointmentDetails: string;
  outstandingTreatment: string;
  treatmentContinuationPlan: string;
  referralsNeeded: string;
  referralDetails: string;
  fitnessForFutureEmployment: string;
  restrictionsForFutureWork: string;
  healthRecordsCopied: string;
  exitHealthClearance: string;
  additionalNotes: string;
  confirmationChecked: boolean;
  employeeSignature: string;
  assessorSignature: string;
  assessmentDate: string;
}

const totalSections = 4;

const hazardTypeOptions = [
  "Noise", "Dust / Particles", "Chemicals / Solvents", "Asbestos",
  "Manual handling / Heavy lifting", "Vibration", "Radiation",
  "Biological agents", "Extreme temperatures", "Confined spaces",
  "Working at heights", "Night shift / Shift work", "None"
];

export default function ExitHealthCheckForm(): React.ReactElement {
  const navigate = useNavigate();
  const [currentSection, setCurrentSection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ExitHealthCheckData>({
    firstName: "",
    lastName: "",
    email: "",
    employer: "",
    jobTitle: "",
    department: "",
    startDate: "",
    lastWorkingDay: "",
    exitReason: "",
    exitReasonDetails: "",
    yearsOfService: "",
    overallHealthAtExit: "",
    healthChangedDuringEmployment: "",
    healthChangeDetails: "",
    currentMedicalConditions: "",
    workRelatedConditions: "",
    workRelatedConditionDetails: "",
    ongoingTreatment: "",
    treatmentDetails: "",
    currentMedications: "",
    openWorkersCompClaim: "",
    claimDetails: "",
    exposedToHazards: "",
    hazardTypes: [],
    hazardDetails: "",
    ppeUsed: "",
    healthSurveillanceCompleted: "",
    lastHealthSurveillanceDate: "",
    abnormalResults: "",
    abnormalResultsDetails: "",
    noiseExposure: "",
    audiometryDone: "",
    lastAudiometryDate: "",
    respiratoryExposure: "",
    lungFunctionDone: "",
    skinExposure: "",
    chemicalExposure: "",
    currentFunctionalStatus: "",
    physicalLimitations: "",
    mentalHealthStatus: "",
    outstandingMedicalAppointments: "",
    appointmentDetails: "",
    outstandingTreatment: "",
    treatmentContinuationPlan: "",
    referralsNeeded: "",
    referralDetails: "",
    fitnessForFutureEmployment: "",
    restrictionsForFutureWork: "",
    healthRecordsCopied: "",
    exitHealthClearance: "",
    additionalNotes: "",
    confirmationChecked: false,
    employeeSignature: "",
    assessorSignature: "",
    assessmentDate: new Date().toISOString().split('T')[0]
  });

  const updateFormData = (field: keyof ExitHealthCheckData, value: string | boolean): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateArrayField = (field: keyof ExitHealthCheckData, value: string, checked: boolean): void => {
    setFormData(prev => {
      const currentArray = prev[field] as string[];
      if (checked) {
        return { ...prev, [field]: [...currentArray, value] };
      } else {
        return { ...prev, [field]: currentArray.filter(item => item !== value) };
      }
    });
  };

  const calculateExitRiskScore = (): number => {
    let score = 0;
    if (formData.workRelatedConditions === 'yes') score += 2;
    if (formData.openWorkersCompClaim === 'yes') score += 2;
    if (formData.exposedToHazards === 'yes') score += 1;
    if (formData.abnormalResults === 'yes') score += 2;
    if (formData.ongoingTreatment === 'yes') score += 1;
    if (formData.healthChangedDuringEmployment === 'worse') score += 1;
    if (formData.overallHealthAtExit === 'poor') score += 1;
    return Math.min(Math.max(score, 0), 10);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const riskScore = calculateExitRiskScore();
      const clearanceLevel = riskScore <= 3 ? 'cleared_unconditional' : riskScore <= 6 ? 'cleared_conditional' : 'cleared_with_restrictions';

      const response = await fetchWithCsrf('/api/pre-employment/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateName: `${formData.firstName} ${formData.lastName}`,
          candidateEmail: formData.email,
          positionTitle: formData.jobTitle,
          departmentName: formData.employer,
          assessmentType: 'exit_health_check',
          status: 'completed',
          clearanceLevel,
          notes: `Exit Risk Score: ${riskScore}/10. Exit reason: ${formData.exitReason || 'Not specified'}. Open WC claim: ${formData.openWorkersCompClaim || 'No'}. Hazard exposure: ${formData.exposedToHazards || 'No'}.`
        }),
      });

      if (response.ok) {
        navigate('/checks', {
          state: { message: 'Exit health check submitted successfully!' }
        });
      } else {
        throw new Error('Failed to submit exit health check');
      }
    } catch (error) {
      console.error("Error submitting exit health check:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sectionNames = [
    "Employee & Exit Details",
    "Health Baseline at Exit",
    "Occupational Exposure History",
    "Functional Status & Clearance"
  ];

  const renderSection1 = (): React.ReactElement => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Employee & Exit Details</h3>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="firstName">First Name *</Label>
          <Input id="firstName" value={formData.firstName} onChange={(e) => updateFormData('firstName', e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name *</Label>
          <Input id="lastName" value={formData.lastName} onChange={(e) => updateFormData('lastName', e.target.value)} required />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" value={formData.email} onChange={(e) => updateFormData('email', e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="employer">Employer / Company *</Label>
          <Input id="employer" value={formData.employer} onChange={(e) => updateFormData('employer', e.target.value)} required />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="jobTitle">Job Title</Label>
          <Input id="jobTitle" value={formData.jobTitle} onChange={(e) => updateFormData('jobTitle', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="department">Department</Label>
          <Input id="department" value={formData.department} onChange={(e) => updateFormData('department', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="yearsOfService">Years of Service</Label>
          <Input id="yearsOfService" type="number" value={formData.yearsOfService} onChange={(e) => updateFormData('yearsOfService', e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="startDate">Employment Start Date</Label>
          <Input id="startDate" type="date" value={formData.startDate} onChange={(e) => updateFormData('startDate', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="lastWorkingDay">Last Working Day *</Label>
          <Input id="lastWorkingDay" type="date" value={formData.lastWorkingDay} onChange={(e) => updateFormData('lastWorkingDay', e.target.value)} required />
        </div>
      </div>

      <div>
        <Label htmlFor="exitReason">Reason for Exit *</Label>
        <Select value={formData.exitReason} onValueChange={(value) => updateFormData('exitReason', value)}>
          <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="resignation">Resignation</SelectItem>
            <SelectItem value="redundancy">Redundancy</SelectItem>
            <SelectItem value="retirement">Retirement</SelectItem>
            <SelectItem value="end-of-contract">End of contract</SelectItem>
            <SelectItem value="termination">Termination</SelectItem>
            <SelectItem value="medical-retirement">Medical retirement</SelectItem>
            <SelectItem value="mutual-agreement">Mutual agreement</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.exitReason === 'other' && (
        <div>
          <Label htmlFor="exitReasonDetails">Exit Reason Details</Label>
          <Input id="exitReasonDetails" value={formData.exitReasonDetails} onChange={(e) => updateFormData('exitReasonDetails', e.target.value)} />
        </div>
      )}
    </div>
  );

  const renderSection2 = (): React.ReactElement => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Health Baseline at Exit</h3>

      <div>
        <Label className="text-sm font-medium">Overall health at time of exit</Label>
        <RadioGroup value={formData.overallHealthAtExit} onValueChange={(value) => updateFormData('overallHealthAtExit', value)} className="flex flex-wrap gap-4 mt-1">
          {["excellent", "good", "fair", "poor"].map(v => (
            <div key={v} className="flex items-center space-x-2">
              <RadioGroupItem value={v} id={`exitHealth-${v}`} />
              <Label htmlFor={`exitHealth-${v}`} className="font-normal capitalize">{v}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div>
        <Label className="text-sm font-medium">Has your health changed during employment?</Label>
        <RadioGroup value={formData.healthChangedDuringEmployment} onValueChange={(value) => updateFormData('healthChangedDuringEmployment', value)} className="flex flex-wrap gap-4 mt-1">
          {[
            { value: "improved", label: "Improved" },
            { value: "same", label: "Stayed the same" },
            { value: "worse", label: "Got worse" },
            { value: "unsure", label: "Unsure" }
          ].map(opt => (
            <div key={opt.value} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.value} id={`changed-${opt.value}`} />
              <Label htmlFor={`changed-${opt.value}`} className="font-normal">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {formData.healthChangedDuringEmployment === 'worse' && (
        <div>
          <Label htmlFor="healthChangeDetails">How has your health changed?</Label>
          <Textarea id="healthChangeDetails" rows={3} value={formData.healthChangeDetails} onChange={(e) => updateFormData('healthChangeDetails', e.target.value)} />
        </div>
      )}

      <div>
        <Label htmlFor="currentMedicalConditions">Current Medical Conditions</Label>
        <Textarea id="currentMedicalConditions" rows={2} value={formData.currentMedicalConditions} onChange={(e) => updateFormData('currentMedicalConditions', e.target.value)} placeholder="List any current medical conditions..." />
      </div>

      <div>
        <Label className="text-sm font-medium">Do you have any work-related health conditions?</Label>
        <RadioGroup value={formData.workRelatedConditions} onValueChange={(value) => updateFormData('workRelatedConditions', value)} className="flex gap-4 mt-1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="workRelated-yes" />
            <Label htmlFor="workRelated-yes" className="font-normal">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="workRelated-no" />
            <Label htmlFor="workRelated-no" className="font-normal">No</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="unsure" id="workRelated-unsure" />
            <Label htmlFor="workRelated-unsure" className="font-normal">Unsure</Label>
          </div>
        </RadioGroup>
      </div>

      {formData.workRelatedConditions === 'yes' && (
        <div>
          <Label htmlFor="workRelatedConditionDetails">Work-Related Condition Details</Label>
          <Textarea id="workRelatedConditionDetails" rows={3} value={formData.workRelatedConditionDetails} onChange={(e) => updateFormData('workRelatedConditionDetails', e.target.value)} />
        </div>
      )}

      <div>
        <Label className="text-sm font-medium">Currently receiving ongoing treatment?</Label>
        <RadioGroup value={formData.ongoingTreatment} onValueChange={(value) => updateFormData('ongoingTreatment', value)} className="flex gap-4 mt-1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="ongoingTx-yes" />
            <Label htmlFor="ongoingTx-yes" className="font-normal">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="ongoingTx-no" />
            <Label htmlFor="ongoingTx-no" className="font-normal">No</Label>
          </div>
        </RadioGroup>
      </div>

      {formData.ongoingTreatment === 'yes' && (
        <div>
          <Label htmlFor="treatmentDetails">Treatment Details</Label>
          <Textarea id="treatmentDetails" rows={2} value={formData.treatmentDetails} onChange={(e) => updateFormData('treatmentDetails', e.target.value)} />
        </div>
      )}

      <div>
        <Label htmlFor="currentMedications">Current Medications</Label>
        <Input id="currentMedications" value={formData.currentMedications} onChange={(e) => updateFormData('currentMedications', e.target.value)} placeholder="List medications..." />
      </div>

      <div>
        <Label className="text-sm font-medium">Open workers' compensation claim?</Label>
        <RadioGroup value={formData.openWorkersCompClaim} onValueChange={(value) => updateFormData('openWorkersCompClaim', value)} className="flex gap-4 mt-1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="wcClaim-yes" />
            <Label htmlFor="wcClaim-yes" className="font-normal">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="wcClaim-no" />
            <Label htmlFor="wcClaim-no" className="font-normal">No</Label>
          </div>
        </RadioGroup>
      </div>

      {formData.openWorkersCompClaim === 'yes' && (
        <div>
          <Label htmlFor="claimDetails">Claim Details</Label>
          <Input id="claimDetails" value={formData.claimDetails} onChange={(e) => updateFormData('claimDetails', e.target.value)} placeholder="Claim number and status..." />
        </div>
      )}
    </div>
  );

  const renderSection3 = (): React.ReactElement => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Occupational Exposure & Hazard History</h3>

      <div>
        <Label className="text-sm font-medium">Were you exposed to workplace hazards during employment?</Label>
        <RadioGroup value={formData.exposedToHazards} onValueChange={(value) => updateFormData('exposedToHazards', value)} className="flex gap-4 mt-1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="hazards-yes" />
            <Label htmlFor="hazards-yes" className="font-normal">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="hazards-no" />
            <Label htmlFor="hazards-no" className="font-normal">No</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="unsure" id="hazards-unsure" />
            <Label htmlFor="hazards-unsure" className="font-normal">Unsure</Label>
          </div>
        </RadioGroup>
      </div>

      {formData.exposedToHazards === 'yes' && (
        <>
          <div>
            <Label className="text-sm font-medium">Hazard types (select all that apply)</Label>
            <div className="grid gap-2 md:grid-cols-2 mt-2">
              {hazardTypeOptions.map(hazard => (
                <div key={hazard} className="flex items-center space-x-2">
                  <Checkbox
                    id={`hazard-${hazard}`}
                    checked={(formData.hazardTypes as string[]).includes(hazard)}
                    onCheckedChange={(checked) => updateArrayField('hazardTypes', hazard, checked as boolean)}
                  />
                  <Label htmlFor={`hazard-${hazard}`} className="font-normal text-sm">{hazard}</Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="hazardDetails">Hazard Exposure Details</Label>
            <Textarea id="hazardDetails" rows={3} value={formData.hazardDetails} onChange={(e) => updateFormData('hazardDetails', e.target.value)} placeholder="Duration, frequency, and nature of exposure..." />
          </div>
        </>
      )}

      <div>
        <Label className="text-sm font-medium">Was PPE (Personal Protective Equipment) used?</Label>
        <RadioGroup value={formData.ppeUsed} onValueChange={(value) => updateFormData('ppeUsed', value)} className="flex gap-4 mt-1">
          {["always", "mostly", "sometimes", "rarely", "never", "na"].map(v => (
            <div key={v} className="flex items-center space-x-2">
              <RadioGroupItem value={v} id={`ppe-${v}`} />
              <Label htmlFor={`ppe-${v}`} className="font-normal capitalize">{v === 'na' ? 'N/A' : v}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div>
        <Label className="text-sm font-medium">Health surveillance completed during employment?</Label>
        <RadioGroup value={formData.healthSurveillanceCompleted} onValueChange={(value) => updateFormData('healthSurveillanceCompleted', value)} className="flex gap-4 mt-1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="surveillance-yes" />
            <Label htmlFor="surveillance-yes" className="font-normal">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="surveillance-no" />
            <Label htmlFor="surveillance-no" className="font-normal">No</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="na" id="surveillance-na" />
            <Label htmlFor="surveillance-na" className="font-normal">Not applicable</Label>
          </div>
        </RadioGroup>
      </div>

      {formData.healthSurveillanceCompleted === 'yes' && (
        <>
          <div>
            <Label htmlFor="lastHealthSurveillanceDate">Last Health Surveillance Date</Label>
            <Input id="lastHealthSurveillanceDate" type="date" value={formData.lastHealthSurveillanceDate} onChange={(e) => updateFormData('lastHealthSurveillanceDate', e.target.value)} />
          </div>

          <div>
            <Label className="text-sm font-medium">Any abnormal results?</Label>
            <RadioGroup value={formData.abnormalResults} onValueChange={(value) => updateFormData('abnormalResults', value)} className="flex gap-4 mt-1">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="abnormal-yes" />
                <Label htmlFor="abnormal-yes" className="font-normal">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="abnormal-no" />
                <Label htmlFor="abnormal-no" className="font-normal">No</Label>
              </div>
            </RadioGroup>
          </div>

          {formData.abnormalResults === 'yes' && (
            <div>
              <Label htmlFor="abnormalResultsDetails">Abnormal Results Details</Label>
              <Textarea id="abnormalResultsDetails" rows={2} value={formData.abnormalResultsDetails} onChange={(e) => updateFormData('abnormalResultsDetails', e.target.value)} />
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderSection4 = (): React.ReactElement => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Functional Status & Clearance</h3>

      <div>
        <Label className="text-sm font-medium">Current functional status</Label>
        <RadioGroup value={formData.currentFunctionalStatus} onValueChange={(value) => updateFormData('currentFunctionalStatus', value)} className="flex flex-wrap gap-4 mt-1">
          {[
            { value: "full-capacity", label: "Full capacity" },
            { value: "minor-limitations", label: "Minor limitations" },
            { value: "moderate-limitations", label: "Moderate limitations" },
            { value: "significant-limitations", label: "Significant limitations" }
          ].map(opt => (
            <div key={opt.value} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.value} id={`funcStatus-${opt.value}`} />
              <Label htmlFor={`funcStatus-${opt.value}`} className="font-normal">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div>
        <Label htmlFor="physicalLimitations">Physical Limitations (if any)</Label>
        <Textarea id="physicalLimitations" rows={2} value={formData.physicalLimitations} onChange={(e) => updateFormData('physicalLimitations', e.target.value)} />
      </div>

      <div>
        <Label className="text-sm font-medium">Mental health status at exit</Label>
        <RadioGroup value={formData.mentalHealthStatus} onValueChange={(value) => updateFormData('mentalHealthStatus', value)} className="flex flex-wrap gap-4 mt-1">
          {["excellent", "good", "fair", "poor", "prefer-not-to-say"].map(v => (
            <div key={v} className="flex items-center space-x-2">
              <RadioGroupItem value={v} id={`mhStatus-${v}`} />
              <Label htmlFor={`mhStatus-${v}`} className="font-normal capitalize">{v.replace(/-/g, ' ')}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div>
        <Label className="text-sm font-medium">Outstanding medical appointments?</Label>
        <RadioGroup value={formData.outstandingMedicalAppointments} onValueChange={(value) => updateFormData('outstandingMedicalAppointments', value)} className="flex gap-4 mt-1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="appointments-yes" />
            <Label htmlFor="appointments-yes" className="font-normal">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="appointments-no" />
            <Label htmlFor="appointments-no" className="font-normal">No</Label>
          </div>
        </RadioGroup>
      </div>

      {formData.outstandingMedicalAppointments === 'yes' && (
        <div>
          <Label htmlFor="appointmentDetails">Appointment Details</Label>
          <Input id="appointmentDetails" value={formData.appointmentDetails} onChange={(e) => updateFormData('appointmentDetails', e.target.value)} />
        </div>
      )}

      <div>
        <Label className="text-sm font-medium">Referrals needed for post-employment care?</Label>
        <RadioGroup value={formData.referralsNeeded} onValueChange={(value) => updateFormData('referralsNeeded', value)} className="flex gap-4 mt-1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="referrals-yes" />
            <Label htmlFor="referrals-yes" className="font-normal">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="referrals-no" />
            <Label htmlFor="referrals-no" className="font-normal">No</Label>
          </div>
        </RadioGroup>
      </div>

      {formData.referralsNeeded === 'yes' && (
        <div>
          <Label htmlFor="referralDetails">Referral Details</Label>
          <Textarea id="referralDetails" rows={2} value={formData.referralDetails} onChange={(e) => updateFormData('referralDetails', e.target.value)} />
        </div>
      )}

      <div>
        <Label className="text-sm font-medium">Fitness for future employment</Label>
        <RadioGroup value={formData.fitnessForFutureEmployment} onValueChange={(value) => updateFormData('fitnessForFutureEmployment', value)} className="flex flex-wrap gap-4 mt-1">
          {[
            { value: "fit-all-duties", label: "Fit for all duties" },
            { value: "fit-with-restrictions", label: "Fit with restrictions" },
            { value: "temporarily-unfit", label: "Temporarily unfit" },
            { value: "permanently-restricted", label: "Permanently restricted" }
          ].map(opt => (
            <div key={opt.value} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.value} id={`fitness-${opt.value}`} />
              <Label htmlFor={`fitness-${opt.value}`} className="font-normal">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div>
        <Label className="text-sm font-medium">Health records copy provided to employee?</Label>
        <RadioGroup value={formData.healthRecordsCopied} onValueChange={(value) => updateFormData('healthRecordsCopied', value)} className="flex gap-4 mt-1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="records-yes" />
            <Label htmlFor="records-yes" className="font-normal">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="records-no" />
            <Label htmlFor="records-no" className="font-normal">No</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="requested" id="records-requested" />
            <Label htmlFor="records-requested" className="font-normal">Requested</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label htmlFor="additionalNotes">Additional Notes</Label>
        <Textarea id="additionalNotes" rows={3} value={formData.additionalNotes} onChange={(e) => updateFormData('additionalNotes', e.target.value)} />
      </div>

      <div className="border rounded-lg p-4 bg-muted/50 space-y-4">
        <h4 className="font-medium">Exit Health Declaration</h4>
        <p className="text-sm text-muted-foreground">
          I declare that the information provided in this exit health check is accurate.
          I understand that this record forms part of my occupational health history
          and will be retained in accordance with workplace health and safety legislation.
        </p>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="confirmationChecked"
            checked={formData.confirmationChecked}
            onCheckedChange={(checked) => updateFormData('confirmationChecked', checked as boolean)}
          />
          <Label htmlFor="confirmationChecked" className="font-normal">
            I confirm the above declaration
          </Label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="employeeSignature">Employee Signature (type full name) *</Label>
          <Input id="employeeSignature" value={formData.employeeSignature} onChange={(e) => updateFormData('employeeSignature', e.target.value)} placeholder="Type your full name" required />
        </div>
        <div>
          <Label htmlFor="assessorSignature">Assessor Signature (type full name) *</Label>
          <Input id="assessorSignature" value={formData.assessorSignature} onChange={(e) => updateFormData('assessorSignature', e.target.value)} placeholder="Type your full name" required />
        </div>
      </div>

      <div>
        <Label htmlFor="assessmentDate">Assessment Date</Label>
        <Input id="assessmentDate" type="date" value={formData.assessmentDate} onChange={(e) => updateFormData('assessmentDate', e.target.value)} />
      </div>
    </div>
  );

  return (
    <PageLayout title="Exit Health Check" subtitle="Final health assessment and liability closure">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 flex items-center gap-2">
          {sectionNames.map((name, i) => (
            <div key={i} className="flex items-center">
              <button
                type="button"
                onClick={() => setCurrentSection(i + 1)}
                className={`text-xs px-3 py-1 rounded ${
                  i + 1 === currentSection
                    ? 'bg-primary text-primary-foreground font-medium'
                    : i + 1 < currentSection
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i + 1}. {name}
              </button>
              {i < sectionNames.length - 1 && <div className="w-4 h-px bg-border" />}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <LogOut className="h-6 w-6 text-gray-600" />
              <div>
                <CardTitle>Exit Health Check Assessment</CardTitle>
                <CardDescription>
                  Section {currentSection} of {totalSections} - {sectionNames[currentSection - 1]}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              {currentSection === 1 && renderSection1()}
              {currentSection === 2 && renderSection2()}
              {currentSection === 3 && renderSection3()}
              {currentSection === 4 && renderSection4()}

              <div className="flex justify-between mt-8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentSection(prev => Math.max(1, prev - 1))}
                  disabled={currentSection === 1}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                {currentSection < totalSections ? (
                  <Button
                    type="button"
                    onClick={() => setCurrentSection(prev => Math.min(totalSections, prev + 1))}
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={!formData.confirmationChecked || !formData.employeeSignature || !formData.assessorSignature || isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Exit Health Check'}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
