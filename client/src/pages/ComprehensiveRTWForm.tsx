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
import { ClipboardList, ArrowRight, ArrowLeft } from "lucide-react";

interface ComprehensiveRTWData {
  // Section 1: Worker Details
  workerFirstName: string;
  workerLastName: string;
  workerEmail: string;
  workerPhone: string;
  dateOfBirth: string;
  gender: string;
  homeAddress: string;
  employer: string;
  occupation: string;
  employmentType: string;
  startDate: string;
  supervisorName: string;
  supervisorPhone: string;

  // Section 2: Injury / Condition Details
  dateOfInjury: string;
  claimNumber: string;
  natureOfInjury: string;
  bodyPartAffected: string;
  mechanismOfInjury: string;
  injuryDescription: string;
  previousInjurySameArea: string;
  previousInjuryDetails: string;

  // Section 3: Medical Status
  treatingDoctorName: string;
  treatingDoctorPhone: string;
  currentDiagnosis: string;
  treatmentReceived: string;
  currentMedications: string;
  surgeryRequired: string;
  surgeryDetails: string;
  surgeryDate: string;
  medicalClearanceStatus: string;
  nextMedicalReview: string;
  medicalRestrictions: string;

  // Section 4: Functional Capacity
  canSit: string;
  canStand: string;
  canWalk: string;
  canBend: string;
  canSquat: string;
  canKneel: string;
  canClimb: string;
  canReachAbove: string;
  canLift: string;
  maxLiftKg: string;
  canDrive: string;
  canUseKeyboard: string;
  canGrip: string;
  hoursPerDay: string;
  daysPerWeek: string;
  functionalNotes: string;

  // Section 5: Treatment & Recovery Plan
  currentTreatmentPlan: string;
  physiotherapy: string;
  physioFrequency: string;
  psychology: string;
  psychologyFrequency: string;
  otherTreatment: string;
  otherTreatmentDetails: string;
  estimatedRecoveryWeeks: string;
  recoveryMilestones: string;
  barriersToRecovery: string;

  // Section 6: Workplace Assessment
  preInjuryDuties: string;
  physicalDemandsOfRole: string;
  workplaceHazards: string;
  modificationsAvailable: string;
  alternativeDutiesAvailable: string;
  alternativeDutiesDescription: string;
  workplaceAccessible: string;
  equipmentRequired: string;
  gradualReturnPossible: string;

  // Section 7: RTW Plan
  rtwStartDate: string;
  rtwType: string;
  initialHoursPerDay: string;
  initialDaysPerWeek: string;
  targetFullDutiesDate: string;
  week1Duties: string;
  week2Duties: string;
  week3Duties: string;
  week4Duties: string;
  reviewSchedule: string;
  escalationPlan: string;
  communicationPlan: string;

  // Section 8: Employer Input
  employerContactName: string;
  employerContactPhone: string;
  employerContactEmail: string;
  employerAgreesToPlan: string;
  employerConcerns: string;
  dutiesModificationAgreed: string;
  hoursModificationAgreed: string;
  supportMeasures: string;
  workplacePolicyCompliance: string;
  additionalEmployerNotes: string;

  // Section 9: Completion & Declaration
  workerAgreesToPlan: string;
  workerConcerns: string;
  goalsForRTW: string;
  confirmationChecked: boolean;
  workerSignature: string;
  coordinatorSignature: string;
  planDate: string;
}

const totalSections = 9;

const capacityOptions = [
  { value: "can", label: "Can perform without restriction" },
  { value: "modification", label: "Can perform with modification" },
  { value: "cannot", label: "Cannot perform" },
  { value: "not-assessed", label: "Not assessed" }
];

