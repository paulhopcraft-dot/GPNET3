import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserPlus,
  Shield,
  Activity,
  Heart,
  Brain,
  LogOut,
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  Calendar,
  FileText,
  TrendingUp
} from "lucide-react";

interface Assessment {
  id: string;
  candidateName: string;
  positionTitle: string;
  status: string;
  clearanceLevel?: string | null;
  sentAt?: string | null;
  createdAt: string;
}

function clearanceBadgeClass(level?: string | null): string {
  if (!level) return "bg-gray-100 text-gray-700 border-gray-200";
  const l = level.toUpperCase();
  if (l === "CLEARED" || l.startsWith("CLEARED_")) return "bg-green-100 text-green-800 border-green-200";
  if (l === "REQUIRES_REVIEW" || l === "PENDING_REVIEW") return "bg-yellow-100 text-yellow-800 border-yellow-200";
  if (l === "NOT_CLEARED" || l.startsWith("NOT_")) return "bg-red-100 text-red-800 border-red-200";
  if (l.startsWith("CLEARED_WITH_RESTRICTIONS")) return "bg-orange-100 text-orange-800 border-orange-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "completed": return "bg-green-100 text-green-800 border-green-200";
    case "sent": return "bg-blue-100 text-blue-800 border-blue-200";
    case "created": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    default: return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function formatDate(s?: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export default function ChecksPage() {
  const [activeTab, setActiveTab] = useState("pre-employment");

  const { data: assessmentsData, isLoading: assessmentsLoading } = useQuery<{ assessments: Assessment[] }>({
    queryKey: ["assessments"],
    queryFn: () => fetch("/api/assessments", { credentials: "include" }).then(r => r.json()),
  });

  const assessments = assessmentsData?.assessments ?? [];
  const peStats = {
    total: assessments.length,
    pending: assessments.filter(a => a.status === "created" || a.status === "sent").length,
    completed: assessments.filter(a => a.status === "completed").length,
    cleared: assessments.filter(a => {
      const l = (a.clearanceLevel ?? "").toUpperCase();
      return l.startsWith("CLEARED") && !l.startsWith("CLEARED_WITH_RESTRICTIONS");
    }).length,
  };

  // Mock data for other check types (not yet wired to real APIs)
  const checkStats = {
    prevention: { total: 45, due: 7, completed: 38, overdue: 2 },
    injury: { total: 8, active: 3, resolved: 5, critical: 1 },
    wellness: { total: 67, scheduled: 12, completed: 55, flagged: 3 },
    mentalHealth: { total: 23, active: 5, scheduled: 8, completed: 18 },
    exit: { total: 4, pending: 2, completed: 2, clearanceReady: 1 }
  };

  const StatCard = ({ title, value, description, icon: Icon, color = "blue" }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 text-${color}-600`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  return (
    <PageLayout title="Health Checks" subtitle="Comprehensive employee health monitoring across all lifecycle stages">
      <div className="space-y-6">

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="pre-employment" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Pre-Employment
            </TabsTrigger>
            <TabsTrigger value="prevention" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Prevention
            </TabsTrigger>
            <TabsTrigger value="injury" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Injury
            </TabsTrigger>
            <TabsTrigger value="wellness" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Wellness
            </TabsTrigger>
            <TabsTrigger value="mental-health" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Mental Health
            </TabsTrigger>
            <TabsTrigger value="exit" className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Exit
            </TabsTrigger>
          </TabsList>

          {/* PRE-EMPLOYMENT CHECKS */}
          <TabsContent value="pre-employment" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard
                title="Total Assessments"
                value={assessmentsLoading ? "…" : peStats.total}
                description="All time"
                icon={Users}
                color="blue"
              />
              <StatCard
                title="Awaiting Response"
                value={assessmentsLoading ? "…" : peStats.pending}
                description="Created or sent"
                icon={Clock}
                color="yellow"
              />
              <StatCard
                title="Completed"
                value={assessmentsLoading ? "…" : peStats.completed}
                description="Questionnaire submitted"
                icon={CheckCircle}
                color="green"
              />
              <StatCard
                title="Cleared for Work"
                value={assessmentsLoading ? "…" : peStats.cleared}
                description="Ready to start"
                icon={Shield}
                color="green"
              />
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Pre-Employment Health Assessments</CardTitle>
                    <CardDescription>Candidate health screening and clearance management</CardDescription>
                  </div>
                  <Button asChild>
                    <Link to="/assessments/new">New Assessment</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {assessmentsLoading ? (
                  <p className="text-sm text-muted-foreground py-4">Loading assessments…</p>
                ) : assessments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserPlus className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No assessments yet. Create one to get started.</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {assessments.slice(0, 10).map((a) => (
                      <div key={a.id} className="py-3 flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{a.candidateName}</p>
                          <p className="text-xs text-muted-foreground truncate">{a.positionTitle}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {a.sentAt ? `Sent ${formatDate(a.sentAt)}` : `Created ${formatDate(a.createdAt)}`}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge className={`text-xs border ${statusBadgeClass(a.status)}`}>
                            {a.status}
                          </Badge>
                          {a.clearanceLevel && (
                            <Badge className={`text-xs border ${clearanceBadgeClass(a.clearanceLevel)}`}>
                              {a.clearanceLevel.replace(/_/g, " ")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {assessments.length > 10 && (
                      <p className="text-xs text-muted-foreground pt-3">
                        +{assessments.length - 10} more assessments
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PREVENTION CHECKS */}
          <TabsContent value="prevention" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard
                title="Active Programs"
                value={checkStats.prevention.total}
                description="Prevention initiatives"
                icon={Shield}
                color="blue"
              />
              <StatCard
                title="Due This Week"
                value={checkStats.prevention.due}
                description="Scheduled checks"
                icon={Calendar}
                color="orange"
              />
              <StatCard
                title="Completed"
                value={checkStats.prevention.completed}
                description="This quarter"
                icon={CheckCircle}
                color="green"
              />
              <StatCard
                title="Overdue"
                value={checkStats.prevention.overdue}
                description="Requires attention"
                icon={AlertTriangle}
                color="red"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Prevention & Wellness Programs</CardTitle>
                <CardDescription>Proactive health monitoring and injury prevention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  • Regular health screenings<br/>
                  • Workplace safety assessments<br/>
                  • Ergonomic evaluations<br/>
                  • Health and safety training compliance
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline">Manage Programs</Button>
                  <Button asChild>
                    <Link to="/prevention-assessment-form">New Assessment</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* INJURY CHECKS */}
          <TabsContent value="injury" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard
                title="Active Cases"
                value={checkStats.injury.active}
                description="Currently managing"
                icon={Activity}
                color="red"
              />
              <StatCard
                title="Total Cases"
                value={checkStats.injury.total}
                description="This year"
                icon={FileText}
                color="blue"
              />
              <StatCard
                title="Resolved"
                value={checkStats.injury.resolved}
                description="Successfully closed"
                icon={CheckCircle}
                color="green"
              />
              <StatCard
                title="Critical"
                value={checkStats.injury.critical}
                description="Requiring urgent attention"
                icon={AlertTriangle}
                color="red"
              />
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Injury Management</CardTitle>
                    <CardDescription>Workplace injury tracking and return-to-work coordination</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" asChild>
                      <Link to="/cases">View All Cases</Link>
                    </Button>
                    <Button asChild>
                      <Link to="/injury-assessment-form">New Injury Report</Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  • Incident reporting and documentation<br/>
                  • Medical certificate management<br/>
                  • Return-to-work planning<br/>
                  • Recovery timeline tracking
                </div>
                <div className="mt-4">
                  <Button variant="outline" asChild>
                    <Link to="/comprehensive-rtw-form">New RTW Assessment</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WELLNESS CHECKS */}
          <TabsContent value="wellness" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard
                title="Enrolled"
                value={checkStats.wellness.total}
                description="In wellness programs"
                icon={Heart}
                color="pink"
              />
              <StatCard
                title="Scheduled"
                value={checkStats.wellness.scheduled}
                description="Upcoming checks"
                icon={Calendar}
                color="blue"
              />
              <StatCard
                title="Completed"
                value={checkStats.wellness.completed}
                description="This year"
                icon={CheckCircle}
                color="green"
              />
              <StatCard
                title="Health Flags"
                value={checkStats.wellness.flagged}
                description="Require follow-up"
                icon={AlertTriangle}
                color="orange"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>General Health & Wellbeing</CardTitle>
                <CardDescription>Comprehensive employee wellness monitoring</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  • Annual health screenings<br/>
                  • Biometric monitoring<br/>
                  • Fitness assessments<br/>
                  • Health education programs
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline">Wellness Dashboard</Button>
                  <Button asChild>
                    <Link to="/wellness-form">New Wellness Assessment</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MENTAL HEALTH CHECKS */}
          <TabsContent value="mental-health" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard
                title="Active Support"
                value={checkStats.mentalHealth.active}
                description="Currently supported"
                icon={Brain}
                color="purple"
              />
              <StatCard
                title="Total Enrolled"
                value={checkStats.mentalHealth.total}
                description="In MH programs"
                icon={Users}
                color="blue"
              />
              <StatCard
                title="Scheduled"
                value={checkStats.mentalHealth.scheduled}
                description="Upcoming sessions"
                icon={Calendar}
                color="orange"
              />
              <StatCard
                title="Completed"
                value={checkStats.mentalHealth.completed}
                description="Sessions this quarter"
                icon={CheckCircle}
                color="green"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Mental Health Support</CardTitle>
                <CardDescription>Employee mental health and wellbeing services</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  • Psychological assessments<br/>
                  • Counseling and therapy coordination<br/>
                  • Stress and anxiety management<br/>
                  • Mental health first aid training
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline">Mental Health Dashboard</Button>
                  <Button asChild>
                    <Link to="/mental-health-form">New MH Assessment</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* EXIT CHECKS */}
          <TabsContent value="exit" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard
                title="Active Exits"
                value={checkStats.exit.total}
                description="In progress"
                icon={LogOut}
                color="gray"
              />
              <StatCard
                title="Pending Checks"
                value={checkStats.exit.pending}
                description="Health assessments"
                icon={Clock}
                color="orange"
              />
              <StatCard
                title="Completed"
                value={checkStats.exit.completed}
                description="Fully processed"
                icon={CheckCircle}
                color="green"
              />
              <StatCard
                title="Ready for Clearance"
                value={checkStats.exit.clearanceReady}
                description="Final approval"
                icon={Shield}
                color="blue"
              />
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Exit Processing</CardTitle>
                    <CardDescription>Final health assessments and liability closure</CardDescription>
                  </div>
                  <Button variant="outline" asChild>
                    <Link to="/exit-processing">View Exit Cases</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  • Final health assessments<br/>
                  • Exit documentation completion<br/>
                  • Liability and insurance closure<br/>
                  • Health record archival
                </div>
                <div className="mt-4">
                  <Button asChild>
                    <Link to="/exit-health-check-form">New Exit Health Check</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </PageLayout>
  );
}