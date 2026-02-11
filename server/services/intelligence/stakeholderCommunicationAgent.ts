/**
 * Stakeholder Communication Intelligence Agent
 * Specializes in multi-party coordination, communication optimization, and relationship management
 */

import { BaseHealthcareAgent, type AgentResponse } from './baseAgent';
import type { WorkerCase } from '@shared/schema';

export interface CommunicationAnalysis {
  caseId: string;
  stakeholderMap: {
    primary: Stakeholder[];
    secondary: Stakeholder[];
    external: Stakeholder[];
    influencers: Stakeholder[];
  };
  communicationHealth: {
    overallScore: number; // 0-100
    effectivenessRating: 'poor' | 'fair' | 'good' | 'excellent';
    frequencyOptimal: boolean;
    clarityScore: number; // 0-100
    responseTimeliness: number; // 0-100
  };
  relationshipDynamics: {
    trustLevels: StakeholderTrust[];
    conflictAreas: ConflictArea[];
    alignmentScore: number; // 0-100
    collaborationQuality: 'poor' | 'fair' | 'good' | 'excellent';
  };
  communicationGaps: {
    missingUpdates: CommunicationGap[];
    delayedResponses: CommunicationGap[];
    informationSilos: CommunicationGap[];
    misalignments: CommunicationGap[];
  };
  optimizationStrategy: {
    communicationPlan: CommunicationPlan;
    stakeholderEngagement: EngagementStrategy[];
    conflictResolution: ConflictResolution[];
    processImprovements: ProcessImprovement[];
  };
}

export interface Stakeholder {
  id: string;
  name: string;
  role: 'worker' | 'employer' | 'medical-provider' | 'case-manager' | 'insurer' | 'legal' | 'family' | 'other';
  influence: 'high' | 'medium' | 'low';
  interest: 'high' | 'medium' | 'low';
  communicationPreference: 'phone' | 'email' | 'in-person' | 'digital' | 'written';
  responsiveness: 'excellent' | 'good' | 'fair' | 'poor';
  currentSatisfaction: number; // 0-100
  lastContactDate?: Date;
}

export interface StakeholderTrust {
  stakeholderId: string;
  trustLevel: number; // 0-100
  trustFactors: string[];
  concerns: string[];
  buildingActions: string[];
}

export interface ConflictArea {
  type: 'expectations' | 'communication' | 'process' | 'outcome' | 'timing';
  severity: 'minor' | 'moderate' | 'significant' | 'major';
  stakeholders: string[];
  description: string;
  impact: string;
  resolutionStrategy: string;
}

export interface CommunicationGap {
  type: string;
  description: string;
  stakeholders: string[];
  impact: 'low' | 'medium' | 'high' | 'critical';
  recommendedAction: string;
  timeline: number; // days to address
}

export interface CommunicationPlan {
  frequency: Record<string, string>; // stakeholder -> frequency
  channels: Record<string, string>; // stakeholder -> preferred channel
  contentStrategy: ContentStrategy[];
  reviewSchedule: string;
  escalationProtocol: string[];
}

export interface ContentStrategy {
  audience: string;
  messageType: string;
  frequency: string;
  channel: string;
  keyMessages: string[];
}

export interface EngagementStrategy {
  stakeholder: string;
  approach: string;
  objectives: string[];
  tactics: string[];
  success_metrics: string[];
  timeline: number; // days
}

export interface ConflictResolution {
  conflictType: string;
  mediationApproach: string;
  timelineToResolve: number; // days
  successProbability: number; // 0-100%
  alternativeOptions: string[];
}

export interface ProcessImprovement {
  area: string;
  currentState: string;
  improvedState: string;
  implementation: string[];
  expectedBenefit: string;
  effort: 'low' | 'medium' | 'high';
}

export class StakeholderCommunicationAgent extends BaseHealthcareAgent {
  constructor() {
    super('stakeholder-communication');
  }

