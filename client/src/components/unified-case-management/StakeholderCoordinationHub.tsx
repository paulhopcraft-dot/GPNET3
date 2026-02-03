import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Send,
  User,
  Building,
  Heart,
  Briefcase,
  Shield,
  Activity,
  Zap,
  Bell,
  Eye,
  FileText,
  Video,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { WorkerCase } from "@shared/schema";

interface Stakeholder {
  id: string;
  name: string;
  role: "worker" | "employer" | "medical_practitioner" | "case_manager" | "rehabilitation_provider" | "union_rep" | "legal_rep";
  email: string;
  phone?: string;
  organization?: string;
  status: "active" | "inactive" | "pending";
  lastContact: string;
  preferredContact: "email" | "phone" | "sms";
  responsiveness: "excellent" | "good" | "fair" | "poor";
  nextAction?: StakeholderAction;
  permissions: string[];
}

interface StakeholderAction {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in_progress" | "completed" | "overdue";
  actionType: "provide_information" | "approve_treatment" | "assess_duties" | "schedule_meeting" | "submit_report";
}

interface CommunicationTemplate {
  id: string;
  title: string;
  description: string;
  recipients: string[];
  template: string;
  triggerConditions: string[];
  automatic: boolean;
  frequency?: "immediate" | "daily" | "weekly" | "milestone";
}

interface StakeholderCoordinationHubProps {
  workerCase: WorkerCase;
  showAutomation?: boolean;
}

