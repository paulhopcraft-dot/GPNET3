import { useEffect, useState } from "react";

export default function App() {
  const [cases, setCases] = useState([]);

  useEffect(() => {
    fetch("/api/gpnet2/cases?page=1&limit=10")
      .then((res) => res.json())
      .then(setCases)
      .catch((err) => console.error(err));
  }, []);

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>🩺 GPNet Case Management</h1>
      <p>Live compliance and recovery dashboard</p>
      <table border="1" cellPadding="6" cellSpacing="0">
        <thead>
          <tr>
            <th>Worker</th>
            <th>Status</th>
            <th>Risk</th>
            <th>WorkCover</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c: any) => (
            <tr key={c.id}>
              <td>{c.workerName}</td>
              <td>{c.status}</td>
              <td>{c.riskLevel}</td>
              <td>{c.workcover ? "✅" : "❌"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
