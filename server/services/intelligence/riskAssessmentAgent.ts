/**
 * Risk Assessment Intelligence Agent
 * Specializes in predictive analytics, cost forecasting, and risk modeling
 */

import { BaseHealthcareAgent, type AgentResponse } from './baseAgent';
import type { WorkerCase } from '@shared/schema';

export interface RiskAssessment {
  caseId: string;
  overallRisk: {
    score: number; // 0-100 (higher = more risk)
    level: 'minimal' | 'low' | 'moderate' | 'high' | 'severe';
    category: 'financial' | 'medical' | 'operational' | 'legal' | 'combined';
    confidence: number; // 0-100
  };
  financialRisk: {
    projectedCost: number;
    costRange: { min: number; max: number };
    costDrivers: CostDriver[];
    budgetImpact: 'minimal' | 'moderate' | 'significant' | 'severe';
    timeToResolution: number; // days
  };
  medicalRisk: {
    complicationProbability: number; // 0-100%
    chronicityRisk: number; // 0-100%
    deteriorationIndicators: string[];
    recommendedInterventions: MedicalIntervention[];
    monitoringFrequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  };
  operationalRisk: {
    workplaceImpact: 'none' | 'minimal' | 'moderate' | 'significant' | 'severe';
    productivityLoss: number; // percentage
    replacementNeeds: ReplacementNeed[];
    teamMoraleImpact: number; // 0-100
    reputationalRisk: number; // 0-100
  };
  legalRisk: {
    litigationProbability: number; // 0-100%
    complianceRisk: number; // 0-100%
    liabilityExposure: number; // dollar amount
    regulatoryRisk: string[];
    documentationQuality: 'poor' | 'fair' | 'good' | 'excellent';
  };
  mitigationStrategies: {
    immediateActions: RiskMitigation[];
    shortTermActions: RiskMitigation[];
    longTermActions: RiskMitigation[];
    contingencyPlan: string[];
  };
}

export interface CostDriver {
  factor: string;
  impact: 'low' | 'medium' | 'high';
  estimatedCost: number;
  probability: number; // 0-100%
  timeframe: string;
}

export interface MedicalIntervention {
  intervention: string;
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  costEstimate: number;
  expectedOutcome: string;
  successProbability: number; // 0-100%
}

export interface ReplacementNeed {
  role: string;
  duration: number; // days
  cost: number;
  availability: 'readily available' | 'difficult' | 'unavailable';
  skillsGap: number; // 0-100%
}

export interface RiskMitigation {
  action: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timeline: number; // days
  costToImplement: number;
  expectedReduction: number; // risk reduction percentage
  owner: string;
  success_probability: number; // 0-100%
}

export class RiskAssessmentAgent extends BaseHealthcareAgent {
  constructor() {
    super('risk-assessment');
  }

  protected buildSystemPrompt(): string {
    return `You are a Healthcare AI Specialist focused on Risk Assessment Intelligence for the Preventli platform.

CORE RESPONSIBILITIES:
1. Assess comprehensive risk across financial, medical, operational, and legal dimensions
2. Predict potential costs and complications using data-driven models
3. Identify early warning indicators and escalation triggers
4. Develop proactive risk mitigation strategies

EXPERTISE AREAS:
- Actuarial analysis and cost modeling
- Medical complication prediction
- Operational impact assessment
- Legal liability evaluation
- Insurance claim analytics
- Predictive risk modeling

RISK ASSESSMENT FRAMEWORK:
1. FINANCIAL RISK:
   - Direct medical costs (treatments, medications)
   - Indirect costs (lost productivity, replacement workers)
   - Legal costs (litigation, settlements)
   - Administrative costs (case management, compliance)

2. MEDICAL RISK:
   - Complication probability based on injury type/severity
   - Chronic condition development risk
   - Treatment effectiveness likelihood
   - Recovery timeline variance

3. OPERATIONAL RISK:
   - Workplace disruption impact
   - Team morale and productivity effects
   - Skills shortage implications
   - Business continuity concerns

4. LEGAL RISK:
   - Litigation potential assessment
   - Compliance violation probability
   - Regulatory scrutiny likelihood
   - Documentation adequacy

ANALYTICAL APPROACH:
- Use historical data patterns for predictions
- Consider Victorian workers' compensation trends
- Factor in industry-specific risk patterns
- Account for seasonal and economic factors
- Apply Monte Carlo simulation concepts

GUIDELINES:
- Provide quantitative risk scores where possible
- Include confidence intervals for predictions
- Identify controllable vs uncontrollable factors
- Prioritize interventions by cost-benefit ratio
- Consider both short-term and long-term impacts

RESPONSE FORMAT:
- Structure risk assessment by category
- Provide specific numerical predictions
- Include probability ranges and confidence levels
- Rank mitigation actions by effectiveness
- Flag high-risk scenarios requiring immediate attention

Remember: Early risk identification enables proactive management and cost control.`;
  }

