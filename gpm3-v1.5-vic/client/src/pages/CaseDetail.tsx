import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

type Point = { date: string; capacity: number }
type CaseRecord = {
  id: string;
  workerName: string;
  employer: string;
  injuryDate: string;
  workStatus: 'Not working'|'Suitable duties'|'Full duties';
  risk: 'Low'|'Medium'|'High';
  isWorkCover: boolean;
  expectedRecoveryDate: string;
  progress: Point[];
}

export default function CaseDetail() {
  const { id } = useParams()
  const [data, setData] = useState<CaseRecord | null>(null)
  const [compliance, setCompliance] = useState<any>(null)

  useEffect(() => {
    axios.get(`/api/cases/${id}`).then(res => setData(res.data))
    axios.get(`/api/cases/${id}/compliance`).then(res => setCompliance(res.data))
  }, [id])

  if (!data) return <div className="container py-8">Loading…</div>

  // Build expected straight-line from injury to 100% at expectedRecoveryDate
  const series: Point[] = []
  if (data.progress.length) {
    const first = new Date(data.injuryDate).getTime()
    const last = new Date(data.expectedRecoveryDate).getTime()
    const steps = 6
    for (let i=0;i<=steps;i++){
      const t = first + (i/steps)*(last-first)
      series.push({ date: new Date(t).toISOString().slice(0,10), capacity: Math.round((i/steps)*100) })
    }
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Case: {data.workerName}</h1>
        <Link className="underline" to="/">Back</Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card md:col-span-2">
          <h2 className="font-medium mb-2">Anticipated Recovery Timeline</h2>
          <div style={{width:'100%', height:300}}>
            <ResponsiveContainer>
              <LineChart data={data.progress}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0,100]} />
                <Tooltip />
                <Line type="monotone" dataKey="capacity" />
                {/* Expected straight-line to 100% */}
                {series.length > 0 && (
                  <Line type="monotone" dataKey="capacity" data={series} dot={false} />
                )}
                <ReferenceLine x={data.expectedRecoveryDate} label="Expected 100%" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card space-y-2">
          <div><span className="text-gray-500">Employer:</span> {data.employer}</div>
          <div><span className="text-gray-500">Injury date:</span> {data.injuryDate}</div>
          <div><span className="text-gray-500">Work status:</span> {data.workStatus}</div>
          <div><span className="text-gray-500">WorkCover:</span> {data.isWorkCover ? 'Yes' : 'No'}</div>
          <div><span className="text-gray-500">Risk:</span> {data.risk}</div>
          {compliance && (
            <div className="mt-3">
              <div className="font-medium">Compliance (VIC): {compliance.level}</div>
              <div className="text-sm text-gray-600">{compliance.rationale}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
