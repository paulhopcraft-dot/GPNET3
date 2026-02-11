/**
 * Intelligence Coordinator
 * Manages and orchestrates all 6 Healthcare Specialist Subagents
 */

import { InjuryCaseAgent } from './injuryCaseAgent';
import { ComplianceAgent } from './complianceAgent';
import { RiskAssessmentAgent } from './riskAssessmentAgent';
import { StakeholderCommunicationAgent } from './stakeholderCommunicationAgent';
import { BusinessIntelligenceAgent } from './businessIntelligenceAgent';
import { IntegrationOrchestrationAgent } from './integrationOrchestrationAgent';
import type { AgentResponse } from './baseAgent';
import { createLogger } from '../../lib/logger';

const logger = createLogger('Intelligence');

export interface CoordinatedAnalysis {
  caseId?: string;
  analysisId: string;
  timestamp: Date;
  overallAssessment: {
    status: 'optimal' | 'good' | 'concerning' | 'critical';
    confidenceScore: number; // 0-100
    priorityLevel: 'low' | 'medium' | 'high' | 'urgent';
    keyFindings: string[];
    criticalAlerts: string[];
  };
  agentResults: {
    injuryCase: AgentResponse;
    compliance: AgentResponse;
    riskAssessment: AgentResponse;
    stakeholderCommunication: AgentResponse;
    businessIntelligence: AgentResponse;
    integrationOrchestration: AgentResponse;
  };
  crossAgentInsights: {
    correlatedFindings: CorrelatedFinding[];
    conflictingRecommendations: ConflictingRecommendation[];
    synergisticOpportunities: SynergisticOpportunity[];
    holisticRecommendations: HolisticRecommendation[];
  };
  executiveSummary: {
    situationOverview: string;
    keyRisks: string[];
    topPriorities: string[];
    recommendedActions: string[];
    nextSteps: string[];
  };
}

export interface CorrelatedFinding {
  finding: string;
  supportingAgents: string[];
  confidenceLevel: number; // 0-100
  implications: string[];
}

export interface ConflictingRecommendation {
  recommendation1: { agent: string; recommendation: string };
  recommendation2: { agent: string; recommendation: string };
  conflictType: 'priority' | 'approach' | 'timeline' | 'resource';
  resolution: string;
  reasonRing: string;
}

export interface SynergisticOpportunity {
  opportunity: string;
  involvedAgents: string[];
  combinedBenefit: string;
  implementationStrategy: string;
  estimatedImpact: 'low' | 'medium' | 'high' | 'transformational';
}

export interface HolisticRecommendation {
  recommendation: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timeline: number; // days
  involvedStakeholders: string[];
  expectedOutcome: string;
  successMetrics: string[];
}

export class IntelligenceCoordinator {
  private injuryCaseAgent: InjuryCaseAgent;
  private complianceAgent: ComplianceAgent;
  private riskAssessmentAgent: RiskAssessmentAgent;
  private stakeholderCommunicationAgent: StakeholderCommunicationAgent;
  private businessIntelligenceAgent: BusinessIntelligenceAgent;
  private integrationOrchestrationAgent: IntegrationOrchestrationAgent;

  constructor() {
    this.injuryCaseAgent = new InjuryCaseAgent();
    this.complianceAgent = new ComplianceAgent();
    this.riskAssessmentAgent = new RiskAssessmentAgent();
    this.stakeholderCommunicationAgent = new StakeholderCommunicationAgent();
    this.businessIntelligenceAgent = new BusinessIntelligenceAgent();
    this.integrationOrchestrationAgent = new IntegrationOrchestrationAgent();
  }

