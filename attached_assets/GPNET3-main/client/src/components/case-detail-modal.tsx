import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FileText, User, Building2, Calendar, AlertTriangle } from "lucide-react";

interface CaseDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
}

export function CaseDetailModal({ open, onOpenChange, caseId }: CaseDetailModalProps) {
  // TODO: remove mock functionality
  const [activeTab, setActiveTab] = useState("details");

  const caseData = {
    id: caseId,
    candidateName: "Sarah Johnson",
    organization: "TechCorp Inc",
    status: "in_progress",
    riskScore: 25,
    assignedTo: "John Doe",
    dateSubmitted: "2024-10-28",
    email: "sarah.johnson@example.com",
    phone: "+1 (555) 123-4567",
    position: "Senior Software Engineer",
    checks: [
      { type: "Identity Verification", status: "Completed", result: "Passed" },
      { type: "Employment History", status: "In Progress", result: "-" },
      { type: "Education Verification", status: "Pending", result: "-" },
      { type: "Criminal Record", status: "Completed", result: "Clear" },
    ],
    timeline: [
      { event: "Case created", timestamp: "2024-10-28 09:00 AM", user: "System" },
      { event: "Assigned to John Doe", timestamp: "2024-10-28 09:15 AM", user: "Admin" },
      { event: "Identity check completed", timestamp: "2024-10-28 10:30 AM", user: "Automated" },
      { event: "Status updated to In Progress", timestamp: "2024-10-28 11:00 AM", user: "John Doe" },
    ],
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-case-detail">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="font-mono text-lg">{caseData.id}</span>
              <Badge>In Progress</Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full" data-testid="tabs-case-detail">
            <TabsTrigger value="details" className="flex-1" data-testid="tab-details">Details</TabsTrigger>
            <TabsTrigger value="checks" className="flex-1" data-testid="tab-checks">Checks</TabsTrigger>
            <TabsTrigger value="timeline" className="flex-1" data-testid="tab-timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>Candidate</span>
                    </div>
                    <p className="font-medium" data-testid="text-candidate-name">{caseData.candidateName}</p>
                    <p className="text-sm text-muted-foreground">{caseData.position}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>Organization</span>
                    </div>
                    <p className="font-medium" data-testid="text-organization">{caseData.organization}</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-sm" data-testid="text-email">{caseData.email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="text-sm" data-testid="text-phone">{caseData.phone}</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Date Submitted</span>
                    </div>
                    <p className="font-medium" data-testid="text-date-submitted">
                      {new Date(caseData.dateSubmitted).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Risk Score</span>
                    </div>
                    <p className="font-semibold text-green-600 dark:text-green-500" data-testid="text-risk-score">
                      {caseData.riskScore} / 100
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checks" className="space-y-4">
            {caseData.checks.map((check, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium" data-testid={`text-check-type-${index}`}>{check.type}</p>
                        <p className="text-sm text-muted-foreground">Result: {check.result}</p>
                      </div>
                    </div>
                    <Badge variant={check.status === "Completed" ? "default" : "secondary"} data-testid={`badge-check-status-${index}`}>
                      {check.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <div className="space-y-4">
              {caseData.timeline.map((event, index) => (
                <div key={index} className="flex gap-4" data-testid={`timeline-event-${index}`}>
                  <div className="w-2 bg-primary rounded-full" />
                  <div className="flex-1 pb-4">
                    <p className="font-medium" data-testid={`text-event-${index}`}>{event.event}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <span>{event.timestamp}</span>
                      <span>•</span>
                      <span>{event.user}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-close">
            Close
          </Button>
          <Button onClick={() => console.log("Updating case")} data-testid="button-update-status">
            Update Status
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
