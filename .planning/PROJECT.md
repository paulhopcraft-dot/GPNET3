# RTW Planner Engine

## What This Is

A Return-to-Work Planning Engine for Preventli that transforms medical restrictions and job duties into manager-approvable RTW plans. Not HR paperwork — claims ops software that algorithmically matches constraints against duties and generates graduated return plans with full audit trails.

## Core Value

**Automatically generate legally-defensible RTW plans from structured medical constraints and job duty data** — eliminating subjective decision-making and protecting employers from disputes.

## Requirements

### Validated

- ✓ Medical certificates with structured restrictions — existing
- ✓ Case management system — existing
- ✓ Employer portal with authentication — existing

### Active

**Module 1: Job Role & Duties Database**
- [ ] Create/edit organisation roles (e.g., Warehouse Supervisor)
- [ ] Define duties per role with physical/cognitive demands
- [ ] Mark duties as modifiable or fixed
- [ ] Store demand profiles: lifting limits, standing tolerance, cognitive load
- [ ] Admin UI for managing roles and duties

**Module 2: Functional Ability Matrix**
- [ ] Compare medical restrictions vs duty requirements
- [ ] Output per duty: Suitable / Suitable with modification / Not suitable
- [ ] Scoring engine for constraint matching
- [ ] Handle partial matches and edge cases

**Module 3: RTW Plan Generator**
- [ ] Auto-select plan type: Normal hours / Partial hours / Graduated return
- [ ] Generate week-by-week schedules based on restrictions
- [ ] Apply rules engine (not free text)
- [ ] Include suitable duties, exclude unsuitable ones

**Module 4: Email Output**
- [ ] Auto-generate manager-ready email from plan
- [ ] Include worker details, constraints, proposed duties, hours
- [ ] Editable only before approval
- [ ] Professional formatting

**Module 5: Manager Approval Workflow**
- [ ] Approve as-is
- [ ] Request modification (tracked)
- [ ] Reject with mandatory reason
- [ ] No plan active without approval
- [ ] Version control — changes create new versions, old immutable

**Module 6: Audit Trail**
- [ ] Log all decisions and changes
- [ ] Timestamp and user attribution
- [ ] Immutable history for legal protection

### Out of Scope

- Predictive recovery timelines — v2 feature
- AI-powered plan recommendations — v2 feature
- Multi-jurisdiction compliance rules — defer to v2
- Mobile app — web-first
- Direct doctor integration/API — manual cert upload sufficient for v1

## Context

**Existing system:**
- Preventli already has medical certificates with structured restrictions
- Employer portal exists with role-based auth
- Case management system tracks workers and injuries
- Dashboard shows "RTW plan required" actions but no actual planner

**Technical environment:**
- React 18 + TypeScript + Vite frontend
- Express.js + TypeScript backend
- PostgreSQL + Drizzle ORM
- Existing patterns in codebase for CRUD, forms, validation

**Why this matters:**
- High switching costs once duties loaded (competitive moat)
- Clear ROI: faster RTW, fewer disputes
- Compliance-aligned without being compliance-heavy

## Constraints

- **Tech stack**: Must use existing React/Express/PostgreSQL stack
- **Data model**: Must integrate with existing cases, workers, certificates
- **Auth**: Must respect existing employer/admin role permissions
- **Audit**: All plan changes must be immutable and timestamped

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Duties DB from scratch | No existing duty data; need proper structure | — Pending |
| Full system for v1 | Partial system not useful; need end-to-end flow | — Pending |
| Rules engine not AI | Deterministic matching more defensible legally | — Pending |

---
*Last updated: 2026-01-25 after initialization*
