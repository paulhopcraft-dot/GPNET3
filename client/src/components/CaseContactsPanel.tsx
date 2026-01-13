/**
 * CaseContactsPanel - Comprehensive contact management panel for case detail views
 *
 * Features:
 * - Display all case contacts with clickable phone/email
 * - Add new contacts
 * - Edit/delete contacts
 * - Email composer with CC and Send to All
 * - Contact card grid and compact list views
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import {
  Phone,
  Mail,
  Users,
  Plus,
  Edit,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  UserCircle,
  Building,
} from "lucide-react";
import { ContactCard } from "./ContactCard";
import { EmailComposer, SendToAllButton } from "./EmailComposer";
import { fetchWithCsrf } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CaseContact, CaseContactRole } from "@shared/schema";
import { cn } from "@/lib/utils";

interface CaseContactsPanelProps {
  caseId: string;
  workerName: string;
  company?: string;
  compact?: boolean;
  readOnly?: boolean;
}

const contactRoles: { value: CaseContactRole; label: string }[] = [
  { value: "worker", label: "Worker" },
  { value: "employer_primary", label: "Employer (Primary)" },
  { value: "employer_secondary", label: "Employer (Secondary)" },
  { value: "host_employer", label: "Host Employer" },
  { value: "case_manager", label: "Case Manager" },
  { value: "treating_gp", label: "Treating GP" },
  { value: "physiotherapist", label: "Physiotherapist" },
  { value: "specialist", label: "Specialist" },
  { value: "orp", label: "ORP" },
  { value: "insurer", label: "Insurer" },
  { value: "gpnet", label: "GPNet Contact" },
  { value: "other", label: "Other" },
];

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

interface ContactFormData {
  role: CaseContactRole;
  name: string;
  phone: string;
  email: string;
  company: string;
  notes: string;
  isPrimary: boolean;
}

const initialFormData: ContactFormData = {
  role: "other",
  name: "",
  phone: "",
  email: "",
  company: "",
  notes: "",
  isPrimary: false,
};

export function CaseContactsPanel({
  caseId,
  workerName,
  company = "",
  compact = false,
  readOnly = false,
}: CaseContactsPanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [selectedContact, setSelectedContact] = useState<CaseContact | null>(null);
  const [formData, setFormData] = useState<ContactFormData>(initialFormData);

  // Fetch contacts
  const { data: contactsData, isLoading } = useQuery<{ success: boolean; data: CaseContact[] }>({
    queryKey: [`/api/cases/${caseId}/contacts`],
    queryFn: async () => {
      const response = await fetchWithCsrf(`/api/cases/${caseId}/contacts`);
      if (!response.ok) throw new Error("Failed to fetch contacts");
      return response.json();
    },
    enabled: !!caseId,
  });

  const contacts = contactsData?.data || [];

  // Create contact mutation
  const createContactMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      const response = await fetchWithCsrf(`/api/cases/${caseId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to create contact");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/contacts`] });
      setShowAddDialog(false);
      setFormData(initialFormData);
      toast({
        title: "Contact Added",
        description: "The contact has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update contact mutation
  const updateContactMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ContactFormData> }) => {
      const response = await fetchWithCsrf(`/api/cases/${caseId}/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to update contact");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/contacts`] });
      setShowEditDialog(false);
      setSelectedContact(null);
      setFormData(initialFormData);
      toast({
        title: "Contact Updated",
        description: "The contact has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete contact mutation
  const deleteContactMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetchWithCsrf(`/api/cases/${caseId}/contacts/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to delete contact");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/contacts`] });
      toast({
        title: "Contact Removed",
        description: "The contact has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddContact = () => {
    setFormData(initialFormData);
    setShowAddDialog(true);
  };

  const handleEditContact = (contact: CaseContact) => {
    setSelectedContact(contact);
    setFormData({
      role: contact.role as CaseContactRole,
      name: contact.name,
      phone: contact.phone || "",
      email: contact.email || "",
      company: contact.company || "",
      notes: contact.notes || "",
      isPrimary: contact.isPrimary,
    });
    setShowEditDialog(true);
  };

  const handleDeleteContact = (contact: CaseContact) => {
    if (window.confirm(`Are you sure you want to remove ${contact.name} from the contacts?`)) {
      deleteContactMutation.mutate(contact.id);
    }
  };

  const handleEmailContact = (contact: CaseContact) => {
    setSelectedContact(contact);
    setShowEmailComposer(true);
  };

  const handleFormSubmit = () => {
    if (showEditDialog && selectedContact) {
      updateContactMutation.mutate({
        id: selectedContact.id,
        data: formData,
      });
    } else {
      createContactMutation.mutate(formData);
    }
  };

  const formatPhoneForTel = (phone: string): string => {
    return phone.replace(/[^\d+]/g, "");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
            Loading contacts...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Key Contacts
              {contacts.length > 0 && (
                <Badge variant="secondary" className="text-xs ml-2">
                  {contacts.length}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {contacts.length > 0 && (
                <SendToAllButton
                  contacts={contacts}
                  workerName={workerName}
                  subject={`Re: ${workerName} - Case Update`}
                />
              )}
              {!readOnly && (
                <Button size="sm" onClick={handleAddContact}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Contact
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No contacts added yet.</p>
              {!readOnly && (
                <Button variant="outline" size="sm" onClick={handleAddContact} className="mt-4">
                  <Plus className="h-4 w-4 mr-1" />
                  Add First Contact
                </Button>
              )}
            </div>
          ) : compact ? (
            <div className="space-y-2">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{contact.name}</span>
                        <Badge variant="outline" className="text-[10px]">
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
                      <a
                        href={`tel:${formatPhoneForTel(contact.phone)}`}
                        className="p-2 rounded-md hover:bg-primary/10 text-primary transition-colors"
                        title={`Call ${contact.phone}`}
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    )}
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="p-2 rounded-md hover:bg-primary/10 text-primary transition-colors"
                        title={`Email ${contact.email}`}
                        onClick={(e) => {
                          e.preventDefault();
                          handleEmailContact(contact);
                        }}
                      >
                        <Mail className="h-4 w-4" />
                      </a>
                    )}
                    {!readOnly && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEditContact(contact)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteContact(contact)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contacts.map((contact) => (
                <Card key={contact.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserCircle className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{contact.name}</p>
                          <Badge variant="outline" className="text-[10px]">
                            {roleLabels[contact.role as CaseContactRole]}
                          </Badge>
                        </div>
                      </div>
                      {contact.isPrimary && (
                        <Badge variant="secondary" className="text-[10px]">Primary</Badge>
                      )}
                    </div>

                    {contact.company && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Building className="h-3 w-3" />
                        {contact.company}
                      </div>
                    )}

                    {/* Clickable Phone */}
                    {contact.phone && (
                      <a
                        href={`tel:${formatPhoneForTel(contact.phone)}`}
                        className="flex items-center gap-2 text-sm text-primary hover:underline mb-2"
                      >
                        <Phone className="h-4 w-4" />
                        {contact.phone}
                      </a>
                    )}

                    {/* Clickable Email */}
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex items-center gap-2 text-sm text-primary hover:underline mb-2"
                        onClick={(e) => {
                          e.preventDefault();
                          handleEmailContact(contact);
                        }}
                      >
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{contact.email}</span>
                      </a>
                    )}

                    {contact.notes && (
                      <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                        {contact.notes}
                      </p>
                    )}

                    {!readOnly && (
                      <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={() => handleEditContact(contact)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteContact(contact)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Contact Dialog */}
      <Dialog open={showAddDialog || showEditDialog} onOpenChange={(open) => {
        if (!open) {
          setShowAddDialog(false);
          setShowEditDialog(false);
          setSelectedContact(null);
          setFormData(initialFormData);
        }
      }}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {showEditDialog ? "Edit Contact" : "Add New Contact"}
            </DialogTitle>
            <DialogDescription>
              {showEditDialog
                ? "Update the contact information."
                : "Add a new contact for this case."}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 max-h-[55vh] pr-4">
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as CaseContactRole })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {contactRoles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g., 0412 345 678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g., name@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company/Organization</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="e.g., ABC Medical Centre"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this contact..."
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="isPrimary"
                checked={formData.isPrimary}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isPrimary: checked === true })
                }
              />
              <Label htmlFor="isPrimary" className="cursor-pointer">
                Mark as primary contact for this role
              </Label>
            </div>
          </div>
          </ScrollArea>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setShowEditDialog(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleFormSubmit}
              disabled={!formData.name || createContactMutation.isPending || updateContactMutation.isPending}
            >
              {(createContactMutation.isPending || updateContactMutation.isPending)
                ? "Saving..."
                : showEditDialog
                ? "Save Changes"
                : "Add Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Composer */}
      <EmailComposer
        open={showEmailComposer}
        onOpenChange={setShowEmailComposer}
        contacts={contacts}
        caseId={caseId}
        workerName={workerName}
        preselectedRecipient={selectedContact}
        defaultSubject={`Re: ${workerName} - Case Update`}
      />
    </>
  );
}