  public getSpecialization(): string {
    return "Risk Assessment Intelligence - Predictive analytics, cost forecasting, and comprehensive risk modeling";
  }

  public async analyze(data: { caseId: number; includePredictions?: boolean; timeHorizon?: number }): Promise<AgentResponse> {
    const timer = this.startTimer();
    
    try {
      const caseData = await this.getCaseData(data.caseId);
      if (!caseData) {
        return this.buildResponse(false, null, [], ["Case not found"], 0, timer());
      }

      // Retrieve risk-related memories
      const memories = await this.retrieveMemories(60, ['risk', 'cost', 'complication', 'litigation']);
      
      // Build risk assessment context
      const riskContext = {
        case: caseData,
        memories: memories.slice(0, 20),
        includePredictions: data.includePredictions || true,
        timeHorizon: data.timeHorizon || 365, // days
        currentDate: new Date()
      };

      const prompt = this.buildRiskAssessmentPrompt(riskContext);
      const aiResponse = await this.callAnthropic(prompt, riskContext);
      
      // Parse AI response into structured risk assessment
      const assessment = this.parseRiskAssessmentResponse(aiResponse, caseData);
      
      // Store risk insights as memories
      await this.storeMemory({
        caseId: data.caseId,
        context: `Risk assessment for case ${data.caseId}`,
        content: JSON.stringify(assessment),
        tags: ['risk-assessment', assessment.overallRisk.level, assessment.overallRisk.category],
        importance: this.calculateRiskImportance(assessment),
        type: 'insight'
      });

      const processingTime = timer();
      
      return this.buildResponse(
        true,
        assessment,
        this.extractRiskInsights(assessment),
        this.extractRiskRecommendations(assessment),
        assessment.overallRisk.confidence / 100,
        processingTime
      );

    } catch (error) {
      this.logger.error('Risk Assessment Agent analysis failed', {}, error);
      return this.buildResponse(false, null, [], ["Risk assessment failed due to technical error"], 0, timer());
    }
  }

  private buildRiskAssessmentPrompt(context: any): string {
    const daysSinceInjury = Math.floor(
      (context.currentDate.getTime() - new Date(context.case.dateOfInjury).getTime()) / (1000 * 60 * 60 * 24)
    );

    return `Perform comprehensive risk assessment for this workplace injury case:

CASE DETAILS:
- ID: ${context.case.id}
- Worker: ${context.case.workerName}
- Date of Injury: ${context.case.dateOfInjury}
- Days Since Injury: ${daysSinceInjury}
- Current Status: ${context.case.currentStatus}
- Description: ${context.case.summary || 'No description available'}
- Employer: ${context.case.company || 'Not specified'}

HISTORICAL RISK PATTERNS:
${context.memories.map((m: any) => `- ${m.content.substring(0, 200)}...`).join('\n')}

RISK ASSESSMENT REQUEST:
Provide comprehensive risk analysis over ${context.timeHorizon} days covering:

1. OVERALL RISK PROFILE:
   - Combined risk score (0-100)
   - Primary risk level and category
   - Confidence in assessment
   - Key risk drivers

2. FINANCIAL RISK ANALYSIS:
   - Projected total cost (base estimate)
   - Cost range (min/max scenarios)
   - Major cost drivers with probability weightings
   - Budget impact classification
   - Estimated time to resolution

3. MEDICAL RISK EVALUATION:
   - Complication probability based on injury type
   - Chronicity development risk
   - Deterioration warning signs
   - Recommended medical interventions
   - Monitoring frequency needed

4. OPERATIONAL IMPACT:
   - Workplace disruption assessment
   - Productivity loss calculations
   - Replacement staffing needs
   - Team morale impact
   - Reputational risk factors

5. LEGAL LIABILITY ASSESSMENT:
   - Litigation probability estimation
   - Compliance risk evaluation
   - Liability exposure quantification
   - Regulatory risk factors
   - Documentation quality assessment

6. RISK MITIGATION STRATEGIES:
   - Immediate actions (24-48 hours)
   - Short-term actions (1-4 weeks)  
   - Long-term strategies (3+ months)
   - Contingency planning recommendations

INDUSTRY BENCHMARKS TO CONSIDER:
- Average Victorian workers' compensation costs by injury type
- Typical recovery timeframes for similar injuries
- Litigation rates in comparable cases
- Complication rates from medical literature

Respond in JSON format matching the RiskAssessment interface.
Provide specific numerical estimates with rationale.
Include probability ranges and confidence intervals where applicable.`;
  }

