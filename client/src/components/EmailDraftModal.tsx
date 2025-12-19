/**
 * EmailDraftModal - Two-step modal for AI email drafting
 *
 * Step 1: Configure email type, recipient, tone, context
 * Step 2: Review, edit, and copy/save the generated draft
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { fetchWithCsrf } from "../lib/queryClient";
import type {
  EmailDraftType,
  EmailRecipientType,
  EmailTone,
  EmailTypeInfo,
  EmailDraft,
} from "@shared/schema";

interface EmailDraftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  workerName: string;
}

type Step = "configure" | "review";

export function EmailDraftModal({
  open,
  onOpenChange,
  caseId,
  workerName,
}: EmailDraftModalProps) {
  const [step, setStep] = useState<Step>("configure");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [emailTypes, setEmailTypes] = useState<EmailTypeInfo[]>([]);
  const [emailType, setEmailType] = useState<EmailDraftType>("certificate_chase");
  const [recipient, setRecipient] = useState<EmailRecipientType>("worker");
  const [recipientName, setRecipientName] = useState("");
  const [tone, setTone] = useState<EmailTone>("formal");
  const [additionalContext, setAdditionalContext] = useState("");

  // Generated draft state
  const [generatedDraft, setGeneratedDraft] = useState<EmailDraft | null>(null);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");

  // Fetch email types on mount
  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const response = await fetch("/api/email-drafts/types");
        if (response.ok) {
          const data = await response.json();
          setEmailTypes(data.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch email types:", err);
      }
    };
    fetchTypes();
  }, []);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setStep("configure");
      setError(null);
      setCopied(false);
      setSaved(false);
      setGeneratedDraft(null);
      setEditedSubject("");
      setEditedBody("");
      setAdditionalContext("");
    }
  }, [open]);

  // Update recipient based on email type default
  useEffect(() => {
    const typeInfo = emailTypes.find((t) => t.value === emailType);
    if (typeInfo) {
      setRecipient(typeInfo.defaultRecipient);
    }
  }, [emailType, emailTypes]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/cases/${caseId}/email-drafts/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emailType,
            recipient,
            recipientName: recipientName || undefined,
            tone,
            additionalContext: additionalContext || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || data.error || "Failed to generate email");
      }

      setGeneratedDraft(data.data);
      setEditedSubject(data.data.subject);
      setEditedBody(data.data.body);
      setStep("review");
    } catch (err) {
      console.error("Email generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate email");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = () => {
    setStep("configure");
    setCopied(false);
    setSaved(false);
  };

  const handleCopyToClipboard = async () => {
    const fullEmail = `Subject: ${editedSubject}\n\n${editedBody}`;
    try {
      await navigator.clipboard.writeText(fullEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = fullEmail;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveDraft = async () => {
    if (!generatedDraft) return;

    setLoading(true);
    try {
      const response = await fetchWithCsrf(
        `/api/cases/${caseId}/email-drafts/${generatedDraft.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: editedSubject,
            body: editedBody,
          }),
        }
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to save draft");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Save error:", err);
      setError(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setLoading(false);
    }
  };

  const selectedTypeInfo = emailTypes.find((t) => t.value === emailType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">mail</span>
            Draft Email for {workerName}
          </DialogTitle>
          <DialogDescription>
            {step === "configure"
              ? "Configure the email type and recipient, then generate an AI draft."
              : "Review and edit the generated email before copying or saving."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            {error}
          </div>
        )}

        {step === "configure" ? (
          <div className="space-y-4 py-4">
            {/* Email Type */}
            <div className="space-y-2">
              <Label htmlFor="email-type">Email Type</Label>
              <Select
                value={emailType}
                onValueChange={(v) => setEmailType(v as EmailDraftType)}
              >
                <SelectTrigger id="email-type">
                  <SelectValue placeholder="Select email type" />
                </SelectTrigger>
                <SelectContent>
                  {emailTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTypeInfo && (
                <p className="text-xs text-muted-foreground">
                  {selectedTypeInfo.description}
                </p>
              )}
            </div>

            {/* Recipient */}
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient</Label>
              <Select
                value={recipient}
                onValueChange={(v) => setRecipient(v as EmailRecipientType)}
              >
                <SelectTrigger id="recipient">
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="worker">Worker</SelectItem>
                  <SelectItem value="employer">Employer</SelectItem>
                  <SelectItem value="insurer">Insurer</SelectItem>
                  <SelectItem value="host">Host Employer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recipient Name (optional) */}
            <div className="space-y-2">
              <Label htmlFor="recipient-name">Recipient Name (optional)</Label>
              <Input
                id="recipient-name"
                placeholder="e.g., John Smith"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
            </div>

            {/* Tone */}
            <div className="space-y-2">
              <Label htmlFor="tone">Tone</Label>
              <Select value={tone} onValueChange={(v) => setTone(v as EmailTone)}>
                <SelectTrigger id="tone">
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">
                    Formal - Professional, business-like
                  </SelectItem>
                  <SelectItem value="supportive">
                    Supportive - Warm, empathetic
                  </SelectItem>
                  <SelectItem value="firm">Firm - Direct, clear</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Additional Context */}
            <div className="space-y-2">
              <Label htmlFor="context">Additional Context (optional)</Label>
              <Textarea
                id="context"
                placeholder="Any specific points to address or context to include..."
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {/* Generate Button */}
            <div className="flex justify-end pt-4">
              <Button onClick={handleGenerate} disabled={loading}>
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm mr-2">
                      autorenew
                    </span>
                    Generating...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm mr-2">
                      auto_awesome
                    </span>
                    Generate Draft
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={editedSubject}
                onChange={(e) => setEditedSubject(e.target.value)}
              />
            </div>

            {/* Body */}
            <div className="space-y-2">
              <Label htmlFor="body">Email Body</Label>
              <Textarea
                id="body"
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleRegenerate}>
                <span className="material-symbols-outlined text-sm mr-2">
                  refresh
                </span>
                Regenerate
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCopyToClipboard}
                  disabled={loading}
                >
                  <span className="material-symbols-outlined text-sm mr-2">
                    {copied ? "check" : "content_copy"}
                  </span>
                  {copied ? "Copied!" : "Copy to Clipboard"}
                </Button>
                <Button onClick={handleSaveDraft} disabled={loading}>
                  <span className="material-symbols-outlined text-sm mr-2">
                    {saved ? "check" : "save"}
                  </span>
                  {saved ? "Saved!" : "Save Draft"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