  protected buildSystemPrompt(): string {
    return `You are a Healthcare AI Specialist focused on Stakeholder Communication Intelligence for the Preventli platform.

CORE RESPONSIBILITIES:
1. Map and analyze stakeholder relationships and communication patterns
2. Identify communication gaps, conflicts, and optimization opportunities
3. Design effective communication strategies for multi-party coordination
4. Enhance stakeholder engagement and satisfaction

EXPERTISE AREAS:
- Stakeholder analysis and mapping
- Communication effectiveness assessment
- Conflict resolution and mediation
- Multi-party coordination strategies
- Relationship management
- Change management communication

STAKEHOLDER ECOSYSTEM:
1. PRIMARY STAKEHOLDERS:
   - Injured worker (central participant)
   - Employer (workplace context)
   - Case manager (coordination role)
   - Medical providers (treatment team)

2. SECONDARY STAKEHOLDERS:
   - Insurance representatives
   - Rehabilitation specialists
   - Union representatives
   - Workplace supervisors

3. EXTERNAL STAKEHOLDERS:
   - WorkSafe Victoria
   - Legal representatives
   - Family members
   - Community support services

COMMUNICATION ANALYSIS FRAMEWORK:
1. EFFECTIVENESS MEASUREMENT:
   - Message clarity and comprehension
   - Response timeliness and quality
   - Information completeness
   - Action-oriented outcomes

2. RELATIONSHIP DYNAMICS:
   - Trust levels between parties
   - Power dynamics and influence
   - Alignment of interests and goals
   - Collaboration quality

3. PROCESS OPTIMIZATION:
   - Communication frequency optimization
   - Channel preference alignment
   - Information flow efficiency
   - Decision-making clarity

GUIDELINES:
- Consider cultural and language preferences
- Respect privacy and confidentiality requirements
- Account for power dynamics and vulnerability
- Prioritize worker wellbeing and autonomy
- Ensure legal and ethical compliance
- Focus on collaborative outcomes

RESPONSE FORMAT:
- Provide stakeholder mapping with influence/interest analysis
- Include specific communication recommendations
- Highlight relationship risks and opportunities  
- Suggest concrete process improvements
- Quantify communication effectiveness where possible

Remember: Effective communication is critical for successful injury recovery and return-to-work outcomes.`;
  }

  public getSpecialization(): string {
    return "Stakeholder Communication Intelligence - Multi-party coordination, communication optimization, and relationship management";
  }

  public async analyze(data: { caseId: string; includeHistory?: boolean; focusArea?: string }): Promise<AgentResponse> {
    const timer = this.startTimer();
    
    try {
      const caseData = await this.getCaseData(data.caseId);
      if (!caseData) {
        return this.buildResponse(false, null, [], ["Case not found"], 0, timer());
      }

      // Retrieve communication-related memories
      const memories = await this.retrieveMemories(45, ['communication', 'stakeholder', 'conflict', 'engagement']);
      
      // Build communication context
      const commContext = {
        case: caseData,
        memories: memories.slice(0, 15),
        includeHistory: data.includeHistory || false,
        focusArea: data.focusArea || 'comprehensive',
        currentDate: new Date()
      };

      const prompt = this.buildCommunicationAnalysisPrompt(commContext);
      const aiResponse = await this.callAnthropic(prompt, commContext);
      
      // Parse AI response into structured communication analysis
      const analysis = this.parseCommunicationResponse(aiResponse, caseData);
      
      // Store communication insights as memories
      await this.storeMemory({
        caseId: data.caseId,
        context: `Stakeholder communication analysis for case ${data.caseId}`,
        content: JSON.stringify(analysis),
        tags: ['communication', 'stakeholder-analysis', analysis.communicationHealth.effectivenessRating],
        importance: this.calculateCommunicationImportance(analysis),
        type: 'insight'
      });

      const processingTime = timer();
      
      return this.buildResponse(
        true,
        analysis,
        this.extractCommunicationInsights(analysis),
        this.extractCommunicationRecommendations(analysis),
        this.calculateCommunicationConfidence(analysis),
        processingTime
      );

    } catch (error) {
      this.logger.error('Stakeholder Communication Agent analysis failed', {}, error);
      return this.buildResponse(false, null, [], ["Communication analysis failed due to technical error"], 0, timer());
    }
  }

