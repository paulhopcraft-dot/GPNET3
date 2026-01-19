import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
  Area,
  ComposedChart,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Activity,
  Stethoscope,
  FileText,
  ArrowUpRight,
  ArrowRight,
  ArrowDownRight,
  Gauge,
  Sparkles,
} from "lucide-react";

// Types matching the server-side RecoveryTimelineChartData
interface ChartDataPoint {
  date: string;
  week: number;
  estimatedCapacity: number;
  actualCapacity: number | null;
  label?: string;
}

interface RoleDemandPoint {
  date: string;
  week: number;
  demand: number; // 0-100% - what the job requires
  label?: string; // e.g., "Modified duties", "Full duties"
}

interface CertificateMarker {
  date: string;
  week: number;
  capacity: number;
  certificateNumber: number;
  capacityLabel: string;
  color: string;
}

interface RecoveryPhaseDisplay {
  name: string;
  weekStart: number;
  weekEnd: number;
  color: string;
  status: "completed" | "in_progress" | "upcoming";
  milestones: Array<{
    description: string;
    completed: boolean;
    completedDate?: string;
  }>;
}

interface DiagnosticRecommendation {
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  suggestedAction: string;
  relatedTests?: string[];
  specialistReferral?: string;
}

interface RecoveryAnalysis {
  comparedToExpected: "ahead" | "on_track" | "behind" | "insufficient_data";
  weeksDifference: number | null;
  trend: "improving" | "stable" | "declining" | "unknown";
  message: string;
}

// Phase 3: Trajectory projection
interface TrajectoryProjection {
  direction: "improving" | "stable" | "declining" | "unknown";
  confidence: "low" | "medium" | "high";
  projectedWeeks: number[];
  projectedCapacity: number[];
  rtwLikelihood: "likely" | "possible" | "unlikely" | "unknown";
  rtwEstimatedWeek: number | null;
  insight: string;
}

// Phase 3: Recovery Friction Index
interface RecoveryFrictionIndex {
  score: number;
  level: "low" | "moderate" | "high" | "critical";
  breakdown: {
    missedDutiesRate: number;
    certDelayRate: number;
    engagementInconsistency: number;
    roleCapacityGap: number;
    psychosocialFlags: number;
  };
  topFactors: string[];
  trend: "improving" | "stable" | "worsening" | "unknown";
}

interface RecoveryTimelineChartData {
  caseId: string;
  workerName: string;
  injuryType: string;
  injuryTypeLabel: string;
  injuryDate: string;
  currentDate: string;
  weeksElapsed: number;
  estimatedWeeks: number;
  estimatedRTWDate: string;
  confidence: "low" | "medium" | "high";
  estimatedCurve: ChartDataPoint[];
  actualCurve: ChartDataPoint[];
  roleDemandCurve: RoleDemandPoint[]; // Role requirements over time
  certificateMarkers: CertificateMarker[];
  phases: RecoveryPhaseDisplay[];
  currentPhase: string;
  analysis: RecoveryAnalysis;
  diagnosticRecommendations: DiagnosticRecommendation[];
  // Phase 3: Intelligence features
  trajectoryProjection: TrajectoryProjection;
  frictionIndex: RecoveryFrictionIndex;
  narrativeCaption: string;
  riskFactors: string[];
  suggestedDiagnosticTests: string[];
  potentialSpecialistReferrals: string[];
}

interface DynamicRecoveryTimelineProps {
  caseId: string;
  className?: string;
}

