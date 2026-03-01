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
import { Activity, ArrowRight, ArrowLeft, AlertTriangle } from "lucide-react";

interface InjuryAssessmentData {
  // Section 1: Personal Information
  companyName: string;
  employerEmail: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  age: string;
  height: string;
  weight: string;
  gender: string;
  selfDescribeGender: string;

  // Section 2: Incident Details
  whatHappened: string;
  whenHappened: string;
  whereHappened: string;
  whatDoing: string;
  whyDoing: string;
  whoToldYou: string;
  normallyDoThat: string;
  howHappened: string;
  whoWitnessed: string;
  reportedTo: string;
  ppeUsed: string;
  treatmentSought: string;
  whenTreated: string;
  offsiteTreatment: string;
  firstTreatmentDate: string;
  currentTreatmentPlan: string;
  treatmentPlanDescription: string;
  timeOff: string;
  timeOffHours: string;
  medicalRestrictions: string;
  preventNormalDuties: string;
  preventionDetails: string;
  howManagedWork: string;
  restOfShiftManagement: string;
  workRestrictions: string;
  homeManagement: string;
  homeRestrictions: string;
  previousInjuries: string;
  previousInjuryDetails: string;

  // Section 3: Pain Assessment
  armsPain: string;
  shouldersPain: string;
  upperBackPain: string;
  lowerBackPain: string;
  legsPain: string;
  kneesPain: string;
  feetPain: string;
  painElsewhere: string;
  otherPainDetails: string;

  // Section 4: Work Capacity & Function
  canSit: string;
  canStandWalk: string;
  canBend: string;
  canSquat: string;
  canKneel: string;
  canReachAboveShoulder: string;
  canUseArmsHands: string;
  canLift: string;
  canNeckMovement: string;
  physicalComments: string;
  attentionConcentration: string;
  memory: string;
  judgement: string;
  mentalComments: string;
  functionalConsiderations: string;
  workEnvironmentConsiderations: string;

  // Section 5: Completion
  confirmationChecked: boolean;
  signature: string;
}

const painLevels = Array.from({ length: 11 }, (_, i) => ({
  value: i.toString(),
  label: i === 0 ? "0 - No pain" : i === 10 ? "10 - Worst possible pain" : i.toString()
}));

