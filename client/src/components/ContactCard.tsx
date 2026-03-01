/**
 * ContactCard - Displays contact information with clickable phone and email links
 *
 * Features:
 * - Click-to-call (tel: links)
 * - Click-to-email (mailto: links)
 * - Role-based styling
 * - Copy to clipboard functionality
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Phone, Mail, Copy, Check, User, Building, MessageSquare } from "lucide-react";
import type { CaseContact, CaseContactRole } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ContactCardProps {
  contact: CaseContact;
  onEmailClick?: (contact: CaseContact) => void;
  compact?: boolean;
  showActions?: boolean;
}

// Role-based color styling
const roleColors: Record<CaseContactRole, string> = {
  worker: "bg-blue-100 text-blue-800 border-blue-200",
  employer_primary: "bg-emerald-100 text-emerald-800 border-emerald-200",
  employer_secondary: "bg-emerald-50 text-emerald-700 border-emerald-150",
  host_employer: "bg-teal-100 text-teal-800 border-teal-200",
  case_manager: "bg-purple-100 text-purple-800 border-purple-200",
  treating_gp: "bg-rose-100 text-rose-800 border-rose-200",
  physiotherapist: "bg-orange-100 text-orange-800 border-orange-200",
  specialist: "bg-red-100 text-red-800 border-red-200",
  orp: "bg-amber-100 text-amber-800 border-amber-200",
  insurer: "bg-indigo-100 text-indigo-800 border-indigo-200",
  gpnet: "bg-cyan-100 text-cyan-800 border-cyan-200",
  other: "bg-slate-100 text-slate-800 border-slate-200",
};

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

export function ContactCard({
  contact,
  onEmailClick,
  compact = false,
  showActions = true,
}: ContactCardProps) {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyPhone = async () => {
    if (contact.phone) {
      await navigator.clipboard.writeText(contact.phone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const handleCopyEmail = async () => {
    if (contact.email) {
      await navigator.clipboard.writeText(contact.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const formatPhoneForTel = (phone: string): string => {
    // Remove all non-numeric characters except + at the start
    return phone.replace(/[^\d+]/g, "");
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{contact.name}</span>
              <Badge variant="outline" className={cn("text-[10px]", roleColors[contact.role as CaseContactRole])}>
                {roleLabels[contact.role as CaseContactRole]}
              </Badge>
              {contact.isPrimary && (
                <Badge variant="secondary" className="text-[10px]">Primary</Badge>
              )}
            </div>
            {contact.company && (
              <span className="text-xs text-muted-foreground">{contact.company}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {contact.phone && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={`tel:${formatPhoneForTel(contact.phone)}`}
                    className="p-2 rounded-md hover:bg-primary/10 text-primary transition-colors"
                    aria-label={`Call ${contact.name}`}
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Call {contact.phone}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {contact.email && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={`mailto:${contact.email}`}
                    className="p-2 rounded-md hover:bg-primary/10 text-primary transition-colors"
                    aria-label={`Email ${contact.name}`}
                    onClick={(e) => {
                      if (onEmailClick) {
                        e.preventDefault();
                        onEmailClick(contact);
                      }
                    }}
                  >
                    <Mail className="h-4 w-4" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Email {contact.email}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            {contact.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-xs", roleColors[contact.role as CaseContactRole])}>
              {roleLabels[contact.role as CaseContactRole]}
            </Badge>
            {contact.isPrimary && (
              <Badge variant="secondary" className="text-xs">Primary</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {contact.company && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building className="h-4 w-4" />
            <span>{contact.company}</span>
          </div>
        )}

        {/* Phone */}
        {contact.phone && (
          <div className="flex items-center justify-between">
            <a
              href={`tel:${formatPhoneForTel(contact.phone)}`}
              className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
              aria-label={`Call ${contact.name} at ${contact.phone}`}
            >
              <Phone className="h-4 w-4" />
              {contact.phone}
            </a>
            {showActions && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={handleCopyPhone}
                    >
                      {copiedPhone ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{copiedPhone ? "Copied!" : "Copy phone number"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}

        {/* Email */}
        {contact.email && (
          <div className="flex items-center justify-between">
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
              aria-label={`Email ${contact.name} at ${contact.email}`}
              onClick={(e) => {
                if (onEmailClick) {
                  e.preventDefault();
                  onEmailClick(contact);
                }
              }}
            >
              <Mail className="h-4 w-4" />
              <span className="truncate max-w-[200px]">{contact.email}</span>
            </a>
            {showActions && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={handleCopyEmail}
                    >
                      {copiedEmail ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{copiedEmail ? "Copied!" : "Copy email address"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}

        {/* Notes */}
        {contact.notes && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground mt-2 pt-2 border-t">
            <MessageSquare className="h-4 w-4 mt-0.5" />
            <span>{contact.notes}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Quick contact display for inline use
interface QuickContactProps {
  name: string;
  phone?: string | null;
  email?: string | null;
  role?: string;
  onEmailClick?: () => void;
}

export function QuickContact({ name, phone, email, role, onEmailClick }: QuickContactProps) {
  return (
    <div className="inline-flex items-center gap-2 text-sm">
      <span className="font-medium">{name}</span>
      {role && (
        <span className="text-xs text-muted-foreground">({role})</span>
      )}
      {phone && (
        <a
          href={`tel:${phone.replace(/[^\d+]/g, "")}`}
          className="text-primary hover:underline inline-flex items-center gap-1"
        >
          <Phone className="h-3 w-3" />
          {phone}
        </a>
      )}
      {email && (
        <a
          href={`mailto:${email}`}
          className="text-primary hover:underline inline-flex items-center gap-1"
          onClick={(e) => {
            if (onEmailClick) {
              e.preventDefault();
              onEmailClick();
            }
          }}
        >
          <Mail className="h-3 w-3" />
          {email}
        </a>
      )}
    </div>
  );
}
