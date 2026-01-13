/**
 * EmailComposer - Email composition with CC and Send to All functionality
 *
 * Features:
 * - Select primary recipient from contacts
 * - Add CC recipients
 * - "Send to All" button for bulk communication
 * - Copy full email content (including headers)
 * - Open in default email client
 */

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import {
  Mail,
  Users,
  Copy,
  Check,
  ExternalLink,
  X,
  Plus,
  Loader2,
} from "lucide-react";
import type { CaseContact, CaseContactRole } from "@shared/schema";
import { cn } from "@/lib/utils";

interface EmailComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: CaseContact[];
  caseId: string;
  workerName: string;
  preselectedRecipient?: CaseContact | null;
  defaultSubject?: string;
  defaultBody?: string;
}

const roleLabels: Record<CaseContactRole, string> = {
  worker: "Worker",
  employer_primary: "Employer (Primary)",
  employer_secondary: "Employer (Secondary)",
  host_employer: "Host Employer",
  case_manager: "Case Manager",
  treating_gp: "Treating GP",
  physiotherapist: "Physiotherapist",
  specialist: "Specialist",
  orp: "ORP",
  insurer: "Insurer",
  gpnet: "GPNet Contact",
  other: "Other",
};

export function EmailComposer({
  open,
  onOpenChange,
  contacts,
  caseId,
  workerName,
  preselectedRecipient,
  defaultSubject = "",
  defaultBody = "",
}: EmailComposerProps) {
  const [toRecipient, setToRecipient] = useState<CaseContact | null>(preselectedRecipient || null);
  const [ccRecipients, setCcRecipients] = useState<CaseContact[]>([]);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [copied, setCopied] = useState(false);
  const [sendToAll, setSendToAll] = useState(false);

  // Filter contacts with email addresses
  const emailableContacts = useMemo(
    () => contacts.filter((c) => c.email && c.isActive),
    [contacts]
  );

  // Reset form when modal opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setToRecipient(preselectedRecipient || null);
      setCcRecipients([]);
      setSubject(defaultSubject);
      setBody(defaultBody);
      setSendToAll(false);
    }
    onOpenChange(newOpen);
  };

  // Handle "Send to All" toggle
  const handleSendToAllChange = (checked: boolean) => {
    setSendToAll(checked);
    if (checked) {
      // Set first contact as TO, rest as CC
      if (emailableContacts.length > 0) {
        setToRecipient(emailableContacts[0]);
        setCcRecipients(emailableContacts.slice(1));
      }
    } else {
      setToRecipient(preselectedRecipient || null);
      setCcRecipients([]);
    }
  };

  // Add a contact to CC
  const addToCc = (contact: CaseContact) => {
    if (!ccRecipients.find((c) => c.id === contact.id) && contact.id !== toRecipient?.id) {
      setCcRecipients([...ccRecipients, contact]);
    }
  };

  // Remove a contact from CC
  const removeFromCc = (contactId: string) => {
    setCcRecipients(ccRecipients.filter((c) => c.id !== contactId));
  };

  // Set a contact as TO recipient
  const setAsToRecipient = (contact: CaseContact) => {
    // If current TO is in CC list, keep them there
    if (toRecipient && toRecipient.id !== contact.id) {
      // Optionally add old TO to CC
      // setCcRecipients([...ccRecipients.filter(c => c.id !== contact.id), toRecipient]);
    }
    // Remove new TO from CC if present
    setCcRecipients(ccRecipients.filter((c) => c.id !== contact.id));
    setToRecipient(contact);
    setSendToAll(false);
  };

  // Build mailto link
  const buildMailtoLink = (): string => {
    if (!toRecipient?.email) return "";

    const params = new URLSearchParams();

    // Add CC recipients
    if (ccRecipients.length > 0) {
      params.set("cc", ccRecipients.map((c) => c.email).filter(Boolean).join(","));
    }

    // Add subject
    if (subject) {
      params.set("subject", subject);
    }

    // Add body
    if (body) {
      params.set("body", body);
    }

    const queryString = params.toString();
    return `mailto:${toRecipient.email}${queryString ? `?${queryString}` : ""}`;
  };

  // Copy full email content to clipboard
  const handleCopyToClipboard = async () => {
    const emailContent = [
      `To: ${toRecipient?.email || ""}`,
      ccRecipients.length > 0 ? `CC: ${ccRecipients.map((c) => c.email).join(", ")}` : null,
      `Subject: ${subject}`,
      "",
      body,
    ]
      .filter((line) => line !== null)
      .join("\n");

    try {
      await navigator.clipboard.writeText(emailContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Open in default email client
  const handleOpenInEmailClient = () => {
    const mailtoLink = buildMailtoLink();
    if (mailtoLink) {
      window.location.href = mailtoLink;
    }
  };

  // Available contacts (not already selected)
  const availableForCc = emailableContacts.filter(
    (c) => c.id !== toRecipient?.id && !ccRecipients.find((cc) => cc.id === c.id)
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Compose Email - {workerName}
          </DialogTitle>
          <DialogDescription>
            Send email to case contacts with optional CC recipients.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-4">
            {/* Send to All Toggle */}
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Checkbox
                id="send-to-all"
                checked={sendToAll}
                onCheckedChange={handleSendToAllChange}
                disabled={emailableContacts.length === 0}
              />
              <Label
                htmlFor="send-to-all"
                className="flex items-center gap-2 cursor-pointer"
              >
                <Users className="h-4 w-4" />
                Send to all contacts ({emailableContacts.length})
              </Label>
            </div>

            {/* TO Recipient */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                To <span className="text-destructive">*</span>
              </Label>
              {toRecipient ? (
                <div className="flex items-center gap-2 p-2 border rounded-md bg-card">
                  <Badge variant="secondary" className="text-xs">
                    {roleLabels[toRecipient.role as CaseContactRole]}
                  </Badge>
                  <span className="text-sm font-medium">{toRecipient.name}</span>
                  <span className="text-sm text-muted-foreground">&lt;{toRecipient.email}&gt;</span>
                  {!sendToAll && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-6 w-6 p-0"
                      onClick={() => setToRecipient(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Select a recipient:</p>
                  <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto">
                    {emailableContacts.map((contact) => (
                      <button
                        key={contact.id}
                        className="flex items-center gap-2 p-2 text-left hover:bg-accent rounded-md transition-colors"
                        onClick={() => setAsToRecipient(contact)}
                      >
                        <Badge variant="outline" className="text-[10px]">
                          {roleLabels[contact.role as CaseContactRole]}
                        </Badge>
                        <span className="text-sm">{contact.name}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {contact.email}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* CC Recipients */}
            <div className="space-y-2">
              <Label>CC</Label>
              <div className="flex flex-wrap gap-2 min-h-[36px] p-2 border rounded-md bg-card">
                {ccRecipients.map((contact) => (
                  <Badge
                    key={contact.id}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {contact.name}
                    {!sendToAll && (
                      <button
                        className="ml-1 hover:text-destructive"
                        onClick={() => removeFromCc(contact.id)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
                {!sendToAll && availableForCc.length > 0 && (
                  <div className="relative group">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add CC
                    </Button>
                    <div className="absolute top-full left-0 mt-1 bg-card border rounded-md shadow-lg z-10 hidden group-hover:block min-w-[200px]">
                      {availableForCc.map((contact) => (
                        <button
                          key={contact.id}
                          className="w-full flex items-center gap-2 p-2 text-left text-sm hover:bg-accent"
                          onClick={() => addToCc(contact)}
                        >
                          <span className="truncate">{contact.name}</span>
                          <span className="text-xs text-muted-foreground truncate">
                            ({roleLabels[contact.role as CaseContactRole]})
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {ccRecipients.length === 0 && !sendToAll && (
                  <span className="text-sm text-muted-foreground">
                    No CC recipients selected
                  </span>
                )}
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder={`Re: ${workerName} - Case Update`}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            {/* Body */}
            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                placeholder="Enter your message here..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="min-h-[200px]"
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
          <div className="flex items-center gap-2 mr-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyToClipboard}
              disabled={!toRecipient}
            >
              {copied ? (
                <Check className="h-4 w-4 mr-2 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleOpenInEmailClient}
            disabled={!toRecipient?.email}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open in Email Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Quick compose button that opens email client directly
interface QuickEmailButtonProps {
  to: string;
  cc?: string[];
  subject?: string;
  body?: string;
  children?: React.ReactNode;
  className?: string;
}

export function QuickEmailButton({
  to,
  cc = [],
  subject = "",
  body = "",
  children,
  className,
}: QuickEmailButtonProps) {
  const handleClick = () => {
    const params = new URLSearchParams();
    if (cc.length > 0) params.set("cc", cc.join(","));
    if (subject) params.set("subject", subject);
    if (body) params.set("body", body);

    const queryString = params.toString();
    window.location.href = `mailto:${to}${queryString ? `?${queryString}` : ""}`;
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleClick} className={className}>
      {children || (
        <>
          <Mail className="h-4 w-4 mr-2" />
          Email
        </>
      )}
    </Button>
  );
}

// Send to All button component
interface SendToAllButtonProps {
  contacts: CaseContact[];
  subject?: string;
  body?: string;
  workerName: string;
  variant?: "default" | "outline" | "ghost";
}

export function SendToAllButton({
  contacts,
  subject = "",
  body = "",
  workerName,
  variant = "outline",
}: SendToAllButtonProps) {
  const emailableContacts = contacts.filter((c) => c.email && c.isActive);

  const handleClick = () => {
    if (emailableContacts.length === 0) return;

    const toEmail = emailableContacts[0].email;
    const ccEmails = emailableContacts.slice(1).map((c) => c.email).filter(Boolean);

    const params = new URLSearchParams();
    if (ccEmails.length > 0) params.set("cc", ccEmails.join(","));
    if (subject) params.set("subject", subject);
    if (body) params.set("body", body);

    const queryString = params.toString();
    window.location.href = `mailto:${toEmail}${queryString ? `?${queryString}` : ""}`;
  };

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleClick}
      disabled={emailableContacts.length === 0}
      className="gap-2"
    >
      <Users className="h-4 w-4" />
      Email All ({emailableContacts.length})
    </Button>
  );
}