export default function ComprehensiveRTWForm(): React.ReactElement {
  const navigate = useNavigate();
  const [currentSection, setCurrentSection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ComprehensiveRTWData>({
    workerFirstName: "",
    workerLastName: "",
    workerEmail: "",
    workerPhone: "",
    dateOfBirth: "",
    gender: "",
    homeAddress: "",
    employer: "",
    occupation: "",
    employmentType: "",
    startDate: "",
    supervisorName: "",
    supervisorPhone: "",
    dateOfInjury: "",
    claimNumber: "",
    natureOfInjury: "",
    bodyPartAffected: "",
    mechanismOfInjury: "",
    injuryDescription: "",
    previousInjurySameArea: "",
    previousInjuryDetails: "",
    treatingDoctorName: "",
    treatingDoctorPhone: "",
    currentDiagnosis: "",
    treatmentReceived: "",
    currentMedications: "",
    surgeryRequired: "",
    surgeryDetails: "",
    surgeryDate: "",
    medicalClearanceStatus: "",
    nextMedicalReview: "",
    medicalRestrictions: "",
    canSit: "",
    canStand: "",
    canWalk: "",
    canBend: "",
    canSquat: "",
    canKneel: "",
    canClimb: "",
    canReachAbove: "",
    canLift: "",
    maxLiftKg: "",
    canDrive: "",
    canUseKeyboard: "",
    canGrip: "",
    hoursPerDay: "",
    daysPerWeek: "",
    functionalNotes: "",
    currentTreatmentPlan: "",
    physiotherapy: "",
    physioFrequency: "",
    psychology: "",
    psychologyFrequency: "",
    otherTreatment: "",
    otherTreatmentDetails: "",
    estimatedRecoveryWeeks: "",
    recoveryMilestones: "",
    barriersToRecovery: "",
    preInjuryDuties: "",
    physicalDemandsOfRole: "",
    workplaceHazards: "",
    modificationsAvailable: "",
    alternativeDutiesAvailable: "",
    alternativeDutiesDescription: "",
    workplaceAccessible: "",
    equipmentRequired: "",
    gradualReturnPossible: "",
    rtwStartDate: "",
    rtwType: "",
    initialHoursPerDay: "",
    initialDaysPerWeek: "",
    targetFullDutiesDate: "",
    week1Duties: "",
    week2Duties: "",
    week3Duties: "",
    week4Duties: "",
    reviewSchedule: "",
    escalationPlan: "",
    communicationPlan: "",
    employerContactName: "",
    employerContactPhone: "",
    employerContactEmail: "",
    employerAgreesToPlan: "",
    employerConcerns: "",
    dutiesModificationAgreed: "",
    hoursModificationAgreed: "",
    supportMeasures: "",
    workplacePolicyCompliance: "",
    additionalEmployerNotes: "",
    workerAgreesToPlan: "",
    workerConcerns: "",
    goalsForRTW: "",
    confirmationChecked: false,
    workerSignature: "",
    coordinatorSignature: "",
    planDate: new Date().toISOString().split('T')[0]
  });

  const updateFormData = (field: keyof ComprehensiveRTWData, value: string | boolean): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateRTWRiskScore = (): number => {
    let score = 0;
    // Functional capacity restrictions
    const capacityFields = ['canSit', 'canStand', 'canWalk', 'canBend', 'canSquat', 'canKneel', 'canClimb', 'canReachAbove', 'canLift', 'canDrive', 'canGrip'] as const;
    const restrictions = capacityFields.filter(f => formData[f] === 'cannot').length;
    const modifications = capacityFields.filter(f => formData[f] === 'modification').length;
    score += Math.min(restrictions * 2, 4);
    score += Math.min(Math.floor(modifications / 2), 2);
    // Surgery required
    if (formData.surgeryRequired === 'yes') score += 2;
    // Previous injury same area
    if (formData.previousInjurySameArea === 'yes') score += 1;
    // Recovery timeline
    const weeks = parseInt(formData.estimatedRecoveryWeeks) || 0;
    if (weeks > 12) score += 1;
    return Math.min(Math.max(score, 0), 10);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const riskScore = calculateRTWRiskScore();
      const clearanceLevel = riskScore <= 3 ? 'cleared_conditional' : riskScore <= 6 ? 'cleared_with_restrictions' : 'cleared_with_restrictions';

      const response = await fetchWithCsrf('/api/pre-employment/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateName: `${formData.workerFirstName} ${formData.workerLastName}`,
          candidateEmail: formData.workerEmail,
          positionTitle: formData.occupation,
          departmentName: formData.employer,
          assessmentType: 'comprehensive_rtw',
          status: 'completed',
          clearanceLevel,
          notes: `RTW Risk Score: ${riskScore}/10. Comprehensive return-to-work assessment. Claim #${formData.claimNumber}. Injury: ${formData.natureOfInjury}. Target full duties: ${formData.targetFullDutiesDate || 'TBD'}.`
        }),
      });

      if (response.ok) {
        navigate('/checks', {
          state: { message: 'Comprehensive RTW assessment submitted successfully!' }
        });
      } else {
        throw new Error('Failed to submit RTW assessment');
      }
    } catch (error) {
      console.error("Error submitting RTW assessment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sectionNames = [
    "Worker Details",
    "Injury / Condition",
    "Medical Status",
    "Functional Capacity",
    "Treatment & Recovery",
    "Workplace Assessment",
    "RTW Plan",
    "Employer Input",
    "Completion"
  ];

  const renderCapacityField = (id: string, label: string, field: keyof ComprehensiveRTWData): React.ReactElement => (
    <div key={id}>
      <Label className="text-sm font-medium">{label}</Label>
      <RadioGroup
        value={formData[field] as string}
        onValueChange={(value) => updateFormData(field, value)}
        className="flex flex-wrap gap-4 mt-1"
      >
        {capacityOptions.map(opt => (
          <div key={opt.value} className="flex items-center space-x-2">
            <RadioGroupItem value={opt.value} id={`${id}-${opt.value}`} />
            <Label htmlFor={`${id}-${opt.value}`} className="text-sm font-normal">{opt.label}</Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );

  const renderSection1 = (): React.ReactElement => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Worker Details</h3>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="workerFirstName">First Name *</Label>
          <Input id="workerFirstName" value={formData.workerFirstName} onChange={(e) => updateFormData('workerFirstName', e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="workerLastName">Last Name *</Label>
          <Input id="workerLastName" value={formData.workerLastName} onChange={(e) => updateFormData('workerLastName', e.target.value)} required />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="workerEmail">Email *</Label>
          <Input id="workerEmail" type="email" value={formData.workerEmail} onChange={(e) => updateFormData('workerEmail', e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="workerPhone">Phone</Label>
          <Input id="workerPhone" type="tel" value={formData.workerPhone} onChange={(e) => updateFormData('workerPhone', e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <Input id="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={(e) => updateFormData('dateOfBirth', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="gender">Gender</Label>
          <Select value={formData.gender} onValueChange={(value) => updateFormData('gender', value)}>
            <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="non-binary">Non-binary</SelectItem>
              <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="homeAddress">Home Address</Label>
        <Input id="homeAddress" value={formData.homeAddress} onChange={(e) => updateFormData('homeAddress', e.target.value)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="employer">Employer / Company *</Label>
          <Input id="employer" value={formData.employer} onChange={(e) => updateFormData('employer', e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="occupation">Occupation / Job Title *</Label>
          <Input id="occupation" value={formData.occupation} onChange={(e) => updateFormData('occupation', e.target.value)} required />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="employmentType">Employment Type</Label>
          <Select value={formData.employmentType} onValueChange={(value) => updateFormData('employmentType', value)}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="full-time">Full-time</SelectItem>
              <SelectItem value="part-time">Part-time</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="contractor">Contractor</SelectItem>
              <SelectItem value="labour-hire">Labour hire</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="startDate">Employment Start Date</Label>
          <Input id="startDate" type="date" value={formData.startDate} onChange={(e) => updateFormData('startDate', e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="supervisorName">Supervisor Name</Label>
          <Input id="supervisorName" value={formData.supervisorName} onChange={(e) => updateFormData('supervisorName', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="supervisorPhone">Supervisor Phone</Label>
          <Input id="supervisorPhone" type="tel" value={formData.supervisorPhone} onChange={(e) => updateFormData('supervisorPhone', e.target.value)} />
        </div>
      </div>
    </div>
  );

  const renderSection2 = (): React.ReactElement => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Injury / Condition Details</h3>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="dateOfInjury">Date of Injury *</Label>
          <Input id="dateOfInjury" type="date" value={formData.dateOfInjury} onChange={(e) => updateFormData('dateOfInjury', e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="claimNumber">Claim Number</Label>
          <Input id="claimNumber" value={formData.claimNumber} onChange={(e) => updateFormData('claimNumber', e.target.value)} placeholder="e.g. WC-2026-001" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="natureOfInjury">Nature of Injury *</Label>
          <Select value={formData.natureOfInjury} onValueChange={(value) => updateFormData('natureOfInjury', value)}>
            <SelectTrigger><SelectValue placeholder="Select injury type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="strain-sprain">Strain / Sprain</SelectItem>
              <SelectItem value="fracture">Fracture</SelectItem>
              <SelectItem value="laceration">Laceration / Cut</SelectItem>
              <SelectItem value="contusion">Contusion / Bruise</SelectItem>
              <SelectItem value="dislocation">Dislocation</SelectItem>
              <SelectItem value="crush-injury">Crush Injury</SelectItem>
              <SelectItem value="burn">Burn</SelectItem>
              <SelectItem value="repetitive-strain">Repetitive Strain Injury</SelectItem>
              <SelectItem value="psychological">Psychological Injury</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="bodyPartAffected">Body Part Affected *</Label>
          <Select value={formData.bodyPartAffected} onValueChange={(value) => updateFormData('bodyPartAffected', value)}>
            <SelectTrigger><SelectValue placeholder="Select body part" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="head-neck">Head / Neck</SelectItem>
              <SelectItem value="shoulder">Shoulder</SelectItem>
              <SelectItem value="upper-back">Upper Back</SelectItem>
              <SelectItem value="lower-back">Lower Back</SelectItem>
              <SelectItem value="arm-elbow">Arm / Elbow</SelectItem>
              <SelectItem value="wrist-hand">Wrist / Hand</SelectItem>
              <SelectItem value="hip">Hip</SelectItem>
              <SelectItem value="knee">Knee</SelectItem>
              <SelectItem value="ankle-foot">Ankle / Foot</SelectItem>
              <SelectItem value="leg">Leg</SelectItem>
              <SelectItem value="chest-abdomen">Chest / Abdomen</SelectItem>
              <SelectItem value="multiple">Multiple areas</SelectItem>
              <SelectItem value="psychological">Psychological</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="mechanismOfInjury">Mechanism of Injury</Label>
        <Select value={formData.mechanismOfInjury} onValueChange={(value) => updateFormData('mechanismOfInjury', value)}>
          <SelectTrigger><SelectValue placeholder="How did the injury occur?" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="lifting">Lifting / Carrying</SelectItem>
            <SelectItem value="fall-same-level">Fall on same level</SelectItem>
            <SelectItem value="fall-height">Fall from height</SelectItem>
            <SelectItem value="struck-by">Struck by object</SelectItem>
            <SelectItem value="vehicle">Vehicle accident</SelectItem>
            <SelectItem value="repetitive-motion">Repetitive motion</SelectItem>
            <SelectItem value="slip-trip">Slip / Trip</SelectItem>
            <SelectItem value="machinery">Machinery / Equipment</SelectItem>
            <SelectItem value="workplace-stress">Workplace stress / Bullying</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="injuryDescription">Detailed Description of Injury / Condition *</Label>
        <Textarea id="injuryDescription" rows={4} value={formData.injuryDescription} onChange={(e) => updateFormData('injuryDescription', e.target.value)} placeholder="Describe how the injury occurred and the resulting condition..." required />
      </div>

      <div>
        <Label className="text-sm font-medium">Previous injury to the same area?</Label>
        <RadioGroup value={formData.previousInjurySameArea} onValueChange={(value) => updateFormData('previousInjurySameArea', value)} className="flex gap-4 mt-1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="prevInjury-yes" />
            <Label htmlFor="prevInjury-yes" className="font-normal">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="prevInjury-no" />
            <Label htmlFor="prevInjury-no" className="font-normal">No</Label>
          </div>
        </RadioGroup>
      </div>

      {formData.previousInjurySameArea === 'yes' && (
        <div>
          <Label htmlFor="previousInjuryDetails">Previous Injury Details</Label>
          <Textarea id="previousInjuryDetails" rows={3} value={formData.previousInjuryDetails} onChange={(e) => updateFormData('previousInjuryDetails', e.target.value)} placeholder="Describe the previous injury..." />
        </div>
      )}
    </div>
  );

  const renderSection3 = (): React.ReactElement => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Medical Status</h3>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="treatingDoctorName">Treating Doctor Name *</Label>
          <Input id="treatingDoctorName" value={formData.treatingDoctorName} onChange={(e) => updateFormData('treatingDoctorName', e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="treatingDoctorPhone">Doctor Phone</Label>
          <Input id="treatingDoctorPhone" type="tel" value={formData.treatingDoctorPhone} onChange={(e) => updateFormData('treatingDoctorPhone', e.target.value)} />
        </div>
      </div>

      <div>
        <Label htmlFor="currentDiagnosis">Current Diagnosis *</Label>
        <Textarea id="currentDiagnosis" rows={3} value={formData.currentDiagnosis} onChange={(e) => updateFormData('currentDiagnosis', e.target.value)} placeholder="Enter the current medical diagnosis..." required />
      </div>

      <div>
        <Label htmlFor="treatmentReceived">Treatment Received to Date</Label>
        <Textarea id="treatmentReceived" rows={3} value={formData.treatmentReceived} onChange={(e) => updateFormData('treatmentReceived', e.target.value)} placeholder="List treatments received..." />
      </div>

      <div>
        <Label htmlFor="currentMedications">Current Medications</Label>
        <Textarea id="currentMedications" rows={2} value={formData.currentMedications} onChange={(e) => updateFormData('currentMedications', e.target.value)} placeholder="List current medications and dosages..." />
      </div>

      <div>
        <Label className="text-sm font-medium">Surgery Required?</Label>
        <RadioGroup value={formData.surgeryRequired} onValueChange={(value) => updateFormData('surgeryRequired', value)} className="flex gap-4 mt-1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="surgery-yes" />
            <Label htmlFor="surgery-yes" className="font-normal">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="surgery-no" />
            <Label htmlFor="surgery-no" className="font-normal">No</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="pending" id="surgery-pending" />
            <Label htmlFor="surgery-pending" className="font-normal">Pending review</Label>
          </div>
        </RadioGroup>
      </div>

      {formData.surgeryRequired === 'yes' && (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="surgeryDetails">Surgery Details</Label>
            <Input id="surgeryDetails" value={formData.surgeryDetails} onChange={(e) => updateFormData('surgeryDetails', e.target.value)} placeholder="Type of surgery..." />
          </div>
          <div>
            <Label htmlFor="surgeryDate">Surgery Date</Label>
            <Input id="surgeryDate" type="date" value={formData.surgeryDate} onChange={(e) => updateFormData('surgeryDate', e.target.value)} />
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="medicalClearanceStatus">Medical Clearance Status *</Label>
        <Select value={formData.medicalClearanceStatus} onValueChange={(value) => updateFormData('medicalClearanceStatus', value)}>
          <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="full-clearance">Full medical clearance</SelectItem>
            <SelectItem value="partial-clearance">Partial clearance with restrictions</SelectItem>
            <SelectItem value="not-cleared">Not yet cleared for work</SelectItem>
            <SelectItem value="pending-review">Pending specialist review</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="nextMedicalReview">Next Medical Review Date</Label>
        <Input id="nextMedicalReview" type="date" value={formData.nextMedicalReview} onChange={(e) => updateFormData('nextMedicalReview', e.target.value)} />
      </div>

      <div>
        <Label htmlFor="medicalRestrictions">Medical Restrictions / Limitations</Label>
        <Textarea id="medicalRestrictions" rows={3} value={formData.medicalRestrictions} onChange={(e) => updateFormData('medicalRestrictions', e.target.value)} placeholder="List any restrictions imposed by treating medical practitioner..." />
      </div>
    </div>
  );

  const renderSection4 = (): React.ReactElement => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Functional Capacity Assessment</h3>
      <p className="text-sm text-muted-foreground mb-4">Assess the worker's current functional capacity for each activity.</p>

      <div className="space-y-4">
        {renderCapacityField('canSit', 'Sitting', 'canSit')}
        {renderCapacityField('canStand', 'Standing', 'canStand')}
        {renderCapacityField('canWalk', 'Walking', 'canWalk')}
        {renderCapacityField('canBend', 'Bending / Stooping', 'canBend')}
        {renderCapacityField('canSquat', 'Squatting / Crouching', 'canSquat')}
        {renderCapacityField('canKneel', 'Kneeling', 'canKneel')}
        {renderCapacityField('canClimb', 'Climbing (stairs/ladders)', 'canClimb')}
        {renderCapacityField('canReachAbove', 'Reaching Above Shoulder', 'canReachAbove')}
        {renderCapacityField('canLift', 'Lifting / Carrying', 'canLift')}
      </div>

      {formData.canLift === 'can' || formData.canLift === 'modification' ? (
        <div>
          <Label htmlFor="maxLiftKg">Maximum Lift Capacity (kg)</Label>
          <Input id="maxLiftKg" type="number" value={formData.maxLiftKg} onChange={(e) => updateFormData('maxLiftKg', e.target.value)} placeholder="e.g. 10" />
        </div>
      ) : null}

      <div className="space-y-4">
        {renderCapacityField('canDrive', 'Driving', 'canDrive')}
        {renderCapacityField('canUseKeyboard', 'Keyboard / Computer Use', 'canUseKeyboard')}
        {renderCapacityField('canGrip', 'Gripping / Fine Motor', 'canGrip')}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="hoursPerDay">Recommended Hours Per Day</Label>
          <Select value={formData.hoursPerDay} onValueChange={(value) => updateFormData('hoursPerDay', value)}>
            <SelectTrigger><SelectValue placeholder="Select hours" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 hours</SelectItem>
              <SelectItem value="4">4 hours</SelectItem>
              <SelectItem value="6">6 hours</SelectItem>
              <SelectItem value="8">8 hours (full day)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="daysPerWeek">Recommended Days Per Week</Label>
          <Select value={formData.daysPerWeek} onValueChange={(value) => updateFormData('daysPerWeek', value)}>
            <SelectTrigger><SelectValue placeholder="Select days" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 day</SelectItem>
              <SelectItem value="2">2 days</SelectItem>
              <SelectItem value="3">3 days</SelectItem>
              <SelectItem value="4">4 days</SelectItem>
              <SelectItem value="5">5 days (full week)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="functionalNotes">Additional Functional Notes</Label>
        <Textarea id="functionalNotes" rows={3} value={formData.functionalNotes} onChange={(e) => updateFormData('functionalNotes', e.target.value)} placeholder="Any additional notes about functional capacity..." />
      </div>
    </div>
  );

  const renderSection5 = (): React.ReactElement => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Treatment & Recovery Plan</h3>

      <div>
        <Label htmlFor="currentTreatmentPlan">Current Treatment Plan *</Label>
        <Textarea id="currentTreatmentPlan" rows={3} value={formData.currentTreatmentPlan} onChange={(e) => updateFormData('currentTreatmentPlan', e.target.value)} placeholder="Describe the current treatment plan..." required />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label className="text-sm font-medium">Physiotherapy?</Label>
          <RadioGroup value={formData.physiotherapy} onValueChange={(value) => updateFormData('physiotherapy', value)} className="flex gap-4 mt-1">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="physio-yes" />
              <Label htmlFor="physio-yes" className="font-normal">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="physio-no" />
              <Label htmlFor="physio-no" className="font-normal">No</Label>
            </div>
          </RadioGroup>
        </div>
        {formData.physiotherapy === 'yes' && (
          <div>
            <Label htmlFor="physioFrequency">Frequency</Label>
            <Input id="physioFrequency" value={formData.physioFrequency} onChange={(e) => updateFormData('physioFrequency', e.target.value)} placeholder="e.g. 2x per week" />
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label className="text-sm font-medium">Psychology / Counselling?</Label>
          <RadioGroup value={formData.psychology} onValueChange={(value) => updateFormData('psychology', value)} className="flex gap-4 mt-1">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="psych-yes" />
              <Label htmlFor="psych-yes" className="font-normal">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="psych-no" />
              <Label htmlFor="psych-no" className="font-normal">No</Label>
            </div>
          </RadioGroup>
        </div>
        {formData.psychology === 'yes' && (
          <div>
            <Label htmlFor="psychologyFrequency">Frequency</Label>
            <Input id="psychologyFrequency" value={formData.psychologyFrequency} onChange={(e) => updateFormData('psychologyFrequency', e.target.value)} placeholder="e.g. Weekly" />
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label className="text-sm font-medium">Other Treatment?</Label>
          <RadioGroup value={formData.otherTreatment} onValueChange={(value) => updateFormData('otherTreatment', value)} className="flex gap-4 mt-1">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="otherTx-yes" />
              <Label htmlFor="otherTx-yes" className="font-normal">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="otherTx-no" />
              <Label htmlFor="otherTx-no" className="font-normal">No</Label>
            </div>
          </RadioGroup>
        </div>
        {formData.otherTreatment === 'yes' && (
          <div>
            <Label htmlFor="otherTreatmentDetails">Treatment Details</Label>
            <Input id="otherTreatmentDetails" value={formData.otherTreatmentDetails} onChange={(e) => updateFormData('otherTreatmentDetails', e.target.value)} placeholder="e.g. Chiropractic, Hydrotherapy..." />
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="estimatedRecoveryWeeks">Estimated Recovery Timeline (weeks)</Label>
        <Input id="estimatedRecoveryWeeks" type="number" value={formData.estimatedRecoveryWeeks} onChange={(e) => updateFormData('estimatedRecoveryWeeks', e.target.value)} placeholder="e.g. 8" />
      </div>

      <div>
        <Label htmlFor="recoveryMilestones">Recovery Milestones</Label>
        <Textarea id="recoveryMilestones" rows={3} value={formData.recoveryMilestones} onChange={(e) => updateFormData('recoveryMilestones', e.target.value)} placeholder="Key milestones in the recovery plan..." />
      </div>

      <div>
        <Label htmlFor="barriersToRecovery">Barriers to Recovery</Label>
        <Textarea id="barriersToRecovery" rows={3} value={formData.barriersToRecovery} onChange={(e) => updateFormData('barriersToRecovery', e.target.value)} placeholder="Identify any barriers (physical, psychological, social, workplace)..." />
      </div>
    </div>
  );

  const renderSection6 = (): React.ReactElement => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Workplace Assessment</h3>

      <div>
        <Label htmlFor="preInjuryDuties">Pre-Injury Duties *</Label>
        <Textarea id="preInjuryDuties" rows={3} value={formData.preInjuryDuties} onChange={(e) => updateFormData('preInjuryDuties', e.target.value)} placeholder="Describe the worker's normal pre-injury duties..." required />
      </div>

      <div>
        <Label htmlFor="physicalDemandsOfRole">Physical Demands of Role</Label>
        <Select value={formData.physicalDemandsOfRole} onValueChange={(value) => updateFormData('physicalDemandsOfRole', value)}>
          <SelectTrigger><SelectValue placeholder="Select demand level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sedentary">Sedentary (desk-based)</SelectItem>
            <SelectItem value="light">Light physical</SelectItem>
            <SelectItem value="medium">Medium physical</SelectItem>
            <SelectItem value="heavy">Heavy physical</SelectItem>
            <SelectItem value="very-heavy">Very heavy physical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="workplaceHazards">Workplace Hazards Relevant to Injury</Label>
        <Textarea id="workplaceHazards" rows={2} value={formData.workplaceHazards} onChange={(e) => updateFormData('workplaceHazards', e.target.value)} placeholder="List any relevant workplace hazards..." />
      </div>

      <div>
        <Label className="text-sm font-medium">Workplace modifications available?</Label>
        <RadioGroup value={formData.modificationsAvailable} onValueChange={(value) => updateFormData('modificationsAvailable', value)} className="flex gap-4 mt-1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="mods-yes" />
            <Label htmlFor="mods-yes" className="font-normal">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="mods-no" />
            <Label htmlFor="mods-no" className="font-normal">No</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="to-be-assessed" id="mods-tba" />
            <Label htmlFor="mods-tba" className="font-normal">To be assessed</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label className="text-sm font-medium">Alternative duties available?</Label>
        <RadioGroup value={formData.alternativeDutiesAvailable} onValueChange={(value) => updateFormData('alternativeDutiesAvailable', value)} className="flex gap-4 mt-1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="altDuties-yes" />
            <Label htmlFor="altDuties-yes" className="font-normal">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="altDuties-no" />
            <Label htmlFor="altDuties-no" className="font-normal">No</Label>
          </div>
        </RadioGroup>
      </div>

      {formData.alternativeDutiesAvailable === 'yes' && (
        <div>
          <Label htmlFor="alternativeDutiesDescription">Describe Alternative Duties</Label>
          <Textarea id="alternativeDutiesDescription" rows={3} value={formData.alternativeDutiesDescription} onChange={(e) => updateFormData('alternativeDutiesDescription', e.target.value)} placeholder="Describe the alternative duties available..." />
        </div>
      )}

      <div>
        <Label className="text-sm font-medium">Is the workplace accessible for the worker?</Label>
        <RadioGroup value={formData.workplaceAccessible} onValueChange={(value) => updateFormData('workplaceAccessible', value)} className="flex gap-4 mt-1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="accessible-yes" />
            <Label htmlFor="accessible-yes" className="font-normal">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="accessible-no" />
            <Label htmlFor="accessible-no" className="font-normal">No</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="with-modifications" id="accessible-mod" />
            <Label htmlFor="accessible-mod" className="font-normal">With modifications</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label htmlFor="equipmentRequired">Equipment / Aids Required</Label>
        <Input id="equipmentRequired" value={formData.equipmentRequired} onChange={(e) => updateFormData('equipmentRequired', e.target.value)} placeholder="e.g. Ergonomic chair, standing desk, wrist support..." />
      </div>

      <div>
        <Label className="text-sm font-medium">Gradual return to work possible?</Label>
        <RadioGroup value={formData.gradualReturnPossible} onValueChange={(value) => updateFormData('gradualReturnPossible', value)} className="flex gap-4 mt-1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="gradual-yes" />
            <Label htmlFor="gradual-yes" className="font-normal">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="gradual-no" />
            <Label htmlFor="gradual-no" className="font-normal">No - full duties only</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );

  const renderSection7 = (): React.ReactElement => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Return to Work Plan</h3>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="rtwStartDate">RTW Start Date *</Label>
          <Input id="rtwStartDate" type="date" value={formData.rtwStartDate} onChange={(e) => updateFormData('rtwStartDate', e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="rtwType">RTW Type *</Label>
          <Select value={formData.rtwType} onValueChange={(value) => updateFormData('rtwType', value)}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="full-duties">Full duties - no restrictions</SelectItem>
              <SelectItem value="modified-duties">Modified duties</SelectItem>
              <SelectItem value="graduated-return">Graduated return (increasing hours)</SelectItem>
              <SelectItem value="alternative-duties">Alternative duties</SelectItem>
              <SelectItem value="work-trial">Work trial</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="initialHoursPerDay">Initial Hours Per Day</Label>
          <Select value={formData.initialHoursPerDay} onValueChange={(value) => updateFormData('initialHoursPerDay', value)}>
            <SelectTrigger><SelectValue placeholder="Select hours" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 hours</SelectItem>
              <SelectItem value="4">4 hours</SelectItem>
              <SelectItem value="6">6 hours</SelectItem>
              <SelectItem value="8">8 hours (full day)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="initialDaysPerWeek">Initial Days Per Week</Label>
          <Select value={formData.initialDaysPerWeek} onValueChange={(value) => updateFormData('initialDaysPerWeek', value)}>
            <SelectTrigger><SelectValue placeholder="Select days" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 day</SelectItem>
              <SelectItem value="2">2 days</SelectItem>
              <SelectItem value="3">3 days</SelectItem>
              <SelectItem value="4">4 days</SelectItem>
              <SelectItem value="5">5 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="targetFullDutiesDate">Target Full Duties Date</Label>
        <Input id="targetFullDutiesDate" type="date" value={formData.targetFullDutiesDate} onChange={(e) => updateFormData('targetFullDutiesDate', e.target.value)} />
      </div>

      <div className="border rounded-lg p-4 space-y-4">
        <h4 className="font-medium">Weekly Graduated Plan</h4>
        <div>
          <Label htmlFor="week1Duties">Week 1 - Duties & Hours</Label>
          <Input id="week1Duties" value={formData.week1Duties} onChange={(e) => updateFormData('week1Duties', e.target.value)} placeholder="e.g. Light admin duties, 4hrs/day, 3 days/week" />
        </div>
        <div>
          <Label htmlFor="week2Duties">Week 2 - Duties & Hours</Label>
          <Input id="week2Duties" value={formData.week2Duties} onChange={(e) => updateFormData('week2Duties', e.target.value)} placeholder="e.g. Admin + light physical, 6hrs/day, 4 days/week" />
        </div>
        <div>
          <Label htmlFor="week3Duties">Week 3 - Duties & Hours</Label>
          <Input id="week3Duties" value={formData.week3Duties} onChange={(e) => updateFormData('week3Duties', e.target.value)} placeholder="e.g. Normal duties excl. heavy lifting, 8hrs/day, 5 days/week" />
        </div>
        <div>
          <Label htmlFor="week4Duties">Week 4 - Duties & Hours</Label>
          <Input id="week4Duties" value={formData.week4Duties} onChange={(e) => updateFormData('week4Duties', e.target.value)} placeholder="e.g. Full duties, full hours" />
        </div>
      </div>

      <div>
        <Label htmlFor="reviewSchedule">Review Schedule</Label>
        <Select value={formData.reviewSchedule} onValueChange={(value) => updateFormData('reviewSchedule', value)}>
          <SelectTrigger><SelectValue placeholder="How often will the plan be reviewed?" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="twice-weekly">Twice weekly</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="fortnightly">Fortnightly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="escalationPlan">Escalation Plan</Label>
        <Textarea id="escalationPlan" rows={2} value={formData.escalationPlan} onChange={(e) => updateFormData('escalationPlan', e.target.value)} placeholder="What happens if the worker is unable to meet the plan requirements?" />
      </div>

      <div>
        <Label htmlFor="communicationPlan">Communication Plan</Label>
        <Textarea id="communicationPlan" rows={2} value={formData.communicationPlan} onChange={(e) => updateFormData('communicationPlan', e.target.value)} placeholder="How will progress be communicated between worker, employer, and treating team?" />
      </div>
    </div>
  );

  const renderSection8 = (): React.ReactElement => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Employer Input</h3>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="employerContactName">Employer Contact Name *</Label>
          <Input id="employerContactName" value={formData.employerContactName} onChange={(e) => updateFormData('employerContactName', e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="employerContactPhone">Phone</Label>
          <Input id="employerContactPhone" type="tel" value={formData.employerContactPhone} onChange={(e) => updateFormData('employerContactPhone', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="employerContactEmail">Email</Label>
          <Input id="employerContactEmail" type="email" value={formData.employerContactEmail} onChange={(e) => updateFormData('employerContactEmail', e.target.value)} />
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Employer agrees to RTW plan?</Label>
        <RadioGroup value={formData.employerAgreesToPlan} onValueChange={(value) => updateFormData('employerAgreesToPlan', value)} className="flex gap-4 mt-1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="empAgree-yes" />
            <Label htmlFor="empAgree-yes" className="font-normal">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="empAgree-no" />
            <Label htmlFor="empAgree-no" className="font-normal">No</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="with-changes" id="empAgree-changes" />
            <Label htmlFor="empAgree-changes" className="font-normal">Yes, with changes</Label>
          </div>
        </RadioGroup>
      </div>

      {(formData.employerAgreesToPlan === 'no' || formData.employerAgreesToPlan === 'with-changes') && (
        <div>
          <Label htmlFor="employerConcerns">Employer Concerns / Requested Changes</Label>
          <Textarea id="employerConcerns" rows={3} value={formData.employerConcerns} onChange={(e) => updateFormData('employerConcerns', e.target.value)} placeholder="Detail any employer concerns or requested changes..." />
        </div>
      )}

      <div>
        <Label className="text-sm font-medium">Duties modification agreed?</Label>
        <RadioGroup value={formData.dutiesModificationAgreed} onValueChange={(value) => updateFormData('dutiesModificationAgreed', value)} className="flex gap-4 mt-1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="dutiesMod-yes" />
            <Label htmlFor="dutiesMod-yes" className="font-normal">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="dutiesMod-no" />
            <Label htmlFor="dutiesMod-no" className="font-normal">No</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="na" id="dutiesMod-na" />
            <Label htmlFor="dutiesMod-na" className="font-normal">N/A</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label className="text-sm font-medium">Hours modification agreed?</Label>
        <RadioGroup value={formData.hoursModificationAgreed} onValueChange={(value) => updateFormData('hoursModificationAgreed', value)} className="flex gap-4 mt-1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="hoursMod-yes" />
            <Label htmlFor="hoursMod-yes" className="font-normal">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="hoursMod-no" />
            <Label htmlFor="hoursMod-no" className="font-normal">No</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="na" id="hoursMod-na" />
            <Label htmlFor="hoursMod-na" className="font-normal">N/A</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label htmlFor="supportMeasures">Support Measures Offered by Employer</Label>
        <Textarea id="supportMeasures" rows={3} value={formData.supportMeasures} onChange={(e) => updateFormData('supportMeasures', e.target.value)} placeholder="e.g. Buddy system, modified workstation, flexible hours, EAP access..." />
      </div>

      <div>
        <Label className="text-sm font-medium">Workplace policy compliance confirmed?</Label>
        <RadioGroup value={formData.workplacePolicyCompliance} onValueChange={(value) => updateFormData('workplacePolicyCompliance', value)} className="flex gap-4 mt-1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="policyComp-yes" />
            <Label htmlFor="policyComp-yes" className="font-normal">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="policyComp-no" />
            <Label htmlFor="policyComp-no" className="font-normal">No</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label htmlFor="additionalEmployerNotes">Additional Employer Notes</Label>
        <Textarea id="additionalEmployerNotes" rows={3} value={formData.additionalEmployerNotes} onChange={(e) => updateFormData('additionalEmployerNotes', e.target.value)} />
      </div>
    </div>
  );

  const renderSection9 = (): React.ReactElement => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Completion & Declaration</h3>

      <div>
        <Label className="text-sm font-medium">Worker agrees to RTW plan?</Label>
        <RadioGroup value={formData.workerAgreesToPlan} onValueChange={(value) => updateFormData('workerAgreesToPlan', value)} className="flex gap-4 mt-1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="workerAgree-yes" />
            <Label htmlFor="workerAgree-yes" className="font-normal">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="workerAgree-no" />
            <Label htmlFor="workerAgree-no" className="font-normal">No</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="with-concerns" id="workerAgree-concerns" />
            <Label htmlFor="workerAgree-concerns" className="font-normal">Yes, with concerns</Label>
          </div>
        </RadioGroup>
      </div>

      {(formData.workerAgreesToPlan === 'no' || formData.workerAgreesToPlan === 'with-concerns') && (
        <div>
          <Label htmlFor="workerConcerns">Worker Concerns</Label>
          <Textarea id="workerConcerns" rows={3} value={formData.workerConcerns} onChange={(e) => updateFormData('workerConcerns', e.target.value)} placeholder="Detail any worker concerns..." />
        </div>
      )}

      <div>
        <Label htmlFor="goalsForRTW">Worker's Goals for Return to Work</Label>
        <Textarea id="goalsForRTW" rows={3} value={formData.goalsForRTW} onChange={(e) => updateFormData('goalsForRTW', e.target.value)} placeholder="What does the worker hope to achieve through this RTW plan?" />
      </div>

      <div className="border rounded-lg p-4 bg-muted/50 space-y-4">
        <h4 className="font-medium">Declaration</h4>
        <p className="text-sm text-muted-foreground">
          I declare that the information provided in this return-to-work assessment is accurate and complete to the best of my knowledge.
          I understand that this plan will be reviewed regularly and adjusted as needed based on medical progress and workplace requirements.
          All parties agree to act in good faith to support a safe and sustainable return to work.
        </p>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="confirmationChecked"
            checked={formData.confirmationChecked}
            onCheckedChange={(checked) => updateFormData('confirmationChecked', checked as boolean)}
          />
          <Label htmlFor="confirmationChecked" className="font-normal">
            I confirm the above declaration and agree to the terms of this RTW plan
          </Label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="workerSignature">Worker Signature (type full name) *</Label>
          <Input id="workerSignature" value={formData.workerSignature} onChange={(e) => updateFormData('workerSignature', e.target.value)} placeholder="Type your full name" required />
          <p className="text-xs text-muted-foreground mt-1">By typing your name, you are providing a digital signature.</p>
        </div>
        <div>
          <Label htmlFor="coordinatorSignature">RTW Coordinator Signature (type full name) *</Label>
          <Input id="coordinatorSignature" value={formData.coordinatorSignature} onChange={(e) => updateFormData('coordinatorSignature', e.target.value)} placeholder="Type your full name" required />
          <p className="text-xs text-muted-foreground mt-1">By typing your name, you are providing a digital signature.</p>
        </div>
      </div>

      <div>
        <Label htmlFor="planDate">Plan Date</Label>
        <Input id="planDate" type="date" value={formData.planDate} onChange={(e) => updateFormData('planDate', e.target.value)} />
      </div>
    </div>
  );

  return (
    <PageLayout title="RTW Assessment" subtitle="Comprehensive return-to-work planning and coordination">
      <div className="max-w-4xl mx-auto">
        {/* Progress indicator */}
        <div className="mb-4 flex items-center gap-1">
          {sectionNames.map((name, i) => (
            <div key={i} className="flex items-center">
              <button
                type="button"
                onClick={() => setCurrentSection(i + 1)}
                className={`text-xs px-2 py-1 rounded ${
                  i + 1 === currentSection
                    ? 'bg-primary text-primary-foreground font-medium'
                    : i + 1 < currentSection
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i + 1}
              </button>
              {i < sectionNames.length - 1 && <div className="w-2 h-px bg-border" />}
            </div>
          ))}
          <span className="ml-2 text-xs text-muted-foreground">{sectionNames[currentSection - 1]}</span>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <ClipboardList className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>Comprehensive Return-to-Work Assessment</CardTitle>
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
              {currentSection === 5 && renderSection5()}
              {currentSection === 6 && renderSection6()}
              {currentSection === 7 && renderSection7()}
              {currentSection === 8 && renderSection8()}
              {currentSection === 9 && renderSection9()}

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
                    disabled={!formData.confirmationChecked || !formData.workerSignature || !formData.coordinatorSignature || isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit RTW Assessment'}
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
