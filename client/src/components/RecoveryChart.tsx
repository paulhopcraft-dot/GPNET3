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

interface Certificate {
  date: string;
  capacity_percent: number;
}

interface RecoveryChartProps {
  injuryDate: string;
  expectedRecoveryDate: string;
  latestCertificate?: Certificate;
}

export const RecoveryChart: React.FC<RecoveryChartProps> = ({
  injuryDate,
  expectedRecoveryDate,
  latestCertificate,
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

  // Calculate weeks since injury and total recovery period
  const totalWeeks = Math.max(
    1,
    Math.round((expected.getTime() - injury.getTime()) / MS_PER_WEEK)
  );

  // Clamp current week inside visible range (0 → totalWeeks)
  const currentWeek = Math.min(
    totalWeeks,
    Math.max(0, Math.round((now.getTime() - injury.getTime()) / MS_PER_WEEK))
  );

  // Expected linear recovery (0 → 100%)
  const expectedLine = Array.from({ length: totalWeeks + 1 }).map((_, i) => ({
    week: i,
    expected: Math.min(100, Math.round((i / totalWeeks) * 100)),
  }));

  // Actual recovery — uses latest certificate if available, otherwise flat
  let actualLine: { week: number; actual: number }[] = [{ week: 0, actual: 0 }];

  if (latestCertificate && latestCertificate.date) {
    const certWeek = Math.round(
      (new Date(latestCertificate.date).getTime() - injury.getTime()) /
        MS_PER_WEEK
    );
    actualLine.push({
      week: certWeek,
      actual: latestCertificate.capacity_percent,
    });
  }

  // Always add an endpoint at expected recovery (flat or interpolated)
  actualLine.push({
    week: totalWeeks,
    actual:
      latestCertificate?.capacity_percent &&
      latestCertificate.capacity_percent < 100
        ? Math.min(100, latestCertificate.capacity_percent + 20)
        : 100,
  });

  // Merge datasets
  const chartData = expectedLine.map((e) => {
    const match = actualLine.find((a) => a.week === e.week);
    return {
      week: e.week,
      expected: e.expected,
      actual: match ? match.actual : null,
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
            formatter={(value: number, name: string) =>
              `${value}% (${name})`
            }
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

          {/* Improved: Always show current week marker if in range */}
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
        Current week: {currentWeek} of {totalWeeks} — based on injury date
      </div>
    </div>
  );
};