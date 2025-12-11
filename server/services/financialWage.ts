import { randomUUID } from "crypto";

const uuidv4 = randomUUID;

// Types for financial and wage management

export type PayPeriodType = "weekly" | "fortnightly" | "monthly";

export type PaymentCategory =
  | "regular_wages"
  | "rtw_wages"
  | "top_up_payment"
  | "workers_comp"
  | "leave_pay"
  | "no_pay";

export type TransactionType =
  | "wage_payment"
  | "comp_payment"
  | "top_up"
  | "adjustment"
  | "reimbursement";

export interface BaseWageInfo {
  hourlyRate: number;
  normalHoursPerWeek: number;
  normalDaysPerWeek: number;
  payPeriod: PayPeriodType;
  employmentType: "full_time" | "part_time" | "casual";
  superannuationRate: number; // e.g., 0.115 for 11.5%
  allowances?: WageAllowance[];
}

export interface WageAllowance {
  name: string;
  amount: number;
  frequency: "per_hour" | "per_day" | "per_week" | "per_period";
}

export interface WorkPeriod {
  id: string;
  caseId: string;
  startDate: string;
  endDate: string;
  hoursWorked: number;
  daysWorked: number;
  category: PaymentCategory;
  rtwPhase?: number;
  notes?: string;
}

export interface WageCalculation {
  id: string;
  caseId: string;
  periodStart: string;
  periodEnd: string;
  baseWage: number;
  actualWage: number;
  topUpAmount: number;
  workersCompAmount: number;
  superannuation: number;
  allowancesTotal: number;
  grossTotal: number;
  hoursWorked: number;
  normalHours: number;
  capacityPercent: number;
  category: PaymentCategory;
  breakdown: WageBreakdownItem[];
  calculatedAt: string;
}

export interface WageBreakdownItem {
  description: string;
  hours?: number;
  rate?: number;
  amount: number;
}

export interface FinancialTransaction {
  id: string;
  caseId: string;
  date: string;
  type: TransactionType;
  category: PaymentCategory;
  amount: number;
  description: string;
  reference?: string;
  payrollReference?: string;
  reconciled: boolean;
  createdAt: string;
  createdBy: string;
}

export interface CostProjection {
  id: string;
  caseId: string;
  scenarioName: string;
  rtwScenario: RTWScenario;
  projectedWeeks: number;
  totalWageCost: number;
  totalCompCost: number;
  totalTopUpCost: number;
  totalEmployerCost: number;
  weeklyBreakdown: WeeklyProjection[];
  assumptions: string[];
  createdAt: string;
}

export interface RTWScenario {
  name: string;
  phases: RTWPhaseFinancial[];
  totalWeeks: number;
}

export interface RTWPhaseFinancial {
  phaseNumber: number;
  name: string;
  hoursPerDay: number;
  daysPerWeek: number;
  durationWeeks: number;
  capacityPercent: number;
}

export interface WeeklyProjection {
  week: number;
  phase: string;
  hoursWorked: number;
  capacityPercent: number;
  wageCost: number;
  compPayment: number;
  topUp: number;
  employerCost: number;
}

export interface FinancialSummary {
  caseId: string;
  workerName: string;
  baseWageInfo: BaseWageInfo;
  totalPaid: FinancialTotals;
  periodSummary: PeriodSummary[];
  currentStatus: CurrentFinancialStatus;
  projections: ProjectionSummary;
  generatedAt: string;
}

export interface FinancialTotals {
  regularWages: number;
  rtwWages: number;
  topUpPayments: number;
  workersCompPayments: number;
  totalPaid: number;
  totalEmployerCost: number;
  periodsCount: number;
}

export interface PeriodSummary {
  period: string;
  category: PaymentCategory;
  hours: number;
  grossAmount: number;
  capacityPercent: number;
}

export interface CurrentFinancialStatus {
  currentCapacity: number;
  currentHoursPerWeek: number;
  weeklyWage: number;
  weeklyTopUp: number;
  weeklyTotal: number;
  nextPayDate?: string;
}

