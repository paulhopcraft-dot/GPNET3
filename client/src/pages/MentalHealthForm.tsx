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
import { Brain, ArrowRight, ArrowLeft } from "lucide-react";

interface MentalHealthFormData {
  // Section 1: Personal Information
  firstName: string;
  lastName: string;
  email: string;
  employer: string;
  jobTitle: string;
  department: string;
  age: string;
  gender: string;
  referralSource: string;

  // Section 2: Psychological Wellbeing (K-10 / PHQ-9 style)
  littleInterestPleasure: string;
  feelingDown: string;
  sleepProblems: string;
  feelingTired: string;
  poorAppetite: string;
  feelingBadAboutSelf: string;
  troubleConcentrating: string;
  movingSlowlyOrFidgety: string;
  thoughtsSelfHarm: string;
  anxietyNervousness: string;
  cantStopWorrying: string;
  worryingTooMuch: string;
  troubleRelaxing: string;
  restlessnessLevel: string;
  easilyAnnoyed: string;
  feelingAfraid: string;

  // Section 3: Workplace Psychosocial Factors
  workloadStress: string;
  roleClarity: string;
  autonomyAtWork: string;
  supportFromManager: string;
  supportFromColleagues: string;
  workplaceBullying: string;
  bullyingDetails: string;
  workLifeBalance: string;
  jobSecurity: string;
  meaningfulWork: string;
  workplaceConflict: string;
  conflictDetails: string;
  recentSignificantChanges: string;
  changesDetails: string;

  // Section 4: Coping & Support
  currentCopingStrategies: string[];
  currentProfessionalSupport: string;
  supportDetails: string;
  medicationForMentalHealth: string;
  medicationDetails: string;
  eapAwareness: string;
  eapUsed: string;
  socialSupportLevel: string;
  exerciseFrequency: string;
  substanceUse: string;
  substanceDetails: string;
  previousMentalHealthHistory: string;
  historyDetails: string;
  immediateRiskPresent: string;
  wellnessGoals: string;
  preferredSupportType: string[];
  additionalConcerns: string;
  confirmationChecked: boolean;
  signature: string;
}

const totalSections = 4;

const frequencyOptions = [
  { value: "not-at-all", label: "Not at all" },
  { value: "several-days", label: "Several days" },
  { value: "more-than-half", label: "More than half the days" },
  { value: "nearly-every-day", label: "Nearly every day" }
];

const copingOptions = [
  "Exercise / Physical activity", "Meditation / Mindfulness", "Talking to friends/family",
  "Professional counselling", "Creative activities", "Nature / Outdoors",
  "Reading / Learning", "Religion / Spirituality", "None currently"
];

const supportTypeOptions = [
  "One-on-one counselling", "Group support sessions", "Online resources",
  "Peer support program", "Manager coaching", "Flexible work arrangements",
  "Stress management workshop", "Mindfulness training"
];

