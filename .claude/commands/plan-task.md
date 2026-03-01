---
name: plan-task
version: 2.0.0
description: AGI Task Planning Engine - analyzes tasks and recommends complete action plans
aliases: [plan, agi-plan, analyze-task]
---

# AGI Task Planning Engine

For any task, you MUST:
1. Score complexity across 5 dimensions (0-50 scale)
2. Calculate real cost estimates using API pricing
3. Route to optimal model (Haiku/Sonnet/Opus)
4. Generate actionable skill sequence
5. Show completion criteria

**CRITICAL: All scores and costs must be CALCULATED from the task, never copied from templates.**

---

## Step 1: Complexity Scoring

Score the task across 5 dimensions. Each dimension: 0-10 points.

### Scoring Algorithm

**1. Decision Weight (0-10)**
| Pattern | Points |
|---------|--------|
| choose, select, decide, versus, vs, compare, evaluate, which | +3 |
| architecture, design, framework, library, database, approach | +4 |
| should we, what.*best, recommend, strategy | +3 |

**2. Technical Depth (0-10)**
| Pattern | Points |
|---------|--------|
| debug, troubleshoot, diagnose, performance, optimization, scale | +4 |
| security, authentication, encryption, distributed, microservice | +3 |
| database, sql, api design, system design, infrastructure | +3 |
| algorithm, data structure, complex logic | +4 |

**3. Scope Impact (0-10)**
| Pattern | Points |
|---------|--------|
| entire, whole, complete, full, system, project, codebase | +4 |
| multiple, several, many, across, integrate, refactor | +3 |
| single, one, small, simple, quick, minor | -2 |

**4. Ambiguity Level (0-10)**
| Pattern | Points |
|---------|--------|
| improve, better, optimize, enhance, fix issues | +3 |
| somehow, might, could, maybe, uncertain, unclear | +4 |
| specific, exact, precise, defined, clear | -2 |

**5. Time Estimation (0-10)**
| Pattern | Points |
|---------|--------|
| quick, fast, simple, typo, fix, update | +1 |
| implement, create, build, develop, add | +3 |
| design, architecture, complex, system, full | +4 |

**Cap each dimension at 0-10, then sum for total (0-50).**

---

## Step 2: Model Routing

| Total Score | Model | Characteristics |
|-------------|-------|-----------------|
| 0-20 | **HAIKU** | Fast, cheap, simple tasks |
| 21-35 | **SONNET** | Balanced, standard development |
| 36-50 | **OPUS** | Deep thinking, architectural decisions |

---

## Step 3: Cost Estimation

### API Pricing (per 1M tokens)
| Model | Input | Output |
|-------|-------|--------|
| Haiku | $0.25 | $1.25 |
| Sonnet | $3.00 | $15.00 |
| Opus | $15.00 | $75.00 |

### Token Estimation by Complexity
| Score | Model | Input Tokens | Output Tokens |
|-------|-------|--------------|---------------|
| 0-10 | Haiku | 500-2,000 | 200-1,000 |
| 11-20 | Haiku | 2,000-5,000 | 1,000-3,000 |
| 21-28 | Sonnet | 5,000-10,000 | 2,000-5,000 |
| 29-35 | Sonnet | 10,000-25,000 | 5,000-15,000 |
| 36-42 | Opus | 20,000-40,000 | 10,000-25,000 |
| 43-50 | Opus | 40,000-80,000 | 25,000-50,000 |

### Cost Formula
```
min_cost = (min_input/1M × input_price) + (min_output/1M × output_price)
max_cost = (max_input/1M × input_price) + (max_output/1M × output_price)
```

---

## Step 4: Phase Generation

Based on task type, generate appropriate phases:

### Task Type Detection
| Keywords | Task Type | Typical Phases |
|----------|-----------|----------------|
| fix, bug, error, broken | Bug Fix | Investigate → Fix → Verify |
| add, create, build, implement | Feature | Plan → Build → Test → Deploy |
| design, architecture, system | Architecture | Analyze → Design → Review |
| refactor, clean, optimize | Refactor | Audit → Refactor → Verify |
| status, check, review | Information | Gather → Report |

### Phase Templates

**Bug Fix (3 phases)**
- Phase 1: Investigation - /think, Explore agent
- Phase 2: Implementation - /tdd, /continue
- Phase 3: Verification - /verify, /review, /commit

