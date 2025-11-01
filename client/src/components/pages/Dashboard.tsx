import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./../styles/dashboard.css";

type Row = {
  id: string;
  companyName: string;
  workerName: string;
  injuryDate: string;
  latestCertificate: string;
  status: "Open" | "Closed" | "Pending";
  riskLevel: "High" | "Medium" | "Low";
};

export default function Dashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/cases");
        if (!res.ok) throw new Error(`API error ${res.status}`);
        const data = await res.json();
        setRows(data);
      } catch (e:any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="page-wrap">Loading…</div>;
  if (error) return <div className="page-wrap error">Error: {error}</div>;

  return (
    <div className="page-wrap">
      <div className="header">
        <h1>GPNet — Cases</h1>
        {/* <button className="btn" disabled>🎙️ Voice GP (coming soon)</button> */}
      </div>

      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th>Company</th>
              <th>Worker</th>
              <th>Injury Date</th>
              <th>Latest Certificate</th>
              <th>Status</th>
              <th>Risk</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.companyName}</td>
                <td><Link to={`/employee/${r.id}`}>{r.workerName}</Link></td>
                <td>{new Date(r.injuryDate).toLocaleDateString()}</td>
                <td>{r.latestCertificate}</td>
                <td>{r.status}</td>
                <td className={`risk-${r.riskLevel.toLowerCase()}`}>{r.riskLevel}</td>
                <td><Link className="btn-link" to={`/employee/${r.id}`}>Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