export default function MentalHealthForm(): React.ReactElement {
  const navigate = useNavigate();
  const [currentSection, setCurrentSection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<MentalHealthFormData>({
    firstName: "",
    lastName: "",
    email: "",
    employer: "",
    jobTitle: "",
    department: "",
    age: "",
    gender: "",
    referralSource: "",
    littleInterestPleasure: "",
    feelingDown: "",
    sleepProblems: "",
    feelingTired: "",
    poorAppetite: "",
    feelingBadAboutSelf: "",
    troubleConcentrating: "",
    movingSlowlyOrFidgety: "",
    thoughtsSelfHarm: "",
    anxietyNervousness: "",
    cantStopWorrying: "",
    worryingTooMuch: "",
    troubleRelaxing: "",
    restlessnessLevel: "",
    easilyAnnoyed: "",
    feelingAfraid: "",
    workloadStress: "",
    roleClarity: "",
    autonomyAtWork: "",
    supportFromManager: "",
    supportFromColleagues: "",
    workplaceBullying: "",
    bullyingDetails: "",
    workLifeBalance: "",
    jobSecurity: "",
    meaningfulWork: "",
    workplaceConflict: "",
    conflictDetails: "",
    recentSignificantChanges: "",
    changesDetails: "",
    currentCopingStrategies: [],
    currentProfessionalSupport: "",
    supportDetails: "",
    medicationForMentalHealth: "",
    medicationDetails: "",
    eapAwareness: "",
    eapUsed: "",
    socialSupportLevel: "",
    exerciseFrequency: "",
    substanceUse: "",
    substanceDetails: "",
    previousMentalHealthHistory: "",
    historyDetails: "",
    immediateRiskPresent: "",
    wellnessGoals: "",
    preferredSupportType: [],
    additionalConcerns: "",
    confirmationChecked: false,
    signature: ""
  });

  const updateFormData = (field: keyof MentalHealthFormData, value: string | boolean): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateArrayField = (field: keyof MentalHealthFormData, value: string, checked: boolean): void => {
    setFormData(prev => {
      const currentArray = prev[field] as string[];
      if (checked) {
        return { ...prev, [field]: [...currentArray, value] };
      } else {
        return { ...prev, [field]: currentArray.filter(item => item !== value) };
      }
    });
  };

  const calculateMHRiskScore = (): number => {
    let score = 0;
    // PHQ-9 style depression scoring
    const depressionFields = ['littleInterestPleasure', 'feelingDown', 'sleepProblems', 'feelingTired', 'poorAppetite', 'feelingBadAboutSelf', 'troubleConcentrating', 'movingSlowlyOrFidgety'] as const;
    const depCount = depressionFields.filter(f => formData[f] === 'more-than-half' || formData[f] === 'nearly-every-day').length;
    score += Math.min(Math.floor(depCount / 2), 3);
    // Self-harm thoughts
    if (formData.thoughtsSelfHarm === 'several-days') score += 2;
    if (formData.thoughtsSelfHarm === 'more-than-half' || formData.thoughtsSelfHarm === 'nearly-every-day') score += 4;
    // Anxiety
    const anxietyFields = ['anxietyNervousness', 'cantStopWorrying', 'troubleRelaxing', 'feelingAfraid'] as const;
    const anxCount = anxietyFields.filter(f => formData[f] === 'more-than-half' || formData[f] === 'nearly-every-day').length;
    score += Math.min(anxCount, 2);
    // Workplace factors
    if (formData.workplaceBullying === 'yes') score += 1;
    if (formData.workloadStress === 'very-high') score += 1;
    return Math.min(Math.max(score, 0), 10);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const riskScore = calculateMHRiskScore();
      const clearanceLevel = riskScore <= 3 ? 'cleared_unconditional' : riskScore <= 6 ? 'cleared_conditional' : 'cleared_with_restrictions';

      const response = await fetchWithCsrf('/api/pre-employment/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateName: `${formData.firstName} ${formData.lastName}`,
          candidateEmail: formData.email,
          positionTitle: formData.jobTitle,
          departmentName: formData.employer,
          assessmentType: 'mental_health_screening',
          status: 'completed',
          clearanceLevel,
          notes: `Mental Health Score: ${riskScore}/10. Self-harm risk: ${formData.thoughtsSelfHarm || 'not assessed'}. Workplace bullying: ${formData.workplaceBullying || 'not reported'}.`
        }),
      });

      if (response.ok) {
        navigate('/checks', {
          state: { message: 'Mental health assessment submitted successfully!' }
        });
      } else {
        throw new Error('Failed to submit mental health assessment');
      }
    } catch (error) {
      console.error("Error submitting mental health assessment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sectionNames = [
    "Personal Information",
    "Psychological Wellbeing",
    "Workplace Factors",
    "Coping & Support"
  ];

  const renderFrequencyField = (id: string, label: string, field: keyof MentalHealthFormData): React.ReactElement => (
    <div key={id}>
      <Label className="text-sm">{label}</Label>
      <RadioGroup
        value={formData[field] as string}
        onValueChange={(value) => updateFormData(field, value)}
        className="flex flex-wrap gap-3 mt-1"
      >
        {frequencyOptions.map(opt => (
          <div key={opt.value} className="flex items-center space-x-2">
            <RadioGroupItem value={opt.value} id={`${id}-${opt.value}`} />
            <Label htmlFor={`${id}-${opt.value}`} className="text-xs font-normal">{opt.label}</Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );

  const renderSection1 = (): React.ReactElement => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          This assessment is confidential. Your responses will be used to connect you with appropriate support services.
          If you are in immediate crisis, please contact Lifeline on 13 11 14 or 000 for emergencies.
        </p>
      </div>

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
          <Label htmlFor="age">Age</Label>
          <Input id="age" type="number" value={formData.age} onChange={(e) => updateFormData('age', e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="gender">Gender</Label>
          <Select value={formData.gender} onValueChange={(value) => updateFormData('gender', value)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="non-binary">Non-binary</SelectItem>
              <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="referralSource">How were you referred?</Label>
          <Select value={formData.referralSource} onValueChange={(value) => updateFormData('referralSource', value)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="self">Self-referral</SelectItem>
              <SelectItem value="manager">Manager referral</SelectItem>
              <SelectItem value="hr">HR recommendation</SelectItem>
              <SelectItem value="eap">EAP program</SelectItem>
              <SelectItem value="medical">Medical practitioner</SelectItem>
              <SelectItem value="colleague">Colleague suggestion</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderSection2 = (): React.ReactElement => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Psychological Wellbeing</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Over the last 2 weeks, how often have you been bothered by any of the following problems?
      </p>

      <div className="space-y-4 border rounded-lg p-4">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Depression Screening (PHQ-9)</h4>
        {renderFrequencyField('interest', 'Little interest or pleasure in doing things', 'littleInterestPleasure')}
        {renderFrequencyField('down', 'Feeling down, depressed, or hopeless', 'feelingDown')}
        {renderFrequencyField('sleep', 'Trouble falling or staying asleep, or sleeping too much', 'sleepProblems')}
        {renderFrequencyField('tired', 'Feeling tired or having little energy', 'feelingTired')}
        {renderFrequencyField('appetite', 'Poor appetite or overeating', 'poorAppetite')}
        {renderFrequencyField('self', 'Feeling bad about yourself — or that you are a failure', 'feelingBadAboutSelf')}
        {renderFrequencyField('concentrate', 'Trouble concentrating on things', 'troubleConcentrating')}
        {renderFrequencyField('moving', 'Moving or speaking slowly, or being fidgety/restless', 'movingSlowlyOrFidgety')}
        {renderFrequencyField('harm', 'Thoughts that you would be better off dead, or of hurting yourself', 'thoughtsSelfHarm')}
      </div>

      <div className="space-y-4 border rounded-lg p-4">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Anxiety Screening (GAD-7)</h4>
        {renderFrequencyField('nervous', 'Feeling nervous, anxious, or on edge', 'anxietyNervousness')}
        {renderFrequencyField('worrying', 'Not being able to stop or control worrying', 'cantStopWorrying')}
        {renderFrequencyField('toomuch', 'Worrying too much about different things', 'worryingTooMuch')}
        {renderFrequencyField('relax', 'Trouble relaxing', 'troubleRelaxing')}
        {renderFrequencyField('restless', 'Being so restless that it is hard to sit still', 'restlessnessLevel')}
        {renderFrequencyField('annoyed', 'Becoming easily annoyed or irritable', 'easilyAnnoyed')}
        {renderFrequencyField('afraid', 'Feeling afraid, as if something awful might happen', 'feelingAfraid')}
      </div>
    </div>
  );

  const renderSection3 = (): React.ReactElement => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Workplace Psychosocial Factors</h3>

      <div>
        <Label className="text-sm font-medium">Workload stress level</Label>
        <RadioGroup value={formData.workloadStress} onValueChange={(value) => updateFormData('workloadStress', value)} className="flex flex-wrap gap-4 mt-1">
          {["very-low", "low", "moderate", "high", "very-high"].map(v => (
            <div key={v} className="flex items-center space-x-2">
              <RadioGroupItem value={v} id={`workload-${v}`} />
              <Label htmlFor={`workload-${v}`} className="font-normal capitalize">{v.replace('-', ' ')}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div>
        <Label className="text-sm font-medium">Role clarity (do you understand what is expected of you?)</Label>
        <RadioGroup value={formData.roleClarity} onValueChange={(value) => updateFormData('roleClarity', value)} className="flex flex-wrap gap-4 mt-1">
          {["very-clear", "mostly-clear", "somewhat-unclear", "very-unclear"].map(v => (
            <div key={v} className="flex items-center space-x-2">
              <RadioGroupItem value={v} id={`clarity-${v}`} />
              <Label htmlFor={`clarity-${v}`} className="font-normal capitalize">{v.replace('-', ' ')}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div>
        <Label className="text-sm font-medium">Autonomy at work</Label>
        <RadioGroup value={formData.autonomyAtWork} onValueChange={(value) => updateFormData('autonomyAtWork', value)} className="flex flex-wrap gap-4 mt-1">
          {["high", "adequate", "limited", "very-limited"].map(v => (
            <div key={v} className="flex items-center space-x-2">
              <RadioGroupItem value={v} id={`autonomy-${v}`} />
              <Label htmlFor={`autonomy-${v}`} className="font-normal capitalize">{v.replace('-', ' ')}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label className="text-sm font-medium">Support from manager</Label>
          <RadioGroup value={formData.supportFromManager} onValueChange={(value) => updateFormData('supportFromManager', value)} className="flex flex-wrap gap-3 mt-1">
            {["excellent", "good", "adequate", "poor"].map(v => (
              <div key={v} className="flex items-center space-x-2">
                <RadioGroupItem value={v} id={`mgrSupport-${v}`} />
                <Label htmlFor={`mgrSupport-${v}`} className="font-normal capitalize">{v}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        <div>
          <Label className="text-sm font-medium">Support from colleagues</Label>
          <RadioGroup value={formData.supportFromColleagues} onValueChange={(value) => updateFormData('supportFromColleagues', value)} className="flex flex-wrap gap-3 mt-1">
            {["excellent", "good", "adequate", "poor"].map(v => (
              <div key={v} className="flex items-center space-x-2">
                <RadioGroupItem value={v} id={`colSupport-${v}`} />
                <Label htmlFor={`colSupport-${v}`} className="font-normal capitalize">{v}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Have you experienced workplace bullying or harassment?</Label>
        <RadioGroup value={formData.workplaceBullying} onValueChange={(value) => updateFormData('workplaceBullying', value)} className="flex gap-4 mt-1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="bullying-yes" />
            <Label htmlFor="bullying-yes" className="font-normal">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="bullying-no" />
            <Label htmlFor="bullying-no" className="font-normal">No</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="prefer-not-to-say" id="bullying-pnts" />
            <Label htmlFor="bullying-pnts" className="font-normal">Prefer not to say</Label>
          </div>
        </RadioGroup>
      </div>

      {formData.workplaceBullying === 'yes' && (
        <div>
          <Label htmlFor="bullyingDetails">Please describe (optional)</Label>
          <Textarea id="bullyingDetails" rows={3} value={formData.bullyingDetails} onChange={(e) => updateFormData('bullyingDetails', e.target.value)} />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label className="text-sm font-medium">Work-life balance</Label>
          <RadioGroup value={formData.workLifeBalance} onValueChange={(value) => updateFormData('workLifeBalance', value)} className="flex flex-wrap gap-3 mt-1">
            {["excellent", "good", "fair", "poor"].map(v => (
              <div key={v} className="flex items-center space-x-2">
                <RadioGroupItem value={v} id={`wlb-${v}`} />
                <Label htmlFor={`wlb-${v}`} className="font-normal capitalize">{v}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        <div>
          <Label className="text-sm font-medium">Job security</Label>
          <RadioGroup value={formData.jobSecurity} onValueChange={(value) => updateFormData('jobSecurity', value)} className="flex flex-wrap gap-3 mt-1">
            {["very-secure", "secure", "uncertain", "insecure"].map(v => (
              <div key={v} className="flex items-center space-x-2">
                <RadioGroupItem value={v} id={`jobSec-${v}`} />
                <Label htmlFor={`jobSec-${v}`} className="font-normal capitalize">{v.replace('-', ' ')}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Do you find your work meaningful?</Label>
        <RadioGroup value={formData.meaningfulWork} onValueChange={(value) => updateFormData('meaningfulWork', value)} className="flex flex-wrap gap-4 mt-1">
          {["strongly-agree", "agree", "neutral", "disagree", "strongly-disagree"].map(v => (
            <div key={v} className="flex items-center space-x-2">
              <RadioGroupItem value={v} id={`meaningful-${v}`} />
              <Label htmlFor={`meaningful-${v}`} className="font-normal capitalize">{v.replace('-', ' ')}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div>
        <Label className="text-sm font-medium">Workplace conflict present?</Label>
        <RadioGroup value={formData.workplaceConflict} onValueChange={(value) => updateFormData('workplaceConflict', value)} className="flex gap-4 mt-1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="conflict-yes" />
            <Label htmlFor="conflict-yes" className="font-normal">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="conflict-no" />
            <Label htmlFor="conflict-no" className="font-normal">No</Label>
          </div>
        </RadioGroup>
      </div>

      {formData.workplaceConflict === 'yes' && (
        <div>
          <Label htmlFor="conflictDetails">Conflict Details</Label>
          <Textarea id="conflictDetails" rows={2} value={formData.conflictDetails} onChange={(e) => updateFormData('conflictDetails', e.target.value)} />
        </div>
      )}

      <div>
        <Label className="text-sm font-medium">Any recent significant workplace changes?</Label>
        <RadioGroup value={formData.recentSignificantChanges} onValueChange={(value) => updateFormData('recentSignificantChanges', value)} className="flex gap-4 mt-1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="changes-yes" />
            <Label htmlFor="changes-yes" className="font-normal">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="changes-no" />
            <Label htmlFor="changes-no" className="font-normal">No</Label>
          </div>
        </RadioGroup>
      </div>

      {formData.recentSignificantChanges === 'yes' && (
        <div>
          <Label htmlFor="changesDetails">Describe the changes</Label>
          <Textarea id="changesDetails" rows={2} value={formData.changesDetails} onChange={(e) => updateFormData('changesDetails', e.target.value)} placeholder="e.g. Restructure, new manager, role change..." />
        </div>
      )}
    </div>
  );

  const renderSection4 = (): React.ReactElement => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Coping & Support</h3>

      <div>
        <Label className="text-sm font-medium">Current coping strategies (select all that apply)</Label>
        <div className="grid gap-2 md:grid-cols-2 mt-2">
          {copingOptions.map(option => (
            <div key={option} className="flex items-center space-x-2">
              <Checkbox
                id={`coping-${option}`}
                checked={(formData.currentCopingStrategies as string[]).includes(option)}
                onCheckedChange={(checked) => updateArrayField('currentCopingStrategies', option, checked as boolean)}
              />
              <Label htmlFor={`coping-${option}`} className="font-normal text-sm">{option}</Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Are you currently receiving professional mental health support?</Label>
        <RadioGroup value={formData.currentProfessionalSupport} onValueChange={(value) => updateFormData('currentProfessionalSupport', value)} className="flex gap-4 mt-1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="profSupport-yes" />
            <Label htmlFor="profSupport-yes" className="font-normal">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="profSupport-no" />
            <Label htmlFor="profSupport-no" className="font-normal">No</Label>
          </div>
        </RadioGroup>
      </div>

      {formData.currentProfessionalSupport === 'yes' && (
        <div>
          <Label htmlFor="supportDetails">Support details (type, frequency)</Label>
          <Input id="supportDetails" value={formData.supportDetails} onChange={(e) => updateFormData('supportDetails', e.target.value)} placeholder="e.g. Psychologist, fortnightly" />
        </div>
      )}

      <div>
        <Label className="text-sm font-medium">Currently taking medication for mental health?</Label>
        <RadioGroup value={formData.medicationForMentalHealth} onValueChange={(value) => updateFormData('medicationForMentalHealth', value)} className="flex gap-4 mt-1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="mhMed-yes" />
            <Label htmlFor="mhMed-yes" className="font-normal">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="mhMed-no" />
            <Label htmlFor="mhMed-no" className="font-normal">No</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="prefer-not-to-say" id="mhMed-pnts" />
            <Label htmlFor="mhMed-pnts" className="font-normal">Prefer not to say</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label className="text-sm font-medium">Are you aware of your employer's EAP?</Label>
          <RadioGroup value={formData.eapAwareness} onValueChange={(value) => updateFormData('eapAwareness', value)} className="flex gap-4 mt-1">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="eapAware-yes" />
              <Label htmlFor="eapAware-yes" className="font-normal">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="eapAware-no" />
              <Label htmlFor="eapAware-no" className="font-normal">No</Label>
            </div>
          </RadioGroup>
        </div>
        <div>
          <Label className="text-sm font-medium">Have you used EAP services?</Label>
          <RadioGroup value={formData.eapUsed} onValueChange={(value) => updateFormData('eapUsed', value)} className="flex gap-4 mt-1">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="eapUsed-yes" />
              <Label htmlFor="eapUsed-yes" className="font-normal">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="eapUsed-no" />
              <Label htmlFor="eapUsed-no" className="font-normal">No</Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label className="text-sm font-medium">Social support level</Label>
          <RadioGroup value={formData.socialSupportLevel} onValueChange={(value) => updateFormData('socialSupportLevel', value)} className="flex flex-wrap gap-3 mt-1">
            {["strong", "adequate", "limited", "isolated"].map(v => (
              <div key={v} className="flex items-center space-x-2">
                <RadioGroupItem value={v} id={`social-${v}`} />
                <Label htmlFor={`social-${v}`} className="font-normal capitalize">{v}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        <div>
          <Label className="text-sm font-medium">Exercise frequency</Label>
          <RadioGroup value={formData.exerciseFrequency} onValueChange={(value) => updateFormData('exerciseFrequency', value)} className="flex flex-wrap gap-3 mt-1">
            {["daily", "3-4-week", "1-2-week", "rarely", "never"].map(v => (
              <div key={v} className="flex items-center space-x-2">
                <RadioGroupItem value={v} id={`exercise-${v}`} />
                <Label htmlFor={`exercise-${v}`} className="font-normal capitalize">{v.replace(/-/g, ' ')}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Previous mental health history?</Label>
        <RadioGroup value={formData.previousMentalHealthHistory} onValueChange={(value) => updateFormData('previousMentalHealthHistory', value)} className="flex gap-4 mt-1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="mhHistory-yes" />
            <Label htmlFor="mhHistory-yes" className="font-normal">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="mhHistory-no" />
            <Label htmlFor="mhHistory-no" className="font-normal">No</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="prefer-not-to-say" id="mhHistory-pnts" />
            <Label htmlFor="mhHistory-pnts" className="font-normal">Prefer not to say</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label className="text-sm font-medium">Preferred support type (select all that apply)</Label>
        <div className="grid gap-2 md:grid-cols-2 mt-2">
          {supportTypeOptions.map(option => (
            <div key={option} className="flex items-center space-x-2">
              <Checkbox
                id={`support-${option}`}
                checked={(formData.preferredSupportType as string[]).includes(option)}
                onCheckedChange={(checked) => updateArrayField('preferredSupportType', option, checked as boolean)}
              />
              <Label htmlFor={`support-${option}`} className="font-normal text-sm">{option}</Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="wellnessGoals">What are your mental health goals?</Label>
        <Textarea id="wellnessGoals" rows={3} value={formData.wellnessGoals} onChange={(e) => updateFormData('wellnessGoals', e.target.value)} placeholder="e.g. Reduce stress, improve sleep, better work-life balance..." />
      </div>

      <div>
        <Label htmlFor="additionalConcerns">Additional concerns</Label>
        <Textarea id="additionalConcerns" rows={3} value={formData.additionalConcerns} onChange={(e) => updateFormData('additionalConcerns', e.target.value)} />
      </div>

      <div className="border rounded-lg p-4 bg-muted/50 space-y-4">
        <h4 className="font-medium">Confidentiality Declaration</h4>
        <p className="text-sm text-muted-foreground">
          Your responses are confidential and will only be shared with authorised wellbeing staff.
          Individual results will not be shared with your manager without your explicit consent.
          If immediate risk is identified, duty of care protocols may apply.
        </p>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="confirmationChecked"
            checked={formData.confirmationChecked}
            onCheckedChange={(checked) => updateFormData('confirmationChecked', checked as boolean)}
          />
          <Label htmlFor="confirmationChecked" className="font-normal">
            I understand the confidentiality terms and consent to this assessment
          </Label>
        </div>
      </div>

      <div>
        <Label htmlFor="signature">Digital Signature (type full name) *</Label>
        <Input id="signature" value={formData.signature} onChange={(e) => updateFormData('signature', e.target.value)} placeholder="Type your full name" required />
        <p className="text-xs text-muted-foreground mt-1">By typing your name, you are providing a digital signature.</p>
      </div>
    </div>
  );

  return (
    <PageLayout title="Mental Health Assessment" subtitle="Confidential psychological wellbeing screening">
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
              <Brain className="h-6 w-6 text-purple-600" />
              <div>
                <CardTitle>Mental Health & Wellbeing Assessment</CardTitle>
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
