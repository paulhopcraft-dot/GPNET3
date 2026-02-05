import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PreventionAssessmentData {
  // Section 1: Initial Information
  companyName: string;
  employerEmail: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  age: string;
  weight: string;
  genderIdentity: string;
  selfDescribeGender: string;

  // Section 2: Physical Pain Assessment
  neckPain: string;
  armsPain: string;
  shouldersPain: string;
  upperBackPain: string;
  lowerBackPain: string;
  legsPain: string;
  kneesPain: string;
  feetPain: string;
  painElsewhere: string;
  otherPainLocation: string;
  otherPainLevel: string;
  painLastWeek: string;
  averagePain3Months: string;
  riskPersistentPain: string;

  // Section 3: Psychological Wellbeing (last 4 weeks)
  tiredNoReason: string;
  feltNervous: string;
  extremeNervousness: string;
  feltHopeless: string;
  feltRestless: string;
  couldntSitStill: string;
  feltDepressed: string;
  everythingEffortful: string;
  feltSad: string;
  feltWorthless: string;
  depressionBothered: string;
  tensionAnxiety: string;
  workplaceChallenges: string;
  challengesDescription: string;
  jobPerformanceConcerns: string;

  // Section 4: Health & Wellbeing
  smokingStatus: string;
  smokingDuration: string;
  vegetableServings: string;
  fruitServings: string;
  junkFoodFrequency: string;
  fastFoodReasons: string[];
  alcoholConsumption: string;
  vigorousActivity: string;
  walkingSessions: string;
  moderateActivity: string;
  workTimeActivity: string;
  activityBarriers: string[];

  // Section 5: Job Capacity & Restrictions
  canSit: string;
  canStandWalk: string;
  canBend: string;
  canSquat: string;
  canKneel: string;
  canReachAboveShoulder: string;
  canUseArmsHands: string;
  canLift: string;
  canNeckMovement: string;
  physicalFunctionComment: string;
  physicalChallengesInRole: string;
  attentionConcentration: string;
  memory: string;
  judgement: string;
  mentalHealthChallengesComment: string;
  additionalComments: string;
  workEnvironmentConsiderations: string;

  // Section 6: Completion
  confirmationChecked: boolean;
  signature: string;
}

const painLevels = Array.from({ length: 11 }, (_, i) => ({
  value: i.toString(),
  label: i === 0 ? "0 - No pain" : i === 10 ? "10 - Worst possible pain" : i.toString()
}));

const wellbeingOptions = [
  { value: "none", label: "None of the time" },
  { value: "little", label: "A little of the time" },
  { value: "some", label: "Some of the time" },
  { value: "most", label: "Most of the time" },
  { value: "all", label: "All of the time" }
];