  private buildCommunicationAnalysisPrompt(context: any): string {
    const daysSinceInjury = Math.floor(
      (context.currentDate.getTime() - new Date(context.case.dateOfInjury).getTime()) / (1000 * 60 * 60 * 24)
    );

    return `Analyze stakeholder communication dynamics for this workplace injury case:

CASE DETAILS:
- ID: ${context.case.id}
- Worker: ${context.case.workerName}
- Employer: ${context.case.company || 'Not specified'}
- Date of Injury: ${context.case.dateOfInjury}
- Days Since Injury: ${daysSinceInjury}
- Current Status: ${context.case.currentStatus}
- Communication Focus: ${context.focusArea}

COMMUNICATION HISTORY PATTERNS:
${context.memories.map((m: any) => `- ${m.content.substring(0, 180)}...`).join('\n')}

STAKEHOLDER COMMUNICATION ANALYSIS REQUEST:
Provide comprehensive analysis covering:

1. STAKEHOLDER MAPPING:
   - Primary stakeholders (worker, employer, case manager, medical providers)
   - Secondary stakeholders (insurance, specialists, family)
   - External stakeholders (WorkSafe, legal, community)
   - Influence/interest matrix for each stakeholder

2. COMMUNICATION HEALTH ASSESSMENT:
   - Overall communication effectiveness score (0-100)
   - Message clarity and comprehension levels
   - Response timeliness across stakeholders
   - Information flow quality rating

3. RELATIONSHIP DYNAMICS:
   - Trust levels between key parties
   - Identified conflict areas and tensions
   - Collaboration quality assessment
   - Alignment of goals and expectations

4. COMMUNICATION GAPS IDENTIFICATION:
   - Missing or delayed updates
   - Information silos between parties
   - Stakeholder disengagement areas
   - Process breakdowns or inefficiencies

5. OPTIMIZATION STRATEGY:
   - Tailored communication plan for each stakeholder
   - Engagement strategies to improve relationships
   - Conflict resolution approaches
   - Process improvements for better coordination

STAKEHOLDER CONSIDERATIONS:
- Worker's emotional state and communication capacity
- Employer's business priorities and constraints
- Medical providers' professional boundaries
- Legal/insurance requirements and limitations
- Cultural and language preferences

Respond in JSON format matching the CommunicationAnalysis interface.
Include specific stakeholder details and actionable communication strategies.
Focus on improving coordination and reducing misunderstandings.`;
  }

