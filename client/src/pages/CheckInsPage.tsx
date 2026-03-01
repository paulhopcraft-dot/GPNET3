import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WorkerCase, PaginatedCasesResponse } from "@shared/schema";
import { isLegitimateCase } from "@shared/schema";

export default function CheckInsPage() {
  const { data: paginatedData, isLoading } = useQuery<PaginatedCasesResponse>({
    queryKey: ["/api/gpnet2/cases"],
  });
  const cases = paginatedData?.cases ?? [];

  const checkInData = useMemo(() => {
    const legitimate = cases.filter(isLegitimateCase);
    const now = new Date();

    // Cases due for check-in (due date is in the past or within 7 days)
    const dueSoon = legitimate.filter((c) => {
      if (!c.dueDate || c.dueDate === "TBD") return false;
      const due = new Date(c.dueDate);
      const daysUntilDue = Math.floor((due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      return daysUntilDue <= 7;
    });

    // Cases with recent follow-ups
    const recentFollowUps = legitimate.filter((c) => {
      if (!c.clcLastFollowUp) return false;
      const lastFollowUp = new Date(c.clcLastFollowUp);
      const daysSince = Math.floor((now.getTime() - lastFollowUp.getTime()) / (24 * 60 * 60 * 1000));
      return daysSince <= 14;
    });

    // Overdue cases
    const overdue = legitimate.filter((c) => {
      if (!c.dueDate || c.dueDate === "TBD") return false;
      const due = new Date(c.dueDate);
      return due < now;
    });

    return { dueSoon, recentFollowUps, overdue, all: legitimate };
  }, [cases]);

  const getDaysStatus = (dateStr: string) => {
    if (!dateStr || dateStr === "TBD") return { label: "No date set", color: "bg-slate-100 text-slate-600" };
    const date = new Date(dateStr);
    const now = new Date();
    const days = Math.floor((date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

    if (days < 0) {
      return { label: `${Math.abs(days)} days overdue`, color: "bg-red-100 text-red-800" };
    } else if (days === 0) {
      return { label: "Due today", color: "bg-amber-100 text-amber-800" };
    } else if (days <= 3) {
      return { label: `Due in ${days} days`, color: "bg-amber-100 text-amber-800" };
    } else {
      return { label: `Due in ${days} days`, color: "bg-emerald-100 text-emerald-800" };
    }
  };

  if (isLoading) {
    return (
      <PageLayout title="Check-ins" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">
            progress_activity
          </span>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Check-ins" subtitle="Upcoming and recent case check-ins">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Cases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{checkInData.all.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Overdue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{checkInData.overdue.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Due This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{checkInData.dueSoon.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Recent Follow-ups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{checkInData.recentFollowUps.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Overdue Section */}
        {checkInData.overdue.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600">warning</span>
              Overdue Check-ins
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {checkInData.overdue.map((workerCase) => {
                const status = getDaysStatus(workerCase.dueDate);
                return (
                  <Card key={workerCase.id} className="border-red-200">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-medium">{workerCase.workerName}</h3>
                          <p className="text-sm text-muted-foreground">{workerCase.company}</p>
                        </div>
                        <Badge className={status.color}>{status.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {workerCase.nextStep}
                      </p>
                      <Link to={`/summary/${workerCase.id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          Review Case
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Due Soon Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600">schedule</span>
            Due This Week
          </h2>
          {checkInData.dueSoon.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No check-ins due this week
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {checkInData.dueSoon.filter((c) => !checkInData.overdue.includes(c)).map((workerCase) => {
                const status = getDaysStatus(workerCase.dueDate);
                return (
                  <Card key={workerCase.id}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-medium">{workerCase.workerName}</h3>
                          <p className="text-sm text-muted-foreground">{workerCase.company}</p>
                        </div>
                        <Badge className={status.color}>{status.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {workerCase.nextStep}
                      </p>
                      <Link to={`/summary/${workerCase.id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          View Details
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600">check_circle</span>
            Recent Follow-ups
          </h2>
          {checkInData.recentFollowUps.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No recent follow-ups in the last 14 days
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {checkInData.recentFollowUps.slice(0, 6).map((workerCase) => (
                <Card key={workerCase.id}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium">{workerCase.workerName}</h3>
                        <p className="text-sm text-muted-foreground">{workerCase.company}</p>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-800">Followed Up</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Last follow-up: {workerCase.clcLastFollowUp}
                    </p>
                    {workerCase.clcNextFollowUp && (
                      <p className="text-sm text-muted-foreground">
                        Next: {workerCase.clcNextFollowUp}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
