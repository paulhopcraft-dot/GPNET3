/**
 * ClaimsIntakeModal - Modal for creating new worker cases (claims intake)
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { fetchWithCsrf } from "../lib/queryClient";

interface ClaimsIntakeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface FormData {
  workerName: string;
  company: string;
  dateOfInjury: string;
  injuryDescription: string;
  owner: string;
}

interface FormErrors {
  workerName?: string;
  company?: string;
  dateOfInjury?: string;
}

export function ClaimsIntakeModal({
  open,
  onOpenChange,
  onSuccess,
}: ClaimsIntakeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    workerName: "",
    company: "",
    dateOfInjury: new Date().toISOString().split("T")[0],
    injuryDescription: "",
    owner: "",
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setError(null);
      setSuccess(false);
      setFormErrors({});
      setFormData({
        workerName: "",
        company: "",
        dateOfInjury: new Date().toISOString().split("T")[0],
        injuryDescription: "",
        owner: "",
      });
    }
  }, [open]);

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.workerName.trim() || formData.workerName.trim().length < 2) {
      errors.workerName = "Worker name must be at least 2 characters";
    }

    if (!formData.company.trim()) {
      errors.company = "Company is required";
    }

    if (!formData.dateOfInjury) {
      errors.dateOfInjury = "Date of injury is required";
    } else {
      const date = new Date(formData.dateOfInjury);
      if (isNaN(date.getTime())) {
        errors.dateOfInjury = "Invalid date format";
      } else if (date > new Date()) {
        errors.dateOfInjury = "Date cannot be in the future";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithCsrf("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerName: formData.workerName.trim(),
          company: formData.company.trim(),
          dateOfInjury: formData.dateOfInjury,
          injuryDescription: formData.injuryDescription.trim() || undefined,
          owner: formData.owner.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to create case");
      }

      setSuccess(true);

      // Call onSuccess callback after brief delay to show success state
      setTimeout(() => {
        onOpenChange(false);
        onSuccess?.();
      }, 1500);
    } catch (err) {
      console.error("Case creation error:", err);
      setError(err instanceof Error ? err.message : "Failed to create case");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof FormData,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user types
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">
              person_add
            </span>
            New Claim Intake
          </DialogTitle>
          <DialogDescription>
            Create a new worker case to begin tracking their injury claim.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 text-green-700 dark:text-green-400 text-sm p-3 rounded-md flex items-center gap-2">
            <span className="material-symbols-outlined text-base">
              check_circle
            </span>
            Case created successfully!
          </div>
        )}

        <div className="space-y-4 py-4">
          {/* Worker Name */}
          <div className="space-y-2">
            <Label htmlFor="worker-name">
              Worker Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="worker-name"
              placeholder="e.g., John Smith"
              value={formData.workerName}
              onChange={(e) => handleInputChange("workerName", e.target.value)}
              className={formErrors.workerName ? "border-destructive" : ""}
              disabled={loading || success}
            />
            {formErrors.workerName && (
              <p className="text-xs text-destructive">{formErrors.workerName}</p>
            )}
          </div>

          {/* Company */}
          <div className="space-y-2">
            <Label htmlFor="company">
              Company <span className="text-destructive">*</span>
            </Label>
            <Input
              id="company"
              placeholder="e.g., Acme Industries"
              value={formData.company}
              onChange={(e) => handleInputChange("company", e.target.value)}
              className={formErrors.company ? "border-destructive" : ""}
              disabled={loading || success}
            />
            {formErrors.company && (
              <p className="text-xs text-destructive">{formErrors.company}</p>
            )}
          </div>

          {/* Date of Injury */}
          <div className="space-y-2">
            <Label htmlFor="date-of-injury">
              Date of Injury <span className="text-destructive">*</span>
            </Label>
            <Input
              id="date-of-injury"
              type="date"
              value={formData.dateOfInjury}
              onChange={(e) => handleInputChange("dateOfInjury", e.target.value)}
              className={formErrors.dateOfInjury ? "border-destructive" : ""}
              max={new Date().toISOString().split("T")[0]}
              disabled={loading || success}
            />
            {formErrors.dateOfInjury && (
              <p className="text-xs text-destructive">{formErrors.dateOfInjury}</p>
            )}
          </div>

          {/* Injury Description */}
          <div className="space-y-2">
            <Label htmlFor="injury-description">
              Injury Description{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="injury-description"
              placeholder="Brief description of the injury..."
              value={formData.injuryDescription}
              onChange={(e) =>
                handleInputChange("injuryDescription", e.target.value)
              }
              className="min-h-[80px]"
              disabled={loading || success}
            />
          </div>

          {/* Case Owner */}
          <div className="space-y-2">
            <Label htmlFor="owner">
              Assign To{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="owner"
              placeholder="e.g., Case Manager Name"
              value={formData.owner}
              onChange={(e) => handleInputChange("owner", e.target.value)}
              disabled={loading || success}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading || success}>
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm mr-2">
                    autorenew
                  </span>
                  Creating...
                </>
              ) : success ? (
                <>
                  <span className="material-symbols-outlined text-sm mr-2">
                    check
                  </span>
                  Created!
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm mr-2">
                    add
                  </span>
                  Create Case
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
