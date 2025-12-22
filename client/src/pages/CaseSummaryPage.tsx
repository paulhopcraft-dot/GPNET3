import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecoveryChart } from "@/components/RecoveryChart";
import { TimelineCard } from "@/components/TimelineCard";
import type { WorkerCase } from "@shared/schema";

export default function CaseSummaryPage() {
  const { id } = useParams<{ id: string }>();

  const { data: cases = [], isLoading } = useQuery<WorkerCase[]>({
    queryKey: ["/api/gpnet2/cases"],
  });

  const workerCase = cases.find((c) => c.id === id);

  // Fetch dynamic timeline estimate
  const { data: timelineEstimate } = useQuery({
    queryKey: [`/api/cases/${id}/timeline-estimate`],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <PageLayout title="Case Summary" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">
            progress_activity
          </span>
        </div>
      </PageLayout>
    );
  }

  if (!workerCase) {
    return (
      <PageLayout title="Case Not Found">
        <Card>
          <CardContent className="py-8 text-center">
            <span className="material-symbols-outlined text-4xl text-muted-foreground mb-4">
              search_off
            </span>
            <p className="text-muted-foreground mb-4">
              The requested case could not be found.
            </p>
            <Link to="/cases">
              <Button>Back to Cases</Button>
            </Link>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  const riskBadgeColor = (level: string) => {
    switch (level) {
      case "High":
        return "bg-red-100 text-red-800";
      case "Medium":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-emerald-100 text-emerald-800";
    }
  };

  // Use dynamic timeline estimate if available, fallback to 12-week default
  const expectedRecoveryDate = timelineEstimate?.estimatedCompletionDate
    ? new Date(timelineEstimate.estimatedCompletionDate)
    : (() => {
        const fallback = new Date(workerCase.dateOfInjury);
        fallback.setDate(fallback.getDate() + 12 * 7);
        return fallback;
      })();

  return (
    <PageLayout
      title={workerCase.workerName}
      subtitle={`${workerCase.company} - Case ${workerCase.id}`}
    >
      <div className="space-y-6">
        {/* Back Button */}
        <div>
          <Link to="/cases">
            <Button variant="ghost" size="sm">
              <span className="material-symbols-outlined text-sm mr-1">arrow_back</span>
              Back to Cases
            </Button>
          </Link>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Work Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={workerCase.workStatus === "At work" ? "default" : "secondary"}>
                {workerCase.workStatus}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Risk Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={riskBadgeColor(workerCase.riskLevel)}>
                {workerCase.riskLevel}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Date of Injury
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{workerCase.dateOfInjury}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Due Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{workerCase.dueDate}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* AI Summary */}
            {workerCase.aiSummary && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">psychology</span>
                    AI Case Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {workerCase.aiSummary}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Case Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">info</span>
                  Case Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Owner</label>
                  <p className="text-sm">{workerCase.owner}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Current Status</label>
                  <p className="text-sm">{workerCase.currentStatus}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Next Step</label>
                  <p className="text-sm">{workerCase.nextStep}</p>
                </div>
                {workerCase.summary && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Summary</label>
                    <p className="text-sm">{workerCase.summary}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <TimelineCard caseId={workerCase.id} />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Recovery Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">trending_up</span>
                  Recovery Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RecoveryChart
                  injuryDate={workerCase.dateOfInjury}
                  expectedRecoveryDate={expectedRecoveryDate.toISOString()}
                />
              </CardContent>
            </Card>

            {/* Compliance */}
            {workerCase.compliance && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">verified</span>
                    Compliance Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className={riskBadgeColor(
                      workerCase.compliance.indicator === "Very High" || workerCase.compliance.indicator === "High"
                        ? "Low"
                        : workerCase.compliance.indicator === "Low" || workerCase.compliance.indicator === "Very Low"
                          ? "High"
                          : "Medium"
                    )}>
                      {workerCase.compliance.indicator}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{workerCase.compliance.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    Source: {workerCase.compliance.source} | Last checked:{" "}
                    {new Date(workerCase.compliance.lastChecked).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Attachments */}
            {workerCase.attachments && workerCase.attachments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">attach_file</span>
                    Attachments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {workerCase.attachments.map((attachment: any) => (
                      <a
                        key={attachment.id}
                        href={attachment.url}
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="material-symbols-outlined text-base">description</span>
                        {attachment.name}
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