  /**
   * Perform coordinated analysis across all 6 specialist agents
   */
  public async performCoordinatedAnalysis(
    caseId: string,
    analysisOptions: {
      includeBusinessIntelligence?: boolean;
      includeIntegrationHealth?: boolean;
      priorityFocus?: 'clinical' | 'compliance' | 'business' | 'comprehensive';
    } = {}
  ): Promise<CoordinatedAnalysis> {
    
    const analysisId = `coord_${Date.now()}_${caseId}`;
    logger.info(`Starting coordinated intelligence analysis ${analysisId} for case ${caseId}`);

    try {
      // Execute all agent analyses in parallel for efficiency
      const agentPromises = [
        this.injuryCaseAgent.analyze({ caseId, includeHistory: true }),
        this.complianceAgent.analyze({ caseId, includeProjections: true }),
        this.riskAssessmentAgent.analyze({ caseId, includePredictions: true }),
        this.stakeholderCommunicationAgent.analyze({ caseId, includeHistory: true }),
      ];

      // Conditionally add business intelligence and integration analysis
      if (analysisOptions.includeBusinessIntelligence !== false) {
        agentPromises.push(
          this.businessIntelligenceAgent.analyze({ caseId, analysisType: 'performance' })
        );
      } else {
        agentPromises.push(Promise.resolve({
          success: true,
          data: null,
          insights: [],
          recommendations: [],
          confidence: 0.5,
          processingTime: 0,
          agentId: 'business-intelligence'
        }));
      }

      if (analysisOptions.includeIntegrationHealth !== false) {
        agentPromises.push(
          this.integrationOrchestrationAgent.analyze({ caseId, focusArea: 'health' })
        );
      } else {
        agentPromises.push(Promise.resolve({
          success: true,
          data: null,
          insights: [],
          recommendations: [],
          confidence: 0.5,
          processingTime: 0,
          agentId: 'integration-orchestration'
        }));
      }

      // Wait for all agents to complete
      const [
        injuryCaseResult,
        complianceResult,
        riskAssessmentResult,
        stakeholderCommResult,
        businessIntelligenceResult,
        integrationResult
      ] = await Promise.all(agentPromises);

      // Build agent results object
      const agentResults = {
        injuryCase: injuryCaseResult,
        compliance: complianceResult,
        riskAssessment: riskAssessmentResult,
        stakeholderCommunication: stakeholderCommResult,
        businessIntelligence: businessIntelligenceResult,
        integrationOrchestration: integrationResult
      };

      // Perform cross-agent analysis
      const crossAgentInsights = this.analyzeCrossAgentInsights(agentResults);

      // Generate overall assessment
      const overallAssessment = this.generateOverallAssessment(agentResults, crossAgentInsights);

      // Create executive summary
      const executiveSummary = this.generateExecutiveSummary(
        agentResults, 
        crossAgentInsights, 
        overallAssessment,
        analysisOptions.priorityFocus
      );

      const coordinatedAnalysis: CoordinatedAnalysis = {
        caseId,
        analysisId,
        timestamp: new Date(),
        overallAssessment,
        agentResults,
        crossAgentInsights,
        executiveSummary
      };

      logger.info(`Completed coordinated intelligence analysis ${analysisId}`);
      return coordinatedAnalysis;

    } catch (error) {
      logger.error(`Coordinated intelligence analysis ${analysisId} failed`, {}, error);
      throw error;
    }
  }

  /**
   * Perform platform-wide intelligence analysis (no specific case)
   */
  public async performPlatformAnalysis(
    analysisOptions: {
      timeframe?: number; // days
      focusArea?: 'performance' | 'compliance' | 'risk' | 'comprehensive';
    } = {}
  ): Promise<CoordinatedAnalysis> {
    
    const analysisId = `platform_${Date.now()}`;
    logger.info(`Starting platform-wide intelligence analysis ${analysisId}`);

    try {
      // Platform-wide analyses
      const [
        businessIntelligenceResult,
        integrationResult
      ] = await Promise.all([
        this.businessIntelligenceAgent.analyze({ 
          analysisType: 'comprehensive',
          timeframe: analysisOptions.timeframe || 90
        }),
        this.integrationOrchestrationAgent.analyze({ 
          focusArea: 'comprehensive',
          includeMetrics: true
        })
      ]);

      // Create placeholder results for case-specific agents
      const placeholderResult: AgentResponse = {
        success: true,
        data: null,
        insights: [],
        recommendations: [],
        confidence: 0,
        processingTime: 0,
        agentId: 'not-applicable'
      };

      const agentResults = {
        injuryCase: placeholderResult,
        compliance: placeholderResult,
        riskAssessment: placeholderResult,
        stakeholderCommunication: placeholderResult,
        businessIntelligence: businessIntelligenceResult,
        integrationOrchestration: integrationResult
      };

      const crossAgentInsights = this.analyzeCrossAgentInsights(agentResults);
      const overallAssessment = this.generateOverallAssessment(agentResults, crossAgentInsights);
      const executiveSummary = this.generateExecutiveSummary(
        agentResults, 
        crossAgentInsights, 
        overallAssessment,
        'business'
      );

      return {
        analysisId,
        timestamp: new Date(),
        overallAssessment,
        agentResults,
        crossAgentInsights,
        executiveSummary
      };

    } catch (error) {
      logger.error(`Platform intelligence analysis ${analysisId} failed`, {}, error);
      throw error;
    }
  }

