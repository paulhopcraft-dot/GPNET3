# Case Timeline UX Specification

**Problem:** Current interface is a list of tickets/notes. Users can't intuitively see:
- Where is this case in its journey?
- Is recovery on track?
- What happened when?
- What's blocking progress?

**Solution:** Visual timeline showing case progression with AI analysis.

---

## 1. Timeline View Design

### 1.1 Visual Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ MARCUS CHEN - Back Injury                                    Risk: LOW ⬇   │
│ Coastal Logistics | Warehouse Team Leader | Injury: 20 Dec 2025            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  RECOVERY PROGRESS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●━━━━━━━━ 80%         │
│                                                       ↑                     │
│  Week: 1    2    3    4    5    6    7    8    9   [10]  11   12           │
│        ┃    ┃    ┃    ┃    ┃    ┃    ┃    ┃    ┃    ┃                      │
│        ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼                      │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │ TIMELINE                                                        │       │
│  │                                                                 │       │
│  │ ●━━━━━━●━━━━━●━━━━━━━━━●━━━━━━━━━━━━━●━━━━━━━━●━━━━━━●━━━━━○    │       │
│  │ │      │     │         │             │        │      │     │    │       │
│  │ │      │     │         │             │        │      │     └─▶ Target  │
│  │ │      │     │         │             │        │      │       Full Duties│
│  │ │      │     │         │             │        │      │                  │
│  │ │      │     │         │             │        │      └─ Week 10        │
│  │ │      │     │         │             │        │         Check-in       │
│  │ │      │     │         │             │        │         80% capacity   │
│  │ │      │     │         │             │        │                        │
│  │ │      │     │         │             │        └─ Week 8                │
│  │ │      │     │         │             │           Physio: 75%           │
│  │ │      │     │         │             │                                  │
│  │ │      │     │         │             └─ Week 6                         │
│  │ │      │     │         │                Cert 3: Modified               │
│  │ │      │     │         │                7 hrs, <10kg                   │
│  │ │      │     │         │                                               │
│  │ │      │     │         └─ Week 4                                       │
│  │ │      │     │            RTW Plan Created                             │
│  │ │      │     │            ⚠️ Employer issue resolved                   │
│  │ │      │     │                                                         │
│  │ │      │     └─ Week 3                                                 │
│  │ │      │        ⚠️ BLOCKER: No suitable duties                        │
│  │ │      │        CLC intervention                                       │
│  │ │      │                                                               │
│  │ │      └─ Week 2                                                       │
│  │ │         Cert 2: Modified Duties                                      │
│  │ │         6 hrs, <5kg lifting                                          │
│  │ │                                                                       │
│  │ └─ Week 0-1                                                            │
│  │    Injury + Cert 1: Unfit                                              │
│  │    Physio referral                                                     │
│  │                                                                         │
│  └─────────────────────────────────────────────────────────────────────────┘
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ 🤖 AI ANALYSIS                                                              │
│                                                                             │
│ ✅ ON TRACK: Recovery progressing well (80% at week 10, target 100% week 12)│
│                                                                             │
│ 📈 Trend: Pain reduced 8→2, capacity 0%→80% in 10 weeks                    │
│                                                                             │
│ ⚠️ Past Bottleneck (Resolved): Employer refused suitable duties (Week 3)   │
│    → Resolved via WFH data entry arrangement                               │
│                                                                             │
│ 📋 Next Steps:                                                              │
│    1. Schedule FCE (Functional Capacity Evaluation)                        │
│    2. Certificate renewal in 2 weeks                                       │
│    3. Plan transition to full duties (Week 12)                             │
│                                                                             │
│ 🎯 Projected Outcome: Full recovery Week 12-14 (HIGH confidence)           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Event Types on Timeline

| Icon | Event Type | Color |
|------|------------|-------|
| 📋 | Certificate | Blue |
| 🏥 | Medical/Physio | Green |
| 📝 | RTW Plan | Purple |
| 💼 | Employer Communication | Orange |
| 📞 | CLC Check-in | Gray |
| ⚠️ | Blocker/Issue | Red |
| ✅ | Resolution/Milestone | Green |

### 1.3 Recovery Graph (Mini-chart)

```
Capacity %
100│                                    ╭─────○ Target
 80│                              ╭─────●
 60│                        ╭─────╯
 40│                  ╭─────╯
 20│            ╭─────╯
  0│────●───────╯
   └────┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───▶
        1   2   3   4   5   6   7   8   9  10  11  12  Week
```

---

## 2. AI Analysis Engine

### 2.1 What AI Analyzes

```typescript
interface CaseAnalysis {
  // Overall status
  status: 'on_track' | 'at_risk' | 'blocked' | 'ahead_of_schedule';
  confidence: 'high' | 'medium' | 'low';
  
  // Trend analysis
  recoveryTrend: {
    capacityChange: number; // % per week
    painTrend: 'improving' | 'stable' | 'worsening';
    projectedFullRecovery: Date | null;
  };
  
  // Bottleneck detection
  currentBottlenecks: Bottleneck[];
  resolvedBottlenecks: Bottleneck[];
  
  // Next steps (prioritized)
  nextSteps: Action[];
  
  // Risk factors
  riskFactors: RiskFactor[];
}

interface Bottleneck {
  type: 'employer' | 'medical' | 'worker' | 'administrative' | 'compliance';
  description: string;
  startedAt: Date;
  resolvedAt?: Date;
  daysBlocked: number;
  impact: 'high' | 'medium' | 'low';
}
```

### 2.2 Bottleneck Detection Rules