export default function PreventionAssessmentForm() {
  const navigate = useNavigate();
  const [currentSection, setCurrentSection] = useState(1);
  const [formData, setFormData] = useState<PreventionAssessmentData>({
    companyName: "",
    employerEmail: "",
    firstName: "",
    lastName: "",
    email: "",
    jobTitle: "",
    age: "",
    weight: "",
    genderIdentity: "",
    selfDescribeGender: "",
    neckPain: "",
    armsPain: "",
    shouldersPain: "",
    upperBackPain: "",
    lowerBackPain: "",
    legsPain: "",
    kneesPain: "",
    feetPain: "",
    painElsewhere: "",
    otherPainLocation: "",
    otherPainLevel: "",
    painLastWeek: "",
    averagePain3Months: "",
    riskPersistentPain: "",
    tiredNoReason: "",
    feltNervous: "",
    extremeNervousness: "",
    feltHopeless: "",
    feltRestless: "",
    couldntSitStill: "",
    feltDepressed: "",
    everythingEffortful: "",
    feltSad: "",
    feltWorthless: "",
    depressionBothered: "",
    tensionAnxiety: "",
    workplaceChallenges: "",
    challengesDescription: "",
    jobPerformanceConcerns: "",
    smokingStatus: "",
    smokingDuration: "",
    vegetableServings: "",
    fruitServings: "",
    junkFoodFrequency: "",
    fastFoodReasons: [],
    alcoholConsumption: "",
    vigorousActivity: "",
    walkingSessions: "",
    moderateActivity: "",
    workTimeActivity: "",
    activityBarriers: [],
    canSit: "",
    canStandWalk: "",
    canBend: "",
    canSquat: "",
    canKneel: "",
    canReachAboveShoulder: "",
    canUseArmsHands: "",
    canLift: "",
    canNeckMovement: "",
    physicalFunctionComment: "",
    physicalChallengesInRole: "",
    attentionConcentration: "",
    memory: "",
    judgement: "",
    mentalHealthChallengesComment: "",
    additionalComments: "",
    workEnvironmentConsiderations: "",
    confirmationChecked: false,
    signature: ""
  });

  const updateFormData = (field: keyof PreventionAssessmentData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateArrayField = (field: keyof PreventionAssessmentData, value: string, checked: boolean) => {
    setFormData(prev => {
      const currentArray = prev[field] as string[];
      if (checked) {
        return { ...prev, [field]: [...currentArray, value] };
      } else {
        return { ...prev, [field]: currentArray.filter(item => item !== value) };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Here you would submit to your API endpoint
      console.log("Prevention Assessment Data:", formData);

      // For now, navigate to checks page
      navigate('/checks');
    } catch (error) {
      console.error("Error submitting prevention assessment:", error);
    }
  };

  const renderSection1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Initial Information</h3>
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
        <Label>Gender Identity *</Label>
        <RadioGroup
          value={formData.genderIdentity}
          onValueChange={(value) => updateFormData('genderIdentity', value)}
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

        {formData.genderIdentity === "self-describe" && (
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
        <h3 className="text-lg font-semibold mb-2">Physical Pain Assessment</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Please indicate any physical pain. 0 = No pain, 10 = Worst possible pain
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { key: 'neckPain', label: 'Neck Pain' },
          { key: 'armsPain', label: 'Arm(s) Pain' },
          { key: 'shouldersPain', label: 'Shoulder(s) Pain' },
          { key: 'upperBackPain', label: 'Upper Back Pain' },
          { key: 'lowerBackPain', label: 'Lower Back Pain' },
          { key: 'legsPain', label: 'Legs Pain' },
          { key: 'kneesPain', label: 'Knees Pain' },
          { key: 'feetPain', label: 'Feet Pain' }
        ].map(({ key, label }) => (
          <div key={key}>
            <Label>{label} *</Label>
            <Select
              value={formData[key as keyof PreventionAssessmentData] as string}
              onValueChange={(value) => updateFormData(key as keyof PreventionAssessmentData, value)}
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
        <Label>Pain Elsewhere *</Label>
        <RadioGroup
          value={formData.painElsewhere}
          onValueChange={(value) => updateFormData('painElsewhere', value)}
          className="mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="pain-yes" />
            <Label htmlFor="pain-yes">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="pain-no" />
            <Label htmlFor="pain-no">No</Label>
          </div>
        </RadioGroup>

        {formData.painElsewhere === "yes" && (
          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="otherPainLocation">Other Pain Location</Label>
              <Textarea
                id="otherPainLocation"
                value={formData.otherPainLocation}
                onChange={(e) => updateFormData('otherPainLocation', e.target.value)}
                placeholder="Please describe where else you experience pain"
              />
            </div>
            <div>
              <Label>Other Pain Level</Label>
              <Select
                value={formData.otherPainLevel}
                onValueChange={(value) => updateFormData('otherPainLevel', value)}
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
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Pain Rating Last Week *</Label>
          <Select
            value={formData.painLastWeek}
            onValueChange={(value) => updateFormData('painLastWeek', value)}
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
        <div>
          <Label>Average Pain (3 months) *</Label>
          <Select
            value={formData.averagePain3Months}
            onValueChange={(value) => updateFormData('averagePain3Months', value)}
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
      </div>

      <div>
        <Label>Risk of Persistent Pain *</Label>
        <RadioGroup
          value={formData.riskPersistentPain}
          onValueChange={(value) => updateFormData('riskPersistentPain', value)}
          className="mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="highly-likely" id="highly-likely" />
            <Label htmlFor="highly-likely">Highly likely</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="likely" id="likely" />
            <Label htmlFor="likely">Likely</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no-risk" id="no-risk" />
            <Label htmlFor="no-risk">No risk</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );

  const renderSection3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Psychological Wellbeing</h3>
        <p className="text-sm text-muted-foreground mb-4">
          During the last 4 weeks, about how often did you feel...
        </p>
      </div>

      <div className="space-y-4">
        {[
          { key: 'tiredNoReason', label: 'Tired out for no good reason' },
          { key: 'feltNervous', label: 'Nervous' },
          { key: 'extremeNervousness', label: 'So nervous that nothing could calm you down' },
          { key: 'feltHopeless', label: 'Hopeless' },
          { key: 'feltRestless', label: 'Restless or fidgety' },
          { key: 'couldntSitStill', label: 'So restless you could not sit still' },
          { key: 'feltDepressed', label: 'Depressed' },
          { key: 'everythingEffortful', label: 'That everything was an effort' },
          { key: 'feltSad', label: 'So sad that nothing could cheer you up' },
          { key: 'feltWorthless', label: 'Worthless' }
        ].map(({ key, label }) => (
          <div key={key}>
            <Label className="text-sm">{label} *</Label>
            <RadioGroup
              value={formData[key as keyof PreventionAssessmentData] as string}
              onValueChange={(value) => updateFormData(key as keyof PreventionAssessmentData, value)}
              className="flex flex-wrap gap-4 mt-2"
            >
              {wellbeingOptions.map(option => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`${key}-${option.value}`} />
                  <Label htmlFor={`${key}-${option.value}`} className="text-xs">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-sm">During the last week, how much were you bothered by depression? *</Label>
          <RadioGroup
            value={formData.depressionBothered}
            onValueChange={(value) => updateFormData('depressionBothered', value)}
            className="flex flex-wrap gap-4 mt-2"
          >
            {wellbeingOptions.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`depression-${option.value}`} />
                <Label htmlFor={`depression-${option.value}`} className="text-xs">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div>
          <Label className="text-sm">During the last week, how much were you bothered by tension/anxiety? *</Label>
          <RadioGroup
            value={formData.tensionAnxiety}
            onValueChange={(value) => updateFormData('tensionAnxiety', value)}
            className="flex flex-wrap gap-4 mt-2"
          >
            {wellbeingOptions.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`tension-${option.value}`} />
                <Label htmlFor={`tension-${option.value}`} className="text-xs">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </div>

      <div>
        <Label>Are you experiencing any workplace challenges? *</Label>
        <RadioGroup
          value={formData.workplaceChallenges}
          onValueChange={(value) => updateFormData('workplaceChallenges', value)}
          className="mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="challenges-yes" />
            <Label htmlFor="challenges-yes">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="challenges-no" />
            <Label htmlFor="challenges-no">No</Label>
          </div>
        </RadioGroup>

        {formData.workplaceChallenges === "yes" && (
          <div className="mt-4">
            <Label htmlFor="challengesDescription">Describe the challenges</Label>
            <Textarea
              id="challengesDescription"
              value={formData.challengesDescription}
              onChange={(e) => updateFormData('challengesDescription', e.target.value)}
              placeholder="Please describe the workplace challenges you are experiencing"
            />
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="jobPerformanceConcerns">Job performance concerns *</Label>
        <Textarea
          id="jobPerformanceConcerns"
          value={formData.jobPerformanceConcerns}
          onChange={(e) => updateFormData('jobPerformanceConcerns', e.target.value)}
          placeholder="Please describe any concerns about your job performance"
          required
        />
      </div>
    </div>
  );

  const renderSection4 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Health & Wellbeing</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Please indicate your personal health and wellbeing
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Do you smoke? *</Label>
          <RadioGroup
            value={formData.smokingStatus}
            onValueChange={(value) => updateFormData('smokingStatus', value)}
            className="mt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="smoke-yes" />
              <Label htmlFor="smoke-yes">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="smoke-no" />
              <Label htmlFor="smoke-no">No</Label>
            </div>
          </RadioGroup>

          {formData.smokingStatus === "yes" && (
            <div className="mt-3">
              <Label>How long have you been smoking?</Label>
              <Select
                value={formData.smokingDuration}
                onValueChange={(value) => updateFormData('smokingDuration', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="<1month">Less than 1 month</SelectItem>
                  <SelectItem value="1-6months">1-6 months</SelectItem>
                  <SelectItem value="6months-1year">6 months - 1 year</SelectItem>
                  <SelectItem value="1-2years">1-2 years</SelectItem>
                  <SelectItem value="2-5years">2-5 years</SelectItem>
                  <SelectItem value="5+years">5+ years</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div>
          <Label>Vegetable servings per day *</Label>
          <Select
            value={formData.vegetableServings}
            onValueChange={(value) => updateFormData('vegetableServings', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select servings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="1-less">1 or less</SelectItem>
              <SelectItem value="2-4">2-4</SelectItem>
              <SelectItem value="5+">5+</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Fruit servings per day *</Label>
          <Select
            value={formData.fruitServings}
            onValueChange={(value) => updateFormData('fruitServings', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select servings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="1-less">1 or less</SelectItem>
              <SelectItem value="2-4">2-4</SelectItem>
              <SelectItem value="5+">5+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Junk food frequency per week *</Label>
          <Select
            value={formData.junkFoodFrequency}
            onValueChange={(value) => updateFormData('junkFoodFrequency', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="1-3days">1-3 days</SelectItem>
              <SelectItem value="3-5days">3-5 days</SelectItem>
              <SelectItem value="5-7days">5-7 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Reasons for fast food choices *</Label>
        <div className="mt-2 space-y-2">
          {[
            { value: "never", label: "Never eat fast food" },
            { value: "cheaper", label: "It's cheaper" },
            { value: "convenience", label: "Convenience" },
            { value: "taste", label: "Taste preference" },
            { value: "availability", label: "Availability" }
          ].map(option => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`fastfood-${option.value}`}
                checked={formData.fastFoodReasons.includes(option.value)}
                onCheckedChange={(checked) => updateArrayField('fastFoodReasons', option.value, checked as boolean)}
              />
              <Label htmlFor={`fastfood-${option.value}`}>{option.label}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Alcohol consumption per week *</Label>
          <Select
            value={formData.alcoholConsumption}
            onValueChange={(value) => updateFormData('alcoholConsumption', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select drinks per week" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">0 drinks</SelectItem>
              <SelectItem value="1-5">1-5 drinks</SelectItem>
              <SelectItem value="6-10">6-10 drinks</SelectItem>
              <SelectItem value="11-14">11-14 drinks</SelectItem>
              <SelectItem value="14+">14+ drinks</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Vigorous activity sessions per week *</Label>
          <Select
            value={formData.vigorousActivity}
            onValueChange={(value) => updateFormData('vigorousActivity', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select sessions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">0</SelectItem>
              <SelectItem value="1-3">1-3</SelectItem>
              <SelectItem value="4-7">4-7</SelectItem>
              <SelectItem value="7+">7+</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Physical activity barriers *</Label>
        <div className="mt-2 space-y-2">
          {[
            { value: "tired", label: "Too tired" },
            { value: "time", label: "No time" },
            { value: "facilities", label: "No facilities" },
            { value: "shift", label: "Shift work" },
            { value: "road", label: "Always on the road" }
          ].map(option => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`barrier-${option.value}`}
                checked={formData.activityBarriers.includes(option.value)}
                onCheckedChange={(checked) => updateArrayField('activityBarriers', option.value, checked as boolean)}
              />
              <Label htmlFor={`barrier-${option.value}`}>{option.label}</Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSection5 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Job Capacity & Restrictions</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Indicate your capacity to do your job and any restrictions
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium">Physical Functions</h4>
        {[
          { key: 'canSit', label: 'Sit' },
          { key: 'canStandWalk', label: 'Stand and Walk' },
          { key: 'canBend', label: 'Bend' },
          { key: 'canSquat', label: 'Squat' },
          { key: 'canKneel', label: 'Kneel' },
          { key: 'canReachAboveShoulder', label: 'Reach above Shoulder' },
          { key: 'canUseArmsHands', label: 'Use arms/hands' },
          { key: 'canLift', label: 'Lift' },
          { key: 'canNeckMovement', label: 'Neck Movement' }
        ].map(({ key, label }) => (
          <div key={key}>
            <Label className="text-sm font-medium">{label} *</Label>
            <RadioGroup
              value={formData[key as keyof PreventionAssessmentData] as string}
              onValueChange={(value) => updateFormData(key as keyof PreventionAssessmentData, value)}
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
        <Label htmlFor="physicalFunctionComment">Additional physical function comments</Label>
        <Textarea
          id="physicalFunctionComment"
          value={formData.physicalFunctionComment}
          onChange={(e) => updateFormData('physicalFunctionComment', e.target.value)}
          placeholder="Any additional details about your physical capabilities"
        />
      </div>

      <div>
        <Label htmlFor="physicalChallengesInRole">Physical challenges in your role</Label>
        <Textarea
          id="physicalChallengesInRole"
          value={formData.physicalChallengesInRole}
          onChange={(e) => updateFormData('physicalChallengesInRole', e.target.value)}
          placeholder="Describe any physical challenges you face in your current role"
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
              value={formData[key as keyof PreventionAssessmentData] as string}
              onValueChange={(value) => updateFormData(key as keyof PreventionAssessmentData, value)}
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
        <Label htmlFor="mentalHealthChallengesComment">Mental health challenges comment</Label>
        <Textarea
          id="mentalHealthChallengesComment"
          value={formData.mentalHealthChallengesComment}
          onChange={(e) => updateFormData('mentalHealthChallengesComment', e.target.value)}
          placeholder="Describe any mental health challenges affecting your work"
        />
      </div>
    </div>
  );

  const renderSection6 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Additional Comments & Completion</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Please provide any additional information and confirm your assessment
        </p>
      </div>

      <div>
        <Label htmlFor="additionalComments">Additional comments</Label>
        <Textarea
          id="additionalComments"
          value={formData.additionalComments}
          onChange={(e) => updateFormData('additionalComments', e.target.value)}
          placeholder="Any additional information you'd like to share"
          rows={4}
        />
      </div>

      <div>
        <Label htmlFor="workEnvironmentConsiderations">Work environment considerations</Label>
        <Textarea
          id="workEnvironmentConsiderations"
          value={formData.workEnvironmentConsiderations}
          onChange={(e) => updateFormData('workEnvironmentConsiderations', e.target.value)}
          placeholder="Any work environment factors that should be considered"
          rows={4}
        />
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
              I confirm that the information provided in this assessment is true, complete, and accurate to the best of my knowledge.
              I understand that this information will be used for health and safety planning purposes.
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
    <PageLayout title="Prevention Assessment" subtitle="Proactive health screening and risk assessment">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-green-600" />
              <div>
                <CardTitle>Prevention Health Assessment</CardTitle>
                <CardDescription>
                  Section {currentSection} of 6 - Comprehensive health and wellbeing evaluation
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

                {currentSection < 6 ? (
                  <Button
                    type="button"
                    onClick={() => setCurrentSection(prev => Math.min(6, prev + 1))}
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={!formData.confirmationChecked || !formData.signature}
                  >
                    Submit Assessment
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