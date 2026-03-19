import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Bot,
  Brain,
  Upload,
  Shield,
  Users,
  Briefcase,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Server,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { MetricCard } from "@/components/control-tower/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── API helpers ────────────────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

function useControlQuery<T>(key: string, path: string) {
  return useQuery<T, Error>({
    queryKey: ["control", key],
    queryFn: () => fetchJson<T>(`/api/control/${path}`),
    refetchInterval: 30_000,
    staleTime: 25_000,
  });
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface OverviewData {
  totalCases: number;
  openCases: number;
  totalUsers: number;
  agentJobsToday: number;
  agentJobsFailed: number;
  uploadsToday: number;
  generatedAt: string;
}

interface AgentJob {
  id: string;
  agentType: string;
  status: string;
  summary: string | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface AgentsData {
  last24h: {
    total: number;
    completed: number;
    failed: number;
    running: number;
    queued: number;
  };
  byType: Record<string, number>;
  totalActionsLast7d: number;
  recentJobs: AgentJob[];
}

interface AIData {
  provider: string;
  model: string;
  callsLast24h: number;
  callsLast7d: number;
  avgDurationMs: number;
}

interface UploadsData {
  uploadsLast24h: number;
  uploadsLast7d: number;
  byType: Record<string, number>;
  storageProvider: string;
}

interface AuthData {
  last24h: {
    logins: number;
    registrations: number;
    loginFailures: number;
    total: number;
  };
  last7d: {
    logins: number;
    registrations: number;
    loginFailures: number;
    total: number;
  };
}

interface AlertEntry {
  id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  timestamp: string;
  resolved: boolean;
  details?: Record<string, unknown>;
}

interface AlertsData {
  activeCount: number;
  failureCount: number;
  activeAlerts: AlertEntry[];
  recentAlerts: AlertEntry[];
  systemFailures: AlertEntry[];
}

interface PerformanceSnapshot {
  uptimeMs: number;
  totalRequests: number;
  totalErrors: number;
  errorRatePct: number;
  api: {
    avgLatencyMs: number;
    p95LatencyMs: number;
    maxLatencyMs: number;
    sampleCount: number;
    byRoute: Record<string, { avg: number; p95: number; count: number }>;
  };
  agents: {
    avgDurationMs: number;
    p95DurationMs: number;
    sampleCount: number;
    byType: Record<string, { avg: number; count: number }>;
  };
  ai: {
    avgLatencyMs: number;
    p95LatencyMs: number;
    sampleCount: number;
  };
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    completed: { label: "Completed", className: "bg-green-500/15 text-green-700 border-green-500/30" },
    failed: { label: "Failed", className: "bg-red-500/15 text-red-700 border-red-500/30" },
    running: { label: "Running", className: "bg-blue-500/15 text-blue-700 border-blue-500/30" },
    queued: { label: "Queued", className: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30" },
  };
  const c = config[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <Badge variant="outline" className={cn("text-xs", c.className)}>
      {c.label}
    </Badge>
  );
}

function SectionError({ label }: { label: string }) {
  return (
    <Card className="border-red-500/30">
      <CardContent className="pt-4 text-sm text-muted-foreground">
        Failed to load {label} metrics.
      </CardContent>
    </Card>
  );
}

function SectionLoading() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="pt-6 h-24" />
        </Card>
      ))}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ControlTowerPage() {
  const overview = useControlQuery<OverviewData>("overview", "overview");
  const agents = useControlQuery<AgentsData>("agents", "agents");
  const ai = useControlQuery<AIData>("ai", "ai");
  const uploads = useControlQuery<UploadsData>("uploads", "uploads");
  const auth = useControlQuery<AuthData>("auth", "auth");
  const alerts = useControlQuery<AlertsData>("alerts", "alerts");
  const perf = useControlQuery<PerformanceSnapshot>("performance", "performance");

  const lastRefresh = overview.dataUpdatedAt
    ? new Date(overview.dataUpdatedAt).toLocaleTimeString()
    : "—";

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Control Tower</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live operational metrics — auto-refreshes every 30 s
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="h-3 w-3" />
          Last updated: {lastRefresh}
        </div>
      </div>

      {/* ── Overview ── */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Overview
        </h2>
        {overview.isError ? (
          <SectionError label="overview" />
        ) : overview.isLoading ? (
          <SectionLoading />
        ) : overview.data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <MetricCard
              title="Total Cases"
              value={overview.data.totalCases.toLocaleString()}
              icon={Briefcase}
            />
            <MetricCard
              title="Open Cases"
              value={overview.data.openCases.toLocaleString()}
              icon={Activity}
              variant={overview.data.openCases > 0 ? "success" : "default"}
            />
            <MetricCard
              title="Total Users"
              value={overview.data.totalUsers.toLocaleString()}
              icon={Users}
            />
            <MetricCard
              title="Agent Jobs (24h)"
              value={overview.data.agentJobsToday.toLocaleString()}
              icon={Bot}
            />
            <MetricCard
              title="Agent Failures (24h)"
              value={overview.data.agentJobsFailed.toLocaleString()}
              icon={XCircle}
              variant={overview.data.agentJobsFailed > 0 ? "danger" : "success"}
            />
            <MetricCard
              title="Uploads (24h)"
              value={overview.data.uploadsToday.toLocaleString()}
              icon={Upload}
            />
          </div>
        ) : null}
      </section>

      {/* ── Agents ── */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          AI Agents
        </h2>
        {agents.isError ? (
          <SectionError label="agents" />
        ) : agents.isLoading ? (
          <SectionLoading />
        ) : agents.data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Completed (24h)"
                value={agents.data.last24h.completed}
                icon={CheckCircle2}
                variant="success"
              />
              <MetricCard
                title="Failed (24h)"
                value={agents.data.last24h.failed}
                icon={XCircle}
                variant={agents.data.last24h.failed > 0 ? "danger" : "success"}
              />
              <MetricCard
                title="Running / Queued"
                value={`${agents.data.last24h.running} / ${agents.data.last24h.queued}`}
                icon={Clock}
              />
              <MetricCard
                title="Total Actions (7d)"
                value={agents.data.totalActionsLast7d.toLocaleString()}
                icon={Activity}
              />
            </div>

            {/* By type breakdown */}
            {Object.keys(agents.data.byType).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(agents.data.byType).map(([type, count]) => (
                  <div
                    key={type}
                    className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm"
                  >
                    <span className="font-medium capitalize">{type}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Recent jobs */}
            {agents.data.recentJobs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Recent Jobs</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {agents.data.recentJobs.map((job) => (
                      <div
                        key={job.id}
                        className="flex items-start justify-between gap-4 px-4 py-3 text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="capitalize font-medium">{job.agentType}</span>
                            <StatusBadge status={job.status} />
                          </div>
                          {job.summary && (
                            <p className="text-muted-foreground text-xs mt-0.5 truncate">
                              {job.summary}
                            </p>
                          )}
                          {job.error && (
                            <p className="text-red-600 text-xs mt-0.5 truncate">{job.error}</p>
                          )}
                        </div>
                        <time className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(job.createdAt).toLocaleTimeString()}
                        </time>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}
      </section>

      {/* ── AI / LLM ── */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          AI / LLM
        </h2>
        {ai.isError ? (
          <SectionError label="AI" />
        ) : ai.isLoading ? (
          <SectionLoading />
        ) : ai.data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Provider"
              value={ai.data.provider}
              subtitle={ai.data.model}
              icon={Brain}
            />
            <MetricCard
              title="Calls (24h)"
              value={ai.data.callsLast24h.toLocaleString()}
              icon={Activity}
            />
            <MetricCard
              title="Calls (7d)"
              value={ai.data.callsLast7d.toLocaleString()}
              icon={Activity}
            />
            <MetricCard
              title="Avg Duration"
              value={
                ai.data.avgDurationMs > 0
                  ? `${(ai.data.avgDurationMs / 1000).toFixed(1)}s`
                  : "—"
              }
              icon={Clock}
            />
          </div>
        ) : null}
      </section>

      {/* ── Performance ── */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Performance
        </h2>
        {perf.isError ? (
          <SectionError label="performance" />
        ) : perf.isLoading ? (
          <SectionLoading />
        ) : perf.data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Avg API Latency"
                value={`${perf.data.api.avgLatencyMs}ms`}
                subtitle={`p95: ${perf.data.api.p95LatencyMs}ms`}
                icon={Clock}
                variant={perf.data.api.avgLatencyMs > 500 ? "warning" : "default"}
              />
              <MetricCard
                title="Avg AI Latency"
                value={
                  perf.data.ai.sampleCount > 0
                    ? `${(perf.data.ai.avgLatencyMs / 1000).toFixed(1)}s`
                    : "—"
                }
                subtitle={
                  perf.data.ai.sampleCount > 0
                    ? `p95: ${(perf.data.ai.p95LatencyMs / 1000).toFixed(1)}s`
                    : "No data yet"
                }
                icon={Brain}
              />
              <MetricCard
                title="Avg Agent Duration"
                value={
                  perf.data.agents.sampleCount > 0
                    ? `${(perf.data.agents.avgDurationMs / 1000).toFixed(1)}s`
                    : "—"
                }
                subtitle={
                  perf.data.agents.sampleCount > 0
                    ? `p95: ${(perf.data.agents.p95DurationMs / 1000).toFixed(1)}s`
                    : "No data yet"
                }
                icon={Bot}
              />
              <MetricCard
                title="Error Rate"
                value={`${perf.data.errorRatePct}%`}
                subtitle={`${perf.data.totalRequests.toLocaleString()} total requests`}
                icon={AlertTriangle}
                variant={perf.data.errorRatePct > 1 ? "danger" : "success"}
              />
            </div>

            {/* Per-route breakdown */}
            {Object.keys(perf.data.api.byRoute).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">API Latency by Route</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {Object.entries(perf.data.api.byRoute)
                      .sort(([, a], [, b]) => b.avg - a.avg)
                      .slice(0, 10)
                      .map(([route, stats]) => (
                        <div key={route} className="flex items-center justify-between px-4 py-2 text-sm">
                          <span className="font-mono text-xs text-muted-foreground">{route}</span>
                          <div className="flex gap-4 text-right">
                            <span>avg <strong>{stats.avg}ms</strong></span>
                            <span className="text-muted-foreground">p95 {stats.p95}ms</span>
                            <span className="text-muted-foreground w-16">{stats.count} req</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}
      </section>

      {/* ── Uploads + Auth side by side ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Uploads */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            File Uploads
          </h2>
          {uploads.isError ? (
            <SectionError label="uploads" />
          ) : uploads.isLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6 h-24" />
                </Card>
              ))}
            </div>
          ) : uploads.data ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <MetricCard
                  title="Uploads (24h)"
                  value={uploads.data.uploadsLast24h}
                  icon={Upload}
                />
                <MetricCard
                  title="Uploads (7d)"
                  value={uploads.data.uploadsLast7d}
                  icon={Upload}
                />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Server className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Storage:</span>
                <Badge variant="outline" className="font-mono">
                  {uploads.data.storageProvider}
                </Badge>
              </div>
              {Object.keys(uploads.data.byType).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(uploads.data.byType).map(([type, count]) => (
                    <div
                      key={type}
                      className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs"
                    >
                      <span className="font-medium">{type}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </section>

        {/* Alerts */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            System Alerts
          </h2>
          {alerts.isError ? (
            <SectionError label="alerts" />
          ) : alerts.isLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6 h-24" />
                </Card>
              ))}
            </div>
          ) : alerts.data ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <MetricCard
                  title="Active Alerts"
                  value={alerts.data.activeCount}
                  icon={AlertTriangle}
                  variant={alerts.data.activeCount > 0 ? "danger" : "success"}
                />
                <MetricCard
                  title="System Failures (24h)"
                  value={alerts.data.failureCount}
                  icon={XCircle}
                  variant={alerts.data.failureCount > 0 ? "danger" : "success"}
                />
              </div>
              {alerts.data.activeAlerts.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-green-600 py-2">
                  <CheckCircle2 className="h-4 w-4" />
                  No active alerts — all systems nominal
                </div>
              ) : (
                <Card className="border-red-500/30">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-red-700">
                      Active Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {alerts.data.activeAlerts.map((alert) => (
                        <div key={alert.id} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs",
                                  alert.severity === "critical"
                                    ? "bg-red-500/15 text-red-700 border-red-500/30"
                                    : "bg-yellow-500/15 text-yellow-700 border-yellow-500/30"
                                )}
                              >
                                {alert.severity}
                              </Badge>
                              <span className="font-medium">{alert.type.replace(/_/g, " ")}</span>
                            </div>
                            <p className="text-muted-foreground text-xs mt-0.5">{alert.message}</p>
                          </div>
                          <time className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(alert.timestamp).toLocaleTimeString()}
                          </time>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : null}
        </section>

        {/* Auth */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Authentication
          </h2>
          {auth.isError ? (
            <SectionError label="auth" />
          ) : auth.isLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6 h-24" />
                </Card>
              ))}
            </div>
          ) : auth.data ? (
            <div className="grid grid-cols-2 gap-4">
              <MetricCard
                title="Logins (24h)"
                value={auth.data.last24h.logins}
                subtitle={`${auth.data.last7d.logins} in 7 days`}
                icon={Users}
                variant="success"
              />
              <MetricCard
                title="Login Failures (24h)"
                value={auth.data.last24h.loginFailures}
                subtitle={`${auth.data.last7d.loginFailures} in 7 days`}
                icon={AlertTriangle}
                variant={auth.data.last24h.loginFailures > 5 ? "danger" : "default"}
              />
              <MetricCard
                title="Registrations (24h)"
                value={auth.data.last24h.registrations}
                subtitle={`${auth.data.last7d.registrations} in 7 days`}
                icon={Shield}
              />
              <MetricCard
                title="Total Events (24h)"
                value={auth.data.last24h.total}
                subtitle={`${auth.data.last7d.total} in 7 days`}
                icon={Activity}
              />
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