  private analyzeCrossAgentInsights(agentResults: any): {
    correlatedFindings: CorrelatedFinding[];
    conflictingRecommendations: ConflictingRecommendation[];
    synergisticOpportunities: SynergisticOpportunity[];
    holisticRecommendations: HolisticRecommendation[];
  } {
    
    // Analyze correlated findings across agents
    const correlatedFindings: CorrelatedFinding[] = [];
    const allInsights = Object.entries(agentResults)
      .filter(([_, result]) => (result as AgentResponse).success)
      .flatMap(([agent, result]) => 
        (result as AgentResponse).insights?.map(insight => ({ agent, insight })) || []
      );

    // Look for similar themes across insights
    const recoveryThemes = allInsights.filter(item => 
      item.insight.toLowerCase().includes('recovery') || 
      item.insight.toLowerCase().includes('timeline')
    );

    if (recoveryThemes.length > 1) {
      correlatedFindings.push({
        finding: 'Recovery timeline concerns identified across multiple analysis areas',
        supportingAgents: recoveryThemes.map(t => t.agent),
        confidenceLevel: 85,
        implications: ['Coordinated intervention may be needed', 'Timeline expectations should be realigned']
      });
    }

    // Analyze conflicting recommendations
    const conflictingRecommendations: ConflictingRecommendation[] = [];
    // This would involve more complex logic to detect conflicts

    // Identify synergistic opportunities
    const synergisticOpportunities: SynergisticOpportunity[] = [];
    if (agentResults.compliance.success && agentResults.stakeholderCommunication.success) {
      synergisticOpportunities.push({
        opportunity: 'Integrated compliance communication strategy',
        involvedAgents: ['compliance', 'stakeholderCommunication'],
        combinedBenefit: 'Improved stakeholder alignment while ensuring regulatory compliance',
        implementationStrategy: 'Develop templated communications that address compliance requirements',
        estimatedImpact: 'medium'
      });
    }

    // Generate holistic recommendations
    const holisticRecommendations: HolisticRecommendation[] = [];
    
    // Look for high-priority insights across agents
    const highPriorityInsights = Object.entries(agentResults)
      .filter(([_, result]) => (result as AgentResponse).success)
      .flatMap(([agent, result]) => 
        (result as AgentResponse).recommendations?.map(rec => ({ agent, recommendation: rec })) || []
      );

    if (highPriorityInsights.length > 2) {
      holisticRecommendations.push({
        recommendation: 'Implement coordinated case management review process',
        priority: 'high',
        timeline: 14,
        involvedStakeholders: ['Case Manager', 'Medical Team', 'Employer'],
        expectedOutcome: 'Improved coordination and faster resolution',
        successMetrics: ['Case resolution time', 'Stakeholder satisfaction', 'Compliance adherence']
      });
    }

    return {
      correlatedFindings,
      conflictingRecommendations,
      synergisticOpportunities,
      holisticRecommendations
    };
  }

  private generateOverallAssessment(agentResults: any, crossAgentInsights: any): {
    status: 'optimal' | 'good' | 'concerning' | 'critical';
    confidenceScore: number;
    priorityLevel: 'low' | 'medium' | 'high' | 'urgent';
    keyFindings: string[];
    criticalAlerts: string[];
  } {
    
    const successfulAgents = Object.values(agentResults).filter(
      (result: any) => result.success
    ) as AgentResponse[];

    const averageConfidence = successfulAgents.length > 0 
      ? successfulAgents.reduce((sum, result) => sum + result.confidence, 0) / successfulAgents.length 
      : 0.5;

    // Determine overall status based on agent insights
    const allInsights = successfulAgents.flatMap(result => result.insights || []);
    const criticalInsights = allInsights.filter(insight => 
      insight.toLowerCase().includes('critical') || 
      insight.toLowerCase().includes('urgent') ||
      insight.toLowerCase().includes('immediate')
    );

    const status: 'optimal' | 'good' | 'concerning' | 'critical' = 
      criticalInsights.length > 2 ? 'critical' :
      criticalInsights.length > 0 ? 'concerning' :
      averageConfidence > 0.8 ? 'optimal' : 'good';

    const priorityLevel: 'low' | 'medium' | 'high' | 'urgent' = 
      status === 'critical' ? 'urgent' :
      status === 'concerning' ? 'high' :
      status === 'good' ? 'medium' : 'low';

    return {
      status,
      confidenceScore: Math.round(averageConfidence * 100),
      priorityLevel,
      keyFindings: allInsights.slice(0, 5),
      criticalAlerts: criticalInsights
    };
  }

