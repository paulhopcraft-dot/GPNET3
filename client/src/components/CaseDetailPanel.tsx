import type { WorkerCase } from "@shared/schema";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import RecoveryChart from "./RecoveryChart";

interface CaseDetailPanelProps {
  workerCase: WorkerCase;
  onClose: () => void;
}

export function CaseDetailPanel({ workerCase, onClose }: CaseDetailPanelProps) {
  // Generate recovery timeline data based on case information
  const generateRecoveryTimeline = () => {
    // Expected recovery curve (smooth progression)
    const expected = Array.from({ length: 5 }, (_, i) => ({
      x: i / 4,
      y: i / 4,
    }));
    
    // Actual recovery (varies based on work status)
    const progressFactor = workerCase.workStatus === "At work" ? 0.9 : 0.5;
    const actual = Array.from({ length: 5 }, (_, i) => ({
      x: i / 4,
      y: (i / 4) * progressFactor,
    }));
    
    return { expected, actual };
  };

  const { expected, actual } = generateRecoveryTimeline();

  return (
    <aside 
      className="w-96 flex-shrink-0 bg-card border-l border-border p-6"
      data-testid="panel-case-detail"
    >
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-xl font-bold text-card-foreground">{workerCase.workerName}</h2>
        <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-panel">
          <span className="material-symbols-outlined">close</span>
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Anticipated Recovery Timeline</h3>
            <div className="bg-background rounded-md p-4 border border-border">
              <RecoveryChart expected={expected} actual={actual} width={320} height={180} />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Company</h3>
            <p className="text-card-foreground">{workerCase.company}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Date of Injury</h3>
            <p className="text-card-foreground">{workerCase.dateOfInjury}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Summary</h3>
            <p className="text-sm text-card-foreground leading-relaxed">{workerCase.summary}</p>
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

          {workerCase.attachments && workerCase.attachments.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Attachments</h3>
              <div className="space-y-2">
                {workerCase.attachments.map((attachment) => (
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
