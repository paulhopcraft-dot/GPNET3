import React from "react";
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

interface RecoveryChartProps {
  injuryDate: string;
  expectedRecoveryDate: string;
  certificates?: MedicalCertificate[];
}

const CAPACITY_TO_PERCENT: Record<WorkCapacity, number> = {
  fit: 100,
  partial: 60,
  unfit: 0,
  unknown: 40,
};

export const RecoveryChart: React.FC<RecoveryChartProps> = ({
  injuryDate,
  expectedRecoveryDate,
  certificates,
}) => {
  if (!injuryDate || !expectedRecoveryDate) {
    return (
      <div className="text-sm text-gray-500 italic">
        No recovery data available.
      </div>
    );
  }

  const injury = new Date(injuryDate);
  const expected = new Date(expectedRecoveryDate);
  const now = new Date();
  const MS_PER_WEEK = 1000 * 60 * 60 * 24 * 7;

  const totalWeeks = Math.max(
    1,
    Math.round((expected.getTime() - injury.getTime()) / MS_PER_WEEK),
  );

  const currentWeek = Math.min(
    totalWeeks,
    Math.max(0, Math.round((now.getTime() - injury.getTime()) / MS_PER_WEEK)),
  );

  const expectedLine = Array.from({ length: totalWeeks + 1 }).map((_, i) => ({
    week: i,
    expected: Math.min(100, Math.round((i / totalWeeks) * 100)),
  }));

  const certificatePoints =
    certificates?.map((certificate) => {
      const date = new Date(certificate.endDate ?? certificate.startDate);
      const week = Math.max(
        0,
        Math.round((date.getTime() - injury.getTime()) / MS_PER_WEEK),
      );

      return {
        week,
        actual: CAPACITY_TO_PERCENT[certificate.capacity] ?? CAPACITY_TO_PERCENT.unknown,
      };
    }) ?? [];

  const projectionStart =
    certificatePoints.length > 0
      ? certificatePoints[certificatePoints.length - 1].actual
      : 0;
  const projectedEnd = projectionStart < 100 ? Math.min(100, projectionStart + 20) : 100;

  const actualLine = [
    { week: 0, actual: 0 },
    ...certificatePoints,
    { week: totalWeeks, actual: projectedEnd },
  ].sort((a, b) => a.week - b.week);

  const actualByWeek = new Map<number, number>();
  actualLine.forEach((point) => {
    actualByWeek.set(point.week, point.actual);
  });

  let runningActual = 0;
  const chartData = expectedLine.map((point) => {
    if (actualByWeek.has(point.week)) {
      runningActual = actualByWeek.get(point.week)!;
    }
    return {
      week: point.week,
      expected: point.expected,
      actual: runningActual,
    };
  });

  return (
    <div className="w-full h-64 mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="week"
            tickFormatter={(w) => `W${w}`}
            label={{
              value: "Weeks Since Injury",
              position: "insideBottom",
              offset: -2,
            }}
          />
          <YAxis
            domain={[0, 100]}
            label={{
              value: "Capacity (%)",
              angle: -90,
              position: "insideLeft",
            }}
          />
          <Tooltip
            formatter={(value: number, name: string) => `${value}% (${name})`}
            labelFormatter={(label: number) => `Week ${label}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="expected"
            stroke="#4CAF50"
            strokeDasharray="5 5"
            name="Expected Recovery"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#2196F3"
            name="Actual Recovery"
            dot={{ r: 4 }}
          />

          <ReferenceLine
            x={currentWeek}
            stroke="#FF9800"
            strokeWidth={2}
            strokeDasharray="4 2"
            label={{
              value: `Now (W${currentWeek})`,
              position: "top",
              fill: "#FF9800",
              fontSize: 10,
            }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="text-xs text-gray-500 mt-2 text-center">
        Current week: {currentWeek} of {totalWeeks} – based on injury date
      </div>
    </div>
  );
};
