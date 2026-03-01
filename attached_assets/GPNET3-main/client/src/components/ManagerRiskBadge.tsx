import React from "react";

export default function ManagerRiskBadge({ level }: { level: string }) {
  const color = level === "High" ? "#e11d48" : level === "Medium" ? "#f59e0b" : "#10b981";
  const style = { background: color, color: "#fff", borderRadius: 6, padding: "2px 8px", fontSize: 12 } as const;
  return <span style={style}>{level}</span>;
}
