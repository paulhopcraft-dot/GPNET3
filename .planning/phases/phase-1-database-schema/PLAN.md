# Phase 1: Database Schema
**Phase:** 1 of 10
**Goal:** Create the data foundation for the RTW Planner Engine
**Requirements:** DB-01 to DB-10

## Analysis

### Existing Infrastructure
The following already exists in `shared/schema.ts`:
- `workerCases` - Main case table with `rtwPlanStatus`, `clinicalStatusJson`
- `medicalCertificates` - With `restrictions` JSONB field
- `organizations` - Multi-tenant isolation
- `users` - Authentication with roles
- `auditEvents` - Basic audit logging
- `MedicalConstraints` interface - Already defined but limited
- `FunctionalCapacity` interface - Already defined but limited
- `RTWPlanStatus` enum - Exists: `not_planned | planned_not_started | in_progress | working_well | failing | on_hold | completed`
- `TreatmentPlan` interface - Exists but focused on treatment, not RTW duties

### Gap Analysis
| Requirement | Status | Notes |
|-------------|--------|-------|
| DB-01: roles table | NEW | Need job roles per organization |
| DB-02: duties table | NEW | Need duties with modifiable flag |
| DB-03: duty_demands table | NEW | Physical + cognitive demand matrix |
| DB-04: demand frequency enum | NEW | Never/Occasionally/Frequently/Constantly |
| DB-05: rtw_plans table | NEW | Formal RTW plans (not TreatmentPlan) |
| DB-06: rtw_plan_versions table | NEW | Version control for plans |
| DB-07: rtw_plan_duties table | NEW | Plan-duty assignments |
| DB-08: rtw_plan_schedule table | NEW | Week-by-week schedule |
| DB-09: rtw_approvals table | NEW | Manager approval workflow |
| DB-10: rtw_audit_log | EXTEND | Extend existing auditEvents |

## Implementation Plan

### Step 1: Define TypeScript Enums and Interfaces
**File:** `shared/schema.ts` (add near line 50)

```typescript
// =====================================================
// RTW Planner Engine - Job Roles & Duties
// =====================================================

// Demand frequency for physical/cognitive requirements
export type DemandFrequency = "never" | "occasionally" | "frequently" | "constantly";

// Physical demand categories (per requirement)
export type PhysicalDemandCategory =
  | "bending"
  | "squatting"
  | "kneeling"
  | "twisting"
  | "reaching_overhead"
  | "reaching_forward"
  | "lifting"
  | "carrying"
  | "standing"
  | "sitting"
  | "walking"
  | "repetitive_movements";

// Cognitive demand categories
export type CognitiveDemandCategory =
  | "concentration"
  | "stress_tolerance"
  | "work_pace";

// Duty suitability based on matrix evaluation
export type DutySuitability = "suitable" | "suitable_with_modification" | "not_suitable";

// RTW Plan types
export type RTWPlanType = "normal_hours" | "partial_hours" | "graduated_return";

// RTW Plan approval status
export type RTWApprovalStatus = "draft" | "pending" | "approved" | "rejected" | "modification_requested";

// Physical demands structure for a duty (matches medical certificate format)
export interface DutyPhysicalDemands {
  // Core physical functions (from Bridge Street Clinic format)
  sitting: DemandFrequency;
  standingWalking: DemandFrequency;
  bending: DemandFrequency;
  squatting: DemandFrequency;
  kneelingClimbing: DemandFrequency;
  twisting: DemandFrequency;
  reachingOverhead: DemandFrequency;
  reachingForward: DemandFrequency;
  neckMovement: DemandFrequency;

  // Lifting/carrying with weight limits
  lifting: DemandFrequency;
  liftingMaxKg?: number;
  carrying: DemandFrequency;
  carryingMaxKg?: number;

  // Additional
  pushing: DemandFrequency;
  pulling: DemandFrequency;
  repetitiveMovements: DemandFrequency;
  useOfInjuredLimb: DemandFrequency;
}

// Cognitive demands structure for a duty
export interface DutyCognitiveDemands {
  concentration: DemandFrequency;
  stressTolerance: DemandFrequency;
  workPace: DemandFrequency;
}

// Medical restriction capability (from medical certificates)
export type RestrictionCapability = "can" | "with_modifications" | "cannot" | "not_assessed";

// Functional restrictions from medical certificate (CAN/WITH MODS/CANNOT matrix)
export interface FunctionalRestrictions {
  sitting: RestrictionCapability;
  standingWalking: RestrictionCapability;
  bending: RestrictionCapability;
  squatting: RestrictionCapability;
  kneelingClimbing: RestrictionCapability;
  twisting: RestrictionCapability;
  reachingOverhead: RestrictionCapability;
  reachingForward: RestrictionCapability;
  neckMovement: RestrictionCapability;
  lifting: RestrictionCapability;
  liftingMaxKg?: number;
  carrying: RestrictionCapability;
  carryingMaxKg?: number;
  pushing: RestrictionCapability;
  pulling: RestrictionCapability;
  repetitiveMovements: RestrictionCapability;
  useOfInjuredLimb: RestrictionCapability;

  // Exercise and rest requirements (from medical certs)
  exerciseMinutesPerHour?: number;
  restMinutesPerHour?: number;

  // Duration and review
  constraintDurationWeeks?: number;
  nextExaminationDate?: string;
}
```

