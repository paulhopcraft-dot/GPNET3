import React, { useMemo, useState } from "react";
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
} from "recharts";
import type { MedicalCertificate, WorkCapacity } from "@shared/schema";
import { formatWeekAsMonthYear } from "@/lib/dateUtils";
import { TrendingUp, TrendingDown, Minus, Eye, EyeOff } from "lucide-react";

interface RecoveryChartProps {
  injuryDate: string;
  expectedRecoveryDate: string;
  certificates?: MedicalCertificate[];
}

// Enhanced capacity mapping with more realistic values
const CAPACITY_TO_PERCENT: Record<WorkCapacity, number> = {
  fit: 100,        // Fully fit for work
  partial: 65,     // Partial capacity (was 60, now more realistic)
  unfit: 5,        // Not completely 0 - minimal capacity for measurement
  unknown: 35,     // Unknown - conservative estimate (was 40, now lower)
};

// Color scheme for professional healthcare theming
const CHART_COLORS = {
  expected: "#10B981",      // Emerald-500 (positive, expected)
  actual: "#3B82F6",        // Blue-500 (actual data)
  current: "#F59E0B",       // Amber-500 (current time marker)
  grid: "#E5E7EB",          // Gray-200 (subtle grid)
  text: "#374151",          // Gray-700 (readable text)
  background: "#F8FAFC",    // Slate-50 (clean background)
  border: "#E2E8F0",        // Slate-200 (subtle borders)
};