export interface ProjectionSummary {
  estimatedWeeksToFullDuties: number;
  estimatedTotalCost: number;
  bestCaseScenario: { weeks: number; cost: number };
  worstCaseScenario: { weeks: number; cost: number };
}

export interface CaseFinancialMetrics {
  caseId: string;
  totalCostToDate: number;
  projectedTotalCost: number;
  costVariance: number;
  costPerDay: number;
  daysOnClaim: number;
  savingsFromEarlyRTW?: number;
}

export interface AggregateFinancials {
  totalCases: number;
  totalCostThisPeriod: number;
  averageCostPerCase: number;
  costByCategory: Record<PaymentCategory, number>;
  costByMonth: MonthlyAggregate[];
  topCostCases: CaseCostSummary[];
  projectedNextPeriod: number;
}

export interface MonthlyAggregate {
  month: string;
  totalCost: number;
  casesCount: number;
  averageCapacity: number;
}

export interface CaseCostSummary {
  caseId: string;
  workerName: string;
  totalCost: number;
  daysOnClaim: number;
  currentCapacity: number;
}

// In-memory storage for demo
const caseWageInfo: Map<string, BaseWageInfo> = new Map();
const workPeriods: Map<string, WorkPeriod[]> = new Map();
const wageCalculations: Map<string, WageCalculation[]> = new Map();
const financialTransactions: Map<string, FinancialTransaction[]> = new Map();
const costProjections: Map<string, CostProjection[]> = new Map();

// Workers' compensation rates (simplified - typically varies by jurisdiction)
const WORKERS_COMP_RATES = {
  first_13_weeks: 1.0, // 100% of pre-injury earnings
  weeks_14_to_26: 0.95, // 95%
  weeks_27_to_52: 0.80, // 80%
  after_52_weeks: 0.75, // 75% (varies by jurisdiction)
  max_weekly: 2500, // Maximum weekly payment
};

/**
 * Calculate normal weekly wage from base info
 */
export function calculateNormalWeeklyWage(baseWage: BaseWageInfo): number {
  const hourlyTotal =
    baseWage.hourlyRate * baseWage.normalHoursPerWeek;

  // Add allowances
  let allowancesWeekly = 0;
  if (baseWage.allowances) {
    for (const allowance of baseWage.allowances) {
      switch (allowance.frequency) {
        case "per_hour":
          allowancesWeekly += allowance.amount * baseWage.normalHoursPerWeek;
          break;
        case "per_day":
          allowancesWeekly += allowance.amount * baseWage.normalDaysPerWeek;
          break;
        case "per_week":
          allowancesWeekly += allowance.amount;
          break;
        case "per_period":
          // Convert to weekly
          if (baseWage.payPeriod === "fortnightly") {
            allowancesWeekly += allowance.amount / 2;
          } else if (baseWage.payPeriod === "monthly") {
            allowancesWeekly += (allowance.amount * 12) / 52;
          } else {
            allowancesWeekly += allowance.amount;
          }
          break;
      }
    }
  }

  return hourlyTotal + allowancesWeekly;
}

/**
 * Set base wage information for a case
 */
export function setBaseWageInfo(
  caseId: string,
  wageInfo: BaseWageInfo
): BaseWageInfo {
  caseWageInfo.set(caseId, wageInfo);
  return wageInfo;
}

/**
 * Get base wage information for a case
 */
export function getBaseWageInfo(caseId: string): BaseWageInfo | undefined {
  return caseWageInfo.get(caseId);
}

/**
 * Record a work period
 */
export function recordWorkPeriod(period: Omit<WorkPeriod, "id">): WorkPeriod {
  const workPeriod: WorkPeriod = {
    id: uuidv4(),
    ...period,
  };

  const casePeriods = workPeriods.get(period.caseId) || [];
  casePeriods.push(workPeriod);
  workPeriods.set(period.caseId, casePeriods);

  return workPeriod;
}

/**
 * Get work periods for a case
 */
