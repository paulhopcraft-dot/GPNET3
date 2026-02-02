import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface FinancialSummaryPanelProps {
  caseId: string;
  workerName: string;
}

// Demo financial data - in production this would come from API
const demoFinancialData: Record<string, {
  preInjuryWeeklyEarnings: number;
  currentWeeklyEarnings: number;
  piaweEntitlement: number;
  weeklyCompensation: number;
  weeksOnClaim: number;
  totalPaidToDate: number;
  medicalCosts: number;
  rehabilitationCosts: number;
  legalCosts: number;
  otherCosts: number;
  estimatedTotalCost: number;
  reserveAmount: number;
}> = {
  "FD-43714": {
    preInjuryWeeklyEarnings: 1250.00,
    currentWeeklyEarnings: 875.00,
    piaweEntitlement: 1187.50,
    weeklyCompensation: 312.50,
    weeksOnClaim: 45,
    totalPaidToDate: 14062.50,
    medicalCosts: 3850.00,
    rehabilitationCosts: 2200.00,
    legalCosts: 0,
    otherCosts: 450.00,
    estimatedTotalCost: 28500.00,
    reserveAmount: 35000.00,
  },
};

const defaultFinancialData = {
  preInjuryWeeklyEarnings: 1100.00,
  currentWeeklyEarnings: 770.00,
  piaweEntitlement: 1045.00,
  weeklyCompensation: 275.00,
  weeksOnClaim: 12,
  totalPaidToDate: 3300.00,
  medicalCosts: 1500.00,
  rehabilitationCosts: 800.00,
  legalCosts: 0,
  otherCosts: 200.00,
  estimatedTotalCost: 12000.00,
  reserveAmount: 15000.00,
};

export function FinancialSummaryPanel({ caseId, workerName }: FinancialSummaryPanelProps) {
  const data = demoFinancialData[caseId] || defaultFinancialData;

  const weeklyShortfall = data.preInjuryWeeklyEarnings - data.currentWeeklyEarnings;
  const totalCostsToDate = data.totalPaidToDate + data.medicalCosts + data.rehabilitationCosts + data.legalCosts + data.otherCosts;
  const reserveUtilization = (totalCostsToDate / data.reserveAmount) * 100;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Weekly Earnings Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">payments</span>
            Weekly Earnings & Compensation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Pre-Injury Weekly Earnings</label>
              <p className="text-xl font-semibold text-foreground">{formatCurrency(data.preInjuryWeeklyEarnings)}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Current Weekly Earnings</label>
              <p className="text-xl font-semibold text-emerald-600">{formatCurrency(data.currentWeeklyEarnings)}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Weekly Shortfall</label>
              <p className="text-xl font-semibold text-amber-600">{formatCurrency(weeklyShortfall)}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Weekly Compensation</label>
              <p className="text-xl font-semibold text-blue-600">{formatCurrency(data.weeklyCompensation)}</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">PIAWE Entitlement (95%)</span>
              <span className="text-sm font-semibold">{formatCurrency(data.piaweEntitlement)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Pre-Injury Average Weekly Earnings calculated at 95% for first 13 weeks, then 80% thereafter.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Claim Costs Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">account_balance</span>
            Claim Costs Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Weeks on Claim</label>
              <p className="text-2xl font-bold text-foreground">{data.weeksOnClaim}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Total Paid to Date</label>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalCostsToDate)}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Estimated Total Cost</label>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(data.estimatedTotalCost)}</p>
            </div>
          </div>

          {/* Reserve Utilization */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Reserve Utilization</span>
              <span className="text-sm">
                {formatCurrency(totalCostsToDate)} / {formatCurrency(data.reserveAmount)}
              </span>
            </div>
            <Progress value={Math.min(reserveUtilization, 100)} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{reserveUtilization.toFixed(1)}% utilized</span>
              <Badge variant={reserveUtilization < 70 ? "secondary" : reserveUtilization < 90 ? "outline" : "destructive"}>
                {reserveUtilization < 70 ? "On Track" : reserveUtilization < 90 ? "Monitor" : "Review Required"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">pie_chart</span>
            Cost Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm">Weekly Compensation Payments</span>
              </div>
              <span className="font-semibold">{formatCurrency(data.totalPaidToDate)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-sm">Medical Expenses</span>
              </div>
              <span className="font-semibold">{formatCurrency(data.medicalCosts)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span className="text-sm">Rehabilitation & Physio</span>
              </div>
              <span className="font-semibold">{formatCurrency(data.rehabilitationCosts)}</span>
            </div>
            {data.legalCosts > 0 && (
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-sm">Legal Costs</span>
                </div>
                <span className="font-semibold">{formatCurrency(data.legalCosts)}</span>
              </div>
            )}
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                <span className="text-sm">Other Costs</span>
              </div>
              <span className="font-semibold">{formatCurrency(data.otherCosts)}</span>
            </div>
            <div className="flex items-center justify-between py-3 bg-muted/50 rounded-lg px-3 mt-2">
              <span className="font-semibold">Total Costs to Date</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(totalCostsToDate)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">note</span>
            Financial Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-base text-emerald-500">check_circle</span>
              Worker receiving weekly top-up payments as per entitlement
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-base text-blue-500">info</span>
              Physiotherapy sessions ongoing - 2x per week
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-base text-amber-500">schedule</span>
              Next review of PIAWE calculation due in 4 weeks
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
