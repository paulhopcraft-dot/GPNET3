import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, CheckCircle, Calendar, UserPlus } from "lucide-react";

interface WorkerProfileData {
  worker: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    organizationId: string | null;
    createdAt: string;
  };
  assessments: Array<{
    id: string;
    positionTitle: string;
    status: string;
    clearanceLevel: string | null;
    sentAt: string | null;
    createdAt: string;
  }>;
  bookings: Array<{
    id: string;
    serviceType: string | null;
    appointmentType: string;
    status: string;
    createdAt: string;
  }>;
  nextCheckDue: string | null;
  recheckUrgency: "overdue" | "due_soon" | "upcoming" | "pending" | "not_applicable" | null;
  lastClearanceLevel: string | null;
  lastCompletedAt: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  sent: "bg-blue-100 text-blue-800",
  cancelled: "bg-gray-100 text-gray-600",
  confirmed: "bg-green-100 text-green-800",
  in_progress: "bg-blue-100 text-blue-800",
};

const CLEARANCE_COLORS: Record<string, string> = {
  cleared_unconditional: "bg-green-100 text-green-800",
  cleared_conditional: "bg-teal-100 text-teal-800",
  cleared_with_restrictions: "bg-orange-100 text-orange-800",
  not_cleared: "bg-red-100 text-red-800",
  requires_review: "bg-yellow-100 text-yellow-800",
};

function formatDate(s: string | null | undefined): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function RecheckBanner({ urgency, nextCheckDue, lastClearanceLevel, workerId }: {
  urgency: WorkerProfileData["recheckUrgency"];
  nextCheckDue: string | null;
  lastClearanceLevel: string | null;
  workerId: string;
}) {
  if (!urgency || urgency === "not_applicable") return null;

  if (urgency === "pending") {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg border bg-blue-50 border-blue-200 text-blue-900">
        <Clock className="h-5 w-5 shrink-0 text-blue-600" />
        <div className="flex-1">
          <p className="font-semibold text-sm">Assessment in progress</p>
          <p className="text-xs text-blue-700 mt-0.5">Awaiting worker response.</p>
        </div>
      </div>
    );
  }

  const config = {
    overdue: {
      bg: "bg-red-50 border-red-300",
      text: "text-red-900",
      sub: "text-red-700",
      icon: <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />,
      title: "Health check OVERDUE",
      msg: `Was due ${formatDate(nextCheckDue)}. Schedule immediately.`,
      btn: "bg-red-600 hover:bg-red-700 text-white",
      btnLabel: "Schedule Now",
    },
    due_soon: {
      bg: "bg-amber-50 border-amber-300",
      text: "text-amber-900",
      sub: "text-amber-700",
      icon: <Clock className="h-5 w-5 shrink-0 text-amber-600" />,
      title: "Health check due soon",
      msg: `Due ${formatDate(nextCheckDue)}. Book within 60 days.`,
      btn: "bg-amber-500 hover:bg-amber-600 text-white",
      btnLabel: "Schedule Check",
    },
    upcoming: {
      bg: "bg-green-50 border-green-200",
      text: "text-green-900",
      sub: "text-green-700",
      icon: <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />,
      title: "Next health check scheduled",
      msg: `Recommended ${formatDate(nextCheckDue)}.`,
      btn: "bg-green-600 hover:bg-green-700 text-white",
      btnLabel: "Schedule Early",
    },
  }[urgency];

  if (!config) return null;

  return (
    <div className={`flex items-center gap-3 p-4 rounded-lg border ${config.bg}`}>
      {config.icon}
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${config.text}`}>{config.title}</p>
        <p className={`text-xs mt-0.5 ${config.sub}`}>
          {config.msg}
          {lastClearanceLevel && (
            <> Last result: <span className="font-medium">{lastClearanceLevel.replace(/_/g, " ")}</span>.</>
          )}
        </p>
      </div>
      <Button size="sm" className={config.btn} asChild>
        <Link to={`/assessments/new`}>
          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
          {config.btnLabel}
        </Link>
      </Button>
    </div>
  );
}

export default function WorkerProfile() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery<WorkerProfileData>({
    queryKey: ["worker-profile", id],
    queryFn: () =>
      fetch(`/api/workers/${id}`, { credentials: "include" }).then((r) => {
        if (!r.ok) throw new Error("Failed to load worker profile");
        return r.json();
      }),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <PageLayout title="Worker Profile">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageLayout>
    );
  }

  if (error || !data) {
    return (
      <PageLayout title="Worker Profile">
        <div className="text-center py-12 text-muted-foreground">Worker not found.</div>
      </PageLayout>
    );
  }

  const { worker, assessments, bookings, nextCheckDue, recheckUrgency, lastClearanceLevel, lastCompletedAt } = data;

  return (
    <PageLayout title={worker.name} subtitle="Worker Health Profile">
      <div className="max-w-3xl space-y-4">

        {/* Next Check Recommendation — top of page, high visibility */}
        <RecheckBanner
          urgency={recheckUrgency}
          nextCheckDue={nextCheckDue}
          lastClearanceLevel={lastClearanceLevel}
          workerId={worker.id}
        />

        {/* Worker details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Email</p>
              <p>{worker.email ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Phone</p>
              <p>{worker.phone ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Added</p>
              <p>{formatDate(worker.createdAt)}</p>
            </div>
            {lastCompletedAt && (
              <div>
                <p className="text-muted-foreground text-xs">Last check completed</p>
                <p>{formatDate(lastCompletedAt)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Health Assessments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Health Assessments ({assessments.length})</CardTitle>
              <Button size="sm" variant="outline" asChild>
                <Link to="/assessments/new">
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                  New Check
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {assessments.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No assessments on record.</p>
                <Button size="sm" className="mt-3" asChild>
                  <Link to="/assessments/new">Schedule First Check</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {assessments.map((a) => (
                  <div key={a.id} className="py-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{a.positionTitle}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {a.sentAt ? `Sent ${formatDate(a.sentAt)}` : `Created ${formatDate(a.createdAt)}`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[a.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {a.status}
                      </span>
                      {a.clearanceLevel && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CLEARANCE_COLORS[a.clearanceLevel] ?? "bg-gray-100 text-gray-600"}`}>
                          {a.clearanceLevel.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Telehealth Bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Telehealth Bookings ({bookings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bookings on record.</p>
            ) : (
              <div className="divide-y">
                {bookings.map((b) => (
                  <div key={b.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {b.serviceType?.replace(/_/g, " ") ?? "General"} · {b.appointmentType.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(b.createdAt)}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[b.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