export function getWorkPeriods(caseId: string): WorkPeriod[] {
  return workPeriods.get(caseId) || [];
}

/**
 * Calculate wages for a specific period
 */
export function calculatePeriodWages(
  caseId: string,
  periodStart: string,
  periodEnd: string,
  hoursWorked: number,
  rtwPhase?: number,
  weeksOnClaim: number = 1
): WageCalculation {
  const baseWage = caseWageInfo.get(caseId);
  if (!baseWage) {
    throw new Error(`No base wage info found for case ${caseId}`);
  }

  const normalWeekly = calculateNormalWeeklyWage(baseWage);
  const normalHoursForPeriod = baseWage.normalHoursPerWeek;

  // Calculate capacity
  const capacityPercent =
    normalHoursForPeriod > 0
      ? Math.round((hoursWorked / normalHoursForPeriod) * 100)
      : 0;

  // Determine payment category
  let category: PaymentCategory = "regular_wages";
  if (hoursWorked === 0) {
    category = "no_pay";
  } else if (capacityPercent < 100) {
    category = "rtw_wages";
  }

  // Calculate actual wage earned
  const actualWage = hoursWorked * baseWage.hourlyRate;

  // Calculate allowances for actual hours/days worked
  let allowancesTotal = 0;
  const daysWorked = Math.ceil(hoursWorked / (baseWage.normalHoursPerWeek / baseWage.normalDaysPerWeek));
  if (baseWage.allowances) {
    for (const allowance of baseWage.allowances) {
      switch (allowance.frequency) {
        case "per_hour":
          allowancesTotal += allowance.amount * hoursWorked;
          break;
        case "per_day":
          allowancesTotal += allowance.amount * daysWorked;
          break;
        case "per_week":
          allowancesTotal += allowance.amount * (hoursWorked / normalHoursForPeriod);
          break;
        case "per_period":
          allowancesTotal += allowance.amount * (hoursWorked / normalHoursForPeriod);
          break;
      }
    }
  }

  // Calculate workers' comp payment (for lost wages)
  let workersCompAmount = 0;
  let topUpAmount = 0;

  if (capacityPercent < 100) {
    // Determine comp rate based on weeks on claim
    let compRate = WORKERS_COMP_RATES.first_13_weeks;
    if (weeksOnClaim > 52) {
      compRate = WORKERS_COMP_RATES.after_52_weeks;
    } else if (weeksOnClaim > 26) {
      compRate = WORKERS_COMP_RATES.weeks_27_to_52;
    } else if (weeksOnClaim > 13) {
      compRate = WORKERS_COMP_RATES.weeks_14_to_26;
    }

    // Calculate what they should receive (based on pre-injury earnings)
    const entitledAmount = normalWeekly * compRate;
    const lostWages = normalWeekly - actualWage - allowancesTotal;

    if (lostWages > 0) {
      // Workers' comp covers the gap up to entitled amount
      workersCompAmount = Math.min(
        lostWages,
        entitledAmount - actualWage - allowancesTotal,
        WORKERS_COMP_RATES.max_weekly - actualWage
      );
      workersCompAmount = Math.max(0, workersCompAmount);

      // Any remaining gap is top-up (employer pays)
      const remainingGap = lostWages - workersCompAmount;
      if (remainingGap > 0) {
        topUpAmount = remainingGap * 0.5; // Employer may top up 50% of remaining gap
      }
    }
  }

  // Calculate superannuation
  const superannuation = actualWage * baseWage.superannuationRate;

  // Build breakdown
  const breakdown: WageBreakdownItem[] = [
    {
      description: "Base wage",
      hours: hoursWorked,
      rate: baseWage.hourlyRate,
      amount: actualWage,
    },
  ];

  if (allowancesTotal > 0) {
    breakdown.push({
      description: "Allowances",
      amount: allowancesTotal,
    });
  }

  if (workersCompAmount > 0) {
    breakdown.push({
      description: "Workers compensation",
      amount: workersCompAmount,
    });
  }

  if (topUpAmount > 0) {
    breakdown.push({
      description: "Employer top-up",
      amount: topUpAmount,
    });
  }

  breakdown.push({
    description: "Superannuation",
    rate: baseWage.superannuationRate,
    amount: superannuation,
  });

  const grossTotal =
    actualWage + allowancesTotal + workersCompAmount + topUpAmount;

  const calculation: WageCalculation = {
    id: uuidv4(),
    caseId,
    periodStart,
    periodEnd,
    baseWage: normalWeekly,
    actualWage,
    topUpAmount,
    workersCompAmount,
    superannuation,
    allowancesTotal,
    grossTotal,
    hoursWorked,
    normalHours: normalHoursForPeriod,
    capacityPercent,
    category,
    breakdown,
    calculatedAt: new Date().toISOString(),
  };

  // Store calculation
  const caseCalcs = wageCalculations.get(caseId) || [];
  caseCalcs.push(calculation);
  wageCalculations.set(caseId, caseCalcs);

  return calculation;
}

