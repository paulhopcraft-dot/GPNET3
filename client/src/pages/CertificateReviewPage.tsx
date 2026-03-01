import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { MedicalCertificateDB, OcrExtractedData } from "@shared/schema";

interface ReviewFormData {
  issueDate: string;
  startDate: string;
  endDate: string;
  practitionerName: string;
  capacity: string;
}

export default function CertificateReviewPage() {
  const [selectedCertificate, setSelectedCertificate] = useState<MedicalCertificateDB | null>(null);
  const [formData, setFormData] = useState<ReviewFormData>({
    issueDate: "",
    startDate: "",
    endDate: "",
    practitionerName: "",
    capacity: "unknown",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: response, isLoading } = useQuery<{ success: boolean; data: MedicalCertificateDB[] }>({
    queryKey: ["/api/certificates/review-queue"],
  });

  const certificates = response?.data || [];

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<MedicalCertificateDB> }) => {
      return apiRequest("PATCH", `/api/certificates/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/certificates/review-queue"] });
      toast({
        title: "Certificate updated",
        description: "The certificate has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update certificate",
        variant: "destructive",
      });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/certificates/${id}/review`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/certificates/review-queue"] });
      setSelectedCertificate(null);
      toast({
        title: "Review complete",
        description: "The certificate has been marked as reviewed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark as reviewed",
        variant: "destructive",
      });
    },
  });

  const openReviewDialog = (certificate: MedicalCertificateDB) => {
    const extracted = certificate.rawExtractedData as OcrExtractedData | null;
    setFormData({
      issueDate: extracted?.extractedFields.issueDate || formatDate(certificate.issueDate),
      startDate: extracted?.extractedFields.startDate || formatDate(certificate.startDate),
      endDate: extracted?.extractedFields.endDate || formatDate(certificate.endDate),
      practitionerName: extracted?.extractedFields.practitionerName || certificate.treatingPractitioner || "",
      capacity: extracted?.extractedFields.capacity || certificate.capacity || "unknown",
    });
    setSelectedCertificate(certificate);
  };

  const handleSaveAndApprove = async () => {
    if (!selectedCertificate) return;

    // First update the certificate with corrected data
    await updateMutation.mutateAsync({
      id: selectedCertificate.id,
      updates: {
        issueDate: new Date(formData.issueDate),
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        treatingPractitioner: formData.practitionerName,
        capacity: formData.capacity,
      } as any,
    });

    // Then mark as reviewed
    await reviewMutation.mutateAsync(selectedCertificate.id);
  };

  const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toISOString().split("T")[0];
  };

  const formatDisplayDate = (date: string | Date | null | undefined): string => {
    if (!date) return "Not set";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return <Badge className="bg-emerald-100 text-emerald-800">High ({Math.round(confidence * 100)}%)</Badge>;
    } else if (confidence >= 0.5) {
      return <Badge className="bg-amber-100 text-amber-800">Medium ({Math.round(confidence * 100)}%)</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Low ({Math.round(confidence * 100)}%)</Badge>;
    }
  };

  const getCapacityBadge = (capacity: string | null | undefined) => {
    switch (capacity) {
      case "fit":
        return <Badge className="bg-emerald-100 text-emerald-800">Fit</Badge>;
      case "partial":
        return <Badge className="bg-amber-100 text-amber-800">Partial</Badge>;
      case "unfit":
        return <Badge className="bg-red-100 text-red-800">Unfit</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-800">Unknown</Badge>;
    }
  };

  if (isLoading) {
    return (
      <PageLayout title="Certificate Review" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">
            progress_activity
          </span>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Certificate Review" subtitle="Review certificates with low-confidence OCR extraction">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{certificates.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Confidence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {certificates.length > 0
                  ? Math.round(
                      (certificates.reduce((acc, c) => acc + (parseFloat(c.extractionConfidence || "0")), 0) /
                        certificates.length) *
                        100
                    ) + "%"
                  : "N/A"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Review Queue Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {certificates.length === 0 ? "Clear" : "Active"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Certificate List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">fact_check</span>
              Certificates Requiring Review
            </CardTitle>
            <CardDescription>
              These certificates were extracted with low confidence and need manual verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            {certificates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <span className="material-symbols-outlined text-4xl mb-4">verified</span>
                <p>No certificates pending review. All extractions have been verified.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {certificates.map((cert) => {
                  const extracted = cert.rawExtractedData as OcrExtractedData | null;
                  return (
                    <div
                      key={cert.id}
                      className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-amber-600 text-lg">
                          description
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{cert.fileName || "Medical Certificate"}</span>
                          {getCapacityBadge(cert.capacity)}
                          {extracted?.confidence?.overall !== undefined &&
                            getConfidenceBadge(extracted.confidence.overall)}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Issue:</span>{" "}
                            {formatDisplayDate(cert.issueDate)}
                          </div>
                          <div>
                            <span className="font-medium">Start:</span>{" "}
                            {formatDisplayDate(cert.startDate)}
                          </div>
                          <div>
                            <span className="font-medium">End:</span>{" "}
                            {formatDisplayDate(cert.endDate)}
                          </div>
                          <div>
                            <span className="font-medium">Practitioner:</span>{" "}
                            {cert.treatingPractitioner || "Unknown"}
                          </div>
                        </div>
                        {extracted?.rawText && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {extracted.rawText}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>Created: {formatDisplayDate(cert.createdAt)}</span>
                          {cert.fileUrl && (
                            <a
                              href={cert.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              View Document
                            </a>
                          )}
                        </div>
                      </div>
                      <Button onClick={() => openReviewDialog(cert)}>Review</Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedCertificate} onOpenChange={(open) => !open && setSelectedCertificate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Certificate</DialogTitle>
            <DialogDescription>
              Verify and correct the extracted data below. Changes will be saved when you approve.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issueDate">Issue Date</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Select
                  value={formData.capacity}
                  onValueChange={(value) => setFormData({ ...formData, capacity: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fit">Fit for full duties</SelectItem>
                    <SelectItem value="partial">Fit for modified duties</SelectItem>
                    <SelectItem value="unfit">Unfit for work</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="practitionerName">Practitioner Name</Label>
              <Input
                id="practitionerName"
                value={formData.practitionerName}
                onChange={(e) => setFormData({ ...formData, practitionerName: e.target.value })}
                placeholder="Dr. Smith"
              />
            </div>

            {selectedCertificate?.fileUrl && (
              <div className="pt-2">
                <a
                  href={selectedCertificate.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                  View Original Document
                </a>
              </div>
            )}

            {selectedCertificate?.rawExtractedData && (
              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                <div className="font-medium mb-1">Extracted Text:</div>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {(selectedCertificate.rawExtractedData as OcrExtractedData).rawText || "No text extracted"}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCertificate(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveAndApprove}
              disabled={updateMutation.isPending || reviewMutation.isPending}
            >
              {updateMutation.isPending || reviewMutation.isPending ? (
                <>
                  <span className="material-symbols-outlined animate-spin mr-2 text-sm">
                    progress_activity
                  </span>
                  Saving...
                </>
              ) : (
                "Save & Approve"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