**Feature (4 phases)**
- Phase 1: Planning - /prd-check, /constraints, /think
- Phase 2: Implementation - /build-prd or /ralph-loop
- Phase 3: Quality - /verify, /security-scan (if auth), /review
- Phase 4: Integration - /commit, /handoff

**Architecture (3 phases)**
- Phase 1: Analysis - /think harder, Explore agent
- Phase 2: Design - /constraints, /design-prd
- Phase 3: Review - /review, /perspectives

---

## Step 5: Completion Criteria

Generate task-appropriate success criteria:

| Task Type | Completion Criteria |
|-----------|---------------------|
| Bug Fix | Bug no longer reproducible, regression test added, tests passing |
| Feature | Feature working, tests passing, code reviewed |
| Auth/Security | No security vulnerabilities, /security-scan passes |
| Refactor | Same behavior, better structure, tests passing |
| Information | Information gathered and reported |

---

## Step 6: Execution Protocol

### Confirmation Tiers
| Estimated Cost | Behavior |
|----------------|----------|
| < $1.00 | Show plan, ready to execute |
| $1.00 - $5.00 | Show "Execute this plan? [Y/n/modify]" |
| > $5.00 | Show "⚠️ HIGH COST - REQUIRE explicit confirmation" |

### Security Tasks
If task involves auth, security, payments, or encryption:
- Always recommend /security-scan
- Always ask for confirmation regardless of cost

---

## Output Format

For task: `$ARGUMENTS`

```
═══════════════════════════════════════════════════════════════
                    AGI TASK ANALYSIS
═══════════════════════════════════════════════════════════════

TASK: [user's task description]

COMPLEXITY BREAKDOWN ([total]/50 → [MODEL])
├── Decision Weight:    [X]/10  [matched keywords or "none"]
├── Technical Depth:    [X]/10  [matched keywords or "none"]
├── Scope Impact:       [X]/10  [matched keywords or "none"]
├── Ambiguity Level:    [X]/10  [matched keywords or "none"]
└── Time Estimation:    [X]/10  [matched keywords or "none"]

COST ESTIMATE: $[min]-[max] ([confidence]% confidence)
├── API calls:        $[amount]
├── Context overhead: $[amount]
└── Model: [Haiku/Sonnet/Opus]

═══════════════════════════════════════════════════════════════
                    ACTION PLAN
═══════════════════════════════════════════════════════════════

Phase 1: [Name] (~[X] min) - [Model]
├── Command: /[skill]
├── Purpose: [what this achieves]
└── Est: $[cost]

Phase 2: [Name] (~[X] min) - [Model]
├── Command: /[skill]
├── Purpose: [what this achieves]
└── Est: $[cost]

[Additional phases as needed...]

═══════════════════════════════════════════════════════════════
                    COMPLETION CRITERIA
═══════════════════════════════════════════════════════════════

✓ [Criterion 1]
✓ [Criterion 2]
✓ [Criterion 3]

═══════════════════════════════════════════════════════════════

[If cost < $1.00:]
Ready to execute. Type "go" or describe modifications.

[If cost $1.00-$5.00:]
Execute this plan? [Y/n/modify]

[If cost > $5.00:]
⚠️ HIGH COST ($[amount]) - Type "confirm" to proceed.
```

---

## Examples

### Example 1: Simple Task
**Input:** `/plan-task "fix typo in button label"`

**Expected Output:**
- Complexity: ~5/50 → HAIKU
- Cost: $0.002-0.005
- Phases: 1 (Quick fix → commit)
- No confirmation needed

### Example 2: Medium Task
**Input:** `/plan-task "add user profile page with avatar upload"`

**Expected Output:**
- Complexity: ~28/50 → SONNET
- Cost: $0.25-0.60
- Phases: 4 (Plan → Build → Test → Deploy)
- Confirmation: "Execute this plan? [Y/n/modify]"

### Example 3: Complex Task
**Input:** `/plan-task "design microservices authentication system"`

**Expected Output:**
- Complexity: ~42/50 → OPUS
- Cost: $2.50-5.00
- Phases: 5 (Analyze → Design → Implement → Security → Review)
- Confirmation: Required + security scan mandatory

---

**Now analyze the task and generate the plan.**