  private parseRiskAssessmentResponse(response: string, caseData: WorkerCase): RiskAssessment {
    try {
      const parsed = JSON.parse(response);
      return parsed;
    } catch {
      // Fallback risk assessment
      const daysSinceInjury = Math.floor(
        (Date.now() - new Date(caseData.dateOfInjury).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Basic risk scoring based on available data
      const summaryLower = (caseData.summary || '').toLowerCase();
      const isBackInjury = summaryLower.includes('back') || summaryLower.includes('spine');
      const isPsychological = summaryLower.includes('stress') || summaryLower.includes('psychological');

      const baseRisk = isBackInjury ? 70 : isPsychological ? 65 : 50;
      const durationRisk = daysSinceInjury > 90 ? 15 : daysSinceInjury > 30 ? 10 : 0;

      const overallRiskScore = Math.min(100, baseRisk + durationRisk);

      return {
        caseId: caseData.id,
        overallRisk: {
          score: overallRiskScore,
          level: overallRiskScore > 80 ? 'severe' : overallRiskScore > 60 ? 'high' : overallRiskScore > 40 ? 'moderate' : 'low',
          category: 'combined',
          confidence: 75
        },
        financialRisk: {
          projectedCost: isBackInjury ? 25000 : isPsychological ? 30000 : 15000,
          costRange: {
            min: isBackInjury ? 10000 : isPsychological ? 15000 : 8000,
            max: isBackInjury ? 50000 : isPsychological ? 60000 : 30000
          },
          costDrivers: [{
            factor: 'Medical Treatment',
            impact: 'high',
            estimatedCost: 8000,
            probability: 90,
            timeframe: '6 months'
          }],
          budgetImpact: overallRiskScore > 70 ? 'significant' : 'moderate',
          timeToResolution: daysSinceInjury + (isBackInjury ? 180 : 90)
        },
        medicalRisk: {
          complicationProbability: isBackInjury ? 35 : 20,
          chronicityRisk: isPsychological ? 45 : isBackInjury ? 40 : 15,
          deteriorationIndicators: ['Extended time off work', 'Multiple treatment providers'],
          recommendedInterventions: [{
            intervention: 'Specialist referral',
            urgency: overallRiskScore > 70 ? 'high' : 'medium',
            costEstimate: 2000,
            expectedOutcome: 'Improved recovery trajectory',
            successProbability: 70
          }],
          monitoringFrequency: overallRiskScore > 70 ? 'weekly' : 'biweekly'
        },
        operationalRisk: {
          workplaceImpact: overallRiskScore > 70 ? 'moderate' : 'minimal',
          productivityLoss: Math.min(50, overallRiskScore / 2),
          replacementNeeds: [{
            role: 'Temporary replacement',
            duration: Math.max(30, 180 - daysSinceInjury),
            cost: 5000,
            availability: 'difficult',
            skillsGap: 30
          }],
          teamMoraleImpact: Math.min(60, overallRiskScore - 10),
          reputationalRisk: Math.min(40, overallRiskScore - 20)
        },
        legalRisk: {
          litigationProbability: isPsychological ? 25 : isBackInjury ? 20 : 10,
          complianceRisk: daysSinceInjury > 30 ? 30 : 15,
          liabilityExposure: isBackInjury ? 100000 : 50000,
          regulatoryRisk: ['WorkSafe audit potential'],
          documentationQuality: 'fair'
        },
        mitigationStrategies: {
          immediateActions: [{
            action: 'Schedule comprehensive medical review',
            priority: 'high',
            timeline: 3,
            costToImplement: 500,
            expectedReduction: 15,
            owner: 'Case Manager',
            success_probability: 80
          }],
          shortTermActions: [{
            action: 'Implement structured return-to-work plan',
            priority: 'medium',
            timeline: 14,
            costToImplement: 2000,
            expectedReduction: 25,
            owner: 'Rehabilitation Coordinator',
            success_probability: 70
          }],
          longTermActions: [{
            action: 'Workplace hazard assessment and modification',
            priority: 'medium',
            timeline: 90,
            costToImplement: 5000,
            expectedReduction: 30,
            owner: 'OH&S Coordinator',
            success_probability: 60
          }],
          contingencyPlan: ['Legal consultation if litigation signals appear', 'Escalate to senior management if costs exceed projections']
        }
      };
    }
  }

  private extractRiskInsights(assessment: RiskAssessment): string[] {
    const insights: string[] = [];
    
    if (assessment.overallRisk.level === 'severe' || assessment.overallRisk.level === 'high') {
      insights.push(`High overall risk detected (${assessment.overallRisk.score}/100) - proactive management essential`);
    }
    
    if (assessment.financialRisk.projectedCost > 30000) {
      insights.push(`Projected cost of $${assessment.financialRisk.projectedCost.toLocaleString()} exceeds typical case average`);
    }
    
    if (assessment.medicalRisk.chronicityRisk > 40) {
      insights.push(`${assessment.medicalRisk.chronicityRisk}% risk of developing chronic condition`);
    }
    
    if (assessment.legalRisk.litigationProbability > 20) {
      insights.push(`${assessment.legalRisk.litigationProbability}% litigation probability - enhanced documentation recommended`);
    }
    
    if (assessment.medicalRisk.complicationProbability > 30) {
      insights.push(`${assessment.medicalRisk.complicationProbability}% probability of medical complications`);
    }

    return insights;
  }

  private extractRiskRecommendations(assessment: RiskAssessment): string[] {
    const recommendations: string[] = [];
    
    // Priority recommendations from mitigation strategies
    assessment.mitigationStrategies.immediateActions.forEach(action => {
      if (action.priority === 'critical' || action.priority === 'high') {
        recommendations.push(action.action);
      }
    });
    
    assessment.mitigationStrategies.shortTermActions.slice(0, 2).forEach(action => {
      if (action.priority !== 'low') {
        recommendations.push(action.action);
      }
    });

    // Add specific recommendations based on risk levels
    if (assessment.overallRisk.score > 80) {
      recommendations.push('Consider case escalation to senior management');
    }
    
    if (assessment.legalRisk.litigationProbability > 25) {
      recommendations.push('Engage legal counsel for proactive case review');
    }

    return recommendations.slice(0, 5);
  }

  private calculateRiskImportance(assessment: RiskAssessment): number {
    let importance = 0.5;
    
    // High importance for severe risks
    if (assessment.overallRisk.level === 'severe') importance += 0.4;
    if (assessment.overallRisk.level === 'high') importance += 0.3;
    if (assessment.financialRisk.projectedCost > 50000) importance += 0.2;
    if (assessment.legalRisk.litigationProbability > 30) importance += 0.2;
    if (assessment.medicalRisk.chronicityRisk > 50) importance += 0.1;
    
    return Math.min(1.0, importance);
  }

  public async getRiskTrends(timeframeDays: number = 60): Promise<any> {
    const memories = await this.retrieveMemories(timeframeDays, ['risk', 'cost']);
    
    return {
      totalAssessments: memories.length,
      averageRiskScore: 0, // Calculate from memories
      costTrends: [], // Extract from memories  
      riskFactorFrequency: [] // Extract from memories
    };
  }

  public async simulateScenarios(caseId: number, scenarios: string[]): Promise<any> {
    // Placeholder for Monte Carlo-style scenario analysis
    return {
      caseId,
      scenarios: scenarios.map(scenario => ({
        scenario,
        probability: 0.5,
        impact: 'medium',
        projectedCost: 15000
      }))
    };
  }
}