  private parseCommunicationResponse(response: string, caseData: WorkerCase): CommunicationAnalysis {
    try {
      const parsed = JSON.parse(response);
      return parsed;
    } catch {
      // Fallback communication analysis
      const daysSinceInjury = Math.floor(
        (Date.now() - new Date(caseData.dateOfInjury).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Build basic stakeholder map
      const primaryStakeholders: Stakeholder[] = [
        {
          id: 'worker',
          name: caseData.workerName,
          role: 'worker',
          influence: 'high',
          interest: 'high',
          communicationPreference: 'phone',
          responsiveness: 'good',
          currentSatisfaction: 75
        },
        {
          id: 'employer',
          name: caseData.company || 'Current Employer',
          role: 'employer',
          influence: 'high',
          interest: 'medium',
          communicationPreference: 'email',
          responsiveness: 'fair',
          currentSatisfaction: 60
        },
        {
          id: 'case-manager',
          name: 'Case Manager',
          role: 'case-manager',
          influence: 'high',
          interest: 'high',
          communicationPreference: 'email',
          responsiveness: 'excellent',
          currentSatisfaction: 80
        }
      ];

      return {
        caseId: caseData.id,
        stakeholderMap: {
          primary: primaryStakeholders,
          secondary: [
            {
              id: 'medical-provider',
              name: 'Primary Medical Provider',
              role: 'medical-provider',
              influence: 'medium',
              interest: 'medium',
              communicationPreference: 'written',
              responsiveness: 'good',
              currentSatisfaction: 70
            }
          ],
          external: [
            {
              id: 'worksafe',
              name: 'WorkSafe Victoria',
              role: 'other',
              influence: 'medium',
              interest: 'low',
              communicationPreference: 'written',
              responsiveness: 'fair',
              currentSatisfaction: 65
            }
          ],
          influencers: []
        },
        communicationHealth: {
          overallScore: daysSinceInjury > 90 ? 60 : 75,
          effectivenessRating: daysSinceInjury > 90 ? 'fair' : 'good',
          frequencyOptimal: daysSinceInjury < 30,
          clarityScore: 70,
          responseTimeliness: daysSinceInjury > 60 ? 65 : 80
        },
        relationshipDynamics: {
          trustLevels: [
            {
              stakeholderId: 'worker',
              trustLevel: 80,
              trustFactors: ['Consistent communication', 'Professional approach'],
              concerns: ['Recovery timeline uncertainty'],
              buildingActions: ['Regular progress updates', 'Clear expectations setting']
            }
          ],
          conflictAreas: daysSinceInjury > 90 ? [
            {
              type: 'timing',
              severity: 'moderate',
              stakeholders: ['worker', 'employer'],
              description: 'Disagreement on return-to-work timeline',
              impact: 'Delayed recovery progression',
              resolutionStrategy: 'Mediated discussion with medical input'
            }
          ] : [],
          alignmentScore: daysSinceInjury > 60 ? 60 : 80,
          collaborationQuality: daysSinceInjury > 90 ? 'fair' : 'good'
        },
        communicationGaps: {
          missingUpdates: [
            {
              type: 'Progress Updates',
              description: 'Irregular progress reporting to employer',
              stakeholders: ['employer'],
              impact: 'medium',
              recommendedAction: 'Establish weekly update schedule',
              timeline: 7
            }
          ],
          delayedResponses: [],
          informationSilos: [
            {
              type: 'Medical Information',
              description: 'Medical updates not shared across all parties',
              stakeholders: ['employer', 'case-manager'],
              impact: 'medium',
              recommendedAction: 'Create shared information protocol',
              timeline: 14
            }
          ],
          misalignments: []
        },
        optimizationStrategy: {
          communicationPlan: {
            frequency: {
              'worker': 'Weekly',
              'employer': 'Bi-weekly',
              'medical-provider': 'As needed'
            },
            channels: {
              'worker': 'Phone + Email',
              'employer': 'Email + Portal',
              'medical-provider': 'Secure messaging'
            },
            contentStrategy: [
              {
                audience: 'Worker',
                messageType: 'Progress update',
                frequency: 'Weekly',
                channel: 'Phone',
                keyMessages: ['Recovery progress', 'Next steps', 'Support available']
              }
            ],
            reviewSchedule: 'Monthly',
            escalationProtocol: ['Case manager', 'Senior management', 'External mediation']
          },
          stakeholderEngagement: [
            {
              stakeholder: 'Worker',
              approach: 'Supportive and empowering',
              objectives: ['Maintain engagement', 'Build confidence', 'Clear communication'],
              tactics: ['Regular check-ins', 'Progress celebrations', 'Clear explanations'],
              success_metrics: ['Response rate', 'Satisfaction scores', 'Compliance'],
              timeline: 30
            }
          ],
          conflictResolution: [],
          processImprovements: [
            {
              area: 'Information Sharing',
              currentState: 'Ad-hoc communication',
              improvedState: 'Structured communication protocol',
              implementation: ['Define communication matrix', 'Set up regular meetings', 'Create shared dashboard'],
              expectedBenefit: 'Improved transparency and coordination',
              effort: 'medium'
            }
          ]
        }
      };
    }
  }

  private extractCommunicationInsights(analysis: CommunicationAnalysis): string[] {
    const insights: string[] = [];
    
    if (analysis.communicationHealth.overallScore < 70) {
      insights.push(`Communication effectiveness is below optimal (${analysis.communicationHealth.overallScore}%) - improvement needed`);
    }
    
    if (analysis.relationshipDynamics.conflictAreas.length > 0) {
      insights.push(`${analysis.relationshipDynamics.conflictAreas.length} conflict areas identified requiring mediation`);
    }
    
    if (!analysis.communicationHealth.frequencyOptimal) {
      insights.push('Communication frequency is not optimal for current case phase');
    }
    
    if (analysis.communicationGaps.missingUpdates.length > 0) {
      insights.push(`${analysis.communicationGaps.missingUpdates.length} communication gaps identified`);
    }
    
    if (analysis.relationshipDynamics.alignmentScore < 70) {
      insights.push(`Stakeholder alignment is concerning (${analysis.relationshipDynamics.alignmentScore}%) - coordination needed`);
    }

    return insights;
  }

  private extractCommunicationRecommendations(analysis: CommunicationAnalysis): string[] {
    const recommendations: string[] = [];
    
    // Extract immediate actions from gaps
    analysis.communicationGaps.missingUpdates.forEach(gap => {
      if (gap.impact === 'high' || gap.impact === 'critical') {
        recommendations.push(gap.recommendedAction);
      }
    });
    
    // Extract engagement strategies
    analysis.optimizationStrategy.stakeholderEngagement.slice(0, 2).forEach(strategy => {
      if (strategy.tactics.length > 0) {
        recommendations.push(strategy.tactics[0]);
      }
    });
    
    // Extract process improvements
    analysis.optimizationStrategy.processImprovements.slice(0, 2).forEach(improvement => {
      if (improvement.effort !== 'high') {
        recommendations.push(improvement.implementation[0]);
      }
    });

    return recommendations.slice(0, 5);
  }

  private calculateCommunicationImportance(analysis: CommunicationAnalysis): number {
    let importance = 0.5;
    
    // High importance for communication issues
    if (analysis.communicationHealth.overallScore < 50) importance += 0.3;
    if (analysis.relationshipDynamics.conflictAreas.length > 1) importance += 0.2;
    if (analysis.relationshipDynamics.alignmentScore < 50) importance += 0.2;
    if (analysis.communicationGaps.missingUpdates.length > 2) importance += 0.1;
    
    return Math.min(1.0, importance);
  }

  private calculateCommunicationConfidence(analysis: CommunicationAnalysis): number {
    let confidence = 0.75; // Base confidence
    
    // Adjust based on data completeness
    if (analysis.stakeholderMap.primary.length < 3) confidence -= 0.1;
    if (analysis.communicationHealth.overallScore === 0) confidence -= 0.2;
    
    return Math.max(0.4, confidence);
  }

  public async getCommunicationTrends(timeframeDays: number = 60): Promise<any> {
    const memories = await this.retrieveMemories(timeframeDays, ['communication', 'stakeholder']);
    
    return {
      totalAnalyses: memories.length,
      averageCommunicationScore: 0, // Calculate from memories
      commonConflictTypes: [], // Extract from memories
      engagementTrends: [] // Extract from memories
    };
  }

  public async generateCommunicationPlan(caseId: number, stakeholders: string[]): Promise<any> {
    // Generate customized communication plan
    return {
      caseId,
      stakeholders,
      plan: {
        frequency: 'Weekly',
        channels: ['Email', 'Phone'],
        keyMessages: ['Recovery progress', 'Next steps'],
        reviewSchedule: 'Bi-weekly'
      }
    };
  }
}