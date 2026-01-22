import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FileText, Clock, CheckCircle2, AlertTriangle, Calendar } from "lucide-react";
import type { WorkerCase } from "@shared/schema";

/**
 * Helper function to check if a case has an RTW plan that might be expiring
 * This is a simplified check until full RTW compliance is implemented in the frontend
 */
function isRTWPlanPotentiallyExpiring(workerCase: WorkerCase): boolean {
  // Check if case has an active RTW plan
  const hasActivePlan = workerCase.rtwPlanStatus === 'in_progress' || workerCase.rtwPlanStatus === 'working_well';
  if (!hasActivePlan) return false;

  // Check if case has treatment plan with duration info
  const treatmentPlan = workerCase.clinical_status_json?.treatmentPlan;
  if (!treatmentPlan?.expectedDurationWeeks) return false;

  // Estimate if plan might be expiring (simplified logic for now)
  // In full implementation, this would use RTW compliance service
  const planGeneratedAt = new Date(treatmentPlan.generatedAt);
  const planDurationMs = treatmentPlan.expectedDurationWeeks * 7 * 24 * 60 * 60 * 1000;
  const planEndDate = new Date(planGeneratedAt.getTime() + planDurationMs);
  const now = new Date();
  const daysUntilEnd = Math.ceil((planEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

  // Consider expiring if within 14 days (broader than the 7-day notification threshold)
  return daysUntilEnd >= 0 && daysUntilEnd <= 14;
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  onClick?: () => void;
  isActive?: boolean;
}

function StatCard({ title, value, icon: Icon, onClick, isActive }: StatCardProps) {
  return (
    <Card
      data-testid={`card-stat-${title.toLowerCase().replace(/\s+/g, '-')}`}
      className={`transition-all ${onClick ? 'cursor-pointer hover:border-primary hover:shadow-md' : ''} ${isActive ? 'border-primary bg-primary/5' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold" data-testid={`text-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

export type StatFilter = 'all' | 'off-work' | 'at-work' | 'high-risk' | 'rtw-expiring';

interface DashboardStatsProps {
  cases: WorkerCase[];
  activeFilter?: StatFilter;
  onFilterChange?: (filter: StatFilter) => void;
}

export function DashboardStats({ cases, activeFilter = 'all', onFilterChange }: DashboardStatsProps) {
  const totalCases = cases.length;
  const offWorkCases = cases.filter(c => c.workStatus === 'Off work').length;
  const atWorkCases = cases.filter(c => c.workStatus === 'At work').length;
  const highRiskCases = cases.filter(c => c.complianceIndicator === 'High').length;
  const rtwExpiringCases = cases.filter(c => isRTWPlanPotentiallyExpiring(c)).length;

  const stats = [
    {
      title: "Total Cases",
      value: totalCases.toString(),
      icon: FileText,
      filter: 'all' as StatFilter,
    },
    {
      title: "Off Work",
      value: offWorkCases.toString(),
      icon: Clock,
      filter: 'off-work' as StatFilter,
    },
    {
      title: "At Work",
      value: atWorkCases.toString(),
      icon: CheckCircle2,
      filter: 'at-work' as StatFilter,
    },
    {
      title: "High Risk",
      value: highRiskCases.toString(),
      icon: AlertTriangle,
      filter: 'high-risk' as StatFilter,
    },
    {
      title: "RTW Plans Expiring",
      value: rtwExpiringCases.toString(),
      icon: Calendar,
      filter: 'rtw-expiring' as StatFilter,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {stats.map((stat) => (
        <StatCard
          key={stat.title}
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
          onClick={onFilterChange ? () => onFilterChange(stat.filter) : undefined}
          isActive={activeFilter === stat.filter}
        />
      ))}
    </div>
  );
}
