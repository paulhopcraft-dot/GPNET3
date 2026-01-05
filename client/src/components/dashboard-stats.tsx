import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FileText, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import type { WorkerCase } from "@shared/schema";

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

export type StatFilter = 'all' | 'off-work' | 'at-work' | 'high-risk';

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
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
