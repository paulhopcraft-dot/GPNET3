import React from "react";

type Props = {
  rows: Array<{
    id: string;
    companyName: string;
    workerName: string;
    injuryDate: string;
    latestCertificate: string;
    status: string;
    riskLevel: string;
  }>;
};

export default function EmployeeTable({ rows }: Props) {
  return (
    <table className="grid">
      <thead>
        <tr>
          <th>Company</th>
          <th>Worker</th>
          <th>Injury Date</th>
          <th>Latest Certificate</th>
          <th>Status</th>
          <th>Risk</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id}>
            <td>{r.companyName}</td>
            <td>{r.workerName}</td>
            <td>{new Date(r.injuryDate).toLocaleDateString()}</td>
            <td>{r.latestCertificate}</td>
            <td>{r.status}</td>
            <td>{r.riskLevel}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
