import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

type CaseRecord = {
  id: string;
  workerName: string;
  employer: string;
  injuryDate: string;
  workStatus: 'Not working'|'Suitable duties'|'Full duties';
  risk: 'Low'|'Medium'|'High';
  isWorkCover: boolean;
  expectedRecoveryDate: string;
};

type SortKey = keyof CaseRecord;

export default function App() {
  const [data, setData] = useState<CaseRecord[]>([])
  const [q, setQ] = useState('')
  const [risk, setRisk] = useState<'All'|'Low'|'Medium'|'High'>('All')
  const [workcover, setWorkcover] = useState<'All'|'Yes'|'No'>('All')
  const [sortKey, setSortKey] = useState<SortKey>('workerName')
  const [asc, setAsc] = useState(true)

  useEffect(() => {
    axios.get('/api/cases').then(res => setData(res.data))
  }, [])

  const filtered = useMemo(() => {
    return data
      .filter(c => (q ? (c.workerName.toLowerCase().includes(q.toLowerCase()) || c.employer.toLowerCase().includes(q.toLowerCase())) : true))
      .filter(c => risk === 'All' ? true : c.risk === risk)
      .filter(c => workcover === 'All' ? true : c.isWorkCover === (workcover === 'Yes'))
      .sort((a: any, b: any) => {
        const A = a[sortKey]; const B = b[sortKey];
        if (A < B) return asc ? -1 : 1;
        if (A > B) return asc ? 1 : -1;
        return 0;
      })
  }, [data, q, risk, workcover, sortKey, asc])

  const setSort = (k: SortKey) => {
    if (sortKey === k) setAsc(!asc); else { setSortKey(k); setAsc(true); }
  }

  const riskBadge = (r: string) => {
    const cls = r === 'High' ? 'badge-high' : r === 'Medium' ? 'badge-medium' : 'badge-low'
    return <span className={`badge ${cls}`}>{r}</span>
  }

  return (
    <div className="container space-y-6 py-8">
      <h1 className="text-2xl font-semibold">GPM3 — Case Dashboard (VIC)</h1>

      <div className="card grid grid-cols-1 md:grid-cols-4 gap-3">
        <input className="border rounded px-3 py-2" placeholder="Search worker/employer" value={q} onChange={e=>setQ(e.target.value)} />
        <select className="border rounded px-3 py-2" value={risk} onChange={e=>setRisk(e.target.value as any)}>
          <option>All</option><option>Low</option><option>Medium</option><option>High</option>
        </select>
        <select className="border rounded px-3 py-2" value={workcover} onChange={e=>setWorkcover(e.target.value as any)}>
          <option>All</option><option>Yes</option><option>No</option>
        </select>
        <div className="text-sm text-gray-600 self-center">VIC-only build • v1.5</div>
      </div>

      <div className="card overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left">
            <tr>
              {([['workerName','Worker'],['employer','Employer'],['injuryDate','Injury Date'],['workStatus','Work Status'],['risk','Risk'],['isWorkCover','WorkCover?'],['expectedRecoveryDate','Expected 100%']] as any).map(([key,label]: any) => (
                <th key={key} className="px-3 py-2 cursor-pointer select-none" onClick={()=>setSort(key)}>
                  {label} {sortKey===key ? (asc ? '▲' : '▼') : ''}
                </th>
              ))}
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-t">
                <td className="px-3 py-2 font-medium">{c.workerName}</td>
                <td className="px-3 py-2">{c.employer}</td>
                <td className="px-3 py-2">{c.injuryDate}</td>
                <td className="px-3 py-2">{c.workStatus}</td>
                <td className="px-3 py-2">{riskBadge(c.risk)}</td>
                <td className="px-3 py-2">{c.isWorkCover ? 'Yes' : 'No'}</td>
                <td className="px-3 py-2">{c.expectedRecoveryDate}</td>
                <td className="px-3 py-2">
                  <Link className="underline" to={`/cases/${c.id}`}>Open</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
