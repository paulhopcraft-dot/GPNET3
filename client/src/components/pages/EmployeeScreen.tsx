import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "./../styles/employee.css";

type Certificate = {
  id: string;
  type: string;
  expiry: string;
};
type Case = {
  id: string;
  workerName: string;
  companyName: string;
  injuryDate: string;
  status: string;
  riskLevel: string;
  notes?: string;
  certificates: Certificate[];
};

export default function EmployeeScreen() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/cases/${id}`);
        if (!res.ok) throw new Error(`API error ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (e:any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="page-wrap">Loading…</div>;
  if (error) return <div className="page-wrap error">Error: {error}</div>;
  if (!data) return <div className="page-wrap">No data</div>;

  return (
    <div className="page-wrap">
      <div className="crumbs"><Link to="/">← Back to cases</Link></div>
      <h1>{data.workerName} — {data.companyName}</h1>

      <div className="cards">
        <section className="card">
          <h2>Overview</h2>
          <ul>
            <li><strong>Status:</strong> {data.status}</li>
            <li><strong>Risk:</strong> {data.riskLevel}</li>
            <li><strong>Injury date:</strong> {new Date(data.injuryDate).toLocaleDateString()}</li>
          </ul>
        </section>

        <section className="card">
          <h2>Certificates</h2>
          <table className="grid">
            <thead>
              <tr><th>Type</th><th>Expiry</th></tr>
            </thead>
            <tbody>
              {data.certificates?.map(c => (
                <tr key={c.id}>
                  <td>{c.type}</td>
                  <td>{new Date(c.expiry).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h2>Next Actions</h2>
          <ol className="steps">
            <li>Confirm current certificate validity.</li>
            <li>Contact treating provider if renewal is due.</li>
            <li>Update modified duties plan in GPNet.</li>
          </ol>
        </section>
      </div>
    </div>
  );
}
