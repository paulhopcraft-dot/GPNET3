import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FileText, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import type { WorkerCase } from "@shared/schema";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
}

function StatCard({ title, value, icon: Icon }: StatCardProps) {
  return (
    <Card data-testid={`card-stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
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

interface DashboardStatsProps {
  cases: WorkerCase[];
}

export function DashboardStats({ cases }: DashboardStatsProps) {
  const totalCases = cases.length;
  const offWorkCases = cases.filter(c => c.workStatus === 'Off work').length;
  const atWorkCases = cases.filter(c => c.workStatus === 'At work').length;
  const highRiskCases = cases.filter(c => c.complianceIndicator === 'High').length;

  const stats = [
    {
      title: "Total Cases",
      value: totalCases.toString(),
      icon: FileText,
    },
    {
      title: "Off Work",
      value: offWorkCases.toString(),
      icon: Clock,
    },
    {
      title: "At Work",
      value: atWorkCases.toString(),
      icon: CheckCircle2,
    },
    {
      title: "High Risk",
      value: highRiskCases.toString(),
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <StatCard key={stat.title} {...stat} />
      ))}
    </div>
  );
}
