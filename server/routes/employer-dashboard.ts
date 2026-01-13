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
}

interface DashboardData {
  statistics: CaseStatistics;
  priorityActions: PriorityAction[];
  organizationName: string;
}

/**
 * GET /api/employer/dashboard
 * Returns comprehensive dashboard data for employer landing page
 */
router.get('/dashboard', authorize, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    // For now, use a default organization name - we can enhance this later
    const organizationName = 'Your Organization';

    // Get all cases for the organization
    const allCases = await storage.getGPNet2Cases(organizationId);

    // Calculate statistics
    const statistics: CaseStatistics = {
      totalCases: allCases.length,
      atWork: allCases.filter(c => c.workStatus === 'At work').length,
      offWork: allCases.filter(c => c.workStatus === 'Off work').length,
      criticalActions: 0, // Will be calculated from actions
      urgentActions: 0,   // Will be calculated from actions
      routineActions: 0,  // Will be calculated from actions
      expiredCertificates: 0, // Will be calculated
      overdueReviews: 0   // Will be calculated
    };

    // Get priority actions by analyzing all cases
    const priorityActions: PriorityAction[] = [];
    const now = new Date();

    for (const workerCase of allCases) {
      const caseId = workerCase.id;
      const workerName = workerCase.workerName;

      try {
        // Get case actions
        const caseActions = await storage.getActionsByCase(caseId, organizationId);

        // Get medical certificates
        const certificates = await storage.getCertificatesByCase(caseId, organizationId);

        // Check for expired certificates - just check all certificates
        const activeCertificates = certificates;

        for (const cert of activeCertificates) {
          if (cert.endDate && new Date(cert.endDate) < now) {
            const daysOverdue = Math.floor((now.getTime() - new Date(cert.endDate).getTime()) / (1000 * 60 * 60 * 24));

            priorityActions.push({
              id: `cert-${cert.id}`,
              workerName,
              action: `Medical certificate expired - obtain updated certificate`,
              priority: daysOverdue > 14 ? 'critical' : daysOverdue > 7 ? 'urgent' : 'routine',
              daysOverdue,
              type: 'certificate',
              caseId
            });

            statistics.expiredCertificates++;
          }
        }

        // Check for overdue case actions
        for (const action of caseActions) {
          if (action.status === 'pending' && action.dueDate && new Date(action.dueDate) < now) {
            const daysOverdue = Math.floor((now.getTime() - new Date(action.dueDate).getTime()) / (1000 * 60 * 60 * 24));

            let priority: 'critical' | 'urgent' | 'routine' = 'routine';
            let actionType: 'certificate' | 'review' | 'rtw_plan' | 'medical' | 'compliance' = 'compliance';

            // Determine priority and type based on action content
            const actionText = action.type?.toLowerCase() || '';

            if (actionText.includes('certificate')) {
              actionType = 'certificate';
              priority = daysOverdue > 7 ? 'critical' : 'urgent';
            } else if (actionText.includes('review') || actionText.includes('follow-up')) {
              actionType = 'review';
              priority = daysOverdue > 14 ? 'urgent' : 'routine';
              statistics.overdueReviews++;
            } else if (actionText.includes('rtw') || actionText.includes('return to work')) {
              actionType = 'rtw_plan';
              priority = daysOverdue > 10 ? 'urgent' : 'routine';
            } else if (actionText.includes('medical') || actionText.includes('doctor')) {
              actionType = 'medical';
              priority = daysOverdue > 7 ? 'urgent' : 'routine';
            }

            priorityActions.push({
              id: `action-${action.id}`,
              workerName,
              action: action.type || 'Action required',
              priority,
              daysOverdue,
              type: actionType,
              caseId
            });
          }
        }

        // Check for missing RTW plans (for cases off work > 10 weeks)
        if (workerCase.workStatus === 'Off work') {
          const injuryDate = new Date(workerCase.dateOfInjury);
          const weeksSinceInjury = Math.floor((now.getTime() - injuryDate.getTime()) / (1000 * 60 * 60 * 24 * 7));

          if (weeksSinceInjury >= 10) {
            // Add RTW plan requirement for cases off work > 10 weeks
            priorityActions.push({
              id: `rtw-${caseId}`,
              workerName,
              action: `RTW plan required - worker off work for ${weeksSinceInjury} weeks`,
              priority: weeksSinceInjury > 12 ? 'critical' : 'urgent',
              daysOverdue: Math.max(0, (weeksSinceInjury - 10) * 7),
              type: 'rtw_plan',
              caseId
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
            caseId
          });
        }

      } catch (error) {
        logger.error('Error processing case actions', {
          caseId,
          workerName,
        }, error);
        // Continue processing other cases
      }
    }

    // Sort priority actions by priority and days overdue
    const prioritySortOrder = { critical: 0, urgent: 1, routine: 2 };
    priorityActions.sort((a, b) => {
      const priorityDiff = prioritySortOrder[a.priority] - prioritySortOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      return (b.daysOverdue || 0) - (a.daysOverdue || 0);
    });

    // Update statistics with action counts
    statistics.criticalActions = priorityActions.filter(a => a.priority === 'critical').length;
    statistics.urgentActions = priorityActions.filter(a => a.priority === 'urgent').length;
    statistics.routineActions = priorityActions.filter(a => a.priority === 'routine').length;

    const dashboardData: DashboardData = {
      statistics,
      priorityActions: priorityActions.slice(0, 50), // Limit to top 50 for performance
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