/**
 * Get wage calculation history for a case
 */
export function getWageCalculations(caseId: string): WageCalculation[] {
  return wageCalculations.get(caseId) || [];
}

/**
 * Record a financial transaction
 */
export function recordTransaction(
  transaction: Omit<FinancialTransaction, "id" | "createdAt">
): FinancialTransaction {
  const txn: FinancialTransaction = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    ...transaction,
  };

  const caseTxns = financialTransactions.get(transaction.caseId) || [];
  caseTxns.push(txn);
  financialTransactions.set(transaction.caseId, caseTxns);

  return txn;
}

/**
 * Get transactions for a case
 */
export function getTransactions(caseId: string): FinancialTransaction[] {
  return financialTransactions.get(caseId) || [];
}

/**
 * Project costs for different RTW scenarios
 */
export function projectCosts(
  caseId: string,
  scenario: RTWScenario,
  baseWage?: BaseWageInfo
): CostProjection {
  const wage = baseWage || caseWageInfo.get(caseId);
  if (!wage) {
    throw new Error(`No base wage info found for case ${caseId}`);
  }

  const normalWeekly = calculateNormalWeeklyWage(wage);
  const weeklyBreakdown: WeeklyProjection[] = [];

  let totalWageCost = 0;
  let totalCompCost = 0;
  let totalTopUpCost = 0;
  let currentWeek = 0;

  for (const phase of scenario.phases) {
    const weeklyHours = phase.hoursPerDay * phase.daysPerWeek;
    const capacityPercent = phase.capacityPercent;

    for (let w = 0; w < phase.durationWeeks; w++) {
      currentWeek++;
      const wageCost = (weeklyHours / wage.normalHoursPerWeek) * normalWeekly;
      const lostWages = normalWeekly - wageCost;

      // Determine comp rate
      let compRate = WORKERS_COMP_RATES.first_13_weeks;
      if (currentWeek > 52) {
        compRate = WORKERS_COMP_RATES.after_52_weeks;
      } else if (currentWeek > 26) {
        compRate = WORKERS_COMP_RATES.weeks_27_to_52;
      } else if (currentWeek > 13) {
        compRate = WORKERS_COMP_RATES.weeks_14_to_26;
      }

      const compPayment = Math.min(
        lostWages * compRate,
        WORKERS_COMP_RATES.max_weekly - wageCost
      );
      const topUp = lostWages > compPayment ? (lostWages - compPayment) * 0.3 : 0;

      weeklyBreakdown.push({
        week: currentWeek,
        phase: phase.name,
        hoursWorked: weeklyHours,
        capacityPercent,
        wageCost,
        compPayment: Math.max(0, compPayment),
        topUp: Math.max(0, topUp),
        employerCost: wageCost + Math.max(0, topUp),
      });

      totalWageCost += wageCost;
      totalCompCost += Math.max(0, compPayment);
      totalTopUpCost += Math.max(0, topUp);
    }
  }

  const projection: CostProjection = {
    id: uuidv4(),
    caseId,
    scenarioName: scenario.name,
    rtwScenario: scenario,
    projectedWeeks: scenario.totalWeeks,
    totalWageCost,
    totalCompCost,
    totalTopUpCost,
    totalEmployerCost: totalWageCost + totalTopUpCost,
    weeklyBreakdown,
    assumptions: [
      `Based on hourly rate of $${wage.hourlyRate}`,
      `Normal hours: ${wage.normalHoursPerWeek} per week`,
      "Workers comp rates applied based on weeks on claim",
      "Top-up calculated at 30% of remaining gap",
    ],
    createdAt: new Date().toISOString(),
  };

  // Store projection
  const caseProjections = costProjections.get(caseId) || [];
  caseProjections.push(projection);
  costProjections.set(caseId, caseProjections);

  return projection;
}

