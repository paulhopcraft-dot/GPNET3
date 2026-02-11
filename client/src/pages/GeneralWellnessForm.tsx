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
import { Heart, ArrowRight, ArrowLeft } from "lucide-react";

interface WellnessFormData {
  // Section 1: General Health Status
  firstName: string;
  lastName: string;
  email: string;
  employer: string;
  jobTitle: string;
  age: string;
  gender: string;
  overallHealth: string;
  healthComparedLastYear: string;
  chronicConditions: string[];
  currentMedications: string;
  lastMedicalCheckup: string;
  smokingStatus: string;
  alcoholFrequency: string;
  sleepHoursPerNight: string;
  sleepQuality: string;
  dietQuality: string;
  waterIntakeDaily: string;
  bmiCategory: string;

  // Section 2: Functional Limitations & Physical Activity
  vigorousActivitiesLimited: string;
  moderateActivitiesLimited: string;
  liftingCarryingLimited: string;
  climbingSeveralFlightsLimited: string;
  climbingOneFlightLimited: string;
  bendingKneelingLimited: string;
  walkingMoreThanKmLimited: string;
  walkingSeveralBlocksLimited: string;
  walkingOneBlockLimited: string;
  bathingDressingLimited: string;
  physicalHealthReducedWork: string;
  physicalHealthLimitedActivities: string;
  bodilyPainSeverity: string;
  painInterferenceWithWork: string;
  exerciseFrequency: string;
  exerciseType: string;
  exerciseMinutesPerSession: string;
  sittingHoursPerDay: string;

  // Section 3: Mental Wellbeing & Work Satisfaction
  feltFullOfLife: string;
  feltNervous: string;
  feltDownDumps: string;
  feltCalmPeaceful: string;
  hadEnergy: string;
  feltDownhearted: string;
  feltWornOut: string;
  feltHappy: string;
  feltTired: string;
  socialActivitiesImpact: string;
  stressLevel: string;
  workLifeBalance: string;
  jobSatisfaction: string;
  workloadManageable: string;
  supportFromColleagues: string;
  supportFromManagement: string;
  wellnessGoals: string;
  additionalConcerns: string;
  confirmationChecked: boolean;
  signature: string;
}

const totalSections = 3;

const healthFrequency = [
  { value: "all", label: "All of the time" },
  { value: "most", label: "Most of the time" },
  { value: "good-bit", label: "A good bit of the time" },
  { value: "some", label: "Some of the time" },
  { value: "little", label: "A little of the time" },
  { value: "none", label: "None of the time" }
];

const limitationOptions = [
  { value: "limited-a-lot", label: "Yes, limited a lot" },
  { value: "limited-a-little", label: "Yes, limited a little" },
  { value: "not-limited", label: "No, not limited at all" }
];

const chronicConditionOptions = [
  "Diabetes", "Heart disease", "High blood pressure", "Asthma / Respiratory",
  "Arthritis / Joint problems", "Back pain", "Mental health condition",
  "Thyroid disorder", "Cancer (current or in remission)", "None"
];

