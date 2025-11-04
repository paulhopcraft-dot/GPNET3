export type CaseRecord = {
  id: string;
  workerName: string;
  employer: string;
  injuryDate: string; // ISO
  workStatus: 'Not working' | 'Suitable duties' | 'Full duties';
  risk: 'Low' | 'Medium' | 'High';
  isWorkCover: boolean;
  expectedRecoveryDate: string; // ISO
  progress: Array<{ date: string; capacity: number }>; // 0..100 line series
};

const seed: CaseRecord[] = [
  {
    id: 'JACOB-GUNN',
    workerName: 'Jacob Gunn',
    employer: 'Symmetry HR (Group P/L)',
    injuryDate: '2025-09-11',
    workStatus: 'Suitable duties',
    risk: 'High',
    isWorkCover: true,
    expectedRecoveryDate: '2026-01-20',
    progress: [
      { date: '2025-09-18', capacity: 10 },
      { date: '2025-10-01', capacity: 20 },
      { date: '2025-10-15', capacity: 30 },
      { date: '2025-11-01', capacity: 35 }
    ]
  },
  {
    id: 'STUART-BARKLEY',
    workerName: 'Stuart Barkley',
    employer: 'DXC Claims Management',
    injuryDate: '2025-09-11',
    workStatus: 'Not working',
    risk: 'High',
    isWorkCover: true,
    expectedRecoveryDate: '2026-03-01',
    progress: [
      { date: '2025-09-20', capacity: 0 },
      { date: '2025-10-10', capacity: 0 },
      { date: '2025-11-01', capacity: 5 }
    ]
  }
];

class Store {
  private data: Map<string, CaseRecord> = new Map(seed.map(r => [r.id, r]));
  list() { return Array.from(this.data.values()); }
  get(id: string) { return this.data.get(id); }
  upsert(rec: CaseRecord) { this.data.set(rec.id, rec); return rec; }
}

export const casesStore = new Store();
