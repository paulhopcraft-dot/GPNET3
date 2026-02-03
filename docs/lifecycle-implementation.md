# LIFECYCLE PLATFORM - Technical Implementation Plan

*Converting from WorkCover compliance → Employee Health Lifecycle*

## 🎯 CURRENT STATE ANALYSIS

### **Database Schema (shared/schema.ts):**
✅ **Strong Foundation:**
- Comprehensive case management structure
- Medical constraints & functional capacity tracking  
- Treatment plan management
- Compliance status tracking
- 174 active cases with rich data

❌ **Missing for Lifecycle:**
- Employee master records (hire-to-retire tracking)
- Pre-employment health assessments  
- Health risk scoring & predictions
- Employee-employer relationship mapping
- Lifecycle stage tracking

---

## 🏗️ DATABASE EXTENSIONS NEEDED

### **1. Employee Master Table**
```typescript
// New: employees table
export const employees = pgTable("employees", {
  id: varchar("id", { length: 255 }).primaryKey(),
  employerId: varchar("employer_id", { length: 255 }).references(() => employers.id),
  
  // Basic Info
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  
  // Employment Lifecycle
  hireDate: timestamp("hire_date").notNull(),
  currentRole: text("current_role"),
  department: text("department"),
  employmentStatus: varchar("employment_status", { length: 50 }) // active, terminated, on_leave
    .default("active"),
  terminationDate: timestamp("termination_date"),
  
  // Health Lifecycle Tracking
  lifecycleStage: varchar("lifecycle_stage", { length: 50 }) // pre_employment, active, exiting, exited
    .default("active"),
  healthRiskScore: numeric("health_risk_score", { precision: 3, scale: 1 }), // 0.0-10.0
  lastHealthAssessment: timestamp("last_health_assessment"),
  preEmploymentCompleted: boolean("pre_employment_completed").default(false),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### **2. Pre-Employment Assessments**
```typescript
// New: pre_employment_assessments table
export const preEmploymentAssessments = pgTable("pre_employment_assessments", {
  id: varchar("id", { length: 255 }).primaryKey(),
  employeeId: varchar("employee_id", { length: 255 }).references(() => employees.id),
  
  // Assessment Data
  assessmentDate: timestamp("assessment_date").notNull(),
  roleAppliedFor: text("role_applied_for").notNull(),
  
  // Health Screening Results
  physicalCapabilityScore: numeric("physical_capability_score", { precision: 3, scale: 1 }),
  medicalHistoryRiskScore: numeric("medical_history_risk_score", { precision: 3, scale: 1 }),
  jobFitScore: numeric("job_fit_score", { precision: 3, scale: 1 }),
  
  // Risk Factors
  previousInjuries: jsonb("previous_injuries"), // Structured injury history
  medicalConditions: jsonb("medical_conditions"), // Current conditions
  medications: jsonb("medications"), // Current medications
  
  // Recommendations
  recommendedForHire: boolean("recommended_for_hire"),
  recommendedAdjustments: text("recommended_adjustments"),
  followUpRequired: boolean("follow_up_required"),
  notes: text("notes"),
  
  // Legal Compliance
  consentGiven: boolean("consent_given").notNull(),
  gdprCompliant: boolean("gdpr_compliant").default(true),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### **3. Health Risk Predictions**
```typescript
// New: health_risk_predictions table  
export const healthRiskPredictions = pgTable("health_risk_predictions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  employeeId: varchar("employee_id", { length: 255 }).references(() => employees.id),
  
  // Prediction Data
  predictionDate: timestamp("prediction_date").notNull(),
  riskType: varchar("risk_type", { length: 100 }).notNull(), // back_injury, repetitive_strain, etc.
  riskScore: numeric("risk_score", { precision: 3, scale: 1 }).notNull(), // 0.0-10.0
  confidence: numeric("confidence", { precision: 3, scale: 1 }), // 0.0-1.0
  
  // Factors Contributing to Risk
  contributingFactors: jsonb("contributing_factors"),
  
  // Recommendations
  preventiveActions: jsonb("preventive_actions"),
  monitoringRequired: boolean("monitoring_required").default(false),
  
  // Model Info
  modelVersion: varchar("model_version", { length: 50 }),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### **4. Extend Cases Table**
```typescript
// Extend existing cases table with lifecycle context
ALTER TABLE cases ADD COLUMN employee_id VARCHAR(255) REFERENCES employees(id);
ALTER TABLE cases ADD COLUMN lifecycle_stage VARCHAR(50) DEFAULT 'employment';
ALTER TABLE cases ADD COLUMN pre_employment_link_id VARCHAR(255) REFERENCES pre_employment_assessments(id);
```

---

## 🎨 UI COMPONENT CHANGES NEEDED

### **1. New Dashboard Sections:**
```typescript
// client/src/pages/LifecycleDashboard.tsx
interface LifecycleDashboardProps {
  employerId: string;
}

// New sections:
// - Pre-Employment Pipeline 
// - Active Employee Health Monitoring
// - Risk Predictions & Alerts
// - Exit Documentation
```

### **2. Employee Master Management:**
```typescript
// client/src/pages/EmployeeManagement.tsx
// - Employee directory with health status
// - Lifecycle stage tracking
// - Risk score visualization
// - Health assessment scheduling
```

### **3. Pre-Employment Workflow:**
```typescript
// client/src/pages/PreEmploymentFlow.tsx
// - Assessment form with health screening
// - Job fit analysis
// - Recommendation generation
// - Hire/no-hire decision tracking
```

---

## 🔄 API ENDPOINTS TO ADD

### **Employee Management:**
```typescript
// server/src/routes/employees.ts
GET    /api/employees                    // List all employees
POST   /api/employees                    // Create new employee
GET    /api/employees/:id               // Get employee details
PUT    /api/employees/:id               // Update employee
DELETE /api/employees/:id               // Deactivate employee

GET    /api/employees/:id/health-history // Complete health timeline
GET    /api/employees/:id/risk-score     // Current risk assessment
POST   /api/employees/:id/assessment     // Schedule health assessment
```

### **Pre-Employment:**
```typescript
// server/src/routes/pre-employment.ts  
POST   /api/pre-employment/assessment    // Create pre-employment assessment
GET    /api/pre-employment/pending       // Get pending assessments
PUT    /api/pre-employment/:id/complete  // Complete assessment
GET    /api/pre-employment/analytics     // Assessment success rates
```

### **Risk Predictions:**
```typescript
// server/src/routes/predictions.ts
GET    /api/predictions/high-risk        // Get high-risk employees
POST   /api/predictions/calculate        // Trigger risk calculation
GET    /api/predictions/:employeeId      // Get employee predictions
PUT    /api/predictions/:id/action-taken // Mark preventive action taken
```

---

## 🧠 AI/ML INTEGRATION POINTS

### **1. Risk Scoring Engine:**
```typescript
// server/src/services/RiskScoringService.ts
class RiskScoringService {
  calculateEmployeeRiskScore(employee: Employee): Promise<RiskScore>
  predictInjuryLikelihood(employee: Employee, role: Role): Promise<Prediction>
  recommendPreventiveActions(riskFactors: RiskFactor[]): Prevention[]
}
```

### **2. Job Fit Analysis:**
```typescript
// server/src/services/JobFitService.ts
class JobFitService {
  analyzePhysicalCompatibility(health: HealthData, role: JobRequirements): FitScore
  identifyRiskFactors(health: HealthData, role: JobRequirements): RiskFactor[]
  generateRecommendations(fitAnalysis: FitAnalysis): Recommendation[]
}
```

---

## 📊 ANALYTICS & REPORTING

### **New Dashboard Metrics:**
```typescript
// Lifecycle KPIs:
interface LifecycleMetrics {
  // Pre-Employment
  assessmentsCompleted: number
  hireFitRate: number          // % hired who are good fit
  injuryRateByFitScore: number // Correlation validation
  
  // Active Employment  
  totalEmployees: number
  highRiskEmployees: number
  preventiveActionsActive: number
  injuryPreventionRate: number  // % predicted injuries prevented
  
  // Exit
  cleanExitsCompleted: number
  liabilityDocumentationRate: number
  
  // Revenue
  monthlyRecurring: number     // Employees × subscription rate
  retentionRate: number        // Employer retention
}
```

---

## 🚀 MIGRATION PLAN

### **Phase 1: Database Foundation (Week 1)**
- [ ] Create new employee tables
- [ ] Create pre-employment assessment tables  
- [ ] Create risk prediction tables
- [ ] Link existing cases to employees where possible

### **Phase 2: Basic UI (Week 2)**
- [ ] Employee management pages
- [ ] Pre-employment assessment forms
- [ ] Extended dashboard with lifecycle view

### **Phase 3: Intelligence Layer (Week 3)**
- [ ] Risk scoring algorithms
- [ ] Job fit analysis engine
- [ ] Predictive models (basic)

### **Phase 4: Full Platform (Week 4)**
- [ ] Complete workflow integration
- [ ] Advanced analytics
- [ ] Customer-facing documentation

---

## 💼 CUSTOMER MIGRATION

### **Current 174 Cases → Employee Records:**
```sql
-- Migration script to create employees from existing cases
INSERT INTO employees (id, employer_id, first_name, last_name, hire_date, lifecycle_stage)
SELECT 
  gen_random_uuid(),
  employer_id,
  SPLIT_PART(worker_name, ' ', 1) as first_name,
  SPLIT_PART(worker_name, ' ', 2) as last_name,
  injury_date - INTERVAL '6 months' as estimated_hire_date, -- Estimate
  'active' as lifecycle_stage
FROM cases 
WHERE worker_name IS NOT NULL;
```

### **Preserve Case History:**
- Link all existing cases to new employee records
- Maintain full audit trail
- No data loss during transition

---

## 🎯 SUCCESS METRICS

### **Technical:**
- [ ] Zero downtime migration
- [ ] All 174 cases linked to employees
- [ ] Sub-200ms API response times
- [ ] Mobile-responsive UI

### **Business:**
- [ ] 70%+ customer adoption of lifecycle features
- [ ] 10x revenue potential realized within 6 months
- [ ] Insurance partner integration completed

---

*This implementation transforms Preventli from a compliance tool into a predictive health intelligence platform while preserving all existing functionality.*