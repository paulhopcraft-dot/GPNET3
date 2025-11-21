import { useState, useEffect, useRef } from "react";
import type {
  WorkerCase,
  MedicalCertificate,
  RecoveryTimelineSummary,
  WorkCapacity,
  CaseDiscussionNote,
  TranscriptInsight,
} from "@shared/schema";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { RecoveryChart } from "./RecoveryChart";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

interface CaseDetailPanelProps {
  workerCase: WorkerCase;
  onClose: () => void;
}

export function deriveSummaryMetaFromCase(workerCase: WorkerCase) {
  return {
    generatedAt: workerCase.aiSummaryGeneratedAt,
    model: workerCase.aiSummaryModel,
    cached: workerCase.aiSummary ? true : undefined,
    needsRefresh: undefined,
  };
}

export function CaseDetailPanel({ workerCase, onClose }: CaseDetailPanelProps) {
  // Calculate expected recovery date (12 weeks from injury)
  const injuryDate = new Date(workerCase.dateOfInjury);
  const expectedRecoveryDate = new Date(injuryDate);
  expectedRecoveryDate.setDate(expectedRecoveryDate.getDate() + (12 * 7)); // 12 weeks
  const [aiSummary, setAiSummary] = useState<string | null>(workerCase.aiSummary || null);
  const [summaryMeta, setSummaryMeta] = useState(deriveSummaryMetaFromCase(workerCase));
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<MedicalCertificate[]>([]);
  const [timelineSummary, setTimelineSummary] = useState<RecoveryTimelineSummary | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [discussionNotes, setDiscussionNotes] = useState<CaseDiscussionNote[]>(
    workerCase.latestDiscussionNotes ?? [],
  );
  const [discussionInsights, setDiscussionInsights] = useState<TranscriptInsight[]>(
    workerCase.discussionInsights ?? [],
  );
  const [discussionLoading, setDiscussionLoading] = useState(false);
  const [discussionError, setDiscussionError] = useState<string | null>(null);
  const latestCaseIdRef = useRef(workerCase.id);
  useEffect(() => {
    latestCaseIdRef.current = workerCase.id;
  }, [workerCase.id]);

  useEffect(() => {
    setAiSummary(workerCase.aiSummary ?? null);
    setSummaryMeta(deriveSummaryMetaFromCase(workerCase));
    setSummaryError(null);
    setLoadingSummary(false);
  }, [workerCase.id, workerCase.aiSummary, workerCase.aiSummaryGeneratedAt, workerCase.aiSummaryModel]);

  const capacityLabel = (capacity: WorkCapacity | undefined) => {
    switch (capacity) {
      case "fit":
        return "Fit for Work";
      case "partial":
        return "Partial Capacity";
      case "unfit":
        return "No Capacity";
      default:
        return "Unknown";
    }
  };

  const capacityBadgeClass = (capacity: WorkCapacity | undefined) => {
    switch (capacity) {
      case "fit":
        return "bg-emerald-100 text-emerald-800";
      case "partial":
        return "bg-amber-100 text-amber-800";
      case "unfit":
        return "bg-red-100 text-red-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "Unknown";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatRange = (start: string, end: string) => {
    const startLabel = formatDate(start);
    const endLabel = formatDate(end);
    if (startLabel === endLabel) {
      return startLabel;
    }
    return `${startLabel} - ${endLabel}`;
  };

  const formatTimestamp = (value?: string | Date) => {
    if (!value) return "Unknown";
    const date = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleString("en-AU", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fetchCachedSummary = async (): Promise<boolean> => {
    const caseId = workerCase.id;
    try {
      const response = await fetch(`/api/cases/${caseId}/summary`);
      if (!response.ok) {
        throw new Error("Failed to fetch summary");
      }
      const data = await response.json();
      if (latestCaseIdRef.current !== caseId) {
        return false;
      }
      
      if (data.summary) {
        setAiSummary(data.summary);
      }
      setSummaryMeta({
        generatedAt: data.generatedAt,
        model: data.model,
        needsRefresh: data.needsRefresh,
      });
      if (Array.isArray(data.discussionNotes)) {
        setDiscussionNotes((prev) => {
          if (prev.length > data.discussionNotes.length) {
            return prev;
          }
          return data.discussionNotes;
        });
      }
      if (Array.isArray(data.discussionInsights)) {
        setDiscussionInsights((prev) => {
          if (prev.length > data.discussionInsights.length) {
            return prev;
          }
          return data.discussionInsights;
        });
      }
      
      // Return whether we need to generate a new summary
      return data.needsRefresh || !data.summary;
    } catch (error) {
      console.error("Error fetching summary:", error);
      return true; // On error, try to generate
    }
  };

  const generateSummary = async (force: boolean = false) => {
    const caseId = workerCase.id;
    setLoadingSummary(true);
    setSummaryError(null);
    
    try {
      const url = `/api/cases/${caseId}/summary${force ? '?force=true' : ''}`;
      const response = await fetch(url, {
        method: 'POST',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to generate summary");
      }
      const data = await response.json();
      if (latestCaseIdRef.current !== caseId) {
        return;
      }
      setAiSummary(data.summary);
      setSummaryMeta({
        generatedAt: data.generatedAt,
        model: data.model,
        cached: data.cached,
        needsRefresh: false,
      });
      if (Array.isArray(data.discussionNotes)) {
        setDiscussionNotes((prev) => {
          if (prev.length > data.discussionNotes.length) {
            return prev;
          }
          return data.discussionNotes;
        });
      }
      if (Array.isArray(data.discussionInsights)) {
        setDiscussionInsights((prev) => {
          if (prev.length > data.discussionInsights.length) {
            return prev;
          }
          return data.discussionInsights;
        });
      }
    } catch (error) {
      console.error("Error generating AI summary:", error);
      setSummaryError(error instanceof Error ? error.message : "AI summary temporarily unavailable");
    } finally {
      if (latestCaseIdRef.current === caseId) {
        setLoadingSummary(false);
      }
    }
  };

  useEffect(() => {
    const initSummary = async () => {
      // Fetch cached summary metadata on mount
      const needsGeneration = await fetchCachedSummary();
      
      // After fetching, generate if needed
      if (latestCaseIdRef.current !== workerCase.id) {
        return;
      }
      if (needsGeneration) {
        void generateSummary();
      }
    };
    
    initSummary();
  }, [workerCase.id]);

  useEffect(() => {
    let cancelled = false;

    const loadTimeline = async () => {
      setTimelineLoading(true);
      setTimelineError(null);
      try {
        const response = await fetch(`/api/cases/${workerCase.id}/recovery-timeline`);
        if (!response.ok) {
          throw new Error("Failed to fetch recovery timeline");
        }
        const data = await response.json();
        if (cancelled) return;
        setTimeline(data.certificates ?? []);
        setTimelineSummary(data.summary ?? null);
      } catch (error) {
        if (cancelled) return;
        setTimelineError(error instanceof Error ? error.message : "Recovery timeline unavailable");
        setTimeline([]);
        setTimelineSummary(null);
      } finally {
        if (!cancelled) {
          setTimelineLoading(false);
        }
      }
    };

    loadTimeline();
    return () => {
      cancelled = true;
    };
  }, [workerCase.id]);

  useEffect(() => {
    setDiscussionNotes(workerCase.latestDiscussionNotes ?? []);
    setDiscussionInsights(workerCase.discussionInsights ?? []);
  }, [workerCase.id, workerCase.latestDiscussionNotes, workerCase.discussionInsights]);

  useEffect(() => {
    let cancelled = false;

    const loadDiscussionNotes = async () => {
      setDiscussionLoading(true);
      setDiscussionError(null);
      try {
        const response = await fetch(`/api/cases/${workerCase.id}/discussion-notes`);
        if (!response.ok) {
          throw new Error("Failed to fetch discussion notes");
        }
        const data = await response.json();
        if (!cancelled) {
          setDiscussionNotes(data.notes ?? []);
          setDiscussionInsights(data.insights ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setDiscussionError(
            error instanceof Error ? error.message : "Failed to load discussion notes",
          );
        }
      } finally {
        if (!cancelled) {
          setDiscussionLoading(false);
        }
      }
    };

    loadDiscussionNotes();

    return () => {
      cancelled = true;
    };
  }, [workerCase.id]);

  return (
    <aside className="w-96 flex-shrink-0 bg-card border-l border-border p-6">
      <div className="flex justify-between items-start mb-6">
        <h2
          className="text-xl font-bold text-card-foreground"
          data-testid="case-detail-worker-name"
        >
          {workerCase.workerName}
        </h2>
        <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-panel">
          <span className="material-symbols-outlined">close</span>
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="space-y-6">
          {loadingSummary && (
            <Card data-testid="card-summary-loading">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="material-symbols-outlined animate-spin text-primary">autorenew</span>
                  <span>Generating AI case summary with Claude Sonnet 4...</span>
                </div>
              </CardContent>
            </Card>
          )}

          {aiSummary && (
            <Card data-testid="card-ai-summary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="material-symbols-outlined text-primary">psychology</span>
                    AI Case Summary
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateSummary(true)}
                    disabled={loadingSummary}
                    data-testid="button-refresh-summary"
                    className="text-xs"
                  >
                    {loadingSummary ? (
                      <span className="material-symbols-outlined animate-spin text-sm">autorenew</span>
                    ) : (
                      <span className="material-symbols-outlined text-sm">refresh</span>
                    )}
                    Refresh
                  </Button>
                </div>
                {summaryMeta.generatedAt && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                    {summaryMeta.needsRefresh && (
                      <span className="material-symbols-outlined text-warning text-sm">warning</span>
                    )}
                    <span>
                      {summaryMeta.cached && "Cached • "}
                      Generated {new Date(summaryMeta.generatedAt).toLocaleString()}
                      {summaryMeta.model && ` • ${summaryMeta.model}`}
                    </span>
                  </div>
                )}
                {summaryMeta.needsRefresh && (
                  <div className="text-xs text-warning mt-1">
                    Ticket updated since summary generation - click Refresh for latest analysis
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{aiSummary}</div>
              </CardContent>
            </Card>
          )}

          {summaryError && (
            <Card data-testid="card-summary-error">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="material-symbols-outlined">info</span>
                  {summaryError}
                </div>
              </CardContent>
            </Card>
          )}

          <Card data-testid="card-discussion-notes">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="material-symbols-outlined text-primary">forum</span>
                Latest Discussion Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {discussionInsights.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Transcript Risk Insights
                  </p>
                  <div className="space-y-2">
                    {discussionInsights.slice(0, 4).map((insight) => (
                      <div
                        key={insight.id}
                        className="flex items-start gap-2 rounded-md border border-border p-2"
                      >
                        <Badge className={`text-[10px] ${severityBadgeStyle(insight.severity)}`}>
                          {insight.area} · {insight.severity}
                        </Badge>
                        <div className="text-sm text-card-foreground leading-snug">
                          <p>{insight.summary}</p>
                          {insight.detail && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {insight.detail}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {discussionLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                  Loading transcript insights...
                </div>
              )}

              {discussionError && (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="material-symbols-outlined text-warning text-base">error</span>
                  {discussionError}
                </div>
              )}

              {!discussionLoading && !discussionError && discussionNotes.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No transcript discussions have been ingested for this case yet.
                </p>
              )}

              {!discussionLoading && discussionNotes.length > 0 && (
                <div className="space-y-4">
                  {discussionNotes.slice(0, 4).map((note) => (
                    <div key={note.id} className="rounded-md border border-border p-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatTimestamp(note.timestamp)}</span>
                        <div className="flex gap-2">
                          {note.updatesCompliance && (
                            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                              Compliance
                            </Badge>
                          )}
                          {note.updatesRecoveryTimeline && (
                            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                              Recovery
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-card-foreground">{note.summary}</p>

                      {note.riskFlags && note.riskFlags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {note.riskFlags.map((flag) => (
                            <Badge key={`${note.id}-${flag}`} variant="outline" className="text-xs">
                              {flag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {note.nextSteps && note.nextSteps.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium uppercase text-muted-foreground">
                            Next Steps
                          </p>
                          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-card-foreground">
                            {note.nextSteps.map((step, index) => (
                              <li key={`${note.id}-step-${index}`}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Company</h3>
            <p className="text-card-foreground">{workerCase.company}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Date of Injury</h3>
            <p className="text-card-foreground">{workerCase.dateOfInjury}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Next Step</h3>
            <p className="text-card-foreground">{workerCase.nextStep}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Due Date</h3>
            <p className="text-card-foreground">{workerCase.dueDate}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Recovery Timeline</h3>
            <RecoveryChart 
              injuryDate={workerCase.dateOfInjury}
              expectedRecoveryDate={expectedRecoveryDate.toISOString()}
            />
          </div>

          {workerCase.attachments && workerCase.attachments.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Attachments</h3>
              <div className="space-y-2">
                {workerCase.attachments.map((attachment: any) => (
                  <a
                    key={attachment.id}
                    href={attachment.url}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`link-attachment-${attachment.id}`}
                  >
                    <span className="material-symbols-outlined text-base">attach_file</span>
                    <span>{attachment.name}</span>
                    <span className="text-muted-foreground">({attachment.type})</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
  const severityBadgeStyle = (severity: TranscriptInsight["severity"]) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "warning":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };
