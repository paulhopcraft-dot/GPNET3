/**
 * Injury Case Intelligence Agent
 * Specializes in recovery patterns, treatment coordination, and clinical analysis
 */

import { BaseHealthcareAgent, type AgentResponse } from './baseAgent';
import type { WorkerCase } from '@shared/schema';

export interface InjuryCaseAnalysis {
  caseId: string;
  recoveryPattern: {
    phase: 'acute' | 'subacute' | 'chronic' | 'maintenance';
    expectedDuration: number; // days
    currentProgress: number; // 0-100%
    riskFactors: string[];
  };
  treatmentCoordination: {
    activeProviders: string[];
    treatmentGaps: string[];
    coordinationScore: number; // 0-100
    recommendations: string[];
  };
  clinicalEvidence: {
    qualityScore: number; // 0-100
    consistencyRating: 'consistent' | 'inconsistent' | 'conflicting';
    evidenceGaps: string[];
    keyFindings: string[];
  };
  prognosis: {
    returnToWorkProbability: number; // 0-100%
    timeframeEstimate: number; // days
    limitingFactors: string[];
    supportNeeds: string[];
  };
}

export class InjuryCaseAgent extends BaseHealthcareAgent {
  constructor() {
    super('injury-case');
  }

  protected buildSystemPrompt(): string {
    return `You are a Healthcare AI Specialist focused on Injury Case Intelligence for the Preventli platform.

CORE RESPONSIBILITIES:
1. Analyze injury recovery patterns and predict outcomes
2. Coordinate treatment plans across multiple healthcare providers
3. Evaluate clinical evidence quality and consistency
4. Provide evidence-based prognosis and recommendations

EXPERTISE AREAS:
- Musculoskeletal injuries (back, neck, limbs)
- Occupational health and rehabilitation
- Return-to-work planning and coordination
- Clinical evidence evaluation
- Treatment pathway optimization

GUIDELINES:
- Use evidence-based medicine principles
- Consider Victorian WorkSafe requirements
- Focus on sustainable return-to-work outcomes
- Maintain clinical objectivity and compliance
- Prioritize worker safety and wellbeing

RESPONSE FORMAT:
- Provide specific, actionable insights
- Include confidence ratings for predictions
- Highlight critical decision points
- Flag any safety concerns immediately
- Document reasoning for audit trails

Remember: You're supporting case managers with clinical intelligence, not replacing clinical judgment.`;
  }

  public getSpecialization(): string {
    return "Injury Case Intelligence - Recovery patterns, treatment coordination, and clinical analysis";
  }

  public async analyze(data: { caseId: string; includeHistory?: boolean }): Promise<AgentResponse> {
    const timer = this.startTimer();
    
    try {
      const caseData = await this.getCaseData(data.caseId);
      if (!caseData) {
        return this.buildResponse(false, null, [], ["Case not found"], 0, timer());
      }

      // Retrieve relevant memories
      const memories = await this.retrieveMemories(30, ['injury-pattern', 'treatment', 'recovery']);
      
      // Build analysis context
      const analysisContext = {
        case: caseData,
        memories: memories.slice(0, 10), // Top 10 most important memories
        includeHistory: data.includeHistory || false
      };

      const prompt = this.buildAnalysisPrompt(analysisContext);
      const aiResponse = await this.callAnthropic(prompt, analysisContext);
      
      // Parse AI response into structured analysis
      const analysis = this.parseAnalysisResponse(aiResponse, caseData);
      
      // Store key insights as memories
      await this.storeMemory({
        caseId: data.caseId,
        context: `Analysis for case ${data.caseId}`,
        content: JSON.stringify(analysis),
        tags: ['analysis', 'injury-pattern', 'general'],
        importance: this.calculateImportance(analysis),
        type: 'insight'
      });

      const processingTime = timer();
      
      return this.buildResponse(
        true,
        analysis,
        this.extractInsights(analysis),
        this.extractRecommendations(analysis),
        0.7,
        processingTime
      );

    } catch (error) {
      this.logger.error('Injury Case Agent analysis failed', {}, error);
      return this.buildResponse(false, null, [], ["Analysis failed due to technical error"], 0, timer());
    }
  }

  private buildAnalysisPrompt(context: any): string {
    return `Analyze this workplace injury case and provide comprehensive insights:

CASE DETAILS:
- ID: ${context.case.id}
- Worker: ${context.case.workerName}
- Date of Injury: ${context.case.dateOfInjury}
- Current Status: ${context.case.currentStatus}
- Days Since Injury: ${Math.floor((Date.now() - new Date(context.case.dateOfInjury).getTime()) / (1000 * 60 * 60 * 24))}
- Description: ${context.case.description || 'No description available'}

RECENT RELEVANT PATTERNS (from memory):
${context.memories.map((m: any) => `- ${m.content.substring(0, 200)}...`).join('\n')}

ANALYSIS REQUEST:
Please provide a structured analysis covering:

1. RECOVERY PATTERN ANALYSIS:
   - Current recovery phase (acute/subacute/chronic/maintenance)
   - Expected total duration based on injury type and severity
   - Current progress percentage
   - Key risk factors affecting recovery

2. TREATMENT COORDINATION:
   - Active healthcare providers involved
   - Identified treatment gaps or conflicts
   - Coordination effectiveness score (0-100)
   - Specific coordination recommendations

3. CLINICAL EVIDENCE EVALUATION:
   - Quality score of available evidence (0-100)
   - Consistency rating of medical reports
   - Evidence gaps that need addressing
   - Key clinical findings summary

4. PROGNOSIS AND RECOMMENDATIONS:
   - Return-to-work probability percentage
   - Realistic timeframe estimate
   - Primary limiting factors
   - Support needs and interventions

Respond in JSON format with the exact structure of InjuryCaseAnalysis interface.
Include confidence scores and specific, actionable recommendations.`;
  }

  private parseAnalysisResponse(response: string, caseData: WorkerCase): InjuryCaseAnalysis {
    try {
      // Try to parse JSON response
      const parsed = JSON.parse(response);
      return parsed;
    } catch {
      // Fallback to default analysis structure if parsing fails
      const daysSinceInjury = Math.floor(
        (Date.now() - new Date(caseData.dateOfInjury).getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        caseId: caseData.id,
        recoveryPattern: {
          phase: daysSinceInjury < 7 ? 'acute' : daysSinceInjury < 90 ? 'subacute' : 'chronic',
          expectedDuration: 90, // Default estimate
          currentProgress: Math.min(100, (daysSinceInjury / 90) * 100),
          riskFactors: ['Insufficient clinical data', 'Analysis parsing error']
        },
        treatmentCoordination: {
          activeProviders: ['Primary care physician'],
          treatmentGaps: ['Comprehensive treatment plan needed'],
          coordinationScore: 50,
          recommendations: ['Establish clear treatment pathway', 'Improve documentation']
        },
        clinicalEvidence: {
          qualityScore: 50,
          consistencyRating: 'inconsistent',
          evidenceGaps: ['Recent medical certificates', 'Treatment progress notes'],
          keyFindings: ['Limited clinical information available']
        },
        prognosis: {
          returnToWorkProbability: 70,
          timeframeEstimate: Math.max(7, 90 - daysSinceInjury),
          limitingFactors: ['Data quality limitations'],
          supportNeeds: ['Enhanced clinical monitoring', 'Structured return-to-work plan']
        }
      };
    }
  }

  private extractInsights(analysis: InjuryCaseAnalysis): string[] {
    const insights: string[] = [];
    
    if (analysis.recoveryPattern.currentProgress < 50) {
      insights.push(`Recovery is at ${analysis.recoveryPattern.currentProgress}% - may need intervention`);
    }
    
    if (analysis.treatmentCoordination.coordinationScore < 70) {
      insights.push('Treatment coordination could be improved - multiple providers may need better alignment');
    }
    
    if (analysis.clinicalEvidence.qualityScore < 60) {
      insights.push('Clinical evidence quality is below optimal - additional documentation recommended');
    }
    
    if (analysis.prognosis.returnToWorkProbability < 70) {
      insights.push('Return-to-work probability is concerning - proactive support may be needed');
    }

    return insights;
  }

  private extractRecommendations(analysis: InjuryCaseAnalysis): string[] {
    const recommendations: string[] = [];
    
    recommendations.push(...analysis.treatmentCoordination.recommendations);
    recommendations.push(...analysis.prognosis.supportNeeds);
    
    if (analysis.clinicalEvidence.evidenceGaps.length > 0) {
      recommendations.push('Address clinical evidence gaps: ' + analysis.clinicalEvidence.evidenceGaps.join(', '));
    }

    return recommendations.slice(0, 5); // Limit to top 5 recommendations
  }

  private calculateImportance(analysis: InjuryCaseAnalysis): number {
    let importance = 0.5; // Base importance
    
    // Increase importance for concerning cases
    if (analysis.prognosis.returnToWorkProbability < 50) importance += 0.3;
    if (analysis.recoveryPattern.phase === 'chronic') importance += 0.2;
    if (analysis.treatmentCoordination.coordinationScore < 50) importance += 0.2;
    if (analysis.clinicalEvidence.qualityScore < 40) importance += 0.1;
    
    return Math.min(1.0, importance);
  }

  public async getRecoveryTrends(timeframeDays: number = 30): Promise<any> {
    const memories = await this.retrieveMemories(timeframeDays, ['injury-pattern', 'recovery']);
    
    // Analyze recovery trends from memory data
    return {
      totalCasesAnalyzed: memories.length,
      averageRecoveryTime: 0, // Calculate from memories
      commonRiskFactors: [], // Extract from memories
      successfulInterventions: [] // Extract from memories
    };
  }
}