export default function GeneralWellnessForm(): React.ReactElement {
  const navigate = useNavigate();
  const [currentSection, setCurrentSection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<WellnessFormData>({
    firstName: "",
    lastName: "",
    email: "",
    employer: "",
    jobTitle: "",
    age: "",
    gender: "",
    overallHealth: "",
    healthComparedLastYear: "",
    chronicConditions: [],
    currentMedications: "",
    lastMedicalCheckup: "",
    smokingStatus: "",
    alcoholFrequency: "",
    sleepHoursPerNight: "",
    sleepQuality: "",
    dietQuality: "",
    waterIntakeDaily: "",
    bmiCategory: "",
    vigorousActivitiesLimited: "",
    moderateActivitiesLimited: "",
    liftingCarryingLimited: "",
    climbingSeveralFlightsLimited: "",
    climbingOneFlightLimited: "",
    bendingKneelingLimited: "",
    walkingMoreThanKmLimited: "",
    walkingSeveralBlocksLimited: "",
    walkingOneBlockLimited: "",
    bathingDressingLimited: "",
    physicalHealthReducedWork: "",
    physicalHealthLimitedActivities: "",
    bodilyPainSeverity: "",
    painInterferenceWithWork: "",
    exerciseFrequency: "",
    exerciseType: "",
    exerciseMinutesPerSession: "",
    sittingHoursPerDay: "",
    feltFullOfLife: "",
    feltNervous: "",
    feltDownDumps: "",
    feltCalmPeaceful: "",
    hadEnergy: "",
    feltDownhearted: "",
    feltWornOut: "",
    feltHappy: "",
    feltTired: "",
    socialActivitiesImpact: "",
    stressLevel: "",
    workLifeBalance: "",
    jobSatisfaction: "",
    workloadManageable: "",
    supportFromColleagues: "",
    supportFromManagement: "",
    wellnessGoals: "",
    additionalConcerns: "",
    confirmationChecked: false,
    signature: ""
  });

  const updateFormData = (field: keyof WellnessFormData, value: string | boolean): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateArrayField = (field: keyof WellnessFormData, value: string, checked: boolean): void => {
    setFormData(prev => {
      const currentArray = prev[field] as string[];
      if (checked) {
        return { ...prev, [field]: [...currentArray, value] };
      } else {
        return { ...prev, [field]: currentArray.filter(item => item !== value) };
      }
    });
  };

  const calculateWellnessScore = (): number => {
    let score = 0;
    // Overall health self-rating
    if (formData.overallHealth === 'poor') score += 3;
    else if (formData.overallHealth === 'fair') score += 2;
    else if (formData.overallHealth === 'good') score += 1;

    // Functional limitations
    const limitFields = [
      'vigorousActivitiesLimited', 'moderateActivitiesLimited', 'liftingCarryingLimited',
      'climbingSeveralFlightsLimited', 'bendingKneelingLimited', 'walkingMoreThanKmLimited'
    ] as const;
    const severelyLimited = limitFields.filter(f => formData[f] === 'limited-a-lot').length;
    score += Math.min(severelyLimited, 2);

    // Pain
    if (formData.bodilyPainSeverity === 'severe' || formData.bodilyPainSeverity === 'very-severe') score += 2;
    else if (formData.bodilyPainSeverity === 'moderate') score += 1;

    // Mental wellbeing
    const negativeFields = ['feltNervous', 'feltDownDumps', 'feltDownhearted', 'feltWornOut', 'feltTired'] as const;
    const negativeCount = negativeFields.filter(f => formData[f] === 'all' || formData[f] === 'most').length;
    score += Math.min(negativeCount, 2);

    // Lifestyle
    if (formData.smokingStatus === 'daily') score += 1;
    return Math.min(Math.max(score, 0), 10);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const riskScore = calculateWellnessScore();
      const clearanceLevel = riskScore <= 3 ? 'cleared_unconditional' : riskScore <= 6 ? 'cleared_conditional' : 'cleared_with_restrictions';

      const response = await fetchWithCsrf('/api/pre-employment/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateName: `${formData.firstName} ${formData.lastName}`,
          candidateEmail: formData.email,
          positionTitle: formData.jobTitle,
          departmentName: formData.employer,
          assessmentType: 'general_wellness_screening',
          status: 'completed',
          clearanceLevel,
          notes: `Wellness Score: ${riskScore}/10. Overall health: ${formData.overallHealth || 'Not rated'}. Stress level: ${formData.stressLevel || 'Not rated'}.`
        }),
      });

      if (response.ok) {
        navigate('/checks', {
          state: { message: 'General wellness assessment submitted successfully!' }
        });
      } else {
        throw new Error('Failed to submit wellness assessment');
      }
    } catch (error) {
      console.error("Error submitting wellness assessment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sectionNames = [
    "General Health Status",
    "Functional Limitations & Physical Activity",
    "Mental Wellbeing & Work Satisfaction"
  ];

  const renderLimitationField = (id: string, label: string, field: keyof WellnessFormData): React.ReactElement => (
    <div key={id}>
      <Label className="text-sm">{label}</Label>
      <RadioGroup
        value={formData[field] as string}
        onValueChange={(value) => updateFormData(field, value)}
        className="flex flex-wrap gap-4 mt-1"
      >
        {limitationOptions.map(opt => (
          <div key={opt.value} className="flex items-center space-x-2">
            <RadioGroupItem value={opt.value} id={`${id}-${opt.value}`} />
            <Label htmlFor={`${id}-${opt.value}`} className="text-sm font-normal">{opt.label}</Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );

  const renderFrequencyField = (id: string, label: string, field: keyof WellnessFormData): React.ReactElement => (
    <div key={id}>
      <Label className="text-sm">{label}</Label>
      <RadioGroup
        value={formData[field] as string}
        onValueChange={(value) => updateFormData(field, value)}
        className="flex flex-wrap gap-3 mt-1"
      >
        {healthFrequency.map(opt => (
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
      <h3 className="text-lg font-semibold mb-4">General Health Status</h3>

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
          <Label htmlFor="age">Age</Label>
          <Input id="age" type="number" value={formData.age} onChange={(e) => updateFormData('age', e.target.value)} />
        </div>
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
      </div>

      <div>
        <Label className="text-sm font-medium">In general, would you say your health is: *</Label>
        <RadioGroup value={formData.overallHealth} onValueChange={(value) => updateFormData('overallHealth', value)} className="flex flex-wrap gap-4 mt-1">
          {["excellent", "very-good", "good", "fair", "poor"].map(v => (
            <div key={v} className="flex items-center space-x-2">
              <RadioGroupItem value={v} id={`health-${v}`} />
              <Label htmlFor={`health-${v}`} className="font-normal capitalize">{v.replace('-', ' ')}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div>
        <Label className="text-sm font-medium">Compared to one year ago, how would you rate your health now?</Label>
        <RadioGroup value={formData.healthComparedLastYear} onValueChange={(value) => updateFormData('healthComparedLastYear', value)} className="flex flex-wrap gap-4 mt-1">
          {[
            { value: "much-better", label: "Much better" },
            { value: "somewhat-better", label: "Somewhat better" },
            { value: "about-same", label: "About the same" },
            { value: "somewhat-worse", label: "Somewhat worse" },
            { value: "much-worse", label: "Much worse" }
          ].map(opt => (
            <div key={opt.value} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.value} id={`compared-${opt.value}`} />
              <Label htmlFor={`compared-${opt.value}`} className="font-normal">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div>
        <Label className="text-sm font-medium">Do you have any of the following chronic conditions? (select all that apply)</Label>
        <div className="grid gap-2 md:grid-cols-2 mt-2">
          {chronicConditionOptions.map(condition => (
            <div key={condition} className="flex items-center space-x-2">
              <Checkbox
                id={`condition-${condition}`}
                checked={(formData.chronicConditions as string[]).includes(condition)}
                onCheckedChange={(checked) => updateArrayField('chronicConditions', condition, checked as boolean)}
              />
              <Label htmlFor={`condition-${condition}`} className="font-normal text-sm">{condition}</Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="currentMedications">Current Medications</Label>
        <Input id="currentMedications" value={formData.currentMedications} onChange={(e) => updateFormData('currentMedications', e.target.value)} placeholder="List any medications you take regularly" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="lastMedicalCheckup">Last Medical Checkup</Label>
          <Select value={formData.lastMedicalCheckup} onValueChange={(value) => updateFormData('lastMedicalCheckup', value)}>
            <SelectTrigger><SelectValue placeholder="When?" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="within-6-months">Within last 6 months</SelectItem>
              <SelectItem value="6-12-months">6-12 months ago</SelectItem>
              <SelectItem value="1-2-years">1-2 years ago</SelectItem>
              <SelectItem value="over-2-years">Over 2 years ago</SelectItem>
              <SelectItem value="never">Never</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="bmiCategory">BMI Category (if known)</Label>
          <Select value={formData.bmiCategory} onValueChange={(value) => updateFormData('bmiCategory', value)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="underweight">Underweight (&lt;18.5)</SelectItem>
              <SelectItem value="normal">Normal (18.5-24.9)</SelectItem>
              <SelectItem value="overweight">Overweight (25-29.9)</SelectItem>
              <SelectItem value="obese">Obese (30+)</SelectItem>
              <SelectItem value="unknown">Don't know</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="smokingStatus">Smoking Status</Label>
          <Select value={formData.smokingStatus} onValueChange={(value) => updateFormData('smokingStatus', value)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="never">Never smoked</SelectItem>
              <SelectItem value="former">Former smoker</SelectItem>
              <SelectItem value="occasionally">Occasionally</SelectItem>
              <SelectItem value="daily">Daily smoker</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="alcoholFrequency">Alcohol Consumption</Label>
          <Select value={formData.alcoholFrequency} onValueChange={(value) => updateFormData('alcoholFrequency', value)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="never">Never</SelectItem>
              <SelectItem value="rarely">Rarely (few times a year)</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="sleepHoursPerNight">Sleep (hours/night)</Label>
          <Select value={formData.sleepHoursPerNight} onValueChange={(value) => updateFormData('sleepHoursPerNight', value)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="less-than-5">Less than 5</SelectItem>
              <SelectItem value="5-6">5-6 hours</SelectItem>
              <SelectItem value="7-8">7-8 hours</SelectItem>
              <SelectItem value="more-than-8">More than 8</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="sleepQuality">Sleep Quality</Label>
          <Select value={formData.sleepQuality} onValueChange={(value) => updateFormData('sleepQuality', value)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="excellent">Excellent</SelectItem>
              <SelectItem value="good">Good</SelectItem>
              <SelectItem value="fair">Fair</SelectItem>
              <SelectItem value="poor">Poor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="dietQuality">Diet Quality</Label>
          <Select value={formData.dietQuality} onValueChange={(value) => updateFormData('dietQuality', value)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="excellent">Excellent</SelectItem>
              <SelectItem value="good">Good</SelectItem>
              <SelectItem value="fair">Fair</SelectItem>
              <SelectItem value="poor">Poor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="waterIntakeDaily">Daily Water Intake</Label>
        <Select value={formData.waterIntakeDaily} onValueChange={(value) => updateFormData('waterIntakeDaily', value)}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="less-than-4">Less than 4 glasses</SelectItem>
            <SelectItem value="4-6">4-6 glasses</SelectItem>
            <SelectItem value="7-8">7-8 glasses (recommended)</SelectItem>
            <SelectItem value="more-than-8">More than 8 glasses</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderSection2 = (): React.ReactElement => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Functional Limitations & Physical Activity</h3>
      <p className="text-sm text-muted-foreground mb-4">
        The following questions are about activities you might do during a typical day. Does your health now limit you in these activities?
      </p>

      <div className="space-y-4">
        {renderLimitationField('vigorous', 'Vigorous activities (running, heavy lifting, strenuous sports)', 'vigorousActivitiesLimited')}
        {renderLimitationField('moderate', 'Moderate activities (moving a table, vacuuming, bowling, golf)', 'moderateActivitiesLimited')}
        {renderLimitationField('lifting', 'Lifting or carrying groceries', 'liftingCarryingLimited')}
        {renderLimitationField('climbSeveral', 'Climbing several flights of stairs', 'climbingSeveralFlightsLimited')}
        {renderLimitationField('climbOne', 'Climbing one flight of stairs', 'climbingOneFlightLimited')}
        {renderLimitationField('bending', 'Bending, kneeling, or stooping', 'bendingKneelingLimited')}
        {renderLimitationField('walkKm', 'Walking more than a kilometre', 'walkingMoreThanKmLimited')}
        {renderLimitationField('walkBlocks', 'Walking several hundred metres', 'walkingSeveralBlocksLimited')}
        {renderLimitationField('walkOne', 'Walking one hundred metres', 'walkingOneBlockLimited')}
        {renderLimitationField('bathing', 'Bathing or dressing yourself', 'bathingDressingLimited')}
      </div>

      <div className="border-t pt-4 space-y-4">
        <h4 className="font-medium">Physical Health Impact on Work</h4>

        <div>
          <Label className="text-sm">During the past 4 weeks, have you accomplished less than you would like as a result of your physical health?</Label>
          <RadioGroup value={formData.physicalHealthReducedWork} onValueChange={(value) => updateFormData('physicalHealthReducedWork', value)} className="flex gap-4 mt-1">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="reducedWork-yes" />
              <Label htmlFor="reducedWork-yes" className="font-normal">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="reducedWork-no" />
              <Label htmlFor="reducedWork-no" className="font-normal">No</Label>
            </div>
          </RadioGroup>
        </div>

        <div>
          <Label className="text-sm">Were you limited in the kind of work or other activities?</Label>
          <RadioGroup value={formData.physicalHealthLimitedActivities} onValueChange={(value) => updateFormData('physicalHealthLimitedActivities', value)} className="flex gap-4 mt-1">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="limitedActivities-yes" />
              <Label htmlFor="limitedActivities-yes" className="font-normal">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="limitedActivities-no" />
              <Label htmlFor="limitedActivities-no" className="font-normal">No</Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      <div className="border-t pt-4 space-y-4">
        <h4 className="font-medium">Bodily Pain</h4>

        <div>
          <Label className="text-sm font-medium">How much bodily pain have you had during the past 4 weeks?</Label>
          <RadioGroup value={formData.bodilyPainSeverity} onValueChange={(value) => updateFormData('bodilyPainSeverity', value)} className="flex flex-wrap gap-4 mt-1">
            {["none", "very-mild", "mild", "moderate", "severe", "very-severe"].map(v => (
              <div key={v} className="flex items-center space-x-2">
                <RadioGroupItem value={v} id={`pain-${v}`} />
                <Label htmlFor={`pain-${v}`} className="font-normal capitalize">{v.replace('-', ' ')}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div>
          <Label className="text-sm font-medium">During the past 4 weeks, how much did pain interfere with your normal work?</Label>
          <RadioGroup value={formData.painInterferenceWithWork} onValueChange={(value) => updateFormData('painInterferenceWithWork', value)} className="flex flex-wrap gap-4 mt-1">
            {["not-at-all", "a-little-bit", "moderately", "quite-a-bit", "extremely"].map(v => (
              <div key={v} className="flex items-center space-x-2">
                <RadioGroupItem value={v} id={`painWork-${v}`} />
                <Label htmlFor={`painWork-${v}`} className="font-normal capitalize">{v.replace(/-/g, ' ')}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </div>

      <div className="border-t pt-4 space-y-4">
        <h4 className="font-medium">Exercise & Activity</h4>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="exerciseFrequency">Exercise Frequency</Label>
            <Select value={formData.exerciseFrequency} onValueChange={(value) => updateFormData('exerciseFrequency', value)}>
              <SelectTrigger><SelectValue placeholder="How often?" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never</SelectItem>
                <SelectItem value="rarely">Rarely (few times a month)</SelectItem>
                <SelectItem value="1-2-week">1-2 times per week</SelectItem>
                <SelectItem value="3-4-week">3-4 times per week</SelectItem>
                <SelectItem value="5-plus-week">5+ times per week</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="exerciseType">Primary Exercise Type</Label>
            <Input id="exerciseType" value={formData.exerciseType} onChange={(e) => updateFormData('exerciseType', e.target.value)} placeholder="e.g. Walking, gym, swimming..." />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="exerciseMinutesPerSession">Minutes Per Session</Label>
            <Select value={formData.exerciseMinutesPerSession} onValueChange={(value) => updateFormData('exerciseMinutesPerSession', value)}>
              <SelectTrigger><SelectValue placeholder="Duration" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="under-15">Under 15 minutes</SelectItem>
                <SelectItem value="15-30">15-30 minutes</SelectItem>
                <SelectItem value="30-60">30-60 minutes</SelectItem>
                <SelectItem value="over-60">Over 60 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="sittingHoursPerDay">Hours Sitting Per Day</Label>
            <Select value={formData.sittingHoursPerDay} onValueChange={(value) => updateFormData('sittingHoursPerDay', value)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="under-4">Under 4 hours</SelectItem>
                <SelectItem value="4-6">4-6 hours</SelectItem>
                <SelectItem value="6-8">6-8 hours</SelectItem>
                <SelectItem value="over-8">Over 8 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSection3 = (): React.ReactElement => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Mental Wellbeing & Work Satisfaction</h3>
      <p className="text-sm text-muted-foreground mb-4">
        These questions are about how you feel and how things have been with you during the past 4 weeks.
      </p>

      <div className="space-y-4">
        {renderFrequencyField('fullOfLife', 'Did you feel full of life?', 'feltFullOfLife')}
        {renderFrequencyField('nervous', 'Have you been a very nervous person?', 'feltNervous')}
        {renderFrequencyField('downDumps', 'Have you felt so down in the dumps that nothing could cheer you up?', 'feltDownDumps')}
        {renderFrequencyField('calmPeaceful', 'Have you felt calm and peaceful?', 'feltCalmPeaceful')}
        {renderFrequencyField('hadEnergy', 'Did you have a lot of energy?', 'hadEnergy')}
        {renderFrequencyField('downhearted', 'Have you felt downhearted and depressed?', 'feltDownhearted')}
        {renderFrequencyField('wornOut', 'Did you feel worn out?', 'feltWornOut')}
        {renderFrequencyField('happy', 'Have you been a happy person?', 'feltHappy')}
        {renderFrequencyField('tired', 'Did you feel tired?', 'feltTired')}
      </div>

      <div>
        <Label className="text-sm font-medium">During the past 4 weeks, how much of the time has your physical health or emotional problems interfered with your social activities?</Label>
        <RadioGroup value={formData.socialActivitiesImpact} onValueChange={(value) => updateFormData('socialActivitiesImpact', value)} className="flex flex-wrap gap-4 mt-2">
          {healthFrequency.map(opt => (
            <div key={opt.value} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.value} id={`social-${opt.value}`} />
              <Label htmlFor={`social-${opt.value}`} className="text-sm font-normal">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="border-t pt-4 space-y-4">
        <h4 className="font-medium">Work & Stress</h4>

        <div>
          <Label className="text-sm font-medium">Current stress level</Label>
          <RadioGroup value={formData.stressLevel} onValueChange={(value) => updateFormData('stressLevel', value)} className="flex flex-wrap gap-4 mt-1">
            {["very-low", "low", "moderate", "high", "very-high"].map(v => (
              <div key={v} className="flex items-center space-x-2">
                <RadioGroupItem value={v} id={`stress-${v}`} />
                <Label htmlFor={`stress-${v}`} className="font-normal capitalize">{v.replace('-', ' ')}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div>
          <Label className="text-sm font-medium">Work-life balance</Label>
          <RadioGroup value={formData.workLifeBalance} onValueChange={(value) => updateFormData('workLifeBalance', value)} className="flex flex-wrap gap-4 mt-1">
            {["excellent", "good", "fair", "poor", "very-poor"].map(v => (
              <div key={v} className="flex items-center space-x-2">
                <RadioGroupItem value={v} id={`wlb-${v}`} />
                <Label htmlFor={`wlb-${v}`} className="font-normal capitalize">{v.replace('-', ' ')}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div>
          <Label className="text-sm font-medium">Job satisfaction</Label>
          <RadioGroup value={formData.jobSatisfaction} onValueChange={(value) => updateFormData('jobSatisfaction', value)} className="flex flex-wrap gap-4 mt-1">
            {["very-satisfied", "satisfied", "neutral", "dissatisfied", "very-dissatisfied"].map(v => (
              <div key={v} className="flex items-center space-x-2">
                <RadioGroupItem value={v} id={`jobsat-${v}`} />
                <Label htmlFor={`jobsat-${v}`} className="font-normal capitalize">{v.replace('-', ' ')}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-sm">Is your workload manageable?</Label>
            <RadioGroup value={formData.workloadManageable} onValueChange={(value) => updateFormData('workloadManageable', value)} className="flex gap-4 mt-1">
              {["yes", "mostly", "sometimes", "rarely"].map(v => (
                <div key={v} className="flex items-center space-x-2">
                  <RadioGroupItem value={v} id={`workload-${v}`} />
                  <Label htmlFor={`workload-${v}`} className="font-normal capitalize">{v}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-sm">Support from colleagues</Label>
            <RadioGroup value={formData.supportFromColleagues} onValueChange={(value) => updateFormData('supportFromColleagues', value)} className="flex flex-wrap gap-4 mt-1">
              {["excellent", "good", "adequate", "poor"].map(v => (
                <div key={v} className="flex items-center space-x-2">
                  <RadioGroupItem value={v} id={`colSupport-${v}`} />
                  <Label htmlFor={`colSupport-${v}`} className="font-normal capitalize">{v}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div>
            <Label className="text-sm">Support from management</Label>
            <RadioGroup value={formData.supportFromManagement} onValueChange={(value) => updateFormData('supportFromManagement', value)} className="flex flex-wrap gap-4 mt-1">
              {["excellent", "good", "adequate", "poor"].map(v => (
                <div key={v} className="flex items-center space-x-2">
                  <RadioGroupItem value={v} id={`mgtSupport-${v}`} />
                  <Label htmlFor={`mgtSupport-${v}`} className="font-normal capitalize">{v}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>
      </div>

      <div className="border-t pt-4 space-y-4">
        <h4 className="font-medium">Goals & Concerns</h4>

        <div>
          <Label htmlFor="wellnessGoals">What are your wellness goals?</Label>
          <Textarea id="wellnessGoals" rows={3} value={formData.wellnessGoals} onChange={(e) => updateFormData('wellnessGoals', e.target.value)} placeholder="e.g. Improve fitness, reduce stress, better sleep, manage weight..." />
        </div>

        <div>
          <Label htmlFor="additionalConcerns">Any additional health concerns?</Label>
          <Textarea id="additionalConcerns" rows={3} value={formData.additionalConcerns} onChange={(e) => updateFormData('additionalConcerns', e.target.value)} placeholder="Anything else you'd like your employer's wellness program to address?" />
        </div>
      </div>

      <div className="border rounded-lg p-4 bg-muted/50 space-y-4">
        <h4 className="font-medium">Declaration</h4>
        <p className="text-sm text-muted-foreground">
          I declare that the information provided in this wellness assessment is accurate and complete to the best of my knowledge.
          This information will be used to support employee wellness programs and will be treated confidentially.
        </p>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="confirmationChecked"
            checked={formData.confirmationChecked}
            onCheckedChange={(checked) => updateFormData('confirmationChecked', checked as boolean)}
          />
          <Label htmlFor="confirmationChecked" className="font-normal">
            I confirm the above declaration and consent to this wellness assessment
          </Label>
        </div>
      </div>

      <div>
        <Label htmlFor="signature">Digital Signature (type full name) *</Label>
        <Input id="signature" value={formData.signature} onChange={(e) => updateFormData('signature', e.target.value)} placeholder="Type your full name" required />
        <p className="text-xs text-muted-foreground mt-1">By typing your name, you are providing a digital signature for this assessment.</p>
      </div>
    </div>
  );

  return (
    <PageLayout title="Wellness Assessment" subtitle="General health and wellbeing evaluation">
      <div className="max-w-4xl mx-auto">
        {/* Progress indicator */}
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
              <Heart className="h-6 w-6 text-pink-600" />
              <div>
                <CardTitle>General Health & Wellbeing Assessment</CardTitle>
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
                    {isSubmitting ? 'Submitting...' : 'Submit Wellness Assessment'}
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
