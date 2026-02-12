import React, { useState } from "react";
import { Link } from "react-router-dom";
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

export default function ChecksPage() {
  const [activeTab, setActiveTab] = useState("pre-employment");

  // Mock data for each check type
  const checkStats = {
    preEmployment: { total: 12, pending: 3, completed: 9, cleared: 8 },
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
                value={checkStats.preEmployment.total}
                description="This month"
                icon={Users}
                color="blue"
              />
              <StatCard
                title="Pending Review"
                value={checkStats.preEmployment.pending}
                description="Awaiting clearance"
                icon={Clock}
                color="yellow"
              />
              <StatCard
                title="Completed"
                value={checkStats.preEmployment.completed}
                description="Assessments finished"
                icon={CheckCircle}
                color="green"
              />
              <StatCard
                title="Cleared for Work"
                value={checkStats.preEmployment.cleared}
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
                  <div className="flex gap-2">
                    <Button variant="outline" asChild>
                      <Link to="/pre-employment">View Dashboard</Link>
                    </Button>
                    <Button asChild>
                      <Link to="/pre-employment-form">New Assessment</Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  • Comprehensive health questionnaires<br/>
                  • Risk assessment and scoring<br/>
                  • Automated clearance determination<br/>
                  • Medical restriction tracking
                </div>
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