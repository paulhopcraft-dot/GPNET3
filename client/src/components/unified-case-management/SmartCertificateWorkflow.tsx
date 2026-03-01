import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FileText,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Eye,
  Download,
  Upload,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  RefreshCw,
  User,
  Activity
} from "lucide-react";

interface MedicalCertificate {
  id: string;
  caseId: string;
  workerName: string;
  issueDate: string;
  startDate: string;
  endDate: string;
  capacity: "fit" | "partial" | "unfit" | "unknown";
  extractionConfidence: "Low" | "Medium" | "High";
  certificateUrl?: string;
  reviewRequired: boolean;
  isCurrentCertificate: boolean;
  daysUntilExpiry: number;
  restrictions?: string[];
  recommendations?: string[];
}

interface CertificateWorkflowProps {
  caseId: string;
  workerName: string;
  onWorkflowComplete?: () => void;
}

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "blocked";
  urgency: "immediate" | "today" | "this_week" | "routine";
  action?: () => void;
  actionLabel?: string;
}

export function SmartCertificateWorkflow({ caseId, workerName, onWorkflowComplete }: CertificateWorkflowProps) {
  const [selectedCertificateId, setSelectedCertificateId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch certificates for this case
  const { data: certificates, isLoading } = useQuery<MedicalCertificate[]>({
    queryKey: ["certificates", caseId],
    queryFn: async () => {
      const response = await fetch(`/api/certificates/case/${caseId}`);
      if (!response.ok) throw new Error("Failed to fetch certificates");
      const data = await response.json();

      // Transform and enhance certificate data
      return data.certificates.map((cert: any) => ({
        id: cert.id,
        caseId: cert.caseId,
        workerName,
        issueDate: cert.issueDate,
        startDate: cert.startDate,
        endDate: cert.endDate,
        capacity: cert.capacity || "unknown",
        extractionConfidence: cert.extractionConfidence || "Medium",
        certificateUrl: cert.certificateUrl,
        reviewRequired: cert.extractionConfidence === "Low",
        isCurrentCertificate: new Date(cert.endDate) > new Date(),
        daysUntilExpiry: Math.ceil((new Date(cert.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        restrictions: cert.functionalRestrictionsJson?.restrictions || [],
        recommendations: cert.recommendations || []
      }));
    }
  });

  // Calculate workflow steps based on certificate status
  const workflowSteps: WorkflowStep[] = React.useMemo(() => {
    if (!certificates) return [];

    const currentCert = certificates.find(c => c.isCurrentCertificate);
    const pendingReviewCerts = certificates.filter(c => c.reviewRequired && !c.isCurrentCertificate);

    const steps: WorkflowStep[] = [];

    // Step 1: Review pending certificates
    if (pendingReviewCerts.length > 0) {
      steps.push({
        id: "review-pending",
        title: "Review Extracted Certificate Data",
        description: `${pendingReviewCerts.length} certificate(s) need OCR review and approval`,
        status: "pending",
        urgency: "today",
        actionLabel: "Review Now"
      });
    }

    // Step 2: Check current certificate status
    if (currentCert) {
      if (currentCert.daysUntilExpiry <= 0) {
        steps.push({
          id: "expired-cert",
          title: "Certificate Expired",
          description: "Current certificate has expired - request new certificate immediately",
          status: "blocked",
          urgency: "immediate",
          actionLabel: "Request New Certificate"
        });
      } else if (currentCert.daysUntilExpiry <= 7) {
        steps.push({
          id: "expiring-soon",
          title: "Certificate Expiring Soon",
          description: `Current certificate expires in ${currentCert.daysUntilExpiry} days`,
          status: "pending",
          urgency: "today",
          actionLabel: "Follow Up"
        });
      } else {
        steps.push({
          id: "current-valid",
          title: "Current Certificate Valid",
          description: `Certificate valid until ${new Date(currentCert.endDate).toLocaleDateString()}`,
          status: "completed",
          urgency: "routine"
        });
      }
    } else {
      steps.push({
        id: "no-certificate",
        title: "No Current Certificate",
        description: "Worker needs current medical certificate for capacity assessment",
        status: "blocked",
        urgency: "immediate",
        actionLabel: "Request Certificate"
      });
    }

    // Step 3: Capacity assessment
    if (currentCert && currentCert.capacity !== "unknown") {
      steps.push({
        id: "capacity-assessed",
        title: "Work Capacity Assessed",
        description: `Current capacity: ${currentCert.capacity}`,
        status: "completed",
        urgency: "routine"
      });
    } else {
      steps.push({
        id: "capacity-pending",
        title: "Assess Work Capacity",
        description: "Medical certificate needs capacity assessment",
        status: "pending",
        urgency: "today",
        actionLabel: "Assess Capacity"
      });
    }

    // Step 4: RTW planning alignment
    if (currentCert?.capacity === "partial" || currentCert?.capacity === "fit") {
      steps.push({
        id: "rtw-alignment",
        title: "Align with RTW Plan",
        description: "Ensure RTW plan matches current medical capacity",
        status: "pending",
        urgency: "this_week",
        actionLabel: "Review RTW Plan"
      });
    }

    return steps;
  }, [certificates]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-600 bg-green-50 border-green-200";
      case "in_progress": return "text-blue-600 bg-blue-50 border-blue-200";
      case "pending": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "blocked": return "text-red-600 bg-red-50 border-red-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "immediate": return "bg-red-500";
      case "today": return "bg-orange-500";
      case "this_week": return "bg-yellow-500";
      case "routine": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getCapacityIcon = (capacity: string) => {
    switch (capacity) {
      case "fit": return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "partial": return <Clock className="w-4 h-4 text-yellow-600" />;
      case "unfit": return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getCapacityDescription = (capacity: string) => {
    switch (capacity) {
      case "fit": return "Cleared for full duties";
      case "partial": return "Suitable duties with restrictions";
      case "unfit": return "Not fit for work";
      default: return "Capacity assessment pending";
    }
  };

  // Calculate workflow progress
  const completedSteps = workflowSteps.filter(step => step.status === "completed").length;
  const totalSteps = workflowSteps.length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Loading certificate workflow...</p>
        </CardContent>
      </Card>
    );
  }

  const currentCertificate = certificates?.find(c => c.isCurrentCertificate);
  const needsAttention = workflowSteps.some(step =>
    step.urgency === "immediate" || (step.urgency === "today" && step.status !== "completed")
  );

  return (
    <Card className={needsAttention ? "border-orange-200 bg-orange-50/30" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Medical Certificate Workflow
            </CardTitle>
            <p className="text-sm text-gray-600">
              Guided certificate management for {workerName}
            </p>
          </div>
          <div className="text-right space-y-1">
            <div className="flex items-center gap-2">
              {needsAttention && <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />}
              <span className="text-sm font-medium">
                {completedSteps}/{totalSteps} Complete
              </span>
            </div>
            <Progress value={progress} className="w-24 h-2" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Certificate Status */}
        {currentCertificate && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">Current Certificate</h4>
                  {getCapacityIcon(currentCertificate.capacity)}
                  <span className="text-sm">
                    {getCapacityDescription(currentCertificate.capacity)}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>Valid: {new Date(currentCertificate.startDate).toLocaleDateString()} - {new Date(currentCertificate.endDate).toLocaleDateString()}</span>
                  <span>
                    {currentCertificate.daysUntilExpiry > 0
                      ? `${currentCertificate.daysUntilExpiry} days remaining`
                      : "Expired"
                    }
                  </span>
                </div>
                {currentCertificate.restrictions && currentCertificate.restrictions.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-500 uppercase">Restrictions:</span>
                    <div className="flex flex-wrap gap-1">
                      {currentCertificate.restrictions.map((restriction, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {restriction}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {currentCertificate.certificateUrl && (
                  <Button variant="outline" size="sm">
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                )}
                <Button variant="outline" size="sm">
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Note
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Workflow Steps */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Workflow Steps
          </h4>

          {workflowSteps.map((step, index) => (
            <div key={step.id} className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                step.status === "completed" ? "bg-green-500 text-white" :
                step.status === "in_progress" ? "bg-blue-500 text-white" :
                step.status === "blocked" ? "bg-red-500 text-white" :
                "bg-gray-200 text-gray-600"
              }`}>
                {index + 1}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h5 className="font-medium">{step.title}</h5>
                  <div className={`w-2 h-2 rounded-full ${getUrgencyColor(step.urgency)}`} />
                  <Badge className={getStatusColor(step.status)}>
                    {step.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{step.description}</p>
              </div>

              {step.actionLabel && step.status !== "completed" && (
                <Button
                  size="sm"
                  variant={step.urgency === "immediate" ? "destructive" : step.urgency === "today" ? "default" : "outline"}
                  onClick={step.action}
                >
                  {step.actionLabel}
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Certificate History Quick View */}
        {certificates && certificates.length > 1 && (
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recent Certificates ({certificates.length})
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {certificates
                .filter(cert => !cert.isCurrentCertificate)
                .slice(0, 3)
                .map(cert => (
                  <div key={cert.id} className="flex items-center justify-between text-sm bg-gray-50 rounded p-2">
                    <div className="flex items-center gap-2">
                      {getCapacityIcon(cert.capacity)}
                      <span>{new Date(cert.startDate).toLocaleDateString()} - {new Date(cert.endDate).toLocaleDateString()}</span>
                      <Badge variant="outline" className="text-xs">
                        {cert.capacity}
                      </Badge>
                    </div>
                    {cert.certificateUrl && (
                      <Button variant="ghost" size="sm">
                        <Eye className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Smart Recommendations */}
        {needsAttention && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              <strong>Action Required:</strong> This certificate workflow needs immediate attention.
              Complete the pending steps above to ensure proper case management.
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" className="flex-1">
            <Upload className="w-4 h-4 mr-2" />
            Upload Certificate
          </Button>
          <Button variant="outline" className="flex-1">
            <MessageSquare className="w-4 h-4 mr-2" />
            Contact Worker
          </Button>
          <Button variant="outline" className="flex-1">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Review
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}