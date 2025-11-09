import { useState, useEffect } from "react";
import type { WorkerCase } from "@shared/schema";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { RecoveryChart } from "./RecoveryChart";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface CaseDetailPanelProps {
  workerCase: WorkerCase;
  onClose: () => void;
}

function generateRecoveryData(dateOfInjury: string) {
  const injuryDate = new Date(dateOfInjury);
  const now = new Date();
  const daysSinceInjury = Math.max(Math.floor((now.getTime() - injuryDate.getTime()) / (1000 * 60 * 60 * 24)), 1);
  const weeksElapsed = Math.max(daysSinceInjury / 7, 0.5);
  const expectedWeeks = 12;
  
  const normalizeWeek = (week: number) => Math.max(0, Math.min(week / expectedWeeks, 1));
  
  const expected = [];
  for (let i = 0; i <= expectedWeeks; i += 2) {
    expected.push({ 
      x: normalizeWeek(i), 
      y: Math.max(0, Math.min(i / expectedWeeks, 1))
    });
  }
  
  const actual = [];
  const currentProgress = Math.min(weeksElapsed / expectedWeeks, 0.85);
  const steps = Math.max(Math.min(Math.ceil(weeksElapsed / 2), 6), 2);
  
  for (let i = 0; i <= steps; i++) {
    const weekPoint = (i / steps) * weeksElapsed;
    const progressVariation = 0.9 + Math.random() * 0.2;
    const yValue = (i / steps) * currentProgress * progressVariation;
    actual.push({
      x: normalizeWeek(weekPoint),
      y: Math.max(0, Math.min(yValue, 1))
    });
  }
  
  return { expected, actual };
}

export function CaseDetailPanel({ workerCase, onClose }: CaseDetailPanelProps) {
  const { expected, actual } = generateRecoveryData(workerCase.dateOfInjury);
  const [aiSummary, setAiSummary] = useState<string | null>(workerCase.aiSummary || null);
  const [summaryMeta, setSummaryMeta] = useState<{
    generatedAt?: string;
    model?: string;
    needsRefresh?: boolean;
    cached?: boolean;
  }>({
    generatedAt: workerCase.aiSummaryGeneratedAt,
    model: workerCase.aiSummaryModel,
  });
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const fetchCachedSummary = async (): Promise<boolean> => {
    try {
      const response = await fetch(`/api/cases/${workerCase.id}/summary`);
      if (!response.ok) {
        throw new Error("Failed to fetch summary");
      }
      const data = await response.json();
      
      if (data.summary) {
        setAiSummary(data.summary);
      }
      setSummaryMeta({
        generatedAt: data.generatedAt,
        model: data.model,
        needsRefresh: data.needsRefresh,
      });
      
      // Return whether we need to generate a new summary
      return data.needsRefresh || !data.summary;
    } catch (error) {
      console.error("Error fetching summary:", error);
      return true; // On error, try to generate
    }
  };

  const generateSummary = async () => {
    setLoadingSummary(true);
    setSummaryError(null);
    
    try {
      const response = await fetch(`/api/cases/${workerCase.id}/summary`, {
        method: 'POST',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to generate summary");
      }
      const data = await response.json();
      setAiSummary(data.summary);
      setSummaryMeta({
        generatedAt: data.generatedAt,
        model: data.model,
        cached: data.cached,
        needsRefresh: false,
      });
    } catch (error) {
      console.error("Error generating AI summary:", error);
      setSummaryError(error instanceof Error ? error.message : "AI summary temporarily unavailable");
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    const initSummary = async () => {
      // Fetch cached summary metadata on mount
      const needsGeneration = await fetchCachedSummary();
      
      // After fetching, generate if needed
      if (needsGeneration && !loadingSummary) {
        generateSummary();
      }
    };
    
    initSummary();
  }, [workerCase.id]);

  return (
    <aside className="w-96 flex-shrink-0 bg-card border-l border-border p-6">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-xl font-bold text-card-foreground">{workerCase.workerName}</h2>
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
                    onClick={generateSummary}
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

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Company</h3>
            <p className="text-card-foreground">{workerCase.company}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Date of Injury</h3>
            <p className="text-card-foreground">{workerCase.dateOfInjury}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Current Status</h3>
            <p className="text-card-foreground">{workerCase.currentStatus}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Next Step</h3>
            <p className="text-card-foreground">{workerCase.nextStep}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Owner</h3>
            <p className="text-card-foreground">{workerCase.owner}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Due Date</h3>
            <p className="text-card-foreground">{workerCase.dueDate}</p>
          </div>

          {workerCase.clcLastFollowUp && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Last Follow-up</h3>
              <p className="text-card-foreground">{workerCase.clcLastFollowUp}</p>
            </div>
          )}

          {workerCase.clcNextFollowUp && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Next Follow-up</h3>
              <p className="text-card-foreground">{workerCase.clcNextFollowUp}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Recovery Timeline</h3>
            <div className="bg-background rounded-lg p-4 border border-border" data-testid="recovery-timeline-chart">
              <RecoveryChart expected={expected} actual={actual} width={320} height={200} />
              <div className="flex items-center justify-center gap-6 mt-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 border-t-2 border-dashed border-muted-foreground"></div>
                  <span className="text-muted-foreground">Expected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-emerald-600"></div>
                  <span className="text-muted-foreground">Actual</span>
                </div>
              </div>
            </div>
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
