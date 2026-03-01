import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, UserPlus, AlertTriangle, Clock, CheckCircle, Users } from "lucide-react";

interface WorkerSummary {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  latestAssessmentStatus: string | null;
  latestClearanceLevel: string | null;
  latestPositionTitle: string | null;
  assessmentCount: number;
  nextCheckDue: string | null;
  recheckUrgency: "overdue" | "due_soon" | "upcoming" | "pending" | "not_applicable" | null;
  lastCompletedAt: string | null;
}

const CLEARANCE_BADGE: Record<string, string> = {
  cleared_unconditional: "bg-green-100 text-green-800 border-green-200",
  cleared_conditional: "bg-teal-100 text-teal-800 border-teal-200",
  cleared_with_restrictions: "bg-orange-100 text-orange-800 border-orange-200",
  not_cleared: "bg-red-100 text-red-800 border-red-200",
  requires_review: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

const URGENCY_CONFIG = {
  overdue: { label: "Overdue", badge: "bg-red-100 text-red-800 border-red-200", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  due_soon: { label: "Due soon", badge: "bg-amber-100 text-amber-800 border-amber-200", icon: <Clock className="h-3.5 w-3.5" /> },
  upcoming: { label: "Upcoming", badge: "bg-green-100 text-green-800 border-green-200", icon: <CheckCircle className="h-3.5 w-3.5" /> },
  pending: { label: "Pending", badge: "bg-blue-100 text-blue-800 border-blue-200", icon: <Clock className="h-3.5 w-3.5" /> },
  not_applicable: { label: "N/A", badge: "bg-gray-100 text-gray-600 border-gray-200", icon: null },
};

function formatDate(s: string | null | undefined): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export default function WorkersListPage() {
  const [search, setSearch] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("all");

  const { data, isLoading } = useQuery<{ workers: WorkerSummary[] }>({
    queryKey: ["workers-summary"],
    queryFn: () => fetch("/api/workers", { credentials: "include" }).then(r => r.json()),
  });

  const workers = data?.workers ?? [];

  const filtered = workers.filter(w => {
    const matchesSearch =
      !search ||
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.email?.toLowerCase().includes(search.toLowerCase()) ||
      w.latestPositionTitle?.toLowerCase().includes(search.toLowerCase());
    const matchesUrgency = urgencyFilter === "all" || w.recheckUrgency === urgencyFilter;
    return matchesSearch && matchesUrgency;
  });

  const overdue = workers.filter(w => w.recheckUrgency === "overdue").length;
  const dueSoon = workers.filter(w => w.recheckUrgency === "due_soon").length;

  return (
    <PageLayout title="Workers" subtitle="All workers and their health check status">
      <div className="space-y-4">

        {/* Alert bar */}
        {(overdue > 0 || dueSoon > 0) && (
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-amber-50 border-amber-300 text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-sm font-medium">
              {overdue > 0 && <span className="text-red-700">{overdue} overdue check{overdue !== 1 ? "s" : ""}</span>}
              {overdue > 0 && dueSoon > 0 && " · "}
              {dueSoon > 0 && <span>{dueSoon} due within 60 days</span>}
              {" — schedule now to stay compliant."}
            </p>
            <Button size="sm" variant="outline" className="ml-auto shrink-0 h-7" asChild>
              <Link to="/assessments/new">Schedule Check</Link>
            </Button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Workers", value: workers.length, icon: <Users className="h-4 w-4 text-blue-500" /> },
            { label: "Checks Overdue", value: overdue, icon: <AlertTriangle className="h-4 w-4 text-red-500" /> },
            { label: "Due Within 60 Days", value: dueSoon, icon: <Clock className="h-4 w-4 text-amber-500" /> },
            { label: "Fully Current", value: workers.filter(w => w.recheckUrgency === "upcoming").length, icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                {s.icon}
                <div>
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or role…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by check status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All workers</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="due_soon">Due soon</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="not_applicable">N/A</SelectItem>
            </SelectContent>
          </Select>
          <Button asChild>
            <Link to="/assessments/new">
              <UserPlus className="h-4 w-4 mr-2" />
              New Check
            </Link>
          </Button>
        </div>

        {/* Workers table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {filtered.length} worker{filtered.length !== 1 ? "s" : ""}
              {search || urgencyFilter !== "all" ? " (filtered)" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-4">Loading…</p>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No workers found.</p>
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map(w => {
                  const urgCfg = w.recheckUrgency ? URGENCY_CONFIG[w.recheckUrgency] : null;
                  return (
                    <Link
                      key={w.id}
                      to={`/workers/${w.id}`}
                      className="flex items-center gap-4 py-3 hover:bg-muted/40 rounded transition-colors"
                    >
                      {/* Name + role */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{w.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {w.latestPositionTitle ?? "No role on file"} · {w.email ?? "no email"}
                        </p>
                      </div>

                      {/* Clearance */}
                      <div className="shrink-0">
                        {w.latestClearanceLevel ? (
                          <Badge className={`text-xs border ${CLEARANCE_BADGE[w.latestClearanceLevel] ?? "bg-gray-100 text-gray-600"}`}>
                            {w.latestClearanceLevel.replace(/_/g, " ")}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">no clearance</span>
                        )}
                      </div>

                      {/* Next check due */}
                      <div className="shrink-0 text-right min-w-[120px]">
                        {urgCfg && urgCfg.label !== "N/A" ? (
                          <Badge className={`text-xs border inline-flex items-center gap-1 ${urgCfg.badge}`}>
                            {urgCfg.icon}
                            {w.nextCheckDue ? formatDate(w.nextCheckDue) : urgCfg.label}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {w.latestClearanceLevel === "not_cleared" ? "Not cleared" :
                             w.latestClearanceLevel === "requires_review" ? "Review needed" : "—"}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
