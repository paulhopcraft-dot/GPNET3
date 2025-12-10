import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import type { WorkCapacity } from "@shared/schema";

interface CertificateWithStatus {
  id: string;
  caseId: string;
  issueDate: string;
  startDate: string;
  endDate: string;
  capacity: WorkCapacity;
  notes?: string;
  source: "freshdesk" | "manual";
  documentUrl?: string;
  displayStatus: "active" | "expiring_soon" | "expired";
  daysUntilExpiry?: number;
}

interface CertificateCardProps {
  caseId: string;
}

export function CertificateCard({ caseId }: CertificateCardProps) {
  const [certificates, setCertificates] = useState<CertificateWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchCertificates = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/actions/case/${caseId}/certificates-with-status`);
        if (!response.ok) {
          throw new Error("Failed to fetch certificates");
        }
        const data = await response.json();
        if (cancelled) return;
        setCertificates(data.data || []);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Certificates unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCertificates();
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const capacityLabel = (capacity: WorkCapacity) => {
    switch (capacity) {
      case "fit":
        return "FIT";
      case "partial":
        return "RESTRICTED";
      case "unfit":
        return "UNFIT";
      default:
        return "UNKNOWN";
    }
  };

  const capacityBadgeClass = (capacity: WorkCapacity) => {
    switch (capacity) {
      case "fit":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "partial":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "unfit":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const statusBadge = (cert: CertificateWithStatus) => {
    switch (cert.displayStatus) {
      case "active":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
            Active
          </Badge>
        );
      case "expiring_soon":
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
            Expiring {cert.daysUntilExpiry === 0 ? "today" : `in ${cert.daysUntilExpiry}d`}
          </Badge>
        );
      case "expired":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px]">
            Expired
          </Badge>
        );
      default:
        return null;
    }
  };

  const truncateNotes = (notes: string | undefined, maxLength: number = 80) => {
    if (!notes) return null;
    if (notes.length <= maxLength) return notes;
    return notes.substring(0, maxLength) + "...";
  };

  return (
    <Card data-testid="card-certificates">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="material-symbols-outlined text-primary">clinical_notes</span>
          Medical Certificates
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
            <span>Loading certificates...</span>
          </div>
        )}

        {error && (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <span className="material-symbols-outlined text-warning text-base">error</span>
            {error}
          </div>
        )}

        {!loading && !error && certificates.length === 0 && (
          <div className="text-center py-4">
            <span className="material-symbols-outlined text-3xl text-muted-foreground/50 mb-2">
              description
            </span>
            <p className="text-sm text-muted-foreground">
              No medical certificates on file for this case.
            </p>
          </div>
        )}

        {!loading && !error && certificates.length > 0 && (
          <div className="space-y-3">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className={`rounded-md border p-3 ${
                  cert.displayStatus === "active"
                    ? "border-emerald-200 bg-emerald-50/30"
                    : cert.displayStatus === "expiring_soon"
                    ? "border-amber-200 bg-amber-50/30"
                    : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold ${capacityBadgeClass(cert.capacity)}`}
                    >
                      {capacityLabel(cert.capacity)}
                    </Badge>
                    {statusBadge(cert)}
                  </div>
                  {cert.documentUrl && (
                    <a
                      href={cert.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80"
                      title="View document"
                    >
                      <span className="material-symbols-outlined text-base">open_in_new</span>
                    </a>
                  )}
                </div>

                <div className="mt-2 text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">event</span>
                    <span>
                      Issued: {formatDate(cert.issueDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">date_range</span>
                    <span>
                      {formatDate(cert.startDate)} - {formatDate(cert.endDate)}
                    </span>
                  </div>
                </div>

                {cert.notes && (
                  <div className="mt-2">
                    <p className="text-xs text-card-foreground">
                      {truncateNotes(cert.notes)}
                    </p>
                    {cert.notes.length > 80 && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs p-0 h-auto text-primary hover:bg-transparent"
                          >
                            View more
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Certificate Notes</DialogTitle>
                          </DialogHeader>
                          <div className="mt-4">
                            <p className="text-sm whitespace-pre-wrap">{cert.notes}</p>
                          </div>
                          <div className="mt-4 text-xs text-muted-foreground">
                            <p>Capacity: {capacityLabel(cert.capacity)}</p>
                            <p>Period: {formatDate(cert.startDate)} - {formatDate(cert.endDate)}</p>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
