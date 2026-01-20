import React from "react";
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
  Area,
  ComposedChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassPanel } from "@/components/ui/glass-panel";
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
} from "lucide-react";

// Types matching the server-side RecoveryTimelineChartData
interface ChartDataPoint {
  date: string;
  week: number;
  estimatedCapacity: number;
  actualCapacity: number | null;
  label?: string;
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
  certificateMarkers: CertificateMarker[];
  phases: RecoveryPhaseDisplay[];
  currentPhase: string;
  analysis: RecoveryAnalysis;
  diagnosticRecommendations: DiagnosticRecommendation[];
  riskFactors: string[];
  suggestedDiagnosticTests: string[];
  potentialSpecialistReferrals: string[];
}

interface DynamicRecoveryTimelineProps {
  caseId: string;
  className?: string;
}

// Custom tooltip for the chart
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-semibold text-sm mb-2">Week {label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}%
          </p>
        ))}
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

  // Prepare chart data by merging estimated and actual curves
  const chartData = data.estimatedCurve.map((point) => {
    const actualPoint = data.actualCurve.find((a) => a.week === point.week);
    return {
      week: point.week,
      estimated: point.estimatedCapacity,
      actual: actualPoint?.actualCapacity ?? null,
    };
  });

  // Add any actual points that might be beyond the estimated curve
  data.actualCurve.forEach((actualPoint) => {
    if (!chartData.find((c) => c.week === actualPoint.week)) {
      chartData.push({
        week: actualPoint.week,
        estimated: null as any,
        actual: actualPoint.actualCapacity,
      });
    }
  });

  // Sort by week
  chartData.sort((a, b) => a.week - b.week);

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
    <div className={cn(
      "immersive-hero-container space-y-6",
      "min-h-[80vh] relative overflow-hidden",
      "bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-teal-900/20",
      "before:absolute before:inset-0 before:bg-gradient-mesh before:opacity-20 before:animate-gradient",
      className
    )}>
      {/* Background particle effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl animate-gradient"></div>
        {/* Gradient overlays for enhanced animation effects */}
        <div className="gradient-overlay absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 animate-gradient"></div>
        <div className="gradient-overlay absolute inset-0 bg-gradient-to-tl from-teal-500/5 via-transparent to-purple-500/5 animate-pulse-slow"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 space-y-6">
        {/* Hero Typography Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="hero-title text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Activity className="h-8 w-8 text-white/90" />
            Recovery Dashboard
          </h1>
          <h2 className="text-xl font-semibold text-white/90 mb-1">
            {data.injuryTypeLabel} Recovery Timeline
          </h2>
          <p className="text-sm text-white/70 mt-1">
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

      {/* Recovery Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            Recovery Progress: Estimated vs Actual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="week"
                  tickFormatter={(w) => `W${w}`}
                  label={{
                    value: "Weeks Since Injury",
                    position: "insideBottom",
                    offset: -10,
                    style: { fontSize: 12 },
                  }}
                />
                <YAxis
                  domain={[0, 100]}
                  label={{
                    value: "Work Capacity %",
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 12 },
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />

                {/* Estimated recovery line (dashed) */}
                <Line
                  type="monotone"
                  dataKey="estimated"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  name="Estimated Recovery"
                  dot={false}
                />

                {/* Actual recovery line (solid) */}
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#10b981"
                  strokeWidth={3}
                  name="Actual Recovery"
                  dot={{ r: 4, fill: "#10b981" }}
                  connectNulls
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
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Certificate markers legend */}
          {data.certificateMarkers.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              {data.certificateMarkers.map((marker) => (
                <div
                  key={marker.certificateNumber}
                  className="flex items-center gap-2 text-xs"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: marker.color }}
                  />
                  <span>
                    Cert #{marker.certificateNumber} (W{marker.week}): {marker.capacity}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Glassmorphism Recovery Data Panels Grid */}
      <div className="glassmorphism-panels-grid grid grid-cols-12 gap-4 mt-6">
        {/* Recovery Phase Panel - Spans 4 columns */}
        <GlassPanel className="col-span-12 md:col-span-4 p-4" variant="gradient">
          <h4 className="text-sm font-semibold text-white/90 mb-2 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recovery Phase
          </h4>
          <div className="text-2xl font-bold text-white mb-1">
            Week {Math.floor(data.weeksOffWork || 0)}
          </div>
          <div className="text-xs text-white/70">
            Current phase: {data.weeksOffWork > 8 ? 'Extended' : data.weeksOffWork > 4 ? 'Mid-term' : 'Early'}
          </div>
        </GlassPanel>

        {/* Capacity Status Panel - Spans 4 columns */}
        <GlassPanel className="col-span-12 md:col-span-4 p-4" variant="gradient">
          <h4 className="text-sm font-semibold text-white/90 mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Work Capacity
          </h4>
          <div className="text-2xl font-bold text-white mb-1">
            {data.currentCapacityPercentage || 0}%
          </div>
          <div className="text-xs text-white/70">
            {data.currentCapacityPercentage >= 75 ? 'High capacity' : data.currentCapacityPercentage >= 25 ? 'Limited capacity' : 'Unfit for work'}
          </div>
        </GlassPanel>

        {/* Risk Level Panel - Spans 4 columns */}
        <GlassPanel className="col-span-12 md:col-span-4 p-4" variant="gradient">
          <h4 className="text-sm font-semibold text-white/90 mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Risk Level
          </h4>
          <div className="text-2xl font-bold text-white mb-1">
            {data.riskCategory || 'Unknown'}
          </div>
          <div className="text-xs text-white/70">
            Based on injury type and duration
          </div>
        </GlassPanel>
      </div>

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
      </div>
    </div>
  );
};
