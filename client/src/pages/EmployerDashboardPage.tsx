import { PageLayout } from "@/components/PageLayout";
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  AlertTriangle,
  Clock,
  CheckCircle,
  Phone,
  Mail,
  ArrowRight,
  Calendar,
  Building,
  Activity
} from 'lucide-react';

interface CaseStatistics {
  totalCases: number;
  atWork: number;
  offWork: number;
  criticalActions: number;
  urgentActions: number;
  routineActions: number;
  expiredCertificates: number;
  overdueReviews: number;
}

interface PriorityAction {
  id: string;
  workerName: string;
  action: string;
  priority: 'critical' | 'urgent' | 'routine';
  daysOverdue?: number;
  type: 'certificate' | 'review' | 'rtw_plan' | 'medical' | 'compliance';
  caseId: string;
}

interface DashboardData {
  statistics: CaseStatistics;
  priorityActions: PriorityAction[];
  organizationName: string;
}

function EmployerDashboardContent() {
  const { data: dashboardData, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['employer-dashboard'],
    queryFn: () => fetch('/api/employer/dashboard').then(r => r.json()),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-800 mb-2">Dashboard Unavailable</h2>
            <p className="text-red-600">Unable to load dashboard data. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = dashboardData?.statistics;
  const actions = dashboardData?.priorityActions || [];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500 text-white hover:bg-red-600';
      case 'urgent': return 'bg-amber-500 text-white hover:bg-amber-600';
      default: return 'bg-blue-500 text-white hover:bg-blue-600';
    }
  };

  const getPriorityIcon = (type: string) => {
    switch (type) {
      case 'certificate': return <Calendar className="w-4 h-4" />;
      case 'review': return <Clock className="w-4 h-4" />;
      case 'rtw_plan': return <Activity className="w-4 h-4" />;
      case 'medical': return <Users className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const criticalActions = actions.filter(a => a.priority === 'critical');
  const urgentActions = actions.filter(a => a.priority === 'urgent');
  const routineActions = actions.filter(a => a.priority === 'routine');

  return (
    <div className="space-y-6">
      {/* Critical Actions Alert Bar */}
      {criticalActions.length > 0 && (
        <div className="bg-red-500 rounded-xl text-white p-6 shadow-lg animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6" />
              <div>
                <h2 className="text-lg font-bold">Critical Actions Required</h2>
                <p className="text-red-100">
                  {criticalActions.length} critical item{criticalActions.length !== 1 ? 's' : ''} need immediate attention
                </p>
              </div>
            </div>
            <ArrowRight className="w-6 h-6" />
          </div>
        </div>
      )}

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Total Cases</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.totalCases || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">At Work</p>
                <p className="text-3xl font-bold text-green-700">{stats?.atWork || 0}</p>
                <p className="text-xs text-green-600 mt-1">
                  {stats?.totalCases ? Math.round((stats.atWork / stats.totalCases) * 100) : 0}% active
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Off Work</p>
                <p className="text-3xl font-bold text-amber-700">{stats?.offWork || 0}</p>
                <p className="text-xs text-amber-600 mt-1">Requiring support</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Critical Actions</p>
                <p className="text-3xl font-bold text-red-700">{criticalActions.length}</p>
                <p className="text-xs text-red-600 mt-1">Immediate attention</p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Critical Actions */}
        {criticalActions.length > 0 && (
          <Card className="lg:col-span-1 bg-white shadow-xl border-0">
            <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5" />
                <span>Critical Actions</span>
                <Badge className="bg-red-700 text-white">{criticalActions.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {criticalActions.map((action, index) => (
                  <div
                    key={action.id}
                    className="p-4 border-b border-slate-100 hover:bg-red-50 transition-all duration-200 cursor-pointer group"
                    onClick={() => window.location.href = `/employer/case/${action.caseId}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getPriorityIcon(action.type)}
                          <p className="font-semibold text-slate-900 group-hover:text-red-700">
                            {action.workerName}
                          </p>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{action.action}</p>
                        {action.daysOverdue && (
                          <Badge className="bg-red-100 text-red-800">
                            {action.daysOverdue} days overdue
                          </Badge>
                        )}
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Urgent Actions */}
        <Card className="lg:col-span-1 bg-white shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Urgent Actions</span>
              <Badge className="bg-amber-700 text-white">{urgentActions.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {urgentActions.slice(0, 8).map((action) => (
                <div
                  key={action.id}
                  className="p-4 border-b border-slate-100 hover:bg-amber-50 transition-all duration-200 cursor-pointer group"
                  onClick={() => window.location.href = `/employer/case/${action.caseId}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getPriorityIcon(action.type)}
                        <p className="font-semibold text-slate-900 group-hover:text-amber-700">
                          {action.workerName}
                        </p>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{action.action}</p>
                      {action.daysOverdue && (
                        <Badge className="bg-amber-100 text-amber-800">
                          {action.daysOverdue} days overdue
                        </Badge>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
                  </div>
                </div>
              ))}
              {urgentActions.length > 8 && (
                <div className="p-4 text-center">
                  <Button variant="ghost" className="text-amber-600 hover:text-amber-700">
                    View {urgentActions.length - 8} more urgent actions
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Routine Actions */}
        <Card className="lg:col-span-1 bg-white shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span>Routine Actions</span>
              <Badge className="bg-blue-700 text-white">{routineActions.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {routineActions.slice(0, 6).map((action) => (
                <div
                  key={action.id}
                  className="p-4 border-b border-slate-100 hover:bg-blue-50 transition-all duration-200 cursor-pointer group"
                  onClick={() => window.location.href = `/employer/case/${action.caseId}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getPriorityIcon(action.type)}
                        <p className="font-semibold text-slate-900 group-hover:text-blue-700">
                          {action.workerName}
                        </p>
                      </div>
                      <p className="text-sm text-slate-600">{action.action}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </div>
              ))}
              {routineActions.length > 6 && (
                <div className="p-4 text-center">
                  <Button variant="ghost" className="text-blue-600 hover:text-blue-700">
                    View {routineActions.length - 6} more routine actions
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Footer */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Need help managing cases?</h3>
            <p className="text-slate-600">Contact your case management team or access support resources</p>
          </div>
          <div className="flex space-x-3">
            <Button className="bg-green-600 hover:bg-green-700">
              <Phone className="w-4 h-4 mr-2" />
              Call Support
            </Button>
            <Button variant="outline">
              <Mail className="w-4 h-4 mr-2" />
              Email Support
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmployerDashboardPage() {
  // Use hardcoded Symmetry for now since employer users are from Symmetry org
  const organizationName = 'Symmetry Human Resources';

  return (
    <PageLayout
      title={`${organizationName} Dashboard`}
      subtitle="Case Management Portal"
    >
      <EmployerDashboardContent />
    </PageLayout>
  );
}

export default EmployerDashboardPage;