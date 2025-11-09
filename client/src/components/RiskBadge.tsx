import type { RiskLevel, ComplianceIndicator, CaseCompliance } from "@shared/schema";
import { getComplianceBadgeProps } from "@shared/complianceColors";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface RiskBadgeProps {
  level?: RiskLevel | ComplianceIndicator;
  type: "risk" | "compliance";
  compliance?: CaseCompliance;
}

export function RiskBadge({ level, type, compliance }: RiskBadgeProps) {
  const getRiskColorClass = () => {
    switch (level) {
      case "High":
        return "bg-red-500 text-white";
      case "Medium":
        return "bg-yellow-500 text-white";
      case "Low":
        return "bg-green-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  if (type === "risk") {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskColorClass()}`}
        data-testid={`badge-${type}-${level?.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {level}
      </span>
    );
  }

  // Compliance badge with tooltip
  const badgeProps = compliance 
    ? getComplianceBadgeProps(compliance.indicator)
    : getComplianceBadgeProps(level as ComplianceIndicator);

  const badge = (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeProps.bgColor} ${badgeProps.textColor}`}
      data-testid={`badge-${type}-${badgeProps.label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {badgeProps.label}
    </span>
  );

  if (!compliance) {
    return badge;
  }

  // Format timestamp for tooltip
  const formattedTime = new Date(compliance.lastChecked).toLocaleString('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-1">
          <p className="font-semibold">{compliance.reason}</p>
          <p className="text-xs text-muted-foreground">
            Source: {compliance.source} • Checked: {formattedTime}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