| Bottleneck | Detection Logic |
|------------|-----------------|
| No suitable duties | Employer says "cannot accommodate" + worker fit for modified |
| Certificate gap | >3 days between cert end and new cert |
| Stalled RTW | No capacity increase for >2 weeks |
| Unresponsive worker | No contact for >7 days despite attempts |
| Medical delay | Referral made but appointment >14 days out |
| Compliance issue | Overdue lodgement, missing docs |

### 2.3 AI Reasoning Prompt

```
You are analyzing a worker's compensation case timeline.

Case: {workerName} - {employer}
Injury: {injuryType} on {injuryDate}
Current week: {currentWeek}

Timeline events:
{events}

Recovery data:
{capacityOverTime}
{painOverTime}

Analyze this case and provide:
1. STATUS: Is recovery on track? (on_track/at_risk/blocked)
2. TREND: How is recovery progressing vs expected?
3. BOTTLENECKS: What has/is blocking progress?
4. NEXT STEPS: What should happen next? (prioritized)
5. PROJECTION: When will full recovery occur?

Be specific. Reference actual events from the timeline.
Flag anything concerning.
```

---

## 3. Implementation Plan

### Phase 1: Data Model (Week 1)
- [ ] Add `case_events` table for timeline entries
- [ ] Add `recovery_metrics` table (weekly capacity, pain scores)
- [ ] Migrate existing data to new structure

### Phase 2: Timeline UI (Week 2)
- [ ] Create `CaseTimeline` component
- [ ] Create `RecoveryGraph` component
- [ ] Create `EventCard` component
- [ ] Wire up to case detail page

### Phase 3: AI Analysis (Week 3)
- [ ] Build analysis prompt template
- [ ] Create `CaseAnalyzer` service
- [ ] Add bottleneck detection rules
- [ ] Display AI insights panel

### Phase 4: Polish (Week 4)
- [ ] Mobile responsive
- [ ] Print view
- [ ] Export timeline as PDF
- [ ] Animations and transitions

---

## 4. Database Schema Changes

```sql
-- Timeline events table
CREATE TABLE case_events (
  id SERIAL PRIMARY KEY,
  case_id VARCHAR(50) REFERENCES worker_cases(id),
  event_type VARCHAR(50) NOT NULL,
  -- Types: certificate, medical, rtw_plan, employer_comm, check_in, blocker, resolution
  
  event_date DATE NOT NULL,
  week_number INTEGER, -- Calculated from injury date
  
  title VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- For certificates
  certificate_id INTEGER REFERENCES medical_certificates(id),
  capacity VARCHAR(50), -- 'unfit', 'modified', 'full'
  
  -- For blockers
  is_blocker BOOLEAN DEFAULT FALSE,
  blocker_type VARCHAR(50),
  resolved_at TIMESTAMP,
  
  -- Metadata
  source_ticket_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_event_type CHECK (
    event_type IN ('certificate', 'medical', 'rtw_plan', 
                   'employer_comm', 'check_in', 'blocker', 'resolution', 'other')
  )
);

-- Recovery metrics (weekly snapshots)
CREATE TABLE recovery_metrics (
  id SERIAL PRIMARY KEY,
  case_id VARCHAR(50) REFERENCES worker_cases(id),
  week_number INTEGER NOT NULL,
  recorded_at DATE NOT NULL,
  
  capacity_percent INTEGER, -- 0-100
  pain_level INTEGER, -- 1-10
  hours_per_day DECIMAL(3,1),
  days_per_week INTEGER,
  
  work_status VARCHAR(50), -- 'off_work', 'modified', 'full_duties'
  notes TEXT,
  
  UNIQUE(case_id, week_number)
);

-- AI analysis cache
CREATE TABLE case_analysis (
  id SERIAL PRIMARY KEY,
  case_id VARCHAR(50) REFERENCES worker_cases(id),
  analyzed_at TIMESTAMP DEFAULT NOW(),
  
  status VARCHAR(20), -- 'on_track', 'at_risk', 'blocked'
  confidence VARCHAR(10),
  
  trend_summary TEXT,
  bottlenecks JSONB,
  next_steps JSONB,
  projection_text TEXT,
  projected_recovery_date DATE,
  
  raw_analysis TEXT, -- Full AI response
  model_used VARCHAR(50),
  
  UNIQUE(case_id) -- Only keep latest analysis
);
```

---

## 5. API Endpoints

```typescript
// Get case timeline with events
GET /api/cases/:caseId/timeline
Response: {
  case: CaseSummary,
  events: TimelineEvent[],
  metrics: RecoveryMetric[],
  analysis: CaseAnalysis | null
}

// Trigger AI analysis
POST /api/cases/:caseId/analyze
Response: {
  analysis: CaseAnalysis,
  generatedAt: Date
}

// Add manual event
POST /api/cases/:caseId/events
Body: {
  eventType: string,
  eventDate: Date,
  title: string,
  description?: string
}
```

---

## 6. UX Principles

1. **Timeline is the hero** — First thing you see is the visual journey
2. **AI explains, doesn't replace** — Analysis supports human decision-making
3. **Bottlenecks stand out** — Red, prominent, actionable
4. **Progress is visible** — Recovery graph shows momentum
5. **Next steps are clear** — Don't make users think "what now?"
6. **Mobile-first** — Timeline works vertically on phone

---

## 7. Future Enhancements

- **Compare cases** — Show this case vs average for similar injuries
- **Predictive alerts** — "Based on pattern, expect bottleneck at week 6"
- **Employer scorecard** — Track which employers cause delays
- **Worker portal** — Let workers see their own timeline
- **Export to insurer** — Generate PDF report from timeline
