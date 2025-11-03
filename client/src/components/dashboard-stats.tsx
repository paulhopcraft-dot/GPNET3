import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: number;
  icon: string;
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <Card data-testid={`card-stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <span className="material-symbols-outlined text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold" data-testid={`text-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {value.toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}

interface DashboardStatsProps {
  totalCases: number;
  pendingCases: number;
  completedCases: number;
  highRiskCases: number;
}

export function DashboardStats({ totalCases, pendingCases, completedCases, highRiskCases }: DashboardStatsProps) {
  const stats = [
    {
      title: "Total Cases",
      value: totalCases,
      icon: "folder_open",
    },
    {
      title: "Pending Reviews",
      value: pendingCases,
      icon: "schedule",
    },
    {
      title: "Completed",
      value: completedCases,
      icon: "check_circle",
    },
    {
      title: "High Risk",
      value: highRiskCases,
      icon: "warning",
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
