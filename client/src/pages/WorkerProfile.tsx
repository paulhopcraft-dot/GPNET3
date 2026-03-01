import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    createdAt: string;
    completedDate: string | null;
  }>;
  bookings: Array<{
    id: string;
    serviceType: string | null;
    appointmentType: string;
    status: string;
    createdAt: string;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  sent: "bg-blue-100 text-blue-800",
  cancelled: "bg-gray-100 text-gray-600",
  confirmed: "bg-green-100 text-green-800",
};

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

  const { worker, assessments, bookings } = data;

  return (
    <PageLayout title={worker.name} subtitle="Worker Profile">
      <div className="max-w-3xl space-y-6">
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
              <p className="text-muted-foreground text-xs">Worker since</p>
              <p>{new Date(worker.createdAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        {/* Assessments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Health Assessments ({assessments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {assessments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assessments on record.</p>
            ) : (
              <div className="space-y-3">
                {assessments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{a.positionTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.createdAt).toLocaleDateString()}
                        {a.clearanceLevel && ` · ${a.clearanceLevel.replace(/_/g, " ")}`}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[a.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Telehealth Bookings ({bookings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bookings on record.</p>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">
                        {b.serviceType?.replace(/_/g, " ") ?? "General"} · {b.appointmentType.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">{new Date(b.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[b.status] ?? "bg-gray-100 text-gray-600"}`}>
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
