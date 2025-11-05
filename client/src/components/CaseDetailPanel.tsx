import type { WorkerCase } from "@shared/schema";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import RecoveryChart from "./RecoveryChart";

interface CaseDetailPanelProps {
  workerCase: WorkerCase;
  onClose: () => void;
}

function generateRecoveryData(dateOfInjury: string) {
  const injuryDate = new Date(dateOfInjury);
  const now = new Date();
  const daysSinceInjury = Math.floor((now.getTime() - injuryDate.getTime()) / (1000 * 60 * 60 * 24));
  const weeksElapsed = daysSinceInjury / 7;
  const expectedWeeks = 12;
  
  const normalizeWeek = (week: number) => Math.min(week / expectedWeeks, 1);
  
  const expected = [];
  for (let i = 0; i <= expectedWeeks; i += 2) {
    expected.push({ 
      x: normalizeWeek(i), 
      y: i / expectedWeeks
    });
  }
  
  const actual = [];
  const currentProgress = Math.min(weeksElapsed / expectedWeeks, 0.85);
  const steps = Math.min(Math.ceil(weeksElapsed / 2), 6);
  
  for (let i = 0; i <= steps; i++) {
    const weekPoint = (i / steps) * weeksElapsed;
    const progressVariation = 0.9 + Math.random() * 0.2;
    actual.push({
      x: normalizeWeek(weekPoint),
      y: Math.min((i / steps) * currentProgress * progressVariation, 1)
    });
  }
  
  return { expected, actual };
}

export function CaseDetailPanel({ workerCase, onClose }: CaseDetailPanelProps) {
  const { expected, actual } = generateRecoveryData(workerCase.dateOfInjury);
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
