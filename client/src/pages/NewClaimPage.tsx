import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function NewClaimPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    workerName: "",
    company: "",
    dateOfInjury: "",
    injuryType: "",
    injuryDescription: "",
    workStatus: "Off work",
    riskLevel: "Medium",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Build summary from injury type and description
      const summary = formData.injuryDescription
        ? `${formData.injuryType}: ${formData.injuryDescription}`
        : formData.injuryType || undefined;

      const response = await apiRequest("POST", "/api/cases", {
        workerName: formData.workerName,
        company: formData.company,
        dateOfInjury: formData.dateOfInjury,
        workStatus: formData.workStatus,
        riskLevel: formData.riskLevel,
        summary,
      });

      const newCase = await response.json();

      // Invalidate cases query to refresh the list
      await queryClient.invalidateQueries({ queryKey: ["/api/gpnet2/cases"] });

      toast({
        title: "Claim Created",
        description: `New claim for ${formData.workerName} has been created successfully.`,
      });

      // Navigate to the new case detail page
      navigate(`/cases/${newCase.id}`);
    } catch (error) {
      console.error("Error creating claim:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create claim. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <PageLayout title="New Claim" subtitle="Create a new workers' compensation claim">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">add_circle</span>
              Claim Details
            </CardTitle>
            <CardDescription>
              Enter the details for the new workers' compensation claim.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Worker Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Worker Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="workerName">Worker Name *</Label>
                    <Input
                      id="workerName"
                      placeholder="Enter full name"
                      value={formData.workerName}
                      onChange={(e) => handleChange("workerName", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company *</Label>
                    <Select
                      value={formData.company}
                      onValueChange={(value) => handleChange("company", value)}
                    >
                      <SelectTrigger id="company">
                        <SelectValue placeholder="Select company" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Symmetry">Symmetry</SelectItem>
                        <SelectItem value="Allied Health">Allied Health</SelectItem>
                        <SelectItem value="Apex Labour">Apex Labour</SelectItem>
                        <SelectItem value="SafeWorks">SafeWorks</SelectItem>
                        <SelectItem value="Core Industrial">Core Industrial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Injury Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Injury Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <SelectTrigger id="injuryType">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="musculoskeletal">Musculoskeletal</SelectItem>
                        <SelectItem value="psychological">Psychological</SelectItem>
                        <SelectItem value="laceration">Laceration</SelectItem>
                        <SelectItem value="fracture">Fracture</SelectItem>
                        <SelectItem value="burn">Burn</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="injuryDescription">Injury Description</Label>
                  <Textarea
                    id="injuryDescription"
                    placeholder="Describe the injury and how it occurred..."
                    value={formData.injuryDescription}
                    onChange={(e) => handleChange("injuryDescription", e.target.value)}
                    rows={4}
                  />
                </div>
              </div>

              {/* Classification */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Initial Classification
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="workStatus">Work Status</Label>
                    <Select
                      value={formData.workStatus}
                      onValueChange={(value) => handleChange("workStatus", value)}
                    >
                      <SelectTrigger id="workStatus">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="At work">At Work</SelectItem>
                        <SelectItem value="Off work">Off Work</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="riskLevel">Risk Level</Label>
                    <Select
                      value={formData.riskLevel}
                      onValueChange={(value) => handleChange("riskLevel", value)}
                    >
                      <SelectTrigger id="riskLevel">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/cases")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin mr-2 text-sm">
                        progress_activity
                      </span>
                      Creating...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined mr-2 text-sm">add</span>
                      Create Claim
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