### Step 2: Create roles Table
**Migration file:** `migrations/0010_rtw_roles.sql`

```sql
CREATE TABLE rtw_roles (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

CREATE INDEX idx_rtw_roles_org ON rtw_roles(organization_id);
```

**Drizzle schema:**
```typescript
export const rtwRoles = pgTable("rtw_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Step 3: Create duties Table
**Migration file:** `migrations/0011_rtw_duties.sql`

```sql
CREATE TABLE rtw_duties (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id VARCHAR NOT NULL REFERENCES rtw_roles(id) ON DELETE CASCADE,
  organization_id VARCHAR NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  is_modifiable BOOLEAN NOT NULL DEFAULT false,
  risk_flags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rtw_duties_role ON rtw_duties(role_id);
CREATE INDEX idx_rtw_duties_org ON rtw_duties(organization_id);
```

**Drizzle schema:**
```typescript
export const rtwDuties = pgTable("rtw_duties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roleId: varchar("role_id").notNull().references(() => rtwRoles.id, { onDelete: "cascade" }),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  isModifiable: boolean("is_modifiable").notNull().default(false),
  riskFlags: text("risk_flags").array().default(sql`ARRAY[]::text[]`),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Step 4: Create duty_demands Table
**Migration file:** `migrations/0012_rtw_duty_demands.sql`

```sql
CREATE TABLE rtw_duty_demands (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  duty_id VARCHAR NOT NULL REFERENCES rtw_duties(id) ON DELETE CASCADE,

  -- Physical demands (Never/Occasionally/Frequently/Constantly)
  bending VARCHAR NOT NULL DEFAULT 'never',
  squatting VARCHAR NOT NULL DEFAULT 'never',
  kneeling VARCHAR NOT NULL DEFAULT 'never',
  twisting VARCHAR NOT NULL DEFAULT 'never',
  reaching_overhead VARCHAR NOT NULL DEFAULT 'never',
  reaching_forward VARCHAR NOT NULL DEFAULT 'never',
  lifting VARCHAR NOT NULL DEFAULT 'never',
  lifting_max_kg INTEGER,
  carrying VARCHAR NOT NULL DEFAULT 'never',
  carrying_max_kg INTEGER,
  standing VARCHAR NOT NULL DEFAULT 'never',
  sitting VARCHAR NOT NULL DEFAULT 'never',
  walking VARCHAR NOT NULL DEFAULT 'never',
  repetitive_movements VARCHAR NOT NULL DEFAULT 'never',

  -- Cognitive demands
  concentration VARCHAR NOT NULL DEFAULT 'never',
  stress_tolerance VARCHAR NOT NULL DEFAULT 'never',
  work_pace VARCHAR NOT NULL DEFAULT 'never',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(duty_id)
);

CREATE INDEX idx_rtw_duty_demands_duty ON rtw_duty_demands(duty_id);
```

**Drizzle schema:**
```typescript
export const rtwDutyDemands = pgTable("rtw_duty_demands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dutyId: varchar("duty_id").notNull().references(() => rtwDuties.id, { onDelete: "cascade" }).unique(),

  // Physical demands
  bending: varchar("bending").notNull().default("never"),
  squatting: varchar("squatting").notNull().default("never"),
  kneeling: varchar("kneeling").notNull().default("never"),
  twisting: varchar("twisting").notNull().default("never"),
  reachingOverhead: varchar("reaching_overhead").notNull().default("never"),
  reachingForward: varchar("reaching_forward").notNull().default("never"),
  lifting: varchar("lifting").notNull().default("never"),
  liftingMaxKg: integer("lifting_max_kg"),
  carrying: varchar("carrying").notNull().default("never"),
  carryingMaxKg: integer("carrying_max_kg"),
  standing: varchar("standing").notNull().default("never"),
  sitting: varchar("sitting").notNull().default("never"),
  walking: varchar("walking").notNull().default("never"),
  repetitiveMovements: varchar("repetitive_movements").notNull().default("never"),

  // Cognitive demands
  concentration: varchar("concentration").notNull().default("never"),
  stressTolerance: varchar("stress_tolerance").notNull().default("never"),
  workPace: varchar("work_pace").notNull().default("never"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Step 5: Create rtw_plans Table
**Migration file:** `migrations/0013_rtw_plans.sql`

```sql
CREATE TABLE rtw_plans (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR NOT NULL REFERENCES organizations(id),
  case_id VARCHAR NOT NULL REFERENCES worker_cases(id) ON DELETE CASCADE,
  worker_id VARCHAR, -- Optional link to worker record
  role_id VARCHAR REFERENCES rtw_roles(id),

  -- Plan metadata
  plan_type VARCHAR NOT NULL DEFAULT 'graduated_return', -- normal_hours, partial_hours, graduated_return
  status VARCHAR NOT NULL DEFAULT 'draft', -- draft, pending, approved, rejected, modification_requested
  version INTEGER NOT NULL DEFAULT 1,

  -- Dates
  start_date DATE,
  target_end_date DATE,
  restriction_review_date DATE,

  -- Creator info
  created_by VARCHAR NOT NULL REFERENCES users(id),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rtw_plans_case ON rtw_plans(case_id);
CREATE INDEX idx_rtw_plans_org ON rtw_plans(organization_id);
CREATE INDEX idx_rtw_plans_status ON rtw_plans(status);
```

**Drizzle schema:**
```typescript
export const rtwPlans = pgTable("rtw_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  caseId: varchar("case_id").notNull().references(() => workerCases.id, { onDelete: "cascade" }),
  workerId: varchar("worker_id"),
  roleId: varchar("role_id").references(() => rtwRoles.id),

  planType: varchar("plan_type").notNull().default("graduated_return"),
  status: varchar("status").notNull().default("draft"),
  version: integer("version").notNull().default(1),

  startDate: timestamp("start_date"),
  targetEndDate: timestamp("target_end_date"),
  restrictionReviewDate: timestamp("restriction_review_date"),

  createdBy: varchar("created_by").notNull().references(() => users.id),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Step 6: Create rtw_plan_versions Table
**Migration file:** `migrations/0014_rtw_plan_versions.sql`

```sql
CREATE TABLE rtw_plan_versions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id VARCHAR NOT NULL REFERENCES rtw_plans(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,

  -- Snapshot of plan data at this version
  data_json JSONB NOT NULL,

  -- Who created this version
  created_by VARCHAR NOT NULL REFERENCES users(id),
  change_reason TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(plan_id, version)
);

CREATE INDEX idx_rtw_plan_versions_plan ON rtw_plan_versions(plan_id);
```

**Drizzle schema:**
```typescript
export const rtwPlanVersions = pgTable("rtw_plan_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").notNull().references(() => rtwPlans.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  dataJson: jsonb("data_json").notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  changeReason: text("change_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### Step 7: Create rtw_plan_duties Table
**Migration file:** `migrations/0015_rtw_plan_duties.sql`

```sql
CREATE TABLE rtw_plan_duties (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_version_id VARCHAR NOT NULL REFERENCES rtw_plan_versions(id) ON DELETE CASCADE,
  duty_id VARCHAR NOT NULL REFERENCES rtw_duties(id),

  -- Suitability assessment
  suitability VARCHAR NOT NULL, -- suitable, suitable_with_modification, not_suitable
  modification_notes TEXT,
  excluded_reason TEXT,

  -- Manual override
  manually_overridden BOOLEAN DEFAULT false,
  override_reason TEXT,
  overridden_by VARCHAR REFERENCES users(id),

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rtw_plan_duties_version ON rtw_plan_duties(plan_version_id);
CREATE INDEX idx_rtw_plan_duties_duty ON rtw_plan_duties(duty_id);
```

**Drizzle schema:**
```typescript
export const rtwPlanDuties = pgTable("rtw_plan_duties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planVersionId: varchar("plan_version_id").notNull().references(() => rtwPlanVersions.id, { onDelete: "cascade" }),
  dutyId: varchar("duty_id").notNull().references(() => rtwDuties.id),
  suitability: varchar("suitability").notNull(),
  modificationNotes: text("modification_notes"),
  excludedReason: text("excluded_reason"),
  manuallyOverridden: boolean("manually_overridden").default(false),
  overrideReason: text("override_reason"),
  overriddenBy: varchar("overridden_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### Step 8: Create rtw_plan_schedule Table
**Migration file:** `migrations/0016_rtw_plan_schedule.sql`

```sql
CREATE TABLE rtw_plan_schedule (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_version_id VARCHAR NOT NULL REFERENCES rtw_plan_versions(id) ON DELETE CASCADE,

  week_number INTEGER NOT NULL,
  hours_per_day NUMERIC(4,2) NOT NULL,
  days_per_week INTEGER NOT NULL,

  -- Which duties apply this week (array of duty IDs)
  duties_json JSONB DEFAULT '[]'::jsonb,

  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(plan_version_id, week_number)
);

CREATE INDEX idx_rtw_plan_schedule_version ON rtw_plan_schedule(plan_version_id);
```

**Drizzle schema:**
```typescript
export const rtwPlanSchedule = pgTable("rtw_plan_schedule", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planVersionId: varchar("plan_version_id").notNull().references(() => rtwPlanVersions.id, { onDelete: "cascade" }),
  weekNumber: integer("week_number").notNull(),
  hoursPerDay: numeric("hours_per_day", { precision: 4, scale: 2 }).notNull(),
  daysPerWeek: integer("days_per_week").notNull(),
  dutiesJson: jsonb("duties_json").default(sql`'[]'::jsonb`),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### Step 9: Create rtw_approvals Table
**Migration file:** `migrations/0017_rtw_approvals.sql`

```sql
CREATE TABLE rtw_approvals (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_version_id VARCHAR NOT NULL REFERENCES rtw_plan_versions(id) ON DELETE CASCADE,

  approver_id VARCHAR NOT NULL REFERENCES users(id),
  status VARCHAR NOT NULL, -- approved, rejected, modification_requested

  -- Rejection/modification details
  reason TEXT,
  modification_comments TEXT,

  -- Email notification tracking
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rtw_approvals_version ON rtw_approvals(plan_version_id);
CREATE INDEX idx_rtw_approvals_approver ON rtw_approvals(approver_id);
CREATE INDEX idx_rtw_approvals_status ON rtw_approvals(status);
```

**Drizzle schema:**
```typescript
export const rtwApprovals = pgTable("rtw_approvals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planVersionId: varchar("plan_version_id").notNull().references(() => rtwPlanVersions.id, { onDelete: "cascade" }),
  approverId: varchar("approver_id").notNull().references(() => users.id),
  status: varchar("status").notNull(),
  reason: text("reason"),
  modificationComments: text("modification_comments"),
  notificationSent: boolean("notification_sent").default(false),
  notificationSentAt: timestamp("notification_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### Step 10: Extend Audit Events
The existing `auditEvents` table can be used for RTW audit logging. Add new event types:

```typescript
// Add to existing eventType values:
// - rtw_plan_created
// - rtw_plan_updated
// - rtw_plan_submitted
// - rtw_plan_approved
// - rtw_plan_rejected
// - rtw_plan_modification_requested
// - rtw_duty_override
// - rtw_role_created
// - rtw_role_updated
// - rtw_duty_created
// - rtw_duty_updated
```

## Success Criteria

| Criteria | Validation Method |
|----------|-------------------|
| All tables created with proper relationships | `npm run db:push` succeeds |
| Migrations run successfully | No errors in migration output |
| Foreign keys enforce referential integrity | Test cascading deletes |
| Demand frequency enum works correctly | Insert test data with all frequency values |
| Audit log captures RTW entity types | Create RTW plan and verify audit entry |

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `shared/schema.ts` | MODIFY | Add RTW types, interfaces, and table definitions |
| `migrations/0010_rtw_roles.sql` | CREATE | Roles table migration |
| `migrations/0011_rtw_duties.sql` | CREATE | Duties table migration |
| `migrations/0012_rtw_duty_demands.sql` | CREATE | Duty demands table migration |
| `migrations/0013_rtw_plans.sql` | CREATE | RTW plans table migration |
| `migrations/0014_rtw_plan_versions.sql` | CREATE | Plan versions table migration |
| `migrations/0015_rtw_plan_duties.sql` | CREATE | Plan duties table migration |
| `migrations/0016_rtw_plan_schedule.sql` | CREATE | Plan schedule table migration |
| `migrations/0017_rtw_approvals.sql` | CREATE | Approvals table migration |

## Dependencies

- None (foundation phase)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Migration conflicts with existing schema | Use sequential migration numbers (0010+) |
| Performance on large duty_demands queries | Add appropriate indexes from start |
| JSONB data validation | Use Zod schemas for runtime validation |

---
*Plan created: 2026-01-25*
*Ready for execution*
