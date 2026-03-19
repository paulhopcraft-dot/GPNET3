import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  variant?: "default" | "success" | "warning" | "danger";
  className?: string;
  children?: ReactNode;
}

const variantStyles = {
  default: "border-border",
  success: "border-green-500/40 bg-green-500/5",
  warning: "border-yellow-500/40 bg-yellow-500/5",
  danger: "border-red-500/40 bg-red-500/5",
};

const iconStyles = {
  default: "text-muted-foreground",
  success: "text-green-500",
  warning: "text-yellow-500",
  danger: "text-red-500",
};

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
  className,
  children,
}: MetricCardProps) {
  return (
    <Card className={cn("border", variantStyles[variant], className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <Icon className={cn("h-4 w-4", iconStyles[variant])} />
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
