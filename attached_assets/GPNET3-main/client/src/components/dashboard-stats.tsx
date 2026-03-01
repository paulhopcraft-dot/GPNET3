import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FileText, Clock, CheckCircle2, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

function StatCard({ title, value, icon: Icon, trend }: StatCardProps) {
  return (
    <Card data-testid={`card-stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold" data-testid={`text-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>{value}</div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs mt-2 ${trend.isPositive ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
            {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{trend.value} from last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardStats() {
  const stats = [
    {
      title: "Total Cases",
      value: "1,284",
      icon: FileText,
      trend: { value: "+12.3%", isPositive: true },
    },
    {
      title: "Pending Reviews",
      value: "47",
      icon: Clock,
      trend: { value: "-8.1%", isPositive: true },
    },
    {
      title: "Completed",
      value: "1,156",
      icon: CheckCircle2,
      trend: { value: "+15.2%", isPositive: true },
    },
    {
      title: "High Risk",
      value: "23",
      icon: AlertTriangle,
      trend: { value: "+4.2%", isPositive: false },
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