/**
 * Get cost projections for a case
 */
export function getCostProjections(caseId: string): CostProjection[] {
  return costProjections.get(caseId) || [];
}

/**
 * Generate predefined RTW scenarios for comparison
 */
export function generateRTWScenarios(
  normalHoursPerDay: number = 8
): RTWScenario[] {
  return [
    {
      name: "Aggressive RTW",
      totalWeeks: 4,
      phases: [
        {
          phaseNumber: 1,
          name: "Light Duties",
          hoursPerDay: 6,
          daysPerWeek: 5,
          durationWeeks: 1,
          capacityPercent: 75,
        },
        {
          phaseNumber: 2,
          name: "Full Return",
          hoursPerDay: normalHoursPerDay,
          daysPerWeek: 5,
          durationWeeks: 3,
          capacityPercent: 100,
        },
      ],
    },
    {
      name: "Standard RTW",
      totalWeeks: 8,
      phases: [
        {
          phaseNumber: 1,
          name: "Initial Return",
          hoursPerDay: 4,
          daysPerWeek: 3,
          durationWeeks: 2,
          capacityPercent: 30,
        },
        {
          phaseNumber: 2,
          name: "Build Up",
          hoursPerDay: 6,
          daysPerWeek: 4,
          durationWeeks: 2,
          capacityPercent: 60,
        },
        {
          phaseNumber: 3,
          name: "Consolidation",
          hoursPerDay: 7,
          daysPerWeek: 5,
          durationWeeks: 2,
          capacityPercent: 87,
        },
        {
          phaseNumber: 4,
          name: "Full Duties",
          hoursPerDay: normalHoursPerDay,
          daysPerWeek: 5,
          durationWeeks: 2,
          capacityPercent: 100,
        },
      ],
    },
    {
      name: "Graduated RTW (Conservative)",
      totalWeeks: 12,
      phases: [
        {
          phaseNumber: 1,
          name: "Initial Return",
          hoursPerDay: 2,
          daysPerWeek: 3,
          durationWeeks: 2,
          capacityPercent: 15,
        },
        {
          phaseNumber: 2,
          name: "Phase 2",
          hoursPerDay: 4,
          daysPerWeek: 4,
          durationWeeks: 2,
          capacityPercent: 40,
        },
        {
          phaseNumber: 3,
          name: "Phase 3",
          hoursPerDay: 5,
          daysPerWeek: 4,
          durationWeeks: 2,
          capacityPercent: 50,
        },
        {
          phaseNumber: 4,
          name: "Phase 4",
          hoursPerDay: 6,
          daysPerWeek: 5,
          durationWeeks: 2,
          capacityPercent: 75,
        },
        {
          phaseNumber: 5,
          name: "Full Return",
          hoursPerDay: normalHoursPerDay,
          daysPerWeek: 5,
          durationWeeks: 4,
          capacityPercent: 100,
        },
      ],
    },
    {
      name: "Extended Leave then Return",
      totalWeeks: 16,
      phases: [
        {
          phaseNumber: 1,
          name: "Total Incapacity",
          hoursPerDay: 0,
          daysPerWeek: 0,
          durationWeeks: 8,
          capacityPercent: 0,
        },
        {
          phaseNumber: 2,
          name: "Initial Return",
          hoursPerDay: 4,
          daysPerWeek: 3,
          durationWeeks: 2,
          capacityPercent: 30,
        },
        {
          phaseNumber: 3,
          name: "Build Up",
          hoursPerDay: 6,
          daysPerWeek: 4,
          durationWeeks: 2,
          capacityPercent: 60,
        },
        {
          phaseNumber: 4,
          name: "Consolidation",
          hoursPerDay: 7,
          daysPerWeek: 5,
          durationWeeks: 2,
          capacityPercent: 87,
        },
        {
          phaseNumber: 5,
          name: "Full Duties",
          hoursPerDay: normalHoursPerDay,
          daysPerWeek: 5,
          durationWeeks: 2,
          capacityPercent: 100,
        },
      ],
    },
  ];
}

