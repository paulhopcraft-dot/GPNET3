import { CheckCircle, AlertTriangle, XCircle, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface DateQualityBadgeProps {
  source: "verified" | "extracted" | "fallback" | "unknown";
  confidence: "high" | "medium" | "low";
  date: string;
}

export function DateQualityBadge({ source, confidence, date }: DateQualityBadgeProps) {
  const getQualityInfo = () => {
    switch (source) {
      case "verified":
        return {
          icon: <CheckCircle className="w-4 h-4 text-emerald-600" />,
          label: "Verified",
          description: "Date extracted from verified custom field",
          color: "text-emerald-700",
        };
      case "extracted":
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
          label: "Inferred",
          description: "Date extracted from case text or description",
          color: "text-amber-700",
        };
      case "fallback":
        return {
          icon: <XCircle className="w-4 h-4 text-red-600" />,
          label: "Fallback",
          description: "Using ticket creation date (unreliable)",
          color: "text-red-700",
        };
      case "unknown":
      default:
        return {
          icon: <HelpCircle className="w-4 h-4 text-gray-600" />,
          label: "Unknown",
          description: "Data source unknown",
          color: "text-gray-700",
        };
    }
  };

  const quality = getQualityInfo();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1.5">
            <span className="text-sm font-medium">{date}</span>
            <span className="inline-flex">{quality.icon}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-semibold">{quality.label}</p>
            <p className="text-xs text-gray-600">{quality.description}</p>
            <p className="text-xs text-gray-500">Confidence: {confidence}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
