# GPNet Compliance Rules Engine

## Vision

Build an intelligent compliance system that determines if workers and employers are meeting their obligations under:
1. **WorkSafe Claims Manual** - Operational guidelines
2. **WIRC Act** - Legislative requirements (Workers' Compensation and Injury Rehabilitation and Compensation Act)

## The Problem You're Solving

**Current State:**
- Case managers read 30+ emails to understand "Is this case compliant?"
- No automatic detection of non-compliance
- Rules buried in 500+ page documents
- No way to query "What does the Act say about..."

**Your Vision:**
```
Jacob Gunn Case → Compliance Engine → Report

❌ NON-COMPLIANT
  - Certificate expired 14 days ago (WIRC s99, Manual 2.4)
  - No RTW plan developed (WIRC r224, Manual 5.3 - due within 10 weeks)
  - File review overdue (Manual 5.1 - 8 week maximum)

⚠️ AT RISK
  - Centrelink clearance pending >30 days (Manual 3.5)

✓ COMPLIANT
  - Claim lodged within timeframe (WIRC s91)
  - Worker engaged with case manager (WIRC s99)
```

## System Architecture

### 1. Document Ingestion & RAG System

**Documents to Ingest:**
- WorkSafe Claims Manual (7 sections)
- WIRC Act (full legislation)
- Ministerial Directions
- WorkSafe Fact Sheets
- Agent Operating Guidelines

**RAG (Retrieval Augmented Generation) Approach:**
```
┌─────────────────────────────────────────────────┐
│ 1. INGEST: Chunk documents into sections       │
│    - WorkSafe Manual: ~200 chunks              │
│    - WIRC Act: ~300 chunks                     │
│    - Each chunk: 500-1000 tokens               │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 2. EMBED: Generate embeddings with Claude      │
│    - Store in PostgreSQL with pgvector          │
│    - Or use dedicated vector DB (Pinecone, etc) │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 3. QUERY: Semantic search for relevant sections│
│    User asks: "What are certificate rules?"     │
│    Retrieve: Manual 2.4, WIRC s99, etc.        │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 4. GENERATE: AI answers using retrieved context│
│    Claude with context = accurate answers       │
└─────────────────────────────────────────────────┘
```

### 2. Database Schema

```sql
-- Document chunks for RAG
CREATE TABLE compliance_documents (
  id VARCHAR PRIMARY KEY,
  source VARCHAR NOT NULL, -- 'wirc_act', 'worksafe_manual', 'ministerial_direction'
  section VARCHAR NOT NULL, -- e.g., 'WIRC s99', 'Manual 2.4'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- For pgvector semantic search
  metadata JSONB, -- Extra info (page numbers, subsections, etc.)
  created_at TIMESTAMP DEFAULT NOW()
);

-- Compliance rules (extracted from documents)
CREATE TABLE compliance_rules (
  id VARCHAR PRIMARY KEY,
  code VARCHAR NOT NULL, -- e.g., 'CERT_CURRENT', 'RTW_PLAN_10WK'
  name VARCHAR NOT NULL, -- 'Certificate must be current'
  description TEXT,
  source_section VARCHAR, -- 'WIRC s99' or 'Manual 2.4'
  check_type VARCHAR, -- 'certificate', 'rtw_plan', 'file_review', 'payment'
  severity VARCHAR, -- 'critical', 'high', 'medium', 'low'

  -- Rule logic (JSON describing the check)
  rule_logic JSONB, -- e.g., { "field": "certificateEndDate", "operator": ">", "value": "today" }

  created_at TIMESTAMP DEFAULT NOW()
);

-- Compliance check results
CREATE TABLE compliance_checks (
  id VARCHAR PRIMARY KEY,
  case_id VARCHAR REFERENCES worker_cases(id),
  rule_id VARCHAR REFERENCES compliance_rules(id),
  status VARCHAR, -- 'compliant', 'non_compliant', 'at_risk'
  checked_at TIMESTAMP DEFAULT NOW(),
  details JSONB, -- Specific findings
  ai_explanation TEXT -- Natural language explanation from AI
);

-- WorkCover indicator
ALTER TABLE worker_cases ADD COLUMN is_workcover BOOLEAN DEFAULT false;
ALTER TABLE worker_cases ADD COLUMN workcover_claim_number VARCHAR;
ALTER TABLE worker_cases ADD COLUMN liability_accepted BOOLEAN;
```

### 3. Compliance Rules Engine

**Example Rules:**

```typescript
const COMPLIANCE_RULES = {
  // Certificate Rules (WIRC s99, Manual 2.4)
  CERT_CURRENT: {
    name: "Certificate must be current",
    source: "WIRC s99, Manual 2.4",
    check: (workerCase) => {
      const latestCert = getLatestCertificate(workerCase);
      if (!latestCert) return { status: 'non_compliant', reason: 'No certificate on file' };

      const today = new Date();
      const endDate = new Date(latestCert.endDate);

      if (endDate < today) {
        const daysOverdue = Math.floor((today - endDate) / MS_PER_DAY);
        return {
          status: 'non_compliant',
          reason: `Certificate expired ${daysOverdue} days ago`,
          reference: 'WIRC s99, Manual 2.4'
        };
      }

      return { status: 'compliant' };
    }
  },

  // RTW Plan Rules (WIRC r224, Manual 5.3)
  RTW_PLAN_10WK: {
    name: "RTW plan required within 10 weeks",
    source: "WIRC r224, Manual 5.3",
    check: (workerCase) => {
      const injuryDate = new Date(workerCase.dateOfInjury);
      const today = new Date();
      const weeksOffWork = (today - injuryDate) / (MS_PER_DAY * 7);

      if (weeksOffWork > 10 && !workerCase.rtwPlanCompleted) {
        return {
          status: 'non_compliant',
          reason: `Worker off work ${Math.floor(weeksOffWork)} weeks, no RTW plan`,
          reference: 'WIRC r224, Manual 5.3'
        };
      }

      return { status: 'compliant' };
    }
  },

  // File Review Rules (Manual 5.1)
  FILE_REVIEW_8WK: {
    name: "File review every 8 weeks maximum",
    source: "Manual 5.1",
    check: (workerCase) => {
      if (!workerCase.lastFileReviewDate) {
        return {
          status: 'at_risk',
          reason: 'No file review date recorded',
          reference: 'Manual 5.1'
        };
      }

      const lastReview = new Date(workerCase.lastFileReviewDate);
      const today = new Date();
      const weeksSinceReview = (today - lastReview) / (MS_PER_DAY * 7);

      if (weeksSinceReview > 8) {
        return {
          status: 'non_compliant',
          reason: `Last review ${Math.floor(weeksSinceReview)} weeks ago (max 8 weeks)`,
          reference: 'Manual 5.1'
        };
      } else if (weeksSinceReview > 6) {
        return {
          status: 'at_risk',
          reason: `Review due in ${Math.ceil(8 - weeksSinceReview)} weeks`,
          reference: 'Manual 5.1'
        };
      }

      return { status: 'compliant' };
    }
  }
};
```

### 4. Query Interface (Voice/Avatar)

**Future Feature - Natural Language Queries:**

```typescript
// User asks: "What does the WIRC Act say about certificate requirements?"

async function queryComplianceDocuments(question: string) {
  // 1. Generate embedding for the question
  const embedding = await generateEmbedding(question);

  // 2. Semantic search in vector DB
  const relevantSections = await db.query(`
    SELECT content, section, source
    FROM compliance_documents
    ORDER BY embedding <-> $1
    LIMIT 5
  `, [embedding]);

  // 3. Ask Claude with context
  const context = relevantSections.map(s =>
    `[${s.section}] ${s.content}`
  ).join('\n\n');

  const response = await claude.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    messages: [{
      role: 'user',
      content: `Based on this WorkSafe/WIRC context:

${context}

Answer this question: ${question}

Cite specific sections (e.g., "WIRC s99" or "Manual 2.4") in your answer.`
    }]
  });

  return response.content[0].text;
}

// Examples:
// Q: "What are the certificate requirements?"
// A: "Under WIRC s99 and Manual 2.4, certificates must be current at all times..."

// Q: "When is an RTW plan required?"
// A: "According to WIRC r224 and Manual 5.3, an RTW plan must be developed within 10 weeks..."

// Q: "What are the worker's obligations for RTW?"
// A: "Under WIRC s99, workers must participate in case conferences and..."
```

### 5. AI Summary Enhancement

**Enhanced summary with compliance checks:**

```
Case Summary - Jacob Gunn
🏷️ WORKCOVER CLAIM - Claim #12345

══════════════════════════════════════════════
COMPLIANCE STATUS: ❌ NON-COMPLIANT (3 issues)
══════════════════════════════════════════════

❌ CRITICAL: Certificate Expired
   Finding: Certificate expired 14 days ago
   Reference: WIRC s99, Manual 2.4
   Required: Certificate must be current at all times
   Action: Chase certificate from DXC immediately

❌ HIGH: RTW Plan Not Developed
   Finding: Worker off work 12 weeks, no RTW plan
   Reference: WIRC r224, Manual 5.3
   Required: RTW plan within 10 weeks for workers off >10 weeks
   Action: Develop RTW plan with Symmetry and worker

⚠️  MEDIUM: File Review Approaching
   Finding: Last review 6 weeks ago, due in 2 weeks
   Reference: Manual 5.1
   Required: File review every 8 weeks maximum
   Action: Schedule file review before Jan 20

✓ Payment Processing Correct
   Finding: Weekly payments calculated per PIAWE
   Reference: WIRC s93, Manual 3.2

══════════════════════════════════════════════
CURRENT SITUATION (as of Jan 6, 2026)
══════════════════════════════════════════════
...
```

## Implementation Plan

### Phase 1: Document Ingestion ✅ IN PROGRESS
- [x] Scrape WorkSafe Manual (3/7 sections complete)
- [ ] Find and scrape WIRC Act
- [ ] Chunk documents into 500-1000 token sections
- [ ] Store in structured format (JSON initially)

### Phase 2: Vector Database Setup
- [ ] Install pgvector extension for PostgreSQL
- [ ] Or set up Pinecone/Weaviate for dedicated vector DB
- [ ] Generate embeddings for all chunks
- [ ] Store with metadata (section, source, page)

### Phase 3: Compliance Rules Engine
- [ ] Define 10-15 core compliance rules
- [ ] Map rules to WIRC sections and Manual sections
- [ ] Implement rule checking functions
- [ ] Store results in compliance_checks table

### Phase 4: Integration
- [ ] Add compliance checks to AI summary generation
- [ ] Display compliance status prominently in UI
- [ ] Add WorkCover indicator badge
- [ ] Update progress.txt tracking

### Phase 5: Query Interface (Future)
- [ ] Build natural language query endpoint
- [ ] Semantic search with embeddings
- [ ] Voice/avatar interface (speech-to-text + TTS)
- [ ] Chat interface for "Ask the Act" feature

## Example Queries

**User:** "Can a worker refuse suitable duties?"
**System:** *Searches WIRC Act + Manual → Returns:*
> "Under WIRC s99(4), a worker must participate in RTW and accept suitable employment offered by their employer. However, they can raise concerns through the RTW Issue Resolution Process (Manual 5.4). Refusal without valid reason may affect their entitlement to weekly payments (WIRC s112)."

**User:** "How long after injury must employer report?"
**System:**
> "Under WIRC s93, employers must report injuries within 30 days of becoming aware. WorkSafe Manual 2.3 requires immediate notification for serious injuries (hospitalization, death, immediate threat to life)."

## Key Benefits

1. **Automatic Compliance Checking** - Every case shows compliance status
2. **Evidence-Based** - Every finding cites WIRC section or Manual reference
3. **Queryable** - "Ask the Act" for instant answers
4. **Proactive** - Alerts before non-compliance (e.g., "Review due in 2 weeks")
5. **Auditable** - Every compliance check tracked with timestamps

---

**This transforms GPNet from "case tracker" to "intelligent compliance assistant."**

Does this match your vision?
