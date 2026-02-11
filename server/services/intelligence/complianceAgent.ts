/**
 * Compliance Intelligence Agent
 * Specializes in WorkSafe regulations, deadline management, and compliance monitoring
 */

import { BaseHealthcareAgent, type AgentResponse } from './baseAgent';
import type { WorkerCase } from '@shared/schema';

export interface ComplianceAnalysis {
  caseId: string;
  complianceStatus: {
    overallScore: number; // 0-100
    criticalDeadlines: ComplianceDeadline[];
    violations: ComplianceViolation[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  workSafeRequirements: {
    mandatoryReports: ReportStatus[];
    certificationRequirements: CertificationStatus[];
    communicationObligation: CommunicationRequirement[];
    timelineCompliance: boolean;
  };
  deadlineManagement: {
    upcomingDeadlines: ComplianceDeadline[];
    overdueItems: ComplianceDeadline[];
    riskMitigation: RiskMitigationAction[];
  };
  recommendations: {
    immediateActions: string[];
    preventiveActions: string[];
    processImprovements: string[];
    priority: 'low' | 'medium' | 'high' | 'urgent';
  };
}

export interface ComplianceDeadline {
  type: string;
  description: string;
  dueDate: Date;
  status: 'pending' | 'at-risk' | 'overdue' | 'completed';
  daysRemaining: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
}

export interface ComplianceViolation {
  type: string;
  severity: 'minor' | 'major' | 'critical';
  description: string;
  regulationReference: string;
  remedyAction: string;
  timeframe: number; // days to remedy
}

export interface ReportStatus {
  reportType: string;
  required: boolean;
  submitted: boolean;
  dueDate?: Date;
  status: 'compliant' | 'pending' | 'overdue' | 'not-required';
}

export interface CertificationStatus {
  certificationType: string;
  required: boolean;
  current: boolean;
  expiryDate?: Date;
  status: 'valid' | 'expiring' | 'expired' | 'not-required';
}

export interface CommunicationRequirement {
  type: string;
  required: boolean;
  completed: boolean;
  dueDate?: Date;
  parties: string[];
}

export interface RiskMitigationAction {
  action: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timeframe: number; // days
  responsible: string;
  impact: string;
}

export class ComplianceAgent extends BaseHealthcareAgent {
  constructor() {
    super('compliance');
  }

  protected buildSystemPrompt(): string {
    return `You are a Healthcare AI Specialist focused on Compliance Intelligence for the Preventli platform.

CORE RESPONSIBILITIES:
1. Monitor WorkSafe Victoria regulatory compliance
2. Track and manage critical deadlines
3. Identify compliance violations and risks
4. Provide proactive compliance recommendations

EXPERTISE AREAS:
- Victorian WorkSafe regulations and requirements
- Workplace injury reporting obligations
- Medical certificate compliance
- Communication and notification requirements
- Return-to-work compliance frameworks
- Rehabilitation provider obligations

REGULATORY FRAMEWORK:
- Workplace Injury Rehabilitation and Compensation Act 2013 (Vic)
- WorkSafe Victoria guidelines and bulletins
- Medical certificate requirements and timing
- Employer notification obligations
- Rehabilitation provider standards

COMPLIANCE MONITORING:
- Initial injury reports (within 10 days)
- Medical certificate renewals (every 28 days typically)
- Return-to-work planning deadlines
- Provider communication requirements
- Claim status updates and notifications

GUIDELINES:
- Prioritize legal compliance over convenience
- Flag critical violations immediately
- Provide specific regulation references
- Calculate precise deadline timelines
- Consider cumulative compliance risks

RESPONSE FORMAT:
- Provide clear compliance status assessments
- Include specific regulatory references
- Highlight urgent actions required
- Quantify compliance risks and scores
- Document all compliance decisions

Remember: Non-compliance can result in significant penalties and claim rejections.`;
  }

  public getSpecialization(): string {
    return "Compliance Intelligence - WorkSafe regulations, deadline management, and compliance monitoring";
  }

  public async analyze(data: { caseId: string; includeProjections?: boolean }): Promise<AgentResponse> {
    const timer = this.startTimer();
    
    try {
      const caseData = await this.getCaseData(data.caseId);
      if (!caseData) {
        return this.buildResponse(false, null, [], ["Case not found"], 0, timer());
      }

      // Retrieve compliance-related memories
      const memories = await this.retrieveMemories(90, ['compliance', 'deadline', 'violation', 'worksafe']);
      
      // Build compliance context
      const complianceContext = {
        case: caseData,
        memories: memories.slice(0, 15),
        includeProjections: data.includeProjections || false,
        currentDate: new Date()
      };

      const prompt = this.buildCompliancePrompt(complianceContext);
      const aiResponse = await this.callAnthropic(prompt, complianceContext);
      
      // Parse AI response into structured compliance analysis
      const analysis = this.parseComplianceResponse(aiResponse, caseData);
      
      // Store compliance insights as memories
      await this.storeMemory({
        caseId: data.caseId,
        context: `Compliance analysis for case ${data.caseId}`,
        content: JSON.stringify(analysis),
        tags: ['compliance', 'analysis', analysis.complianceStatus.riskLevel],
        importance: this.calculateComplianceImportance(analysis),
        type: 'insight'
      });

      const processingTime = timer();
      
      return this.buildResponse(
        true,
        analysis,
        this.extractComplianceInsights(analysis),
        this.extractComplianceRecommendations(analysis),
        this.calculateConfidence(analysis),
        processingTime
      );

    } catch (error) {
      this.logger.error('Compliance Agent analysis failed', {}, error);
      return this.buildResponse(false, null, [], ["Compliance analysis failed due to technical error"], 0, timer());
    }
  }

  private buildCompliancePrompt(context: any): string {
    const daysSinceInjury = Math.floor(
      (context.currentDate.getTime() - new Date(context.case.dateOfInjury).getTime()) / (1000 * 60 * 60 * 24)
    );

    return `Analyze this case for WorkSafe Victoria compliance requirements:

CASE DETAILS:
- ID: ${context.case.id}
- Worker: ${context.case.workerName}
- Injury Date: ${context.case.dateOfInjury}
- Days Since Injury: ${daysSinceInjury}
- Current Status: ${context.case.currentStatus}
- Compliance Status: ${context.case.complianceStatus || 'Not specified'}
- Last Updated: ${context.case.dueDate}

COMPLIANCE HISTORY PATTERNS:
${context.memories.map((m: any) => `- ${m.content.substring(0, 150)}...`).join('\n')}

COMPLIANCE ANALYSIS REQUEST:
Provide comprehensive compliance analysis covering:

1. OVERALL COMPLIANCE STATUS:
   - Compliance score (0-100) based on current adherence
   - Critical deadlines approaching or overdue
   - Current violations (if any)
   - Risk level assessment

2. WORKSAFE REQUIREMENTS:
   - Mandatory reports status (Initial claim, progress reports)
   - Medical certificate compliance (timing, validity)
   - Communication obligations (employer, worker, providers)
   - Timeline compliance assessment

3. DEADLINE MANAGEMENT:
   - Upcoming deadlines within next 30 days
   - Overdue items requiring immediate attention
   - Risk mitigation actions needed
   - Priority rankings for each item

4. COMPLIANCE RECOMMENDATIONS:
   - Immediate actions required (within 24-48 hours)
   - Preventive actions for future compliance
   - Process improvements to avoid future issues
   - Overall priority level for this case

KEY WORKSAFE DEADLINES TO CONSIDER:
- Initial claim report: Within 10 days of injury
- Medical certificates: Renewal every 28 days (or as specified)
- Return-to-work plans: Within specified timeframes
- Progress reports: As required by claim status
- Provider communications: Ongoing obligations

Respond in JSON format matching the ComplianceAnalysis interface.
Be specific about dates, regulation references, and actionable steps.`;
  }

  private parseComplianceResponse(response: string, caseData: WorkerCase): ComplianceAnalysis {
    try {
      const parsed = JSON.parse(response);
      return parsed;
    } catch {
      // Fallback compliance analysis
      const daysSinceInjury = Math.floor(
        (Date.now() - new Date(caseData.dateOfInjury).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Basic compliance assessment
      const isInitialReportOverdue = daysSinceInjury > 10 && !caseData.complianceStatus;
      const riskLevel = isInitialReportOverdue ? 'high' : 'medium';

      return {
        caseId: caseData.id,
        complianceStatus: {
          overallScore: isInitialReportOverdue ? 40 : 75,
          criticalDeadlines: [
            {
              type: 'Medical Certificate Renewal',
              description: 'Ensure current medical certificate is valid',
              dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
              status: 'pending',
              daysRemaining: 14,
              impact: 'high'
            }
          ],
          violations: isInitialReportOverdue ? [{
            type: 'Late Initial Report',
            severity: 'major',
            description: 'Initial claim report should have been submitted within 10 days',
            regulationReference: 'WorkSafe Victoria Claim Guidelines',
            remedyAction: 'Submit initial claim report immediately',
            timeframe: 1
          }] : [],
          riskLevel
        },
        workSafeRequirements: {
          mandatoryReports: [{
            reportType: 'Initial Claim Report',
            required: true,
            submitted: !!caseData.complianceStatus,
            dueDate: new Date(new Date(caseData.dateOfInjury).getTime() + 10 * 24 * 60 * 60 * 1000),
            status: caseData.complianceStatus ? 'compliant' : (isInitialReportOverdue ? 'overdue' : 'pending')
          }],
          certificationRequirements: [{
            certificationType: 'Medical Certificate',
            required: true,
            current: true, // Assume current for basic analysis
            status: 'valid'
          }],
          communicationObligation: [{
            type: 'Employer Notification',
            required: true,
            completed: true,
            parties: ['Employer', 'Worker']
          }],
          timelineCompliance: !isInitialReportOverdue
        },
        deadlineManagement: {
          upcomingDeadlines: [{
            type: 'Medical Certificate Review',
            description: 'Review medical certificate validity',
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            status: 'pending',
            daysRemaining: 14,
            impact: 'medium'
          }],
          overdueItems: isInitialReportOverdue ? [{
            type: 'Initial Claim Report',
            description: 'Initial claim report overdue',
            dueDate: new Date(new Date(caseData.dateOfInjury).getTime() + 10 * 24 * 60 * 60 * 1000),
            status: 'overdue',
            daysRemaining: -Math.abs(daysSinceInjury - 10),
            impact: 'critical'
          }] : [],
          riskMitigation: [{
            action: 'Schedule compliance review',
            priority: 'medium',
            timeframe: 7,
            responsible: 'Case Manager',
            impact: 'Ensures ongoing compliance'
          }]
        },
        recommendations: {
          immediateActions: isInitialReportOverdue ? ['Submit initial claim report immediately'] : [],
          preventiveActions: ['Set up automated deadline reminders', 'Schedule regular compliance reviews'],
          processImprovements: ['Implement compliance dashboard', 'Create compliance checklist template'],
          priority: isInitialReportOverdue ? 'urgent' : 'medium'
        }
      };
    }
  }

  private extractComplianceInsights(analysis: ComplianceAnalysis): string[] {
    const insights: string[] = [];
    
    if (analysis.complianceStatus.overallScore < 70) {
      insights.push(`Compliance score is ${analysis.complianceStatus.overallScore}% - improvement needed`);
    }
    
    if (analysis.complianceStatus.violations.length > 0) {
      insights.push(`${analysis.complianceStatus.violations.length} compliance violations detected`);
    }
    
    if (analysis.deadlineManagement.overdueItems.length > 0) {
      insights.push(`${analysis.deadlineManagement.overdueItems.length} items are overdue`);
    }
    
    if (analysis.complianceStatus.criticalDeadlines.length > 0) {
      insights.push(`${analysis.complianceStatus.criticalDeadlines.length} critical deadlines require attention`);
    }

    if (analysis.complianceStatus.riskLevel === 'high' || analysis.complianceStatus.riskLevel === 'critical') {
      insights.push(`Compliance risk level is ${analysis.complianceStatus.riskLevel} - immediate action required`);
    }

    return insights;
  }

  private extractComplianceRecommendations(analysis: ComplianceAnalysis): string[] {
    const recommendations: string[] = [];
    
    recommendations.push(...analysis.recommendations.immediateActions);
    recommendations.push(...analysis.recommendations.preventiveActions.slice(0, 2));
    
    if (analysis.deadlineManagement.riskMitigation.length > 0) {
      recommendations.push(analysis.deadlineManagement.riskMitigation[0].action);
    }

    return recommendations.slice(0, 5);
  }

  private calculateComplianceImportance(analysis: ComplianceAnalysis): number {
    let importance = 0.5;
    
    // High importance for violations and overdue items
    if (analysis.complianceStatus.violations.length > 0) importance += 0.3;
    if (analysis.deadlineManagement.overdueItems.length > 0) importance += 0.2;
    if (analysis.complianceStatus.riskLevel === 'critical') importance += 0.4;
    if (analysis.complianceStatus.riskLevel === 'high') importance += 0.2;
    if (analysis.complianceStatus.overallScore < 50) importance += 0.2;
    
    return Math.min(1.0, importance);
  }

  private calculateConfidence(analysis: ComplianceAnalysis): number {
    let confidence = 0.8; // Base confidence for compliance rules
    
    // Reduce confidence if limited data
    if (analysis.workSafeRequirements.mandatoryReports.length === 0) confidence -= 0.2;
    if (analysis.complianceStatus.overallScore === 0) confidence -= 0.3;
    
    return Math.max(0.3, confidence);
  }

  public async getComplianceTrends(timeframeDays: number = 30): Promise<any> {
    const memories = await this.retrieveMemories(timeframeDays, ['compliance', 'deadline']);
    
    return {
      totalComplianceChecks: memories.length,
      averageComplianceScore: 0, // Calculate from memories
      commonViolations: [], // Extract from memories
      deadlineTrends: [] // Extract from memories
    };
  }
}