export default function InjuryAssessmentForm() {
  const navigate = useNavigate();
  const [currentSection, setCurrentSection] = useState(1);
  const [formData, setFormData] = useState<InjuryAssessmentData>({
    companyName: "",
    employerEmail: "",
    firstName: "",
    lastName: "",
    email: "",
    jobTitle: "",
    age: "",
    height: "",
    weight: "",
    gender: "",
    selfDescribeGender: "",
    whatHappened: "",
    whenHappened: "",
    whereHappened: "",
    whatDoing: "",
    whyDoing: "",
    whoToldYou: "",
    normallyDoThat: "",
    howHappened: "",
    whoWitnessed: "",
    reportedTo: "",
    ppeUsed: "",
    treatmentSought: "",
    whenTreated: "",
    offsiteTreatment: "",
    firstTreatmentDate: "",
    currentTreatmentPlan: "",
    treatmentPlanDescription: "",
    timeOff: "",
    timeOffHours: "",
    medicalRestrictions: "",
    preventNormalDuties: "",
    preventionDetails: "",
    howManagedWork: "",
    restOfShiftManagement: "",
    workRestrictions: "",
    homeManagement: "",
    homeRestrictions: "",
    previousInjuries: "",
    previousInjuryDetails: "",
    armsPain: "",
    shouldersPain: "",
    upperBackPain: "",
    lowerBackPain: "",
    legsPain: "",
    kneesPain: "",
    feetPain: "",
    painElsewhere: "",
    otherPainDetails: "",
    canSit: "",
    canStandWalk: "",
    canBend: "",
    canSquat: "",
    canKneel: "",
    canReachAboveShoulder: "",
    canUseArmsHands: "",
    canLift: "",
    canNeckMovement: "",
    physicalComments: "",
    attentionConcentration: "",
    memory: "",
    judgement: "",
    mentalComments: "",
    functionalConsiderations: "",
    workEnvironmentConsiderations: "",
    confirmationChecked: false,
    signature: ""
  });

  const updateFormData = (field: keyof InjuryAssessmentData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculateInjuryRiskScore = (): number => {
    let score = 0;
    // Pain levels
    const painFields = ['armsPain', 'shouldersPain', 'upperBackPain', 'lowerBackPain', 'legsPain', 'kneesPain', 'feetPain'] as const;
    const totalPain = painFields.reduce((sum, f) => sum + (parseInt(formData[f]) || 0), 0);
    score += Math.min(Math.floor(totalPain / 8), 3);
    // Injury severity indicators
    if (formData.timeOff === 'yes') score += 2;
    if (formData.medicalRestrictions === 'yes') score += 1;
    if (formData.preventNormalDuties === 'yes') score += 2;
    if (formData.previousInjuries === 'yes') score += 1;
    if (formData.offsiteTreatment === 'yes') score += 1;
    return Math.min(Math.max(score, 0), 10);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const riskScore = calculateInjuryRiskScore();
      const clearanceLevel = riskScore <= 3 ? 'cleared_unconditional' : riskScore <= 6 ? 'cleared_conditional' : 'cleared_with_restrictions';

      const response = await fetchWithCsrf('/api/pre-employment/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateName: `${formData.firstName} ${formData.lastName}`,
          candidateEmail: formData.email,
          positionTitle: formData.jobTitle,
          departmentName: formData.companyName,
          assessmentType: 'injury_assessment',
          status: 'completed',
          clearanceLevel,
          notes: `Risk score: ${riskScore}/10. Injury assessment completed. Incident: ${formData.whatHappened || 'Not specified'}. Location: ${formData.whereHappened || 'Not specified'}.`
        }),
      });

      if (response.ok) {
        navigate('/checks', {
          state: { message: 'Injury assessment submitted successfully!' }
        });
      } else {
        throw new Error('Failed to submit assessment');
      }
    } catch (error) {
      console.error("Error submitting injury assessment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSection1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="companyName">Company Name *</Label>
          <Input
            id="companyName"
            value={formData.companyName}
            onChange={(e) => updateFormData('companyName', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="employerEmail">Employer Email *</Label>
          <Input
            id="employerEmail"
            type="email"
            value={formData.employerEmail}
            onChange={(e) => updateFormData('employerEmail', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => updateFormData('firstName', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => updateFormData('lastName', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="email">Your Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => updateFormData('email', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="jobTitle">Job Title *</Label>
          <Input
            id="jobTitle"
            value={formData.jobTitle}
            onChange={(e) => updateFormData('jobTitle', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="age">Age *</Label>
          <Input
            id="age"
            type="number"
            value={formData.age}
            onChange={(e) => updateFormData('age', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="height">Height (cm)</Label>
          <Input
            id="height"
            type="number"
            value={formData.height}
            onChange={(e) => updateFormData('height', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="weight">Weight (kg)</Label>
          <Input
            id="weight"
            type="number"
            value={formData.weight}
            onChange={(e) => updateFormData('weight', e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label>Gender *</Label>
        <RadioGroup
          value={formData.gender}
          onValueChange={(value) => updateFormData('gender', value)}
          className="mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="man" id="man" />
            <Label htmlFor="man">Man</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="woman" id="woman" />
            <Label htmlFor="woman">Woman</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="non-binary" id="non-binary" />
            <Label htmlFor="non-binary">Non-binary</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="self-describe" id="self-describe" />
            <Label htmlFor="self-describe">Prefer to self-describe</Label>
          </div>
        </RadioGroup>

        {formData.gender === "self-describe" && (
          <div className="mt-3">
            <Input
              placeholder="Please describe"
              value={formData.selfDescribeGender}
              onChange={(e) => updateFormData('selfDescribeGender', e.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderSection2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Incident Details</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Please provide detailed information about what happened
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <Label htmlFor="whatHappened">What happened? *</Label>
          <Textarea
            id="whatHappened"
            value={formData.whatHappened}
            onChange={(e) => updateFormData('whatHappened', e.target.value)}
            placeholder="Describe the incident in detail"
            required
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor="whenHappened">When did it happen? *</Label>
          <Textarea
            id="whenHappened"
            value={formData.whenHappened}
            onChange={(e) => updateFormData('whenHappened', e.target.value)}
            placeholder="Date and time of incident"
            required
            rows={3}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <Label htmlFor="whereHappened">Where did it happen? *</Label>
          <Textarea
            id="whereHappened"
            value={formData.whereHappened}
            onChange={(e) => updateFormData('whereHappened', e.target.value)}
            placeholder="Location of incident"
            required
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor="whatDoing">What were you doing? *</Label>
          <Textarea
            id="whatDoing"
            value={formData.whatDoing}
            onChange={(e) => updateFormData('whatDoing', e.target.value)}
            placeholder="Your activity at time of incident"
            required
            rows={3}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <Label htmlFor="whyDoing">Why were you doing that? *</Label>
          <Textarea
            id="whyDoing"
            value={formData.whyDoing}
            onChange={(e) => updateFormData('whyDoing', e.target.value)}
            placeholder="Reason for the activity"
            required
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor="whoToldYou">Who told you to do that? *</Label>
          <Textarea
            id="whoToldYou"
            value={formData.whoToldYou}
            onChange={(e) => updateFormData('whoToldYou', e.target.value)}
            placeholder="Who instructed or authorized the task"
            required
            rows={3}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <Label htmlFor="normallyDoThat">Do you normally do that? *</Label>
          <Textarea
            id="normallyDoThat"
            value={formData.normallyDoThat}
            onChange={(e) => updateFormData('normallyDoThat', e.target.value)}
            placeholder="Is this a regular part of your job?"
            required
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor="howHappened">How did it happen? *</Label>
          <Textarea
            id="howHappened"
            value={formData.howHappened}
            onChange={(e) => updateFormData('howHappened', e.target.value)}
            placeholder="Mechanism of injury"
            required
            rows={3}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <Label htmlFor="whoWitnessed">Who witnessed it? *</Label>
          <Textarea
            id="whoWitnessed"
            value={formData.whoWitnessed}
            onChange={(e) => updateFormData('whoWitnessed', e.target.value)}
            placeholder="Names and contact details of witnesses"
            required
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor="reportedTo">Who did you report it to? *</Label>
          <Textarea
            id="reportedTo"
            value={formData.reportedTo}
            onChange={(e) => updateFormData('reportedTo', e.target.value)}
            placeholder="Name and role of person you reported to"
            required
            rows={3}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="ppeUsed">What PPE was used? *</Label>
        <Textarea
          id="ppeUsed"
          value={formData.ppeUsed}
          onChange={(e) => updateFormData('ppeUsed', e.target.value)}
          placeholder="Personal protective equipment in use at time of incident"
          required
          rows={2}
        />
      </div>
    </div>
  );

  const renderSection3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Treatment & Recovery</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Information about medical treatment and time off work
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <Label htmlFor="treatmentSought">What treatment did you seek? *</Label>
          <Textarea
            id="treatmentSought"
            value={formData.treatmentSought}
            onChange={(e) => updateFormData('treatmentSought', e.target.value)}
            placeholder="Medical treatment received"
            required
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor="whenTreated">When was it treated/provided? *</Label>
          <Textarea
            id="whenTreated"
            value={formData.whenTreated}
            onChange={(e) => updateFormData('whenTreated', e.target.value)}
            placeholder="Date and time of treatment"
            required
            rows={3}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <Label htmlFor="offsiteTreatment">Any off site treatment? *</Label>
          <Textarea
            id="offsiteTreatment"
            value={formData.offsiteTreatment}
            onChange={(e) => updateFormData('offsiteTreatment', e.target.value)}
            placeholder="External medical treatment details"
            required
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor="firstTreatmentDate">When did you first receive treatment? *</Label>
          <Textarea
            id="firstTreatmentDate"
            value={formData.firstTreatmentDate}
            onChange={(e) => updateFormData('firstTreatmentDate', e.target.value)}
            placeholder="Date of first medical attention"
            required
            rows={3}
          />
        </div>
      </div>

      <div>
        <Label>Do you have a current treatment plan? *</Label>
        <RadioGroup
          value={formData.currentTreatmentPlan}
          onValueChange={(value) => updateFormData('currentTreatmentPlan', value)}
          className="mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="treatment-yes" />
            <Label htmlFor="treatment-yes">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="treatment-no" />
            <Label htmlFor="treatment-no">No</Label>
          </div>
        </RadioGroup>

        {formData.currentTreatmentPlan === "yes" && (
          <div className="mt-4">
            <Label htmlFor="treatmentPlanDescription">Describe treatment plan</Label>
            <Textarea
              id="treatmentPlanDescription"
              value={formData.treatmentPlanDescription}
              onChange={(e) => updateFormData('treatmentPlanDescription', e.target.value)}
              placeholder="Details of your current treatment plan"
              rows={3}
            />
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <Label htmlFor="timeOff">Did you have any time off? *</Label>
          <Textarea
            id="timeOff"
            value={formData.timeOff}
            onChange={(e) => updateFormData('timeOff', e.target.value)}
            placeholder="Details of time off work"
            required
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor="timeOffHours">How long (hours)? *</Label>
          <Input
            id="timeOffHours"
            value={formData.timeOffHours}
            onChange={(e) => updateFormData('timeOffHours', e.target.value)}
            placeholder="Number of hours off work"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="medicalRestrictions">Any medical restrictions? *</Label>
        <Textarea
          id="medicalRestrictions"
          value={formData.medicalRestrictions}
          onChange={(e) => updateFormData('medicalRestrictions', e.target.value)}
          placeholder="Current medical restrictions or limitations"
          required
          rows={3}
        />
      </div>

      <div>
        <Label>Does it prevent normal duties? *</Label>
        <RadioGroup
          value={formData.preventNormalDuties}
          onValueChange={(value) => updateFormData('preventNormalDuties', value)}
          className="mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="prevent-yes" />
            <Label htmlFor="prevent-yes">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="prevent-no" />
            <Label htmlFor="prevent-no">No</Label>
          </div>
        </RadioGroup>

        {formData.preventNormalDuties === "yes" && (
          <div className="mt-4">
            <Label htmlFor="preventionDetails">In what way?</Label>
            <Textarea
              id="preventionDetails"
              value={formData.preventionDetails}
              onChange={(e) => updateFormData('preventionDetails', e.target.value)}
              placeholder="How does it prevent you from performing normal duties?"
              rows={3}
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderSection4 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Current Pain Assessment</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Indicate any physical pain currently experienced. 0 = No pain, 10 = Worst possible pain
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { key: 'armsPain', label: 'Pain in arm(s)' },
          { key: 'shouldersPain', label: 'Pain in shoulder(s)' },
          { key: 'upperBackPain', label: 'Pain in upper back' },
          { key: 'lowerBackPain', label: 'Pain in lower back' },
          { key: 'legsPain', label: 'Pain in leg(s)' },
          { key: 'kneesPain', label: 'Pain in knee(s)' },
          { key: 'feetPain', label: 'Pain in feet' }
        ].map(({ key, label }) => (
          <div key={key}>
            <Label>{label} *</Label>
            <Select
              value={formData[key as keyof InjuryAssessmentData] as string}
              onValueChange={(value) => updateFormData(key as keyof InjuryAssessmentData, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select pain level" />
              </SelectTrigger>
              <SelectContent>
                {painLevels.map(level => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      <div>
        <Label>Pain anywhere else? *</Label>
        <RadioGroup
          value={formData.painElsewhere}
          onValueChange={(value) => updateFormData('painElsewhere', value)}
          className="mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="other-pain-yes" />
            <Label htmlFor="other-pain-yes">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="other-pain-no" />
            <Label htmlFor="other-pain-no">No</Label>
          </div>
        </RadioGroup>

        {formData.painElsewhere === "yes" && (
          <div className="mt-4">
            <Label htmlFor="otherPainDetails">Level in above stated</Label>
            <Textarea
              id="otherPainDetails"
              value={formData.otherPainDetails}
              onChange={(e) => updateFormData('otherPainDetails', e.target.value)}
              placeholder="Describe other pain location and level (0-10)"
              rows={3}
            />
          </div>
        )}
      </div>

      <div>
        <Label>Previous injuries same location? *</Label>
        <RadioGroup
          value={formData.previousInjuries}
          onValueChange={(value) => updateFormData('previousInjuries', value)}
          className="mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="previous-yes" />
            <Label htmlFor="previous-yes">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="previous-no" />
            <Label htmlFor="previous-no">No</Label>
          </div>
        </RadioGroup>

        {formData.previousInjuries === "yes" && (
          <div className="mt-4">
            <Label htmlFor="previousInjuryDetails">Please give details</Label>
            <Textarea
              id="previousInjuryDetails"
              value={formData.previousInjuryDetails}
              onChange={(e) => updateFormData('previousInjuryDetails', e.target.value)}
              placeholder="Details of previous injuries to the same location"
              rows={3}
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderSection5 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Work Capacity & Function</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Indicate your current capacity to perform work functions
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium">Physical Functions</h4>
        {[
          { key: 'canSit', label: 'Sit' },
          { key: 'canStandWalk', label: 'Stand/Walk' },
          { key: 'canBend', label: 'Bend' },
          { key: 'canSquat', label: 'Squat' },
          { key: 'canKneel', label: 'Kneel' },
          { key: 'canReachAboveShoulder', label: 'Reach above shoulder' },
          { key: 'canUseArmsHands', label: 'Use arms/hands' },
          { key: 'canLift', label: 'Lift' },
          { key: 'canNeckMovement', label: 'Neck movement' }
        ].map(({ key, label }) => (
          <div key={key}>
            <Label className="text-sm font-medium">{label} *</Label>
            <RadioGroup
              value={formData[key as keyof InjuryAssessmentData] as string}
              onValueChange={(value) => updateFormData(key as keyof InjuryAssessmentData, value)}
              className="flex gap-6 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="can" id={`${key}-can`} />
                <Label htmlFor={`${key}-can`} className="text-sm">Can</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="modification" id={`${key}-modification`} />
                <Label htmlFor={`${key}-modification`} className="text-sm">With Modification</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cannot" id={`${key}-cannot`} />
                <Label htmlFor={`${key}-cannot`} className="text-sm">Cannot</Label>
              </div>
            </RadioGroup>
          </div>
        ))}
      </div>

      <div>
        <Label htmlFor="physicalComments">Additional physical function comments</Label>
        <Textarea
          id="physicalComments"
          value={formData.physicalComments}
          onChange={(e) => updateFormData('physicalComments', e.target.value)}
          placeholder="Any additional details about your physical capabilities"
        />
      </div>

      <div className="space-y-4">
        <h4 className="font-medium">Mental Health Functions</h4>
        {[
          { key: 'attentionConcentration', label: 'Attention/Concentration' },
          { key: 'memory', label: 'Memory' },
          { key: 'judgement', label: 'Judgement' }
        ].map(({ key, label }) => (
          <div key={key}>
            <Label className="text-sm font-medium">{label} *</Label>
            <RadioGroup
              value={formData[key as keyof InjuryAssessmentData] as string}
              onValueChange={(value) => updateFormData(key as keyof InjuryAssessmentData, value)}
              className="flex gap-6 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="not-affected" id={`${key}-not-affected`} />
                <Label htmlFor={`${key}-not-affected`} className="text-sm">Not Affected</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="affected" id={`${key}-affected`} />
                <Label htmlFor={`${key}-affected`} className="text-sm">Affected</Label>
              </div>
            </RadioGroup>
          </div>
        ))}
      </div>

      <div>
        <Label htmlFor="mentalComments">Additional mental health comments</Label>
        <Textarea
          id="mentalComments"
          value={formData.mentalComments}
          onChange={(e) => updateFormData('mentalComments', e.target.value)}
          placeholder="Any additional details about mental health impacts"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="functionalConsiderations">Other functional considerations</Label>
          <Textarea
            id="functionalConsiderations"
            value={formData.functionalConsiderations}
            onChange={(e) => updateFormData('functionalConsiderations', e.target.value)}
            placeholder="Other factors affecting your function"
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor="workEnvironmentConsiderations">Work environment considerations</Label>
          <Textarea
            id="workEnvironmentConsiderations"
            value={formData.workEnvironmentConsiderations}
            onChange={(e) => updateFormData('workEnvironmentConsiderations', e.target.value)}
            placeholder="Work environment factors to consider"
            rows={3}
          />
        </div>
      </div>

      <div className="border-t pt-6">
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="confirmation"
              checked={formData.confirmationChecked}
              onCheckedChange={(checked) => updateFormData('confirmationChecked', checked)}
              required
            />
            <Label htmlFor="confirmation" className="text-sm leading-relaxed">
              I confirm that the information provided in this injury assessment is true, complete, and accurate to the best of my knowledge.
              I understand this information will be used for medical and return-to-work planning purposes.
            </Label>
          </div>

          <div>
            <Label htmlFor="signature">Digital Signature *</Label>
            <Input
              id="signature"
              value={formData.signature}
              onChange={(e) => updateFormData('signature', e.target.value)}
              placeholder="Type your full name as digital signature"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              By typing your name, you are providing a digital signature for this assessment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <PageLayout title="Injury Assessment" subtitle="Incident reporting and assessment form">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Activity className="h-6 w-6 text-red-600" />
              <div>
                <CardTitle>Injury Assessment Form</CardTitle>
                <CardDescription>
                  Section {currentSection} of 5 - Comprehensive injury incident documentation
                </CardDescription>
              </div>
            </div>
            {currentSection === 1 && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">Important</span>
                </div>
                <p className="text-xs text-amber-700 mt-1">
                  This form should be completed as soon as possible after an incident occurs.
                  All information will be treated confidentially and used for safety improvement and return-to-work planning.
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              {currentSection === 1 && renderSection1()}
              {currentSection === 2 && renderSection2()}
              {currentSection === 3 && renderSection3()}
              {currentSection === 4 && renderSection4()}
              {currentSection === 5 && renderSection5()}

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

                {currentSection < 5 ? (
                  <Button
                    type="button"
                    onClick={() => setCurrentSection(prev => Math.min(5, prev + 1))}
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={!formData.confirmationChecked || !formData.signature || isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
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