export const RecoveryChart: React.FC<RecoveryChartProps> = ({
  injuryDate,
  expectedRecoveryDate,
  certificates,
}) => {
  // Interactive state management
  const [showExpected, setShowExpected] = useState(true);
  const [showActual, setShowActual] = useState(true);
  const [highlightCurrent, setHighlightCurrent] = useState(true);
  const [selectedCertificate, setSelectedCertificate] = useState<MedicalCertificate | null>(null);

  // Input validation with better error handling
  if (!injuryDate || !expectedRecoveryDate) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-50 rounded-lg border border-slate-200">
        <div className="text-center">
          <Minus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <div className="text-sm text-gray-500 italic">
            No recovery data available.
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {!injuryDate && "Missing injury date"}
            {!injuryDate && !expectedRecoveryDate && " • "}
            {!expectedRecoveryDate && "Missing expected recovery date"}
          </div>
        </div>
      </div>
    );
  }

  // Memoized data processing for better performance
  const chartData = useMemo(() => {
    const injury = new Date(injuryDate);
    const expected = new Date(expectedRecoveryDate);
    const now = new Date();
    const MS_PER_WEEK = 1000 * 60 * 60 * 24 * 7;

    // More accurate week calculations
    const totalWeeks = Math.max(
      1,
      Math.ceil((expected.getTime() - injury.getTime()) / MS_PER_WEEK),
    );

    const currentWeek = Math.min(
      totalWeeks,
      Math.max(0, Math.floor((now.getTime() - injury.getTime()) / MS_PER_WEEK)),
    );

    // Enhanced expected recovery curve - S-shaped for more realistic recovery
    const expectedLine = Array.from({ length: totalWeeks + 1 }).map((_, i) => {
      const progress = i / totalWeeks;
      // S-curve: slow start, rapid middle, slower end (more realistic)
      const capacity = 100 * (1 / (1 + Math.exp(-8 * (progress - 0.5))));
      return {
        week: i,
        expected: Math.round(Math.min(100, Math.max(0, capacity))),
      };
    });

    // Process medical certificates with better error handling
    const certificatePoints =
      certificates
        ?.filter(cert => cert.startDate || cert.endDate) // Filter invalid certs
        .map((certificate) => {
          const date = new Date(certificate.endDate ?? certificate.startDate);

          // Validate date
          if (isNaN(date.getTime())) return null;

          const week = Math.max(
            0,
            Math.floor((date.getTime() - injury.getTime()) / MS_PER_WEEK),
          );

          return {
            week,
            actual: CAPACITY_TO_PERCENT[certificate.capacity] ?? CAPACITY_TO_PERCENT.unknown,
            certificateId: certificate.id,
            capacity: certificate.capacity,
          };
        })
        .filter(Boolean) // Remove null entries
        .sort((a, b) => a!.week - b!.week) ?? []; // Sort by week

    // Improved projection logic
    const projectionStart =
      certificatePoints.length > 0
        ? certificatePoints[certificatePoints.length - 1]!.actual
        : 5; // Start with minimal capacity instead of 0

    // Smart projection based on trend
    let projectedEnd = projectionStart;
    if (certificatePoints.length >= 2) {
      // Calculate trend from last two certificates
      const lastTwo = certificatePoints.slice(-2);
      const trend = lastTwo[1]!.actual - lastTwo[0]!.actual;
      const weeksRemaining = totalWeeks - certificatePoints[certificatePoints.length - 1]!.week;
      projectedEnd = Math.min(100, Math.max(0, projectionStart + (trend * 0.5 * weeksRemaining)));
    } else if (projectionStart < 100) {
      // Default optimistic projection if no trend data
      projectedEnd = Math.min(100, projectionStart + 25);
    }

    // Build actual recovery line with interpolation
    const actualLine = [
      { week: 0, actual: 5 }, // Start with minimal capacity
      ...certificatePoints,
      { week: totalWeeks, actual: Math.round(projectedEnd) },
    ].sort((a, b) => a!.week - b!.week);

    // Create certificate mapping for click handling
    const certificateByWeek = new Map<number, MedicalCertificate & { capacity: WorkCapacity }>();
    certificatePoints.forEach((point) => {
      if (point && certificates) {
        const certificate = certificates.find(c => c.id === point.certificateId);
        if (certificate) {
          certificateByWeek.set(point.week, { ...certificate, capacity: point.capacity });
        }
      }
    });

    // Create smooth interpolated data
    const actualByWeek = new Map<number, number>();
    actualLine.forEach((point) => {
      if (point) actualByWeek.set(point.week, point.actual);
    });

    // Interpolate between known points
    let runningActual = 5;
    const data = expectedLine.map((point) => {
      if (actualByWeek.has(point.week)) {
        runningActual = actualByWeek.get(point.week)!;
      }
      return {
        week: point.week,
        expected: point.expected,
        actual: runningActual,
        isCurrent: point.week === currentWeek,
        isFuture: point.week > currentWeek,
        // Only true if this is an actual certificate point
        hasCertificate: certificateByWeek.has(point.week),
        certificate: certificateByWeek.get(point.week) || null,
      };
    });

    return { data, currentWeek, totalWeeks, certificateCount: certificatePoints.length, certificateByWeek };
  }, [injuryDate, expectedRecoveryDate, certificates]);

  // Custom dot component for certificate points only
  const CertificateDot = (props: any) => {
    const { cx, cy, payload } = props;

    // Only render dot if this point has a certificate
    if (!payload?.hasCertificate) return null;

    return (
      <circle
        cx={cx}
        cy={cy}
        r={6}
        fill={CHART_COLORS.actual}
        stroke="white"
        strokeWidth={2}
        className="cursor-pointer hover:r-8 transition-all duration-200 drop-shadow-sm"
        onClick={() => {
          if (payload.certificate) {
            setSelectedCertificate(payload.certificate);
          }
        }}
        onMouseEnter={(e) => {
          e.target.setAttribute('r', '8');
        }}
        onMouseLeave={(e) => {
          e.target.setAttribute('r', '6');
        }}
      />
    );
  };

  // Certificate details modal
  const CertificateModal = () => {
    if (!selectedCertificate) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedCertificate(null)}>
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800">Medical Certificate Details</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600">Capacity Level</label>
                <div className={`mt-1 px-3 py-1 rounded-full text-sm font-medium inline-block ${
                  selectedCertificate.capacity === 'fit' ? 'bg-emerald-100 text-emerald-700' :
                  selectedCertificate.capacity === 'partial' ? 'bg-amber-100 text-amber-700' :
                  selectedCertificate.capacity === 'unfit' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {selectedCertificate.capacity === 'fit' && 'Fit for Work (100%)'}
                  {selectedCertificate.capacity === 'partial' && 'Partial Capacity (65%)'}
                  {selectedCertificate.capacity === 'unfit' && 'Unfit for Work (5%)'}
                  {selectedCertificate.capacity === 'unknown' && 'Unknown (35%)'}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Certificate ID</label>
                <div className="mt-1 text-sm text-slate-800 font-mono">{selectedCertificate.id}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600">Start Date</label>
                <div className="mt-1 text-sm text-slate-800">
                  {selectedCertificate.startDate ? new Date(selectedCertificate.startDate).toLocaleDateString() : 'Not specified'}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">End Date</label>
                <div className="mt-1 text-sm text-slate-800">
                  {selectedCertificate.endDate ? new Date(selectedCertificate.endDate).toLocaleDateString() : 'Not specified'}
                </div>
              </div>
            </div>

            {selectedCertificate.restrictions && (
              <div>
                <label className="text-sm font-medium text-slate-600">Work Restrictions</label>
                <div className="mt-1 text-sm text-slate-800 bg-slate-50 p-3 rounded-md">
                  {selectedCertificate.restrictions}
                </div>
              </div>
            )}

            {selectedCertificate.notes && (
              <div>
                <label className="text-sm font-medium text-slate-600">Medical Notes</label>
                <div className="mt-1 text-sm text-slate-800 bg-slate-50 p-3 rounded-md">
                  {selectedCertificate.notes}
                </div>
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
            <button
              onClick={() => setSelectedCertificate(null)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Enhanced tooltip formatter with more detailed information
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const weekNumber = label;
    const expectedValue = payload.find((p: any) => p.dataKey === 'expected')?.value;
    const actualValue = payload.find((p: any) => p.dataKey === 'actual')?.value;
    const date = formatWeekAsMonthYear(weekNumber, injuryDate);
    const isCurrent = weekNumber === chartData.currentWeek;

    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 min-w-48">
        <div className="font-medium text-slate-800 mb-2">
          {date} {isCurrent && <span className="text-amber-600 text-xs">(Current)</span>}
        </div>
        {expectedValue !== undefined && showExpected && (
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-0.5 bg-emerald-500 border-dashed border border-emerald-500"></div>
            <span className="text-sm text-slate-600">Expected: {expectedValue}%</span>
          </div>
        )}
        {actualValue !== undefined && showActual && (
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-0.5 bg-blue-500"></div>
            <span className="text-sm text-slate-600">Actual: {actualValue}%</span>
          </div>
        )}
        {expectedValue && actualValue && (
          <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            Variance: {actualValue - expectedValue > 0 ? '+' : ''}{actualValue - expectedValue}%
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full bg-white border border-slate-200 rounded-lg shadow-sm">
      {/* Header with controls */}
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Recovery Progress</h3>
            <p className="text-sm text-slate-600 mt-1">
              Tracking work capacity from {formatWeekAsMonthYear(0, injuryDate)} to {formatWeekAsMonthYear(chartData.totalWeeks, injuryDate)}
              {chartData.certificateCount > 0 && (
                <span className="ml-2 text-slate-500">• {chartData.certificateCount} certificates</span>
              )}
            </p>
          </div>

          {/* Interactive controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowExpected(!showExpected)}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                showExpected
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {showExpected ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              Expected
            </button>
            <button
              onClick={() => setShowActual(!showActual)}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                showActual
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {showActual ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              Actual
            </button>
            <button
              onClick={() => setHighlightCurrent(!highlightCurrent)}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                highlightCurrent
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {highlightCurrent ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              Current
            </button>
          </div>
        </div>
      </div>

      {/* Chart area */}
      <div className="p-6">
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData.data} margin={{ top: 20, right: 30, bottom: 40, left: 20 }}>
              <CartesianGrid
                strokeDasharray="2 2"
                stroke={CHART_COLORS.grid}
                horizontal={true}
                vertical={false}
              />
              <XAxis
                dataKey="week"
                tickFormatter={(w) => formatWeekAsMonthYear(w, injuryDate)}
                tick={{ fontSize: 12, fill: CHART_COLORS.text }}
                axisLine={{ stroke: CHART_COLORS.border }}
                tickLine={{ stroke: CHART_COLORS.border }}
                label={{
                  value: "Recovery Timeline",
                  position: "insideBottom",
                  offset: -5,
                  style: { textAnchor: 'middle', fontSize: '12px', fill: CHART_COLORS.text }
                }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: CHART_COLORS.text }}
                axisLine={{ stroke: CHART_COLORS.border }}
                tickLine={{ stroke: CHART_COLORS.border }}
                label={{
                  value: "Work Capacity (%)",
                  angle: -90,
                  position: "insideLeft",
                  style: { textAnchor: 'middle', fontSize: '12px', fill: CHART_COLORS.text }
                }}
              />
              <Tooltip content={<CustomTooltip />} />

              {showExpected && (
                <Line
                  type="monotone"
                  dataKey="expected"
                  stroke={CHART_COLORS.expected}
                  strokeDasharray="8 4"
                  strokeWidth={2}
                  name="Expected Recovery"
                  dot={false}
                  activeDot={{ r: 4, fill: CHART_COLORS.expected }}
                />
              )}

              {showActual && (
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke={CHART_COLORS.actual}
                  strokeWidth={3}
                  name="Actual Recovery"
                  dot={{ r: 3, fill: CHART_COLORS.actual, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: CHART_COLORS.actual, stroke: 'white', strokeWidth: 2 }}
                />
              )}

              {highlightCurrent && (
                <ReferenceLine
                  x={chartData.currentWeek}
                  stroke={CHART_COLORS.current}
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  label={{
                    value: "Today",
                    position: "topRight",
                    fill: CHART_COLORS.current,
                    fontSize: 11,
                    fontWeight: 'bold'
                  }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Summary stats */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
          <div className="text-center">
            <div className="text-lg font-semibold text-slate-800">
              {chartData.data.find(d => d.week === chartData.currentWeek)?.actual || 0}%
            </div>
            <div className="text-xs text-slate-500">Current Capacity</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-slate-800">
              {chartData.data.find(d => d.week === chartData.currentWeek)?.expected || 0}%
            </div>
            <div className="text-xs text-slate-500">Expected Capacity</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-slate-800">
              {chartData.totalWeeks - chartData.currentWeek}
            </div>
            <div className="text-xs text-slate-500">Weeks Remaining</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-semibold ${
              (chartData.data.find(d => d.week === chartData.currentWeek)?.actual || 0) >=
              (chartData.data.find(d => d.week === chartData.currentWeek)?.expected || 0)
                ? 'text-emerald-600' : 'text-amber-600'
            }`}>
              {(() => {
                const current = chartData.data.find(d => d.week === chartData.currentWeek);
                const variance = (current?.actual || 0) - (current?.expected || 0);
                return variance > 0 ? `+${variance}%` : `${variance}%`;
              })()}
            </div>
            <div className="text-xs text-slate-500">vs Expected</div>
          </div>
        </div>
      </div>
    </div>
  );
};