/**
 * Generate comprehensive financial summary for a case
 */
export function generateFinancialSummary(
  caseId: string,
  workerName: string
): FinancialSummary {
  const baseWage = caseWageInfo.get(caseId);
  if (!baseWage) {
    throw new Error(`No base wage info found for case ${caseId}`);
  }

  const calculations = wageCalculations.get(caseId) || [];
  const transactions = financialTransactions.get(caseId) || [];
  const projections = costProjections.get(caseId) || [];

  // Calculate totals
  const totals: FinancialTotals = {
    regularWages: 0,
    rtwWages: 0,
    topUpPayments: 0,
    workersCompPayments: 0,
    totalPaid: 0,
    totalEmployerCost: 0,
    periodsCount: calculations.length,
  };

  const periodSummary: PeriodSummary[] = [];

  for (const calc of calculations) {
    switch (calc.category) {
      case "regular_wages":
        totals.regularWages += calc.actualWage;
        break;
      case "rtw_wages":
        totals.rtwWages += calc.actualWage;
        break;
    }
    totals.topUpPayments += calc.topUpAmount;
    totals.workersCompPayments += calc.workersCompAmount;
    totals.totalPaid += calc.grossTotal;
    totals.totalEmployerCost += calc.actualWage + calc.topUpAmount + calc.superannuation;

    periodSummary.push({
      period: `${calc.periodStart} to ${calc.periodEnd}`,
      category: calc.category,
      hours: calc.hoursWorked,
      grossAmount: calc.grossTotal,
      capacityPercent: calc.capacityPercent,
    });
  }

  // Current status (from most recent calculation)
  const latestCalc = calculations[calculations.length - 1];
  const normalWeekly = calculateNormalWeeklyWage(baseWage);

  const currentStatus: CurrentFinancialStatus = latestCalc
    ? {
        currentCapacity: latestCalc.capacityPercent,
        currentHoursPerWeek: latestCalc.hoursWorked,
        weeklyWage: latestCalc.actualWage,
        weeklyTopUp: latestCalc.topUpAmount,
        weeklyTotal: latestCalc.grossTotal,
      }
    : {
        currentCapacity: 100,
        currentHoursPerWeek: baseWage.normalHoursPerWeek,
        weeklyWage: normalWeekly,
        weeklyTopUp: 0,
        weeklyTotal: normalWeekly,
      };

  // Projection summary
  const sortedProjections = [...projections].sort(
    (a, b) => a.totalEmployerCost - b.totalEmployerCost
  );

  const projectionSummary: ProjectionSummary = {
    estimatedWeeksToFullDuties:
      projections[0]?.projectedWeeks || 0,
    estimatedTotalCost:
      projections[0]?.totalEmployerCost || 0,
    bestCaseScenario: {
      weeks: sortedProjections[0]?.projectedWeeks || 0,
      cost: sortedProjections[0]?.totalEmployerCost || 0,
    },
    worstCaseScenario: {
      weeks: sortedProjections[sortedProjections.length - 1]?.projectedWeeks || 0,
      cost: sortedProjections[sortedProjections.length - 1]?.totalEmployerCost || 0,
    },
  };

  return {
    caseId,
    workerName,
    baseWageInfo: baseWage,
    totalPaid: totals,
    periodSummary,
    currentStatus,
    projections: projectionSummary,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Calculate ROI for early RTW interventions
 */
export function calculateInterventionROI(
  caseId: string,
  interventionCost: number,
  weeksAccelerated: number
): {
  roi: number;
  savings: number;
  paybackWeeks: number;
  recommendation: string;
} {
  const baseWage = caseWageInfo.get(caseId);
  if (!baseWage) {
    throw new Error(`No base wage info found for case ${caseId}`);
  }

  const normalWeekly = calculateNormalWeeklyWage(baseWage);

  // Estimate weekly cost during incapacity
  const weeklyIncapacityCost =
    normalWeekly * WORKERS_COMP_RATES.first_13_weeks * 0.7; // Employer portion estimate

  const savings = weeksAccelerated * weeklyIncapacityCost;
  const roi = ((savings - interventionCost) / interventionCost) * 100;
  const paybackWeeks =
    weeklyIncapacityCost > 0
      ? Math.ceil(interventionCost / weeklyIncapacityCost)
      : Infinity;

  let recommendation = "";
  if (roi > 100) {
    recommendation = "Highly recommended - strong ROI";
  } else if (roi > 50) {
    recommendation = "Recommended - good return on investment";
  } else if (roi > 0) {
    recommendation = "Consider - marginal benefit";
  } else {
    recommendation = "Not recommended - negative ROI";
  }

  return {
    roi: Math.round(roi),
    savings: Math.round(savings),
    paybackWeeks,
    recommendation,
  };
}

/**
 * Generate aggregate financials across cases
 */
export function generateAggregateFinancials(
  caseIds: string[]
): AggregateFinancials {
  const costByCategory: Record<PaymentCategory, number> = {
    regular_wages: 0,
    rtw_wages: 0,
    top_up_payment: 0,
    workers_comp: 0,
    leave_pay: 0,
    no_pay: 0,
  };

  let totalCost = 0;
  const caseSummaries: CaseCostSummary[] = [];
  const monthlyData: Map<string, { cost: number; cases: Set<string>; capacitySum: number; count: number }> = new Map();

  for (const caseId of caseIds) {
    const calculations = wageCalculations.get(caseId) || [];
    let caseCost = 0;
    let latestCapacity = 100;

    for (const calc of calculations) {
      caseCost += calc.actualWage + calc.topUpAmount;
      totalCost += calc.actualWage + calc.topUpAmount;

      // Track by category
      if (calc.category === "regular_wages" || calc.category === "rtw_wages") {
        costByCategory[calc.category] += calc.actualWage;
      }
      costByCategory.top_up_payment += calc.topUpAmount;
      costByCategory.workers_comp += calc.workersCompAmount;

      // Track by month
      const month = calc.periodStart.substring(0, 7); // YYYY-MM
      const monthData = monthlyData.get(month) || {
        cost: 0,
        cases: new Set<string>(),
        capacitySum: 0,
        count: 0,
      };
      monthData.cost += calc.actualWage + calc.topUpAmount;
      monthData.cases.add(caseId);
      monthData.capacitySum += calc.capacityPercent;
      monthData.count++;
      monthlyData.set(month, monthData);

      latestCapacity = calc.capacityPercent;
    }

    if (calculations.length > 0) {
      const firstCalc = calculations[0];
      const lastCalc = calculations[calculations.length - 1];
      const startDate = new Date(firstCalc.periodStart);
      const endDate = new Date(lastCalc.periodEnd);
      const daysOnClaim = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const baseWage = caseWageInfo.get(caseId);
      caseSummaries.push({
        caseId,
        workerName: baseWage ? `Worker ${caseId.substring(0, 8)}` : "Unknown",
        totalCost: caseCost,
        daysOnClaim,
        currentCapacity: latestCapacity,
      });
    }
  }

  // Sort cases by cost
  caseSummaries.sort((a, b) => b.totalCost - a.totalCost);

  // Convert monthly data
  const costByMonth: MonthlyAggregate[] = Array.from(monthlyData.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      totalCost: data.cost,
      casesCount: data.cases.size,
      averageCapacity: data.count > 0 ? Math.round(data.capacitySum / data.count) : 0,
    }));

  // Project next period (simple extrapolation)
  const recentMonths = costByMonth.slice(-3);
  const avgMonthlyCost =
    recentMonths.length > 0
      ? recentMonths.reduce((sum, m) => sum + m.totalCost, 0) / recentMonths.length
      : 0;

  return {
    totalCases: caseIds.length,
    totalCostThisPeriod: totalCost,
    averageCostPerCase: caseIds.length > 0 ? totalCost / caseIds.length : 0,
    costByCategory,
    costByMonth,
    topCostCases: caseSummaries.slice(0, 10),
    projectedNextPeriod: avgMonthlyCost,
  };
}

