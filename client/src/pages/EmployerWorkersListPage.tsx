import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  AlertTriangle,
  Clock,
  CheckCircle,
  ArrowLeft,
  Search,
  Building
} from 'lucide-react';

interface PriorityAction {
  id: string;
  workerName: string;
  action: string;
  priority: 'critical' | 'urgent' | 'routine';
  daysOverdue?: number;
  type: 'certificate' | 'review' | 'rtw_plan' | 'medical' | 'compliance';
  caseId: string;
  workStatus: string;
}

interface WorkerInfo {
  caseId: string;
  workerName: string;
  workStatus: string;
  company: string;
  dateOfInjury: string;
}

interface DashboardData {
  statistics: {
    totalCases: number;
    atWork: number;
    offWork: number;
    criticalActions: number;
  };
  priorityActions: PriorityAction[];
  allWorkers: WorkerInfo[];
  organizationName: string;
}

export default function EmployerWorkersListPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const filter = searchParams.get('filter') || 'all';
  const [searchQuery, setSearchQuery] = useState('');

  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ['employer-dashboard'],
    queryFn: () => fetch('/api/employer/dashboard').then(r => r.json()),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 font-medium">Loading workers...</p>
        </div>
      </div>
    );
  }

  const actions = dashboardData?.priorityActions || [];
  const criticalActions = actions.filter(a => a.priority === 'critical');

  // Use allWorkers from API (includes all cases, not just those with actions)
  const allWorkers = dashboardData?.allWorkers || [];

  // Create a map to look up actions by caseId for display
  const actionsByCase = new Map<string, PriorityAction>();
  actions.forEach(action => {
    if (!actionsByCase.has(action.caseId)) {
      actionsByCase.set(action.caseId, action);
    }
  });

  // Filter workers based on selected filter
  let filteredWorkers = allWorkers;
  let pageTitle = 'All Workers';
  let pageIcon = <Users className="w-6 h-6" />;
  let iconBgColor = 'bg-blue-100';
  let iconColor = 'text-blue-600';

  if (filter === 'critical') {
    filteredWorkers = allWorkers.filter(w =>
      criticalActions.some(a => a.caseId === w.caseId)
    );
    pageTitle = 'Workers with Critical Actions';
    pageIcon = <AlertTriangle className="w-6 h-6" />;
    iconBgColor = 'bg-red-100';
    iconColor = 'text-red-600';
  } else if (filter === 'at_work') {
    filteredWorkers = allWorkers.filter(w => w.workStatus === 'At work');
    pageTitle = 'Workers At Work';
    pageIcon = <CheckCircle className="w-6 h-6" />;
    iconBgColor = 'bg-green-100';
    iconColor = 'text-green-600';
  } else if (filter === 'off_work') {
    filteredWorkers = allWorkers.filter(w => w.workStatus === 'Off work');
    pageTitle = 'Workers Off Work';
    pageIcon = <Clock className="w-6 h-6" />;
    iconBgColor = 'bg-amber-100';
    iconColor = 'text-amber-600';
  }

  // Apply search filter
  if (searchQuery.trim()) {
    filteredWorkers = filteredWorkers.filter(w =>
      w.workerName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate('/')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
            <div className="flex items-center space-x-4">
              <Building className="w-6 h-6 text-blue-600" />
              <span className="font-semibold text-slate-700">{dashboardData?.organizationName}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className={`p-3 ${iconBgColor} rounded-xl`}>
              <span className={iconColor}>{pageIcon}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{pageTitle}</h1>
              <p className="text-slate-600">{filteredWorkers.length} worker{filteredWorkers.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search workers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-2 mb-6">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => navigate('/employer/workers?filter=all')}
          >
            <Users className="w-4 h-4 mr-2" />
            All ({allWorkers.length})
          </Button>
          <Button
            variant={filter === 'at_work' ? 'default' : 'outline'}
            className={filter === 'at_work' ? 'bg-green-600 hover:bg-green-700' : ''}
            onClick={() => navigate('/employer/workers?filter=at_work')}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            At Work ({allWorkers.filter(w => w.workStatus === 'At work').length})
          </Button>
          <Button
            variant={filter === 'off_work' ? 'default' : 'outline'}
            className={filter === 'off_work' ? 'bg-amber-600 hover:bg-amber-700' : ''}
            onClick={() => navigate('/employer/workers?filter=off_work')}
          >
            <Clock className="w-4 h-4 mr-2" />
            Off Work ({allWorkers.filter(w => w.workStatus === 'Off work').length})
          </Button>
          <Button
            variant={filter === 'critical' ? 'default' : 'outline'}
            className={filter === 'critical' ? 'bg-red-600 hover:bg-red-700' : ''}
            onClick={() => navigate('/employer/workers?filter=critical')}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Critical ({criticalActions.length})
          </Button>
        </div>

        {/* Workers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkers.map(worker => {
            const workerAction = actionsByCase.get(worker.caseId);
            return (
              <Card
                key={worker.caseId}
                className="bg-white shadow-md hover:shadow-lg transition-all cursor-pointer border-0"
                onClick={() => navigate(`/employer/case/${worker.caseId}`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-slate-900 mb-1">
                        {worker.workerName}
                      </h3>
                      <p className="text-sm text-slate-600 mb-3">
                        {workerAction?.action || worker.company || 'No pending actions'}
                      </p>
                      <div className="flex items-center space-x-2">
                        {worker.workStatus === 'At work' && (
                          <Badge className="bg-green-100 text-green-700">At Work</Badge>
                        )}
                        {worker.workStatus === 'Off work' && (
                          <Badge className="bg-amber-100 text-amber-700">Off Work</Badge>
                        )}
                        {workerAction?.priority === 'critical' && (
                          <Badge className="bg-red-100 text-red-700">Critical</Badge>
                        )}
                        {workerAction?.priority === 'urgent' && (
                          <Badge className="bg-amber-100 text-amber-700">Urgent</Badge>
                        )}
                        {workerAction?.daysOverdue && workerAction.daysOverdue > 0 && (
                          <Badge variant="outline" className="text-slate-600">
                            {workerAction.daysOverdue} days overdue
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ArrowLeft className="w-5 h-5 text-slate-400 rotate-180" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredWorkers.length === 0 && (
          <Card className="bg-white shadow-md">
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No workers found</h3>
              <p className="text-slate-500">
                {searchQuery ? `No workers match "${searchQuery}"` : 'No workers in this category'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
