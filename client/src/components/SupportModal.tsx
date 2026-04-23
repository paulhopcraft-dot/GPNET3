/**
 * SupportModal
 *
 * Standalone contact-support modal.
 * - Pre-fills name/email from authenticated user.
 * - POSTs to /api/support/contact.
 * - On server error, reveals a mailto fallback link.
 */

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, AlertCircle, Loader2, Mail } from "lucide-react";

interface SupportModalProps {
  open: boolean;
  onClose: () => void;
}

type Status = "idle" | "submitting" | "success" | "error";

const SUPPORT_EMAIL = "support@preventli.com.au";

export function SupportModal({ open, onClose }: SupportModalProps) {
  const { user } = useAuth();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const fromName = (user as any)?.name || user?.email || "";
  const fromEmail = user?.email || "";

  function resetForm() {
    setSubject("");
    setMessage("");
    setStatus("idle");
    setErrorMsg("");
  }

  function handleClose() {
    onClose();
    // Delay reset so animation completes
    setTimeout(resetForm, 300);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/support/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
      });

      if (res.ok) {
        setStatus("success");
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || "Something went wrong. Please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Could not reach the server. Please use the email link below.");
      setStatus("error");
    }
  }

  const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject || "Support request")}&body=${encodeURIComponent(message)}`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Contact Support</DialogTitle>
          <DialogDescription>
            Send a message to the Preventli support team. We typically respond within one business day.
          </DialogDescription>
        </DialogHeader>

        {/* ── Success state ── */}
        {status === "success" ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-primary" />
            <p className="font-semibold text-foreground">Message sent!</p>
            <p className="text-sm text-muted-foreground">
              We've received your request and will reply to <strong>{fromEmail}</strong> shortly.
            </p>
            <Button onClick={handleClose} className="mt-2">Close</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* From (read-only) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="support-name" className="text-xs text-muted-foreground">Name</Label>
                <Input
                  id="support-name"
                  value={fromName}
                  readOnly
                  disabled
                  className="bg-muted/50 text-muted-foreground cursor-default text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="support-email" className="text-xs text-muted-foreground">Email</Label>
                <Input
                  id="support-email"
                  value={fromEmail}
                  readOnly
                  disabled
                  className="bg-muted/50 text-muted-foreground cursor-default text-sm"
                />
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <Label htmlFor="support-subject">Subject</Label>
              <Input
                id="support-subject"
                placeholder="e.g. Can't upload a certificate"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
                required
                disabled={status === "submitting"}
              />
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <Label htmlFor="support-message">Message</Label>
              <Textarea
                id="support-message"
                placeholder="Describe your issue or question in as much detail as you can…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                maxLength={5000}
                required
                disabled={status === "submitting"}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">{message.length}/5000</p>
            </div>

            {/* Error banner */}
            {status === "error" && (
              <div className="flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p>{errorMsg}</p>
                  <a
                    href={mailtoUrl}
                    className="inline-flex items-center gap-1 mt-1.5 underline underline-offset-2 text-destructive/80 hover:text-destructive"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Email us directly instead
                  </a>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={handleClose} disabled={status === "submitting"}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={status === "submitting" || !subject.trim() || message.trim().length < 10}
              >
                {status === "submitting" ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send Message"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