/**
 * Export financial data for payroll/accounting
 */
export function exportForPayroll(
  caseId: string,
  periodStart: string,
  periodEnd: string
): {
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  hoursWorked: number;
  baseRate: number;
  grossWages: number;
  allowances: number;
  superannuation: number;
  topUp: number;
  workersComp: number;
  totalGross: number;
  costCentre: string;
  notes: string;
} {
  const baseWage = caseWageInfo.get(caseId);
  const calculations = wageCalculations.get(caseId) || [];

  // Find calculations in period
  const periodCalcs = calculations.filter(
    (c) => c.periodStart >= periodStart && c.periodEnd <= periodEnd
  );

  const totals = periodCalcs.reduce(
    (acc, c) => ({
      hoursWorked: acc.hoursWorked + c.hoursWorked,
      grossWages: acc.grossWages + c.actualWage,
      allowances: acc.allowances + c.allowancesTotal,
      superannuation: acc.superannuation + c.superannuation,
      topUp: acc.topUp + c.topUpAmount,
      workersComp: acc.workersComp + c.workersCompAmount,
    }),
    {
      hoursWorked: 0,
      grossWages: 0,
      allowances: 0,
      superannuation: 0,
      topUp: 0,
      workersComp: 0,
    }
  );

  return {
    employeeId: caseId,
    periodStart,
    periodEnd,
    hoursWorked: totals.hoursWorked,
    baseRate: baseWage?.hourlyRate || 0,
    grossWages: totals.grossWages,
    allowances: totals.allowances,
    superannuation: totals.superannuation,
    topUp: totals.topUp,
    workersComp: totals.workersComp,
    totalGross:
      totals.grossWages + totals.allowances + totals.topUp + totals.workersComp,
    costCentre: "WORKERS_COMP",
    notes: `RTW case - ${periodCalcs.length} periods`,
  };
}

/**
 * Reconcile transactions against calculations
 */
export function reconcileTransactions(caseId: string): {
  matched: number;
  unmatched: number;
  variance: number;
  issues: string[];
} {
  const calculations = wageCalculations.get(caseId) || [];
  const transactions = financialTransactions.get(caseId) || [];

  const calcTotal = calculations.reduce((sum, c) => sum + c.grossTotal, 0);
  const txnTotal = transactions
    .filter((t) => t.reconciled)
    .reduce((sum, t) => sum + t.amount, 0);

  const variance = calcTotal - txnTotal;
  const issues: string[] = [];

  if (Math.abs(variance) > 1) {
    issues.push(
      `Variance of $${variance.toFixed(2)} between calculations and transactions`
    );
  }

  const unreconciledTxns = transactions.filter((t) => !t.reconciled);
  if (unreconciledTxns.length > 0) {
    issues.push(`${unreconciledTxns.length} unreconciled transactions`);
  }

  return {
    matched: transactions.filter((t) => t.reconciled).length,
    unmatched: unreconciledTxns.length,
    variance,
    issues,
  };
}
