/**
 * Employer Dashboard API Routes
 * Provides summary statistics and priority actions for employer landing page
 */

import { Router, Request, Response } from 'express';
import { authorize } from '../middleware/auth';
import { storage } from '../storage';
import { createLogger } from '../lib/logger';

const logger = createLogger('EmployerDashboard');

const router = Router();

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
  statistics: CaseStatistics;
  priorityActions: PriorityAction[];
  allWorkers: WorkerInfo[];
  organizationName: string;
}

// Human-readable labels for action types
const actionLabels: Record<string, string> = {
  chase_certificate: 'Obtain updated medical certificate',
  review_case: 'Review case progress',
  follow_up: 'Follow up with worker',
  schedule_appointment: 'Schedule medical appointment',
  update_rtw_plan: 'Update return to work plan',
  contact_employer: 'Contact employer',
  contact_provider: 'Contact treating provider',
};

function getActionLabel(actionType: string | null): string {
  if (!actionType) return 'Action required';
  return actionLabels[actionType] || actionType.replace(/_/g, ' ');
}

/**
 * GET /api/employer/dashboard
 * Returns comprehensive dashboard data for employer landing page
 */
router.get('/dashboard', authorize(), async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    // For now, use a default organization name - we can enhance this later
    const organizationName = 'Your Organization';

    // Batch fetch all data upfront (3 queries instead of N*2)
    const [allCases, allActions, allCertificates] = await Promise.all([
      storage.getGPNet2Cases(organizationId),
      storage.getAllActionsWithCaseInfo(organizationId, { status: 'pending' }),
      storage.getCertificatesByOrganization(organizationId)
    ]);

    // Build lookup maps for O(1) access
    const actionsByCase = new Map<string, typeof allActions>();
    for (const action of allActions) {
      const caseId = action.caseId;
      if (!actionsByCase.has(caseId)) {
        actionsByCase.set(caseId, []);
      }
      actionsByCase.get(caseId)!.push(action);
    }

    const certificatesByCase = new Map<string, typeof allCertificates>();
    for (const cert of allCertificates) {
      const caseId = cert.caseId;
      if (!certificatesByCase.has(caseId)) {
        certificatesByCase.set(caseId, []);
      }
      certificatesByCase.get(caseId)!.push(cert);
    }

    // Calculate statistics
    const statistics: CaseStatistics = {
      totalCases: allCases.length,
      atWork: allCases.filter(c => c.workStatus === 'At work').length,
      offWork: allCases.filter(c => c.workStatus === 'Off work').length,
      criticalActions: 0,
      urgentActions: 0,
      routineActions: 0,
      expiredCertificates: 0,
      overdueReviews: 0
    };

    // Get priority actions by analyzing all cases (now using in-memory lookups)
    const priorityActions: PriorityAction[] = [];
    const now = new Date();

    for (const workerCase of allCases) {
      const caseId = workerCase.id;
      const workerName = workerCase.workerName;

      // Get data from pre-built maps (O(1) lookup)
      const caseActions = actionsByCase.get(caseId) || [];
      const certificates = certificatesByCase.get(caseId) || [];

      // Check for expired certificates
      for (const cert of certificates) {
        if (cert.endDate && new Date(cert.endDate) < now) {
          const daysOverdue = Math.floor((now.getTime() - new Date(cert.endDate).getTime()) / (1000 * 60 * 60 * 24));

          priorityActions.push({
            id: `cert-${cert.id}`,
            workerName,
            action: `Medical certificate expired - obtain updated certificate`,
            priority: daysOverdue > 30 ? 'critical' : daysOverdue > 14 ? 'urgent' : 'routine',
            daysOverdue,
            type: 'certificate',
            caseId,
            workStatus: workerCase.workStatus || 'Unknown'
          });

          statistics.expiredCertificates++;
        }
      }

      // Check for overdue case actions
      for (const action of caseActions) {
        if (action.dueDate && new Date(action.dueDate) < now) {
          const daysOverdue = Math.floor((now.getTime() - new Date(action.dueDate).getTime()) / (1000 * 60 * 60 * 24));

          let priority: 'critical' | 'urgent' | 'routine' = 'routine';
          let actionType: 'certificate' | 'review' | 'rtw_plan' | 'medical' | 'compliance' = 'compliance';

          // Determine priority and type based on action content
          const actionText = action.type?.toLowerCase() || '';

          if (actionText.includes('certificate')) {
            actionType = 'certificate';
            priority = daysOverdue > 21 ? 'critical' : daysOverdue > 7 ? 'urgent' : 'routine';
          } else if (actionText.includes('review') || actionText.includes('follow-up')) {
            actionType = 'review';
            priority = daysOverdue > 30 ? 'critical' : daysOverdue > 14 ? 'urgent' : 'routine';
            statistics.overdueReviews++;
          } else if (actionText.includes('rtw') || actionText.includes('return to work')) {
            actionType = 'rtw_plan';
            priority = daysOverdue > 21 ? 'critical' : daysOverdue > 10 ? 'urgent' : 'routine';
          } else if (actionText.includes('medical') || actionText.includes('doctor')) {
            actionType = 'medical';
            priority = daysOverdue > 21 ? 'critical' : daysOverdue > 7 ? 'urgent' : 'routine';
          }

          priorityActions.push({
            id: `action-${action.id}`,
            workerName,
            action: getActionLabel(action.type),
            priority,
            daysOverdue,
            type: actionType,
            caseId,
            workStatus: workerCase.workStatus || 'Unknown'
          });
        }
      }

      // Check for missing RTW plans (for cases off work > 4 weeks)
      if (workerCase.workStatus === 'Off work') {
        const injuryDate = new Date(workerCase.dateOfInjury);
        const weeksSinceInjury = Math.floor((now.getTime() - injuryDate.getTime()) / (1000 * 60 * 60 * 24 * 7));

        if (weeksSinceInjury >= 4) {
          priorityActions.push({
            id: `rtw-${caseId}`,
            workerName,
            action: `RTW plan required - worker off work for ${weeksSinceInjury} weeks`,
            priority: weeksSinceInjury > 16 ? 'critical' : weeksSinceInjury > 10 ? 'urgent' : 'routine',
            daysOverdue: Math.max(0, (weeksSinceInjury - 4) * 7),
            type: 'rtw_plan',
            caseId,
            workStatus: workerCase.workStatus || 'Unknown'
          });
        }
      }

      // Check for overdue case reviews based on injury date (every 8 weeks)
      const injuryDate = new Date(workerCase.dateOfInjury);
      const weeksSinceInjury = Math.floor((now.getTime() - injuryDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
      if (weeksSinceInjury > 0 && weeksSinceInjury % 8 === 0) {
        priorityActions.push({
          id: `review-${caseId}`,
          workerName,
          action: `Case review due - ${weeksSinceInjury} weeks since injury`,
          priority: 'routine',
          type: 'review',
          caseId,
          workStatus: workerCase.workStatus || 'Unknown'
        });
      }
    }

    // Sort all actions by days overdue (most urgent first)
    priorityActions.sort((a, b) => (b.daysOverdue || 0) - (a.daysOverdue || 0));

    // Reassign priority based on relative position to ensure distribution
    // Top 40% = critical, next 30% = urgent, bottom 30% = routine
    const totalActions = priorityActions.length;
    const criticalCutoff = Math.floor(totalActions * 0.4);
    const urgentCutoff = Math.floor(totalActions * 0.7);

    priorityActions.forEach((action, index) => {
      if (index < criticalCutoff) {
        action.priority = 'critical';
      } else if (index < urgentCutoff) {
        action.priority = 'urgent';
      } else {
        action.priority = 'routine';
      }
    });

    // Update statistics with redistributed action counts
    statistics.criticalActions = priorityActions.filter(a => a.priority === 'critical').length;
    statistics.urgentActions = priorityActions.filter(a => a.priority === 'urgent').length;
    statistics.routineActions = priorityActions.filter(a => a.priority === 'routine').length;

    // Build complete worker list for filtering (not just those with actions)
    const allWorkersInfo: WorkerInfo[] = allCases.map(c => ({
      caseId: c.id,
      workerName: c.workerName,
      workStatus: c.workStatus || 'Unknown',
      company: c.company || '',
      dateOfInjury: c.dateOfInjury ? String(c.dateOfInjury) : ''
    }));

    // Take up to 20 critical, 15 urgent, 15 routine for display (50 total max)
    const criticalActions = priorityActions.filter(a => a.priority === 'critical').slice(0, 20);
    const urgentActions = priorityActions.filter(a => a.priority === 'urgent').slice(0, 15);
    const routineActions = priorityActions.filter(a => a.priority === 'routine').slice(0, 15);
    const distributedActions = [...criticalActions, ...urgentActions, ...routineActions];

    const dashboardData: DashboardData = {
      statistics,
      priorityActions: distributedActions,
      allWorkers: allWorkersInfo,
      organizationName
    };

    logger.info('Generated employer dashboard data', {
      organizationId,
      organizationName,
      totalCases: statistics.totalCases,
      totalActions: priorityActions.length,
      criticalActions: statistics.criticalActions,
      urgentActions: statistics.urgentActions
    });

    res.json(dashboardData);

  } catch (error) {
    logger.error('Error generating dashboard data', {
      organizationId: req.user?.organizationId,
    }, error);
    res.status(500).json({
      error: 'Failed to load dashboard data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as employerDashboardRouter };