// Custom tooltip for the chart with dual-track information
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0]?.payload;
    const capacity = dataPoint?.actual;
    const demand = dataPoint?.roleDemand;
    const confidenceUpper = dataPoint?.confidenceUpper;
    const confidenceLower = dataPoint?.confidenceLower;
    const gap = capacity !== null && demand !== undefined ? capacity - demand : null;

    return (
      <div className="bg-white/95 backdrop-blur-md p-3 border border-slate-200/80 rounded-xl shadow-2xl shadow-slate-300/30">
        <p className="font-semibold text-sm mb-2 text-slate-800">Week {label}</p>
        <div className="space-y-1.5">
          {payload
            .filter((entry: any) => !["Gap Area", "Confidence Band", "Confidence Lower"].includes(entry.name))
            .map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-slate-600">{entry.name}:</span>
                </div>
                <span className="font-medium" style={{ color: entry.color }}>
                  {entry.value !== null && entry.value !== undefined ? `${entry.value}%` : "—"}
                </span>
              </div>
            ))}
        </div>
        {/* Confidence Band info */}
        {confidenceUpper !== null && confidenceLower !== null && (
          <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-slate-300/50" />
              <span>Confidence: {confidenceLower?.toFixed(0)}% - {confidenceUpper?.toFixed(0)}%</span>
            </div>
          </div>
        )}
        {/* Capacity vs Demand insight */}
        {gap !== null && (
          <div className={cn(
            "mt-2 pt-2 border-t border-slate-100 text-xs",
            gap >= 10 && "text-emerald-700",
            gap > -10 && gap < 10 && "text-amber-700",
            gap <= -10 && "text-red-700"
          )}>
            <span className="font-medium">
              {gap >= 10 && "✓ Capacity exceeds demand"}
              {gap > -10 && gap < 10 && "⚠ Capacity near demand threshold"}
              {gap <= -10 && "✗ Capacity below role requirements"}
            </span>
            <span className="text-slate-500 ml-2">({gap > 0 ? "+" : ""}{gap}%)</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

// Severity icon component
const SeverityIcon = ({ severity }: { severity: string }) => {
  switch (severity) {
    case "critical":
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    case "warning":
      return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    default:
      return <Info className="h-5 w-5 text-blue-500" />;
  }
};

// Trend icon component
const TrendIcon = ({ trend }: { trend: string }) => {
  switch (trend) {
    case "improving":
      return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    case "declining":
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    default:
      return <Minus className="h-4 w-4 text-gray-400" />;
  }
};

export const DynamicRecoveryTimeline: React.FC<DynamicRecoveryTimelineProps> = ({
  caseId,
  className,
}) => {
  const { data, isLoading, error } = useQuery<RecoveryTimelineChartData>({
    queryKey: [`/api/cases/${caseId}/recovery-chart`],
    enabled: !!caseId,
  });

  // State for certificate details modal
  const [selectedCert, setSelectedCert] = useState<CertificateMarker | null>(null);

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error loading recovery timeline</AlertTitle>
        <AlertDescription>
          Unable to load recovery data for this case. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  // Find the first certificate's capacity to use for backfilling weeks before it
  // This ensures the actual recovery line starts at W1 with the first known capacity
  const firstCertCapacity = data.certificateMarkers.length > 0
    ? data.certificateMarkers[0].capacity
    : null;

  // Build role demand map for quick lookup
  const roleDemandMap = new Map<number, { demand: number; label?: string }>();
  (data.roleDemandCurve || []).forEach((point) => {
    roleDemandMap.set(point.week, { demand: point.demand, label: point.label });
  });

  // Prepare chart data by merging estimated, actual, and role demand curves
  const chartData = data.estimatedCurve.map((point) => {
    const actualPoint = data.actualCurve.find((a) => a.week === point.week);
    const roleDemandPoint = roleDemandMap.get(point.week);

    // For actual capacity:
    // - If we have certificate data for this week, use it
    // - If no certificate data but we have a first cert, backfill with first cert's capacity
    // - If no certificates at all, use null (no line)
    let actualValue: number | null = null;
    if (actualPoint?.actualCapacity !== null && actualPoint?.actualCapacity !== undefined) {
      actualValue = actualPoint.actualCapacity;
    } else if (firstCertCapacity !== null) {
      actualValue = firstCertCapacity;  // Backfill with first cert capacity
    }

    // Role demand (default to 100% full duties if not specified)
    const roleDemand = roleDemandPoint?.demand ?? 100;

    // Semantic coloring: determine status based on capacity vs demand gap
    // Green: capacity > demand (worker exceeds requirements)
    // Amber: capacity ≈ demand (within 10%)
    // Red: capacity < demand (worker below requirements)
    let semanticStatus: "green" | "amber" | "red" = "green";
    if (actualValue !== null) {
      const gap = actualValue - roleDemand;
      if (gap < -10) {
        semanticStatus = "red";
      } else if (gap >= -10 && gap < 10) {
        semanticStatus = "amber";
      } else {
        semanticStatus = "green";
      }
    }

    return {
      week: point.week,
      estimated: point.estimatedCapacity,
      actual: actualValue,
      roleDemand,
      roleDemandLabel: roleDemandPoint?.label,
      semanticStatus,
      // For area fill: we need both values for the shaded region
      areaBase: roleDemand,
      areaTop: actualValue,
      // Confidence band bounds (calculated below after all points are collected)
      confidenceUpper: null as number | null,
      confidenceLower: null as number | null,
    };
  });

  // Add any actual points that might be beyond the estimated curve
  data.actualCurve.forEach((actualPoint) => {
    if (!chartData.find((c) => c.week === actualPoint.week)) {
      const roleDemandPoint = roleDemandMap.get(actualPoint.week);
      const actualValue = actualPoint.actualCapacity ?? firstCertCapacity;
      const roleDemand = roleDemandPoint?.demand ?? 100;
      let semanticStatus: "green" | "amber" | "red" = "green";
      if (actualValue !== null) {
        const gap = actualValue - roleDemand;
        if (gap < -10) semanticStatus = "red";
        else if (gap >= -10 && gap < 10) semanticStatus = "amber";
      }
      chartData.push({
        week: actualPoint.week,
        estimated: null as any,
        actual: actualValue,
        roleDemand,
        roleDemandLabel: roleDemandPoint?.label,
        semanticStatus,
        areaBase: roleDemand,
        areaTop: actualValue,
        confidenceUpper: null,
        confidenceLower: null,
      });
    }
  });

  // Sort by week
  chartData.sort((a, b) => a.week - b.week);

  // Calculate confidence band based on certificate variance and frequency
  // Higher variance in certificate readings = wider confidence band
  // This represents recovery volatility and psychosocial instability
  const capacityValues = data.certificateMarkers.map(m => m.capacity);
  let confidenceWidth = 10; // Base confidence width ±10%

  if (capacityValues.length >= 2) {
    // Calculate standard deviation of capacity readings
    const mean = capacityValues.reduce((a, b) => a + b, 0) / capacityValues.length;
    const variance = capacityValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / capacityValues.length;
    const stdDev = Math.sqrt(variance);
    // Confidence width scales with volatility (min 5%, max 25%)
    confidenceWidth = Math.max(5, Math.min(25, stdDev * 1.5));
  }

  // Apply confidence bounds to chart data
  chartData.forEach((point) => {
    if (point.actual !== null) {
      point.confidenceUpper = Math.min(100, point.actual + confidenceWidth);
      point.confidenceLower = Math.max(0, point.actual - confidenceWidth);
    }
  });

  // Calculate semantic area segments for colored regions between lines
  // We'll use gradientId to switch colors based on status
  const getSemanticColor = (status: "green" | "amber" | "red") => {
    switch (status) {
      case "green": return "rgba(16, 185, 129, 0.2)"; // emerald-500
      case "amber": return "rgba(245, 158, 11, 0.2)"; // amber-500
      case "red": return "rgba(239, 68, 68, 0.2)"; // red-500
      default: return "rgba(107, 114, 128, 0.1)"; // gray
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "ahead":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "on_track":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "behind":
        return "bg-amber-100 text-amber-800 border-amber-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  // Get confidence badge color
  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "bg-emerald-100 text-emerald-800";
      case "medium":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-red-100 text-red-800";
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with injury type and status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Recovery Timeline: {data.injuryTypeLabel}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Injury Date: {formatDate(data.injuryDate)} | Duration: {data.weeksElapsed} weeks
          </p>
        </div>
        <div className="flex gap-2">
          <Badge className={getStatusColor(data.analysis.comparedToExpected)}>
            {data.analysis.comparedToExpected === "ahead"
              ? "Ahead of Schedule"
              : data.analysis.comparedToExpected === "on_track"
              ? "On Track"
              : data.analysis.comparedToExpected === "behind"
              ? "Behind Schedule"
              : "Assessment Needed"}
          </Badge>
          <Badge className={getConfidenceColor(data.confidence)}>
            {data.confidence.charAt(0).toUpperCase() + data.confidence.slice(1)} Confidence
          </Badge>
        </div>
      </div>

      {/* Recovery Chart - Dual Track Design with Glassmorphism */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
      <Card className="overflow-hidden backdrop-blur-sm bg-white/90 border border-slate-200/60 shadow-xl shadow-slate-200/50">
        <CardHeader className="pb-2 bg-gradient-to-r from-slate-50/80 to-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              Recovery Progress: Capacity vs Role Demand
            </CardTitle>
            {/* Phase 3: Intelligence Indicators */}
            <div className="flex items-center gap-2">
              {/* Friction Index Badge */}
              {data.frictionIndex && (
                <Badge
                  className={cn(
                    "text-xs font-medium cursor-default transition-all duration-200 flex items-center gap-1",
                    data.frictionIndex.level === "low" && "bg-emerald-100 text-emerald-700 border-emerald-300",
                    data.frictionIndex.level === "moderate" && "bg-amber-100 text-amber-700 border-amber-300",
                    data.frictionIndex.level === "high" && "bg-orange-100 text-orange-700 border-orange-300",
                    data.frictionIndex.level === "critical" && "bg-red-100 text-red-700 border-red-300",
                    "hover:shadow-md hover:scale-105"
                  )}
                  title={`Friction: ${data.frictionIndex.topFactors.join(", ") || "No concerns"}`}
                >
                  <Gauge className="h-3 w-3" />
                  {data.frictionIndex.score.toFixed(2)}
                </Badge>
              )}
              {/* Trajectory Arrow */}
              {data.trajectoryProjection && (
                <Badge
                  className={cn(
                    "text-xs font-medium cursor-default transition-all duration-200 flex items-center gap-1",
                    data.trajectoryProjection.direction === "improving" && "bg-emerald-100 text-emerald-700 border-emerald-300",
                    data.trajectoryProjection.direction === "stable" && "bg-blue-100 text-blue-700 border-blue-300",
                    data.trajectoryProjection.direction === "declining" && "bg-red-100 text-red-700 border-red-300",
                    data.trajectoryProjection.direction === "unknown" && "bg-gray-100 text-gray-600 border-gray-300",
                    "hover:shadow-md hover:scale-105"
                  )}
                  title={data.trajectoryProjection.insight}
                >
                  {data.trajectoryProjection.direction === "improving" && <ArrowUpRight className="h-3 w-3" />}
                  {data.trajectoryProjection.direction === "stable" && <ArrowRight className="h-3 w-3" />}
                  {data.trajectoryProjection.direction === "declining" && <ArrowDownRight className="h-3 w-3" />}
                  {data.trajectoryProjection.direction === "unknown" && <Minus className="h-3 w-3" />}
                  {data.trajectoryProjection.rtwLikelihood === "likely" && "RTW Soon"}
                  {data.trajectoryProjection.rtwLikelihood === "possible" && "RTW Possible"}
                  {data.trajectoryProjection.rtwLikelihood === "unlikely" && "Extended"}
                  {data.trajectoryProjection.rtwLikelihood === "unknown" && "Uncertain"}
                </Badge>
              )}
              {/* Semantic Status Indicator */}
              {chartData.length > 0 && (() => {
                const currentPoint = chartData.find(p => p.week === data.weeksElapsed) || chartData[chartData.length - 1];
                const status = currentPoint?.semanticStatus || "amber";
                const statusConfig = {
                  green: { label: "On Track", bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300", hoverBg: "hover:bg-emerald-200" },
                  amber: { label: "Fragile", bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300", hoverBg: "hover:bg-amber-200" },
                  red: { label: "At Risk", bg: "bg-red-100", text: "text-red-700", border: "border-red-300", hoverBg: "hover:bg-red-200" },
                };
                const config = statusConfig[status];
                return (
                  <Badge className={cn(
                    "text-xs font-medium cursor-default transition-all duration-200",
                    config.bg, config.text, config.border, config.hoverBg,
                    "hover:shadow-md hover:scale-105"
                  )}>
                    {config.label}
                  </Badge>
                );
              })()}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Worker capacity (solid green) vs job requirements (dashed gray). Recovery succeeds when lines converge.
          </p>
          {/* Phase 3: AI Narrative Caption */}
          {data.narrativeCaption && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-2 p-2 rounded-lg bg-gradient-to-r from-violet-50/80 to-indigo-50/80 border border-violet-200/50"
            >
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-violet-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-violet-800 font-medium leading-snug">
                  {data.narrativeCaption}
                </p>
              </div>
            </motion.div>
          )}
        </CardHeader>
        <CardContent className="pt-4">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <defs>
                  {/* Gradient for semantic area fill */}
                  <linearGradient id="semanticAreaGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.08} />
                  </linearGradient>
                  <linearGradient id="semanticAreaAmber" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.08} />
                  </linearGradient>
                  <linearGradient id="semanticAreaRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.08} />
                  </linearGradient>
                  {/* Confidence band gradient - subtle blue-gray */}
                  <linearGradient id="confidenceBandGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.25} />
                    <stop offset="50%" stopColor="#94a3b8" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.25} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                <XAxis
                  dataKey="week"
                  tickFormatter={(w) => `W${w}`}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={{ stroke: "#e2e8f0" }}
                  label={{
                    value: "Weeks Since Injury",
                    position: "insideBottom",
                    offset: -10,
                    style: { fontSize: 11, fill: "#94a3b8" },
                  }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={{ stroke: "#e2e8f0" }}
                  label={{
                    value: "Capacity %",
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 11, fill: "#94a3b8" },
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: 10 }}
                  iconType="line"
                />

                {/* Confidence Band - Volatility Envelope around capacity line */}
                <Area
                  type="monotone"
                  dataKey="confidenceUpper"
                  stroke="none"
                  fill="url(#confidenceBandGradient)"
                  fillOpacity={1}
                  name="Confidence Band"
                  legendType="none"
                  isAnimationActive={true}
                  animationDuration={1500}
                  animationEasing="ease-out"
                />
                <Area
                  type="monotone"
                  dataKey="confidenceLower"
                  stroke="none"
                  fill="#fff"
                  fillOpacity={1}
                  name="Confidence Lower"
                  legendType="none"
                  isAnimationActive={true}
                  animationDuration={1500}
                  animationEasing="ease-out"
                />

                {/* Semantic Area between Capacity and Role Demand */}
                <Area
                  type="stepAfter"
                  dataKey="actual"
                  stroke="none"
                  fill="url(#semanticAreaGreen)"
                  fillOpacity={1}
                  name="Gap Area"
                  legendType="none"
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />

                {/* Role Demand line (dashed gray - job requirements) */}
                <Line
                  type="stepAfter"
                  dataKey="roleDemand"
                  stroke="#6b7280"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  name="Role Demand"
                  dot={false}
                  activeDot={{ r: 4, fill: "#6b7280" }}
                  isAnimationActive={true}
                  animationDuration={1000}
                  animationEasing="ease-out"
                />

                {/* Estimated recovery line (light dashed blue - medical projection) */}
                <Line
                  type="monotone"
                  dataKey="estimated"
                  stroke="#93c5fd"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  name="Expected Recovery"
                  dot={false}
                  opacity={0.7}
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />

                {/* Actual recovery line (solid green - worker's actual capacity) */}
                <Line
                  type="stepAfter"
                  dataKey="actual"
                  stroke="#10b981"
                  strokeWidth={3}
                  name="Functional Capacity"
                  dot={(props: any) => {
                    // Only show dots at certificate markers (where capacity changes)
                    const { cx, cy, payload, index } = props;
                    if (index === 0) return null; // Skip first point
                    const prevPoint = chartData[index - 1];
                    if (prevPoint && payload.actual !== prevPoint.actual) {
                      return <circle cx={cx} cy={cy} r={5} fill="#10b981" stroke="#fff" strokeWidth={2} />;
                    }
                    return null;
                  }}
                  activeDot={{ r: 6, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
                  isAnimationActive={true}
                  animationDuration={1500}
                  animationEasing="ease-out"
                />

                {/* Current week marker */}
                <ReferenceLine
                  x={data.weeksElapsed}
                  stroke="#f97316"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  label={{
                    value: "Now",
                    position: "top",
                    fill: "#f97316",
                    fontSize: 11,
                    fontWeight: "bold",
                  }}
                />

                {/* Expected RTW marker */}
                <ReferenceLine
                  x={data.estimatedWeeks}
                  stroke="#8b5cf6"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  label={{
                    value: "Est. RTW",
                    position: "top",
                    fill: "#8b5cf6",
                    fontSize: 10,
                  }}
                />

                {/* Certificate markers on the actual recovery line */}
                {data.certificateMarkers.map((marker) => (
                  <ReferenceDot
                    key={marker.certificateNumber}
                    x={marker.week}
                    y={marker.capacity}
                    r={8}
                    fill={marker.color}
                    stroke="#fff"
                    strokeWidth={2}
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedCert(marker)}
                    label={{
                      value: `#${marker.certificateNumber}`,
                      position: "top",
                      fill: marker.color,
                      fontSize: 10,
                      fontWeight: "bold",
                    }}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Legend and Certificate Markers */}
          <div className="mt-4 space-y-3">
            {/* Semantic color legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="text-muted-foreground font-medium">Recovery Status:</span>
              <div className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-default">
                <div className="w-3 h-3 rounded bg-emerald-200 border border-emerald-400" />
                <span className="text-emerald-700">Capacity exceeds demand</span>
              </div>
              <div className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-default">
                <div className="w-3 h-3 rounded bg-amber-200 border border-amber-400" />
                <span className="text-amber-700">Capacity near demand</span>
              </div>
              <div className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-default">
                <div className="w-3 h-3 rounded bg-red-200 border border-red-400" />
                <span className="text-red-700">Capacity below demand</span>
              </div>
              <span className="text-muted-foreground mx-1">|</span>
              <div className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-default" title="Shaded area showing recovery volatility - wider band indicates more uncertainty">
                <div className="w-3 h-3 rounded bg-slate-200/70 border border-slate-300" />
                <span className="text-slate-600">Confidence band</span>
              </div>
            </div>

            {/* Certificate markers */}
            {data.certificateMarkers.length > 0 && (
              <div className="flex flex-wrap gap-3 pt-2 border-t">
                <span className="text-xs text-muted-foreground font-medium">Certificates:</span>
                {data.certificateMarkers.map((marker) => (
                  <button
                    key={marker.certificateNumber}
                    onClick={() => setSelectedCert(marker)}
                    className="flex items-center gap-2 text-xs hover:bg-slate-100 hover:scale-105 rounded px-2 py-1 transition-all duration-200 ease-out"
                  >
                    <div
                      className="w-3 h-3 rounded-full transition-transform duration-200 hover:scale-125"
                      style={{ backgroundColor: marker.color }}
                    />
                    <span>
                      #{marker.certificateNumber} (W{marker.week}): {marker.capacity}% - {marker.capacityLabel}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </motion.div>

      {/* Analysis Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            Recovery Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3">
            <TrendIcon trend={data.analysis.trend} />
            <div>
              <p className="text-sm">{data.analysis.message}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Trend: <span className="font-medium capitalize">{data.analysis.trend}</span>
                {data.analysis.weeksDifference !== null && (
                  <> | Difference: {Math.abs(data.analysis.weeksDifference)} weeks</>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recovery Phases */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Recovery Phases
            <Badge variant="outline" className="ml-2 font-normal">
              Current: {data.currentPhase}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-gradient-to-b from-red-500 via-amber-500 via-blue-500 to-emerald-500" />

            {/* Phases */}
            <div className="space-y-6">
              {data.phases.map((phase, index) => (
                <div key={index} className="relative flex items-start gap-4">
                  <div
                    className={cn(
                      "relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-4",
                      phase.status === "completed"
                        ? "bg-white border-emerald-500"
                        : phase.status === "in_progress"
                        ? "bg-white border-blue-500"
                        : "bg-gray-100 border-gray-300"
                    )}
                  >
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        phase.status === "completed"
                          ? "bg-emerald-500"
                          : phase.status === "in_progress"
                          ? "bg-blue-500"
                          : "bg-gray-400"
                      )}
                    />
                  </div>
                  <div className="flex-1 pb-4">
                    <div
                      className={cn(
                        "rounded-lg p-3 border",
                        phase.status === "completed"
                          ? "bg-emerald-50 border-emerald-200"
                          : phase.status === "in_progress"
                          ? "bg-blue-50 border-blue-200"
                          : "bg-gray-50 border-gray-200"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h4
                          className={cn(
                            "font-semibold text-sm",
                            phase.status === "completed"
                              ? "text-emerald-800"
                              : phase.status === "in_progress"
                              ? "text-blue-800"
                              : "text-gray-600"
                          )}
                        >
                          {phase.name}
                        </h4>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            phase.status === "completed"
                              ? "border-emerald-300 text-emerald-700"
                              : phase.status === "in_progress"
                              ? "border-blue-300 text-blue-700"
                              : "border-gray-300 text-gray-500"
                          )}
                        >
                          W{phase.weekStart}-{phase.weekEnd}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        {phase.milestones.slice(0, 3).map((milestone, mIdx) => (
                          <div key={mIdx} className="flex items-center gap-2 text-xs">
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                milestone.completed ? "bg-emerald-500" : "bg-gray-300"
                              )}
                            />
                            <span
                              className={
                                milestone.completed ? "text-emerald-700" : "text-gray-600"
                              }
                            >
                              {milestone.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diagnostic Recommendations */}
      {data.diagnosticRecommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Diagnostic Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.diagnosticRecommendations.map((rec, index) => (
                <Alert
                  key={index}
                  variant={rec.severity === "critical" ? "destructive" : "default"}
                  className={cn(
                    rec.severity === "warning" && "border-amber-300 bg-amber-50",
                    rec.severity === "info" && "border-blue-300 bg-blue-50"
                  )}
                >
                  <SeverityIcon severity={rec.severity} />
                  <AlertTitle className="text-sm">{rec.title}</AlertTitle>
                  <AlertDescription className="text-xs mt-1">
                    <p>{rec.description}</p>
                    <p className="mt-2 font-medium">Action: {rec.suggestedAction}</p>
                    {rec.relatedTests && rec.relatedTests.length > 0 && (
                      <p className="mt-1">
                        Suggested tests: {rec.relatedTests.join(", ")}
                      </p>
                    )}
                    {rec.specialistReferral && (
                      <p className="mt-1">Specialist: {rec.specialistReferral}</p>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Factors & Resources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Risk Factors for {data.injuryTypeLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {data.riskFactors.map((factor, index) => (
                <li key={index} className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="w-1 h-1 bg-amber-500 rounded-full" />
                  {factor}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Potential Specialist Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {data.potentialSpecialistReferrals.map((specialist, index) => (
                <li key={index} className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="w-1 h-1 bg-blue-500 rounded-full" />
                  {specialist}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Estimated RTW */}
      <div className="text-center text-sm text-muted-foreground border-t pt-4">
        <p>
          Estimated Return to Work: <strong>{formatDate(data.estimatedRTWDate)}</strong>
          {" "}({data.estimatedWeeks} weeks from injury)
        </p>
        <p className="text-xs mt-1">
          This timeline is advisory only and based on typical recovery patterns for{" "}
          {data.injuryTypeLabel.toLowerCase()}. Individual recovery may vary.
        </p>
      </div>

      {/* Certificate Details Modal */}
      <Dialog open={!!selectedCert} onOpenChange={() => setSelectedCert(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Medical Certificate #{selectedCert?.certificateNumber}
            </DialogTitle>
            <DialogDescription>
              Certificate details and work capacity assessment
            </DialogDescription>
          </DialogHeader>
          {selectedCert && (
            <div className="space-y-4">
              {/* Capacity Badge */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium text-slate-600">Work Capacity</span>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: selectedCert.color }}
                  />
                  <span className="text-lg font-bold">{selectedCert.capacity}%</span>
                  <Badge
                    className={cn(
                      "text-xs",
                      selectedCert.capacity === 100 && "bg-emerald-100 text-emerald-800",
                      selectedCert.capacity > 0 && selectedCert.capacity < 100 && "bg-amber-100 text-amber-800",
                      selectedCert.capacity === 0 && "bg-red-100 text-red-800"
                    )}
                  >
                    {selectedCert.capacityLabel}
                  </Badge>
                </div>
              </div>

              {/* Certificate Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500 block">Week</span>
                  <span className="font-medium">Week {selectedCert.week}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Date</span>
                  <span className="font-medium">{formatDate(selectedCert.date)}</span>
                </div>
              </div>

              {/* Capacity Explanation */}
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm">
                <p className="text-blue-800">
                  {selectedCert.capacity === 100 && "Worker is assessed as fully fit for all duties."}
                  {selectedCert.capacity > 0 && selectedCert.capacity < 100 &&
                    `Worker is on modified duties with ${selectedCert.capacity}% capacity. Suitable for light duties and graduated return to work.`}
                  {selectedCert.capacity === 0 &&
                    "Worker is currently unfit for work. Full rest and recovery required."}
                </p>
              </div>

              {/* Role Demand Context */}
              {(() => {
                const demandPoint = chartData.find(p => p.week === selectedCert.week);
                if (demandPoint && demandPoint.roleDemand !== undefined) {
                  const gap = selectedCert.capacity - demandPoint.roleDemand;
                  return (
                    <div className={cn(
                      "p-3 rounded-lg text-sm border",
                      gap >= 10 && "bg-emerald-50 border-emerald-200",
                      gap > -10 && gap < 10 && "bg-amber-50 border-amber-200",
                      gap <= -10 && "bg-red-50 border-red-200"
                    )}>
                      <div className="flex justify-between items-center mb-1">
                        <span className={cn(
                          "font-medium",
                          gap >= 10 && "text-emerald-800",
                          gap > -10 && gap < 10 && "text-amber-800",
                          gap <= -10 && "text-red-800"
                        )}>
                          Capacity vs Role Demand
                        </span>
                        <span className="text-xs text-slate-500">
                          {demandPoint.roleDemandLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Capacity: {selectedCert.capacity}%</span>
                        <span className="text-slate-400">|</span>
                        <span>Demand: {demandPoint.roleDemand}%</span>
                        <span className="text-slate-400">|</span>
                        <span className={cn(
                          "font-medium",
                          gap >= 0 ? "text-emerald-600" : "text-red-600"
                        )}>
                          Gap: {gap > 0 ? "+" : ""}{gap}%
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
