import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { VideoIcon } from "lucide-react";

interface TelehealthBookingModalProps {
  open: boolean;
  onClose: () => void;
}

interface TelehealthBookingData {
  workerName: string;
  workerEmail: string;
  preferredDate: string;
  preferredTime: string;
  notes: string;
  attachments: FileList | null;
}

export function TelehealthBookingModal({ open, onClose }: TelehealthBookingModalProps) {
  const [formData, setFormData] = useState<TelehealthBookingData>({
    workerName: "",
    workerEmail: "",
    preferredDate: "",
    preferredTime: "09:00",
    notes: "",
    attachments: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.workerName.trim()) {
      newErrors.workerName = "Worker name is required";
    }

    if (!formData.workerEmail.trim()) {
      newErrors.workerEmail = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.workerEmail)) {
      newErrors.workerEmail = "Invalid email format";
    }

    if (!formData.preferredDate) {
      newErrors.preferredDate = "Preferred date is required";
    }

    if (!formData.preferredTime) {
      newErrors.preferredTime = "Preferred time is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const submitData = new FormData();
      submitData.append("workerName", formData.workerName);
      submitData.append("workerEmail", formData.workerEmail);
      submitData.append("preferredDate", formData.preferredDate);
      submitData.append("preferredTime", formData.preferredTime);
      submitData.append("notes", formData.notes);

      // Append file attachments
      if (formData.attachments) {
        Array.from(formData.attachments).forEach((file) => {
          submitData.append("attachments", file);
        });
      }

      const response = await fetch("/api/telehealth/booking", {
        method: "POST",
        credentials: "include",
        body: submitData,
      });

      if (!response.ok) {
        throw new Error("Booking request failed");
      }

      setConfirmed(true);
    } catch (error) {
      setErrors({ submit: "Failed to submit booking. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      workerName: "",
      workerEmail: "",
      preferredDate: "",
      preferredTime: "09:00",
      notes: "",
      attachments: null,
    });
    setErrors({});
    setConfirmed(false);
    onClose();
  };

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split("T")[0];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-primary text-primary-foreground p-6 -m-6 mb-6 rounded-t-lg">
          <div className="flex items-center gap-3">
            <VideoIcon className="w-6 h-6" />
            <DialogTitle className="text-2xl">Book Telehealth Appointment</DialogTitle>
          </div>
        </DialogHeader>

        {confirmed ? (
          <div className="py-8 space-y-4">
            <div className="flex items-start bg-green-50 border border-green-200 rounded-md p-4 dark:bg-green-950 dark:border-green-800">
              <svg
                className="w-5 h-5 text-green-600 mt-0.5 mr-3 dark:text-green-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                  Request Sent!
                </h3>
                <p className="text-sm text-green-700 mt-1 dark:text-green-300">
                  All telehealth providers have been notified. You'll receive confirmation within 24 hours.
                </p>
              </div>
            </div>
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Worker Name */}
            <div className="space-y-2">
              <Label htmlFor="workerName">Worker Name</Label>
              <Input
                id="workerName"
                type="text"
                placeholder="Enter worker's full name"
                value={formData.workerName}
                onChange={(e) =>
                  setFormData({ ...formData, workerName: e.target.value })
                }
                className={errors.workerName ? "border-destructive" : ""}
              />
              {errors.workerName && (
                <p className="text-sm text-destructive">{errors.workerName}</p>
              )}
            </div>

            {/* Worker Email */}
            <div className="space-y-2">
              <Label htmlFor="workerEmail">Worker Email</Label>
              <Input
                id="workerEmail"
                type="email"
                placeholder="worker@example.com"
                value={formData.workerEmail}
                onChange={(e) =>
                  setFormData({ ...formData, workerEmail: e.target.value })
                }
                className={errors.workerEmail ? "border-destructive" : ""}
              />
              {errors.workerEmail && (
                <p className="text-sm text-destructive">{errors.workerEmail}</p>
              )}
            </div>

            {/* Preferred Date */}
            <div className="space-y-2">
              <Label htmlFor="preferredDate">Preferred Date</Label>
              <Input
                id="preferredDate"
                type="date"
                min={today}
                value={formData.preferredDate}
                onChange={(e) =>
                  setFormData({ ...formData, preferredDate: e.target.value })
                }
                className={errors.preferredDate ? "border-destructive" : ""}
              />
              {errors.preferredDate && (
                <p className="text-sm text-destructive">{errors.preferredDate}</p>
              )}
            </div>

            {/* Preferred Time */}
            <div className="space-y-2">
              <Label htmlFor="preferredTime">Preferred Time</Label>
              <Input
                id="preferredTime"
                type="time"
                value={formData.preferredTime}
                onChange={(e) =>
                  setFormData({ ...formData, preferredTime: e.target.value })
                }
                className={errors.preferredTime ? "border-destructive" : ""}
              />
              {errors.preferredTime && (
                <p className="text-sm text-destructive">{errors.preferredTime}</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">
                Notes <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <textarea
                id="notes"
                rows={4}
                placeholder="Any additional information for the provider (symptoms, concerns, etc.)"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="w-full px-4 py-2 border border-input rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none transition resize-vertical bg-background text-foreground"
              />
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label htmlFor="attachments">
                Attachments <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <div className="border-2 border-dashed border-input rounded-md p-4 hover:border-primary/50 transition">
                <Input
                  id="attachments"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) =>
                    setFormData({ ...formData, attachments: e.target.files })
                  }
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Upload medical certificates, diagnosis, or other relevant documents (PDF, JPG, PNG, DOC)
                </p>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 dark:bg-blue-950 dark:border-blue-800">
              <p className="font-medium text-blue-900 mb-2 dark:text-blue-100">How it works:</p>
              <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>All registered telehealth providers will be notified</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>First provider to respond gets the booking</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>You'll receive confirmation within 24 hours</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Provider may need to contact you first if you haven't worked with them before</span>
                </li>
              </ul>
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <p className="text-sm text-destructive">{errors.submit}</p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1"
                disabled={submitting}
              >
                {submitting ? "Sending..." : "Send Request to Providers"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
