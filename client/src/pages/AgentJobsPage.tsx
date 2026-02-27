import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AgentJobDB, AgentActionDB } from "@shared/schema";

// ─── Types ──────────────────────────────────────────────────────────────────

interface JobListResponse {
  jobs: AgentJobDB[];
  total: number;
}

interface JobDetailResponse {
  job: AgentJobDB;
  actions: AgentActionDB[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  switch (status) {
    case "queued":
      return <Badge className="bg-slate-100 text-slate-700">Queued</Badge>;
    case "running":
      return <Badge className="bg-blue-100 text-blue-700">Running</Badge>;
    case "completed":
      return <Badge className="bg-emerald-100 text-emerald-700">Completed</Badge>;
    case "failed":
      return <Badge className="bg-red-100 text-red-700">Failed</Badge>;
    default:
      return <Badge className="bg-slate-100 text-slate-600">{status}</Badge>;
  }
}

function agentBadge(agentType: string) {
  const colors: Record<string, string> = {
    coordinator: "bg-purple-100 text-purple-700",
    rtw: "bg-amber-100 text-amber-700",
    recovery: "bg-teal-100 text-teal-700",
    certificate: "bg-orange-100 text-orange-700",
  };
  return (
    <Badge className={colors[agentType] ?? "bg-slate-100 text-slate-700"}>
      {agentType}
    </Badge>
  );
}

function approvalBadge(status: string | null | undefined) {
  if (!status) return <span className="text-xs text-muted-foreground">auto</span>;
  switch (status) {
    case "pending":
      return <Badge className="bg-amber-100 text-amber-700 text-xs">pending approval</Badge>;
    case "approved":
      return <Badge className="bg-emerald-100 text-emerald-700 text-xs">approved</Badge>;
    case "rejected":
      return <Badge className="bg-red-100 text-red-700 text-xs">rejected</Badge>;
    default:
      return <span className="text-xs text-muted-foreground">{status}</span>;
  }
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function agentIcon(agentType: string) {
  switch (agentType) {
    case "coordinator": return "hub";
    case "rtw": return "event_available";
    case "recovery": return "healing";
    case "certificate": return "description";
    default: return "smart_toy";
  }
}

// ─── Job Detail Dialog ────────────────────────────────────────────────────────

function JobDetailDialog({
  jobId,
  open,
  onClose,
}: {
  jobId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery<JobDetailResponse>({
    queryKey: ["/api/agents/jobs", jobId],
    queryFn: () =>
      fetch(`/api/agents/jobs/${jobId}`, { credentials: "include" }).then((r) => r.json()),
    enabled: !!jobId && open,
  });

  const job = data?.job;
  const actions = data?.actions ?? [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">
              {job ? agentIcon(job.agentType) : "smart_toy"}
            </span>
            Agent Job Detail
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <span className="material-symbols-outlined animate-spin text-3xl text-primary">
              progress_activity
            </span>
          </div>
        )}

        {job && (
          <div className="space-y-6">
            {/* Job metadata */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Agent</p>
                <div className="mt-1">{agentBadge(job.agentType)}</div>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <div className="mt-1">{statusBadge(job.status)}</div>
              </div>
              <div>
                <p className="text-muted-foreground">Triggered by</p>
                <p className="font-medium capitalize">{job.triggeredBy}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Case ID</p>
                <p className="font-medium font-mono text-xs">{job.caseId ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Started</p>
                <p className="font-medium">{formatDate(job.startedAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Completed</p>
                <p className="font-medium">{formatDate(job.completedAt)}</p>
              </div>
            </div>

            {/* Summary */}
            {job.summary && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-primary">summarize</span>
                    Agent Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{job.summary}</p>
                </CardContent>
              </Card>
            )}

            {/* Error */}
            {job.error && (
              <Card className="border-red-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-red-600">
                    <span className="material-symbols-outlined text-sm">error</span>
                    Error
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-red-700 font-mono whitespace-pre-wrap">{job.error}</p>
                </CardContent>
              </Card>
            )}

            {/* Action log */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-primary">receipt_long</span>
                Action Log ({actions.length} actions)
              </h3>
              {actions.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No actions recorded.</p>
              ) : (
                <div className="space-y-3">
                  {actions.map((action, idx) => (
                    <div key={action.id} className="flex gap-3">
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary">{idx + 1}</span>
                        </div>
                        {idx < actions.length - 1 && (
                          <div className="w-px flex-1 bg-border mt-1" />
                        )}
                      </div>

                      {/* Action content */}
                      <div className="flex-1 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-medium">{action.actionType}</span>
                          {approvalBadge(action.approvalStatus)}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatDate(action.executedAt)}
                          </span>
                        </div>

                        {action.reasoning && (
                          <p className="text-sm text-muted-foreground mt-1 italic">
                            {action.reasoning}
                          </p>
                        )}

                        {action.args && Object.keys(action.args).length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              Args
                            </summary>
                            <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                              {JSON.stringify(action.args, null, 2)}
                            </pre>
                          </details>
                        )}

                        {action.result && Object.keys(action.result).length > 0 && (
                          <details className="mt-1">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              Result
                            </summary>
                            <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                              {JSON.stringify(action.result, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Trigger Job Dialog ───────────────────────────────────────────────────────

function TriggerJobDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [agentType, setAgentType] = useState<string>("coordinator");
  const [caseId, setCaseId] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/agents/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          agentType,
          ...(caseId.trim() ? { caseId: caseId.trim() } : {}),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents/jobs"] });
      onClose();
      setCaseId("");
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">play_circle</span>
            Trigger Agent Job
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Agent Type</label>
            <Select value={agentType} onValueChange={setAgentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="coordinator">Coordinator (all cases)</SelectItem>
                <SelectItem value="rtw">RTW Agent (single case)</SelectItem>
                <SelectItem value="recovery">Recovery Agent (single case)</SelectItem>
                <SelectItem value="certificate">Certificate Agent (single case)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {agentType !== "coordinator" && (
            <div>
              <label className="text-sm font-medium mb-1 block">Case ID</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="Enter case ID..."
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
              />
            </div>
          )}

          {mutation.error && (
            <p className="text-sm text-red-600">
              {(mutation.error as Error).message}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || (agentType !== "coordinator" && !caseId.trim())}
            >
              {mutation.isPending ? "Triggering..." : "Trigger"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AgentJobsPage() {
  const [agentTypeFilter, setAgentTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [triggerOpen, setTriggerOpen] = useState(false);

  const params = new URLSearchParams();
  if (agentTypeFilter !== "all") params.set("agentType", agentTypeFilter);
  const queryString = params.toString();

  const { data, isLoading, refetch } = useQuery<JobListResponse>({
    queryKey: ["/api/agents/jobs", agentTypeFilter],
    queryFn: () =>
      fetch(`/api/agents/jobs${queryString ? `?${queryString}` : ""}`, {
        credentials: "include",
      }).then((r) => r.json()),
    refetchInterval: 10000, // poll every 10s while running
  });

  const jobs = data?.jobs ?? [];

  const filtered = jobs.filter(
    (j) => statusFilter === "all" || j.status === statusFilter
  );

  const stats = {
    total: jobs.length,
    running: jobs.filter((j) => j.status === "running").length,
    completed: jobs.filter((j) => j.status === "completed").length,
    failed: jobs.filter((j) => j.status === "failed").length,
  };

  return (
    <PageLayout title="Agent Jobs" subtitle="AI agent runs and their action logs">
      <div className="space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Running</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.running}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{stats.completed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters + actions */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex gap-3">
                <Select value={agentTypeFilter} onValueChange={setAgentTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Agent type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Agents</SelectItem>
                    <SelectItem value="coordinator">Coordinator</SelectItem>
                    <SelectItem value="rtw">RTW</SelectItem>
                    <SelectItem value="recovery">Recovery</SelectItem>
                    <SelectItem value="certificate">Certificate</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="queued">Queued</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <span className="material-symbols-outlined text-sm mr-1">refresh</span>
                  Refresh
                </Button>
              </div>
              <Button size="sm" onClick={() => setTriggerOpen(true)}>
                <span className="material-symbols-outlined text-sm mr-1">play_circle</span>
                Trigger Agent
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Job list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="material-symbols-outlined text-primary">smart_toy</span>
              Agent Jobs
              {stats.running > 0 && (
                <span className="ml-2 flex items-center gap-1 text-sm text-blue-600 font-normal">
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  {stats.running} running
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <span className="material-symbols-outlined animate-spin text-3xl text-primary">
                  progress_activity
                </span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <span className="material-symbols-outlined text-4xl mb-3 block">smart_toy</span>
                <p>No agent jobs found.</p>
                <p className="text-sm mt-1">Trigger an agent job or wait for the morning briefing.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => setSelectedJobId(job.id)}
                    className="w-full text-left p-4 border rounded-lg hover:bg-accent/50 transition-colors flex items-center gap-4"
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-primary text-lg">
                        {agentIcon(job.agentType)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {agentBadge(job.agentType)}
                        {statusBadge(job.status)}
                        <span className="text-xs text-muted-foreground capitalize">
                          {job.triggeredBy}
                        </span>
                      </div>
                      {job.summary && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {job.summary}
                        </p>
                      )}
                      {job.error && !job.summary && (
                        <p className="text-sm text-red-600 mt-1 truncate">{job.error}</p>
                      )}
                      {job.caseId && (
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                          Case: {job.caseId}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-muted-foreground">{formatDate(job.createdAt)}</p>
                      <span className="material-symbols-outlined text-sm text-muted-foreground mt-1">
                        chevron_right
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <JobDetailDialog
        jobId={selectedJobId}
        open={!!selectedJobId}
        onClose={() => setSelectedJobId(null)}
      />

      <TriggerJobDialog open={triggerOpen} onClose={() => setTriggerOpen(false)} />
    </PageLayout>
  );
}
