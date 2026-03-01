import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Phone, Video } from "lucide-react";
import { cn } from "@/lib/utils";

type ServiceType = "pre_employment" | "injury" | "mental_health" | "exit" | "wellbeing";
type AppointmentType = "video" | "face_to_face";

const SERVICE_OPTIONS: { value: ServiceType; label: string; emoji: string }[] = [
  { value: "pre_employment", label: "Pre-Employment", emoji: "📋" },
  { value: "injury", label: "Injury", emoji: "🩹" },
  { value: "mental_health", label: "Mental Health", emoji: "🧠" },
  { value: "exit", label: "Exit", emoji: "🚪" },
  { value: "wellbeing", label: "Wellbeing", emoji: "💚" },
];

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  caseContext?: { caseId?: string };
}

export function BookingModal({ open, onClose, caseContext }: BookingModalProps) {
  const hasCase = Boolean(caseContext?.caseId);

  const [serviceType, setServiceType] = useState<ServiceType | null>(null);
  const [appointmentType, setAppointmentType] = useState<AppointmentType>("video");
  const [workerName, setWorkerName] = useState("");
  const [workerEmail, setWorkerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [requestReferral, setRequestReferral] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!appointmentType) return;
    if (!hasCase && (!workerName.trim() || !workerEmail.trim())) {
      setError("Worker name and email are required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        appointmentType,
        serviceType,
        employerNotes: notes,
        requestReferral,
        ...(caseContext?.caseId ? { caseId: caseContext.caseId } : {}),
        ...(!hasCase ? { workerName, workerEmail } : { workerName: "Case worker" }),
      };

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Booking request failed");
      setConfirmed(true);
    } catch {
      setError("Failed to submit booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setConfirmed(false);
    setServiceType(null);
    setAppointmentType("video");
    setWorkerName("");
    setWorkerEmail("");
    setNotes("");
    setRequestReferral(false);
    setError(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Book Telehealth Appointment</DialogTitle>
          <p className="text-xs text-muted-foreground">
            🩺 All doctors AHPRA registered · 24hr response
          </p>
        </DialogHeader>

        {confirmed ? (
          <div className="py-8 text-center space-y-3">
            <div className="text-4xl">✅</div>
            <p className="font-semibold">Booking Request Received</p>
            <p className="text-sm text-muted-foreground">
              We'll contact you within 24 hours to confirm time and pricing.
            </p>
            <Button onClick={handleClose} className="mt-4">Close</Button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Service type */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Service Type</Label>
              <div className="flex flex-wrap gap-2">
                {SERVICE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setServiceType(opt.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs border transition-colors",
                      serviceType === opt.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {opt.emoji} {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual worker details if no case context */}
            {!hasCase && (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Worker Name *</Label>
                  <input
                    type="text"
                    value={workerName}
                    onChange={(e) => setWorkerName(e.target.value)}
                    placeholder="Full name"
                    className="mt-1 w-full text-sm border border-input rounded-md px-3 py-2 bg-transparent outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Worker Email *</Label>
                  <input
                    type="email"
                    value={workerEmail}
                    onChange={(e) => setWorkerEmail(e.target.value)}
                    placeholder="worker@example.com"
                    className="mt-1 w-full text-sm border border-input rounded-md px-3 py-2 bg-transparent outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            {/* Case context badge */}
            {hasCase && (
              <div className="bg-muted rounded-md px-3 py-2 text-xs text-muted-foreground">
                📎 Details auto-filled from current case
              </div>
            )}

            {/* Appointment type */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Appointment Type</Label>
              <div className="flex gap-3">
                <button
                  onClick={() => setAppointmentType("video")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors flex-1 justify-center",
                    appointmentType === "video"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <Video className="w-4 h-4" /> Video Call
                </button>
                <button
                  onClick={() => setAppointmentType("face_to_face")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors flex-1 justify-center",
                    appointmentType === "face_to_face"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  🏥 Face-to-Face
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-sm font-medium">Notes for the Doctor</Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="E.g., performance concerns, barriers to return, specific questions…"
                rows={3}
                className="mt-1 w-full text-sm border border-input rounded-md px-3 py-2 bg-transparent outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            {/* Referral */}
            <div className="bg-muted/50 rounded-md p-3 space-y-2">
              <p className="text-xs font-medium">💡 Need a Referral?</p>
              <p className="text-xs text-muted-foreground">
                Our doctors can issue referrals for blood tests, scans, or specialist appointments.
                Referrals billed separately (flat fee).
              </p>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="referral"
                  checked={requestReferral}
                  onCheckedChange={(v) => setRequestReferral(Boolean(v))}
                />
                <Label htmlFor="referral" className="text-xs cursor-pointer">
                  Request referral capability for this appointment
                </Label>
              </div>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex justify-end gap-3 pt-1">
              <Button variant="ghost" onClick={handleClose} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                <Phone className="w-4 h-4 mr-2" />
                {submitting ? "Submitting…" : "Request Booking"}
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              ✓ We'll contact you within 24 hours to confirm time & pricing
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