export function StakeholderCoordinationHub({
  workerCase,
  showAutomation = true
}: StakeholderCoordinationHubProps) {
  const [selectedStakeholder, setSelectedStakeholder] = useState<Stakeholder | null>(null);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [messageRecipients, setMessageRecipients] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"stakeholders" | "actions" | "automation" | "communication">("stakeholders");

  // Fetch stakeholders for the case
  const { data: stakeholders, isLoading } = useQuery<Stakeholder[]>({
    queryKey: ["stakeholders", workerCase.id],
    queryFn: async () => {
      // Mock data - in real implementation, this would fetch from API
      return [
        {
          id: "worker_1",
          name: workerCase.workerName,
          role: "worker",
          email: "worker@email.com",
          phone: workerCase.contactPhone,
          status: "active",
          lastContact: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          preferredContact: "phone",
          responsiveness: "good",
          permissions: ["view_own_case", "update_personal_info"],
          nextAction: {
            id: "provide_update",
            title: "Provide Recovery Update",
            description: "Share current symptoms and functional capacity",
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            priority: "medium",
            status: "pending",
            actionType: "provide_information"
          }
        },
        {
          id: "employer_1",
          name: "Sarah Wilson",
          role: "employer",
          email: "sarah.wilson@company.com",
          phone: "+61 3 9876 5432",
          organization: workerCase.company,
          status: "active",
          lastContact: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          preferredContact: "email",
          responsiveness: "excellent",
          permissions: ["view_case_updates", "provide_suitable_duties"],
          nextAction: {
            id: "assess_duties",
            title: "Assess Suitable Duties",
            description: "Review and confirm available light duties",
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            priority: "high",
            status: "pending",
            actionType: "assess_duties"
          }
        },
        {
          id: "medical_1",
          name: "Dr. Michael Chen",
          role: "medical_practitioner",
          email: "mchen@medicalpractice.com.au",
          phone: "+61 3 9123 4567",
          organization: "City Medical Centre",
          status: "active",
          lastContact: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          preferredContact: "email",
          responsiveness: "good",
          permissions: ["provide_medical_updates", "issue_certificates"],
          nextAction: {
            id: "medical_review",
            title: "Provide Medical Update",
            description: "Update on treatment progress and work capacity",
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            priority: "medium",
            status: "pending",
            actionType: "submit_report"
          }
        },
        {
          id: "rehab_1",
          name: "Lisa Rodriguez",
          role: "rehabilitation_provider",
          email: "lisa@rehabservices.com.au",
          phone: "+61 3 9234 5678",
          organization: "Active Rehab Services",
          status: "active",
          lastContact: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          preferredContact: "phone",
          responsiveness: "excellent",
          permissions: ["provide_rehab_updates", "coordinate_services"]
        }
      ];
    }
  });

  // Communication templates for automation
  const communicationTemplates: CommunicationTemplate[] = [
    {
      id: "weekly_update",
      title: "Weekly Progress Update",
      description: "Automated weekly update to all stakeholders",
      recipients: ["worker", "employer", "medical_practitioner"],
      template: "Weekly progress update for {workerName}: Current status, next steps, and upcoming appointments.",
      triggerConditions: ["every_monday", "active_case"],
      automatic: true,
      frequency: "weekly"
    },
    {
      id: "medical_cert_reminder",
      title: "Medical Certificate Reminder",
      description: "Reminder when medical certificate is expiring",
      recipients: ["worker", "medical_practitioner"],
      template: "Medical certificate for {workerName} expires in 7 days. Please arrange renewal.",
      triggerConditions: ["certificate_expiring"],
      automatic: true,
      frequency: "immediate"
    },
    {
      id: "rtw_milestone",
      title: "RTW Milestone Achievement",
      description: "Notification when RTW milestones are reached",
      recipients: ["worker", "employer", "case_manager"],
      template: "Congratulations! {workerName} has successfully achieved RTW milestone: {milestone}",
      triggerConditions: ["milestone_achieved"],
      automatic: true,
      frequency: "immediate"
    }
  ];

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, recipients }: { message: string; recipients: string[] }) => {
      const response = await fetch(`/api/cases/${workerCase.id}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, recipients })
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      setNewMessage("");
      setMessageRecipients([]);
      setShowMessageDialog(false);
    }
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "worker": return <User className="w-4 h-4" />;
      case "employer": return <Building className="w-4 h-4" />;
      case "medical_practitioner": return <Heart className="w-4 h-4" />;
      case "case_manager": return <Shield className="w-4 h-4" />;
      case "rehabilitation_provider": return <Activity className="w-4 h-4" />;
      case "union_rep": return <Users className="w-4 h-4" />;
      case "legal_rep": return <FileText className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "worker": return "bg-blue-100 text-blue-800";
      case "employer": return "bg-green-100 text-green-800";
      case "medical_practitioner": return "bg-red-100 text-red-800";
      case "case_manager": return "bg-purple-100 text-purple-800";
      case "rehabilitation_provider": return "bg-orange-100 text-orange-800";
      case "union_rep": return "bg-yellow-100 text-yellow-800";
      case "legal_rep": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getResponsivenessColor = (responsiveness: string) => {
    switch (responsiveness) {
      case "excellent": return "text-green-600";
      case "good": return "text-blue-600";
      case "fair": return "text-yellow-600";
      case "poor": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || messageRecipients.length === 0) return;

    sendMessageMutation.mutate({
      message: newMessage,
      recipients: messageRecipients
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Stakeholder Coordination
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
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
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Stakeholder Coordination
                <Badge variant="outline">
                  {stakeholders?.filter(s => s.status === "active").length || 0} active
                </Badge>
              </CardTitle>
              <p className="text-sm text-gray-600">
                Automated coordination and communication with all parties
              </p>
            </div>

            <Button
              onClick={() => setShowMessageDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Send Message
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Tab Navigation */}
          <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
            {[
              { id: "stakeholders", label: "Stakeholders", icon: <Users className="w-4 h-4" /> },
              { id: "actions", label: "Actions", icon: <CheckCircle2 className="w-4 h-4" /> },
              { id: "automation", label: "Automation", icon: <Zap className="w-4 h-4" /> },
              { id: "communication", label: "History", icon: <MessageSquare className="w-4 h-4" /> }
            ].map(tab => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(tab.id as any)}
                className="flex items-center gap-2"
              >
                {tab.icon}
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Stakeholders Tab */}
          {activeTab === "stakeholders" && (
            <div className="space-y-4">
              {stakeholders?.map(stakeholder => (
                <div
                  key={stakeholder.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedStakeholder(stakeholder)}
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="border-2 border-gray-200">
                      <AvatarImage src={`/stakeholder-${stakeholder.role}.png`} />
                      <AvatarFallback className={getRoleColor(stakeholder.role)}>
                        {getRoleIcon(stakeholder.role)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{stakeholder.name}</h3>
                        <Badge className={getRoleColor(stakeholder.role)}>
                          {stakeholder.role.replace('_', ' ')}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={getResponsivenessColor(stakeholder.responsiveness)}
                        >
                          {stakeholder.responsiveness} response
                        </Badge>
                      </div>

                      {stakeholder.organization && (
                        <p className="text-sm text-gray-600 mb-2">{stakeholder.organization}</p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Last contact: {formatRelativeTime(stakeholder.lastContact)}</span>
                        <span>Prefers: {stakeholder.preferredContact}</span>
                      </div>

                      {stakeholder.nextAction && (
                        <Alert className={`mt-3 border-l-4 ${
                          stakeholder.nextAction.priority === "high" ? "border-l-red-500 bg-red-50" :
                          stakeholder.nextAction.priority === "medium" ? "border-l-yellow-500 bg-yellow-50" :
                          "border-l-blue-500 bg-blue-50"
                        }`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-sm">{stakeholder.nextAction.title}</h4>
                              <AlertDescription className="text-xs">
                                {stakeholder.nextAction.description}
                              </AlertDescription>
                            </div>
                            <Badge className={getPriorityColor(stakeholder.nextAction.priority)}>
                              {stakeholder.nextAction.priority}
                            </Badge>
                          </div>
                        </Alert>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Phone className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Mail className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions Tab */}
          {activeTab === "actions" && (
            <div className="space-y-3">
              {stakeholders?.filter(s => s.nextAction).map(stakeholder => (
                <div key={stakeholder.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={getRoleColor(stakeholder.role)}>
                          {getRoleIcon(stakeholder.role)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold text-sm">{stakeholder.nextAction?.title}</h4>
                        <p className="text-xs text-gray-600">{stakeholder.name} • {stakeholder.role.replace('_', ' ')}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(stakeholder.nextAction?.priority || "low")}>
                        {stakeholder.nextAction?.priority}
                      </Badge>
                      <Button size="sm">
                        Follow Up
                      </Button>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mt-2 ml-11">
                    {stakeholder.nextAction?.description}
                  </p>

                  <div className="text-xs text-gray-500 mt-2 ml-11">
                    Due: {formatRelativeTime(stakeholder.nextAction?.dueDate || "")}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Automation Tab */}
          {activeTab === "automation" && showAutomation && (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <Zap className="w-4 h-4" />
                <AlertDescription>
                  <strong>Smart Automation Active:</strong> The system automatically coordinates stakeholders,
                  sends reminders, and manages communications based on case events and timelines.
                </AlertDescription>
              </Alert>

              {communicationTemplates.map(template => (
                <div key={template.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{template.title}</h4>
                    <div className="flex items-center gap-2">
                      {template.automatic && (
                        <Badge className="bg-green-100 text-green-700">
                          Auto
                        </Badge>
                      )}
                      <Badge variant="outline">
                        {template.frequency}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-3">{template.description}</p>

                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Recipients:</span> {template.recipients.join(", ")}
                    </div>
                    <div>
                      <span className="font-medium">Triggers:</span> {template.triggerConditions.join(", ")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Communication History Tab */}
          {activeTab === "communication" && (
            <div className="space-y-3">
              <Alert className="bg-blue-50 border-blue-200">
                <MessageSquare className="w-4 h-4" />
                <AlertDescription>
                  All communications are automatically logged and accessible to relevant stakeholders.
                  Recent activity shows automated coordination is working effectively.
                </AlertDescription>
              </Alert>

              {/* Mock communication history */}
              {[
                {
                  date: "Today",
                  type: "auto",
                  message: "Weekly progress update sent to all stakeholders",
                  recipients: ["worker", "employer", "medical"]
                },
                {
                  date: "Yesterday",
                  type: "manual",
                  message: "Follow-up call with employer regarding suitable duties",
                  recipients: ["employer"]
                },
                {
                  date: "2 days ago",
                  type: "auto",
                  message: "Medical certificate reminder sent",
                  recipients: ["worker", "medical"]
                }
              ].map((comm, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={comm.type === "auto" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}>
                        {comm.type === "auto" ? "Automated" : "Manual"}
                      </Badge>
                      <span className="text-sm text-gray-500">{comm.date}</span>
                    </div>
                    <Button size="sm" variant="outline">
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                  </div>
                  <p className="text-sm mt-2">{comm.message}</p>
                  <div className="text-xs text-gray-500 mt-1">
                    To: {comm.recipients.join(", ")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Message to Stakeholders</DialogTitle>
            <DialogDescription>
              Coordinate with stakeholders and keep everyone informed
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Recipients</label>
              <div className="grid grid-cols-2 gap-2">
                {stakeholders?.filter(s => s.status === "active").map(stakeholder => (
                  <label key={stakeholder.id} className="flex items-center space-x-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={messageRecipients.includes(stakeholder.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setMessageRecipients(prev => [...prev, stakeholder.id]);
                        } else {
                          setMessageRecipients(prev => prev.filter(id => id !== stakeholder.id));
                        }
                      }}
                    />
                    <div className="flex items-center gap-2">
                      {getRoleIcon(stakeholder.role)}
                      <span className="text-sm">{stakeholder.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message to stakeholders..."
                className="min-h-[120px]"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || messageRecipients.length === 0 || sendMessageMutation.isLoading}
                className="flex-1"
              >
                {sendMessageMutation.isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send Message
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowMessageDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stakeholder Detail Dialog */}
      {selectedStakeholder && (
        <Dialog open={!!selectedStakeholder} onOpenChange={() => setSelectedStakeholder(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getRoleIcon(selectedStakeholder.role)}
                {selectedStakeholder.name}
              </DialogTitle>
              <DialogDescription>
                {selectedStakeholder.role.replace('_', ' ')} • {selectedStakeholder.organization}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Email:</span> {selectedStakeholder.email}
                </div>
                <div>
                  <span className="font-medium">Phone:</span> {selectedStakeholder.phone || "Not provided"}
                </div>
                <div>
                  <span className="font-medium">Preferred Contact:</span> {selectedStakeholder.preferredContact}
                </div>
                <div>
                  <span className="font-medium">Responsiveness:</span>{" "}
                  <span className={getResponsivenessColor(selectedStakeholder.responsiveness)}>
                    {selectedStakeholder.responsiveness}
                  </span>
                </div>
              </div>

              {selectedStakeholder.nextAction && (
                <div className="border rounded-lg p-3">
                  <h4 className="font-semibold mb-2">Pending Action</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{selectedStakeholder.nextAction.title}</span>
                      <Badge className={getPriorityColor(selectedStakeholder.nextAction.priority)}>
                        {selectedStakeholder.nextAction.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{selectedStakeholder.nextAction.description}</p>
                    <div className="text-sm">
                      <span className="font-medium">Due:</span> {formatRelativeTime(selectedStakeholder.nextAction.dueDate)}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button className="flex-1">
                  <Phone className="w-4 h-4 mr-2" />
                  Call
                </Button>
                <Button variant="outline" className="flex-1">
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </Button>
                <Button variant="outline" className="flex-1">
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}