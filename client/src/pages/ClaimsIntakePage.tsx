import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileText,
  User,
  Building2,
  Calendar,
  Stethoscope,
  ClipboardList,
  Loader2,
} from "lucide-react";

interface InjuryType {
  id: string;
  name: string;
  description: string;
  requiredDocuments: string[];
  riskFactors: string[];
}

interface ValidationResult {
  valid: boolean;
  errors: { field: string; message: string }[];
  warnings: { field: string; message: string }[];
  riskAssessment: {
    level: "low" | "medium" | "high";
    factors: string[];
  };
}

export default function ClaimsIntakePage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    workerName: "",
    dateOfBirth: "",
    email: "",
    phone: "",
    company: "",
    jobTitle: "",
    employmentStartDate: "",
    dateOfInjury: "",
    injuryType: "",
    injuryDescription: "",
    bodyPartAffected: "",
    treatingSupervisor: "",
    witnessName: "",
    witnessContact: "",
    initialTreatment: "",
    currentSymptoms: "",
  });

  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // Fetch injury types
  const { data: injuryTypes = [] } = useQuery<InjuryType[]>({
    queryKey: ["/api/intake/injury-types"],
  });

  // Validate form
  const validateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/intake/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Validation failed");
      return response.json();
    },
    onSuccess: (result) => {
      setValidationResult(result);
    },
  });

  // Submit form
  const submitMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/intake/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Submission failed");
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Claim Submitted",
        description: `Case ${result.caseId} has been created successfully.`,
      });
      navigate("/cases");
    },
    onError: () => {
      toast({
        title: "Submission Failed",
        description: "Please check your form and try again.",
        variant: "destructive",
      });
    },
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setValidationResult(null);
  };

  const handleValidate = () => {
    validateMutation.mutate(formData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validationResult?.valid) {
      submitMutation.mutate(formData);
    } else {
      handleValidate();
    }
  };

  const selectedInjuryType = injuryTypes.find((t) => t.id === formData.injuryType);

  return (
    <MainLayout>
      <div className="container max-w-4xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">New Claim Intake</h1>
          <p className="text-muted-foreground mt-2">
            Submit a new workers' compensation claim. All fields marked with * are required.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Worker Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Worker Information
              </CardTitle>
              <CardDescription>Personal details of the injured worker</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="workerName">Full Name *</Label>
                <Input
                  id="workerName"
                  value={formData.workerName}
                  onChange={(e) => handleChange("workerName", e.target.value)}
                  placeholder="John Smith"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="john.smith@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="0412 345 678"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Employment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Employment Details
              </CardTitle>
              <CardDescription>Workplace and employment information</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company">Company/Employer *</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => handleChange("company", e.target.value)}
                  placeholder="Acme Corporation"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title *</Label>
                <Input
                  id="jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) => handleChange("jobTitle", e.target.value)}
                  placeholder="Warehouse Operator"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employmentStartDate">Employment Start Date</Label>
                <Input
                  id="employmentStartDate"
                  type="date"
                  value={formData.employmentStartDate}
                  onChange={(e) => handleChange("employmentStartDate", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="treatingSupervisor">Supervisor Name</Label>
                <Input
                  id="treatingSupervisor"
                  value={formData.treatingSupervisor}
                  onChange={(e) => handleChange("treatingSupervisor", e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
            </CardContent>
          </Card>

          {/* Injury Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Injury Details
              </CardTitle>
              <CardDescription>Information about the workplace injury</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dateOfInjury">Date of Injury *</Label>
                  <Input
                    id="dateOfInjury"
                    type="date"
                    value={formData.dateOfInjury}
                    onChange={(e) => handleChange("dateOfInjury", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="injuryType">Injury Type *</Label>
                  <Select
                    value={formData.injuryType}
                    onValueChange={(value) => handleChange("injuryType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select injury type" />
                    </SelectTrigger>
                    <SelectContent>
                      {injuryTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedInjuryType && (
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertTitle>Required Documents for {selectedInjuryType.name}</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      {selectedInjuryType.requiredDocuments.map((doc, i) => (
                        <li key={i}>{doc}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="bodyPartAffected">Body Part(s) Affected *</Label>
                <Input
                  id="bodyPartAffected"
                  value={formData.bodyPartAffected}
                  onChange={(e) => handleChange("bodyPartAffected", e.target.value)}
                  placeholder="Lower back, left shoulder"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="injuryDescription">Description of Incident *</Label>
                <Textarea
                  id="injuryDescription"
                  value={formData.injuryDescription}
                  onChange={(e) => handleChange("injuryDescription", e.target.value)}
                  placeholder="Describe how the injury occurred..."
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentSymptoms">Current Symptoms</Label>
                <Textarea
                  id="currentSymptoms"
                  value={formData.currentSymptoms}
                  onChange={(e) => handleChange("currentSymptoms", e.target.value)}
                  placeholder="Describe current symptoms and pain levels..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="initialTreatment">Initial Treatment Received</Label>
                <Textarea
                  id="initialTreatment"
                  value={formData.initialTreatment}
                  onChange={(e) => handleChange("initialTreatment", e.target.value)}
                  placeholder="First aid, GP visit, hospital, etc."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Witness Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Witness Information
              </CardTitle>
              <CardDescription>Details of anyone who witnessed the incident</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="witnessName">Witness Name</Label>
                <Input
                  id="witnessName"
                  value={formData.witnessName}
                  onChange={(e) => handleChange("witnessName", e.target.value)}
                  placeholder="Bob Johnson"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="witnessContact">Witness Contact</Label>
                <Input
                  id="witnessContact"
                  value={formData.witnessContact}
                  onChange={(e) => handleChange("witnessContact", e.target.value)}
                  placeholder="Phone or email"
                />
              </div>
            </CardContent>
          </Card>

          {/* Validation Results */}
          {validationResult && (
            <Card className={validationResult.valid ? "border-green-500" : "border-red-500"}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {validationResult.valid ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  Validation Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {validationResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-red-600">Errors</h4>
                    {validationResult.errors.map((error, i) => (
                      <Alert key={i} variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>{error.field}:</strong> {error.message}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}

                {validationResult.warnings.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-yellow-600">Warnings</h4>
                    {validationResult.warnings.map((warning, i) => (
                      <Alert key={i}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>{warning.field}:</strong> {warning.message}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">Risk Assessment</h4>
                  <div className="flex items-center gap-2 mb-2">
                    <span>Risk Level:</span>
                    <Badge
                      variant={
                        validationResult.riskAssessment.level === "high"
                          ? "destructive"
                          : validationResult.riskAssessment.level === "medium"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {validationResult.riskAssessment.level.toUpperCase()}
                    </Badge>
                  </div>
                  {validationResult.riskAssessment.factors.length > 0 && (
                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                      {validationResult.riskAssessment.factors.map((factor, i) => (
                        <li key={i}>{factor}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Actions */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate("/cases")}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleValidate}
              disabled={validateMutation.isPending}
            >
              {validateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Validate
            </Button>
            <Button
              type="submit"
              disabled={submitMutation.isPending || (validationResult && !validationResult.valid)}
            >
              {submitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Claim
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