  private generateExecutiveSummary(
    agentResults: any, 
    crossAgentInsights: any, 
    overallAssessment: any,
    priorityFocus?: string
  ): {
    situationOverview: string;
    keyRisks: string[];
    topPriorities: string[];
    recommendedActions: string[];
    nextSteps: string[];
  } {
    
    const successfulAgents = Object.values(agentResults).filter(
      (result: any) => result.success
    ) as AgentResponse[];

    const allRecommendations = successfulAgents.flatMap(result => result.recommendations || []);

    return {
      situationOverview: `Case analysis completed with ${overallAssessment.status} overall status. ${successfulAgents.length} specialist agents provided insights with ${overallAssessment.confidenceScore}% average confidence.`,
      keyRisks: crossAgentInsights.correlatedFindings.map((f: any) => f.finding).slice(0, 3),
      topPriorities: overallAssessment.keyFindings.slice(0, 3),
      recommendedActions: allRecommendations.slice(0, 5),
      nextSteps: [
        'Review coordinated analysis findings with case management team',
        'Implement high-priority recommendations within specified timelines',
        'Schedule follow-up analysis in 2-4 weeks to track progress',
        'Ensure stakeholder communication aligns with recommendations'
      ]
    };
  }

  /**
   * Get individual agent analysis
   */
  public async getAgentAnalysis(
    agentType: 'injury-case' | 'compliance' | 'risk-assessment' | 'stakeholder-communication' | 'business-intelligence' | 'integration-orchestration',
    caseId?: string,
    options: any = {}
  ): Promise<AgentResponse> {
    
    switch (agentType) {
      case 'injury-case':
        return this.injuryCaseAgent.analyze({ caseId: caseId!, ...options });
      case 'compliance':
        return this.complianceAgent.analyze({ caseId: caseId!, ...options });
      case 'risk-assessment':
        return this.riskAssessmentAgent.analyze({ caseId: caseId!, ...options });
      case 'stakeholder-communication':
        return this.stakeholderCommunicationAgent.analyze({ caseId: caseId!, ...options });
      case 'business-intelligence':
        return this.businessIntelligenceAgent.analyze({ caseId, ...options });
      case 'integration-orchestration':
        return this.integrationOrchestrationAgent.analyze({ caseId, ...options });
      default:
        throw new Error(`Unknown agent type: ${agentType}`);
    }
  }

  /**
   * Get all available agents and their specializations
   */
  public getAvailableAgents(): { id: string; name: string; specialization: string }[] {
    return [
      {
        id: 'injury-case',
        name: 'Injury Case Intelligence',
        specialization: this.injuryCaseAgent.getSpecialization()
      },
      {
        id: 'compliance',
        name: 'Compliance Intelligence',
        specialization: this.complianceAgent.getSpecialization()
      },
      {
        id: 'risk-assessment',
        name: 'Risk Assessment Intelligence',
        specialization: this.riskAssessmentAgent.getSpecialization()
      },
      {
        id: 'stakeholder-communication',
        name: 'Stakeholder Communication Intelligence',
        specialization: this.stakeholderCommunicationAgent.getSpecialization()
      },
      {
        id: 'business-intelligence',
        name: 'Business Intelligence',
        specialization: this.businessIntelligenceAgent.getSpecialization()
      },
      {
        id: 'integration-orchestration',
        name: 'Integration Orchestration Intelligence',
        specialization: this.integrationOrchestrationAgent.getSpecialization()
      }
    ];
  }
}

// Export singleton instance
export const intelligenceCoordinator = new IntelligenceCoordinator();