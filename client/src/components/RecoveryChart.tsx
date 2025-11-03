type Point = { x: number; y: number };
type Props = {
  expected: Point[]; // 0..1 normalized
  actual: Point[];   // 0..1 normalized
  width?: number;
  height?: number;
};

export default function RecoveryChart({ expected, actual, width = 600, height = 240 }: Props) {
  const pad = 24;
  const X = (x: number) => pad + x * (width - 2 * pad);
  const Y = (y: number) => height - pad - y * (height - 2 * pad);

  const line = (pts: Point[]) => pts.map((p, i) => `${i ? "L" : "M"} ${X(p.x)} ${Y(p.y)}`).join(" ");

  return (
    <svg width={width} height={height} role="img" aria-label="Recovery timeline chart">
      <rect x={0} y={0} width={width} height={height} fill="none" stroke="#999" />
      {/* axes */}
      <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#999" />
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#999" />
      <text x={pad} y={pad - 6} fontSize="10">Progress</text>
      <text x={width - pad - 40} y={height - 6} fontSize="10">Time</text>

      {/* expected */}
      <path d={line(expected)} fill="none" stroke="#444" strokeDasharray="4 4" strokeWidth={2} />
      {/* actual */}
      <path d={line(actual)} fill="none" stroke="#0a7" strokeWidth={2} />

      <g>
        <circle cx={X(actual[actual.length-1].x)} cy={Y(actual[actual.length-1].y)} r={3} fill="#0a7" />
      </g>
    </svg>
  );
}
