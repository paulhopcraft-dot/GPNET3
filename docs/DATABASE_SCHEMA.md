# Employee Health Lifecycle Platform - Database Schema

**Strategic Foundation**: Longitudinal health data creates unbreachable competitive moat

**Design Principles**:
- Complete employee health journey tracking (hire → work → retire)
- Predictive analytics through rich data relationships
- Legal compliance and audit trail requirements
- Scalable architecture for enterprise deployment

---

## 🏗️ Schema Overview

### Core Entity Relationships

```
Organizations
    │
    ├── Employee Lifecycles
    │   ├── Pre-Employment Assessments
    │   │   ├── Health Requirements
    │   │   ├── Assessment Components
    │   │   └── Screening Results
    │   │
    │   ├── Employment Phase (existing RTW system)
    │   │   ├── Worker Cases
    │   │   ├── Medical Certificates
    │   │   ├── RTW Plans
    │   │   └── Compliance Data
    │   │
    │   └── Exit Assessments
    │       ├── Final Documentation
    │       ├── Liability Closure
    │       └── Health Certification
    │
    ├── Predictive Analytics
    │   ├── Risk Models
    │   ├── Industry Benchmarks
    │   └── Cost Analytics
    │
    └── Memory System
        ├── Strategic Decisions
        ├── Technical Learnings
        └── Session Context
```

---

## 📊 Core Tables

### Employee Lifecycle Management

```sql
-- Central employee lifecycle tracking
CREATE TABLE employee_lifecycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_external_id VARCHAR(255) NOT NULL, -- From HR system
    employee_name VARCHAR(255) NOT NULL,
    hire_date DATE NOT NULL,
    exit_date DATE NULL,
    current_stage VARCHAR(50) NOT NULL CHECK (current_stage IN (
        'pre_employment', 'employment', 'exit_processing', 'exited'
    )),
    position_title VARCHAR(255),
    department VARCHAR(255),
    manager_email VARCHAR(255),
    lifecycle_metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(organization_id, employee_external_id)
);

-- Index for performance
CREATE INDEX idx_employee_lifecycles_org_stage ON employee_lifecycles(organization_id, current_stage);
CREATE INDEX idx_employee_lifecycles_hire_date ON employee_lifecycles(hire_date);
```

---

## 🔍 Pre-Employment Module

### Health Requirements & Assessments

```sql
-- Position-specific health requirements
CREATE TABLE pre_employment_health_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    position_title VARCHAR(255) NOT NULL,
    department VARCHAR(255),

    -- Physical demands (from existing RTW duty demands structure)
    lifting_max_kg INTEGER,
    standing_hours_max INTEGER,
    sitting_hours_max INTEGER,
    walking_distance_max INTEGER,
    bending_frequency VARCHAR(20) CHECK (bending_frequency IN ('never', 'occasionally', 'frequently', 'constantly')),
    reaching_overhead_frequency VARCHAR(20) CHECK (reaching_overhead_frequency IN ('never', 'occasionally', 'frequently', 'constantly')),
    repetitive_movements_frequency VARCHAR(20),

    -- Cognitive demands
    concentration_level VARCHAR(20) CHECK (concentration_level IN ('low', 'medium', 'high', 'critical')),
    stress_tolerance VARCHAR(20) CHECK (stress_tolerance IN ('low', 'medium', 'high')),
    multitasking_required BOOLEAN DEFAULT FALSE,

    -- Environmental factors
    noise_exposure VARCHAR(20),
    chemical_exposure BOOLEAN DEFAULT FALSE,
    height_work BOOLEAN DEFAULT FALSE,
    outdoor_work BOOLEAN DEFAULT FALSE,

    -- Legal requirements
    medical_clearance_required BOOLEAN DEFAULT TRUE,
    drug_testing_required BOOLEAN DEFAULT FALSE,
    vision_requirements VARCHAR(100),
    hearing_requirements VARCHAR(100),

    requirements_json JSONB, -- Additional structured requirements
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(organization_id, position_title, department)
);

-- Pre-employment assessments
CREATE TABLE pre_employment_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_lifecycle_id UUID NOT NULL REFERENCES employee_lifecycles(id) ON DELETE CASCADE,
    health_requirements_id UUID NOT NULL REFERENCES pre_employment_health_requirements(id),

    -- Assessment metadata
    assessment_date DATE NOT NULL,
    assessor_type VARCHAR(50) NOT NULL CHECK (assessor_type IN ('occupational_physician', 'nurse', 'physiotherapist', 'automated')),
    assessor_name VARCHAR(255),
    assessment_location VARCHAR(255),

    -- Health baseline data
    height_cm INTEGER,
    weight_kg INTEGER,
    bmi DECIMAL(4,2),
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    resting_heart_rate INTEGER,

    -- Functional capacity
    lifting_capacity_kg INTEGER,
    grip_strength_kg INTEGER,
    flexibility_score INTEGER, -- 1-10 scale
    cardiovascular_fitness VARCHAR(20) CHECK (cardiovascular_fitness IN ('poor', 'fair', 'good', 'excellent')),

    -- Medical history flags
    previous_back_injury BOOLEAN DEFAULT FALSE,
    previous_shoulder_injury BOOLEAN DEFAULT FALSE,
    chronic_conditions JSONB, -- Array of conditions
    medications JSONB, -- Array of medications
    allergies JSONB, -- Array of allergies

    -- Risk assessment
    overall_risk_score DECIMAL(5,2), -- 0-100 scale
    job_fitness_percentage DECIMAL(5,2), -- 0-100 compatibility
    risk_factors JSONB, -- Array of identified risks

    -- Clearance decision
    clearance_status VARCHAR(30) NOT NULL CHECK (clearance_status IN (
        'cleared', 'cleared_with_restrictions', 'not_cleared', 'pending_review'
    )),
    restrictions_json JSONB, -- If cleared with restrictions
    clearance_notes TEXT,
    review_required_date DATE,

    -- Legal documentation
    consent_obtained BOOLEAN DEFAULT FALSE,
    privacy_disclosure_signed BOOLEAN DEFAULT FALSE,
    assessment_report_url VARCHAR(500),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Assessment components (detailed test results)
CREATE TABLE pre_employment_assessment_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES pre_employment_assessments(id) ON DELETE CASCADE,

    component_type VARCHAR(50) NOT NULL CHECK (component_type IN (
        'physical_capacity', 'medical_examination', 'drug_screen', 'vision_test',
        'hearing_test', 'psychological_assessment', 'job_simulation'
    )),
    component_name VARCHAR(255) NOT NULL,

    -- Results
    result_status VARCHAR(30) NOT NULL CHECK (result_status IN ('pass', 'fail', 'conditional', 'pending')),
    result_value VARCHAR(255), -- Numeric or text result
    result_units VARCHAR(50), -- kg, seconds, percentage, etc.
    result_details JSONB, -- Structured result data

    -- Assessor
    performed_by VARCHAR(255),
    performed_date DATE NOT NULL,
    equipment_used VARCHAR(255),

    -- Quality assurance
    verified_by VARCHAR(255),
    verification_date DATE,
    notes TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

-- Health history tracking
CREATE TABLE pre_employment_health_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES pre_employment_assessments(id) ON DELETE CASCADE,

    -- Previous employment health
    previous_workplace_injuries JSONB, -- Array of injury records
    workers_comp_claims JSONB, -- Previous claims history
    lost_time_injuries JSONB, -- LTI history

    -- Medical history
    surgical_history JSONB, -- Previous surgeries
    hospitalization_history JSONB, -- Hospital admissions
    specialist_treatments JSONB, -- Ongoing treatments

    -- Family health history (if relevant for genetic risks)
    family_history_relevant JSONB,

    -- Lifestyle factors
    smoking_status VARCHAR(20) CHECK (smoking_status IN ('never', 'former', 'current')),
    alcohol_consumption VARCHAR(20) CHECK (alcohol_consumption IN ('none', 'light', 'moderate', 'heavy')),
    exercise_frequency VARCHAR(20) CHECK (exercise_frequency IN ('none', 'occasional', 'regular', 'intensive')),

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 💼 Employment Module (Enhanced Existing)

### Enhanced Worker Cases

```sql
-- Add lifecycle integration to existing worker_cases table
ALTER TABLE worker_cases
ADD COLUMN employee_lifecycle_id UUID REFERENCES employee_lifecycles(id);

-- Add predictive analytics fields
ALTER TABLE worker_cases
ADD COLUMN predictive_risk_score DECIMAL(5,2), -- AI-generated risk score
ADD COLUMN injury_probability_6_months DECIMAL(5,2), -- 6-month injury probability
ADD COLUMN rtw_success_probability DECIMAL(5,2), -- RTW success likelihood
ADD COLUMN cost_prediction_total DECIMAL(12,2), -- Predicted total cost
ADD COLUMN intervention_recommendations JSONB, -- AI-suggested interventions
ADD COLUMN benchmark_comparison JSONB; -- Industry comparison data

-- Predictive analytics tracking
CREATE TABLE employment_risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_lifecycle_id UUID NOT NULL REFERENCES employee_lifecycles(id),
    worker_case_id UUID REFERENCES worker_cases(id), -- NULL for ongoing assessments

    assessment_date DATE NOT NULL,
    assessment_type VARCHAR(30) NOT NULL CHECK (assessment_type IN (
        'routine', 'post_incident', 'annual_review', 'role_change', 'return_to_work'
    )),

    -- Risk scoring
    injury_risk_score DECIMAL(5,2) NOT NULL, -- 0-100
    risk_factors JSONB NOT NULL, -- Array of contributing factors
    risk_calculation_details JSONB, -- Model inputs and logic

    -- Predictions
    injury_probability_30_days DECIMAL(5,2),
    injury_probability_90_days DECIMAL(5,2),
    injury_probability_365_days DECIMAL(5,2),
    likely_injury_types JSONB, -- Array of probable injury types

    -- Recommendations
    preventive_interventions JSONB, -- Suggested prevention measures
    monitoring_frequency VARCHAR(20), -- How often to reassess
    escalation_triggers JSONB, -- Conditions requiring immediate action

    -- Model metadata
    model_version VARCHAR(20),
    confidence_score DECIMAL(5,2),
    model_inputs_hash VARCHAR(255), -- For reproducibility

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🚪 Exit Module

### Exit Assessments & Documentation

```sql
-- Exit health assessments
CREATE TABLE exit_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_lifecycle_id UUID NOT NULL REFERENCES employee_lifecycles(id) ON DELETE CASCADE,

    -- Exit metadata
    exit_date DATE NOT NULL,
    exit_reason VARCHAR(50) CHECK (exit_reason IN (
        'resignation', 'termination', 'retirement', 'redundancy', 'end_contract'
    )),
    final_work_date DATE,
    notice_period_days INTEGER,

    -- Assessment details
    assessment_date DATE NOT NULL,
    assessor_type VARCHAR(50) NOT NULL CHECK (assessor_type IN ('occupational_physician', 'nurse', 'hr_representative')),
    assessor_name VARCHAR(255),

    -- Health status at exit
    current_health_status VARCHAR(30) CHECK (current_health_status IN ('excellent', 'good', 'fair', 'poor')),
    active_health_issues JSONB, -- Current health problems
    ongoing_treatments JSONB, -- Continuing medical care
    work_related_conditions JSONB, -- Conditions related to employment

    -- Fitness comparison (vs pre-employment)
    pre_employment_comparison JSONB, -- Health changes during employment
    fitness_deterioration JSONB, -- Any decline in health/fitness
    fitness_improvement JSONB, -- Any improvement in health/fitness

    -- Workplace exposure summary
    total_exposure_summary JSONB, -- Chemicals, noise, repetitive work, etc.
    injury_history_summary JSONB, -- All workplace injuries during employment
    workers_comp_claims_summary JSONB, -- Claims filed during employment

    -- Documentation
    medical_clearance_provided BOOLEAN DEFAULT FALSE,
    fitness_for_future_work VARCHAR(30), -- Assessment for future employment
    restrictions_for_future_work JSONB, -- Any lasting restrictions

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Final health documentation
CREATE TABLE exit_health_documentation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exit_assessment_id UUID NOT NULL REFERENCES exit_assessments(id) ON DELETE CASCADE,

    -- Documentation types
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
        'medical_summary', 'fitness_certificate', 'exposure_record', 'liability_release'
    )),
    document_title VARCHAR(255) NOT NULL,

    -- Document content
    document_content TEXT, -- Full text content
    document_data JSONB, -- Structured data
    document_url VARCHAR(500), -- File storage location

    -- Legal status
    legal_review_required BOOLEAN DEFAULT TRUE,
    legal_review_completed BOOLEAN DEFAULT FALSE,
    legal_reviewer VARCHAR(255),
    legal_review_date DATE,
    legal_notes TEXT,

    -- Employee acknowledgment
    employee_acknowledgment_required BOOLEAN DEFAULT TRUE,
    employee_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledgment_date DATE,
    acknowledgment_method VARCHAR(50), -- email, physical_signature, digital_signature

    created_at TIMESTAMP DEFAULT NOW()
);

-- Liability closure tracking
CREATE TABLE liability_closure_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_lifecycle_id UUID NOT NULL REFERENCES employee_lifecycles(id) ON DELETE CASCADE,
    exit_assessment_id UUID NOT NULL REFERENCES exit_assessments(id),

    -- Closure status
    closure_status VARCHAR(30) NOT NULL CHECK (closure_status IN (
        'pending', 'documentation_complete', 'legal_review', 'closed', 'disputed'
    )),
    closure_date DATE,

    -- Legal protection
    statute_limitations_date DATE, -- When claims can no longer be filed
    liability_exposure_assessment JSONB, -- Risk of future claims
    insurance_notification_sent BOOLEAN DEFAULT FALSE,
    insurance_notification_date DATE,

    -- Documentation completeness
    medical_documentation_complete BOOLEAN DEFAULT FALSE,
    exposure_documentation_complete BOOLEAN DEFAULT FALSE,
    injury_documentation_complete BOOLEAN DEFAULT FALSE,
    training_documentation_complete BOOLEAN DEFAULT FALSE,

    -- Follow-up requirements
    follow_up_medical_required BOOLEAN DEFAULT FALSE,
    follow_up_medical_date DATE,
    follow_up_legal_required BOOLEAN DEFAULT FALSE,
    follow_up_legal_date DATE,

    -- Notes
    closure_notes TEXT,
    legal_counsel_consulted BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🧠 Analytics & Intelligence

### Predictive Models & Benchmarking

```sql
-- Industry benchmarking data
CREATE TABLE industry_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Industry classification
    industry_code VARCHAR(20) NOT NULL, -- ANZSIC code
    industry_name VARCHAR(255) NOT NULL,
    sub_industry VARCHAR(255),

    -- Benchmark period
    benchmark_year INTEGER NOT NULL,
    benchmark_quarter INTEGER CHECK (benchmark_quarter BETWEEN 1 AND 4),
    data_source VARCHAR(100), -- WorkSafe Victoria, Safe Work Australia, etc.

    -- Injury statistics
    injury_frequency_rate DECIMAL(8,4), -- Injuries per 1M hours worked
    lost_time_injury_frequency_rate DECIMAL(8,4),
    workers_comp_premium_rate DECIMAL(8,4),
    average_claim_cost DECIMAL(12,2),

    -- Cost metrics
    average_cost_per_employee DECIMAL(12,2),
    prevention_cost_per_employee DECIMAL(12,2),
    roi_prevention_programs DECIMAL(8,4),

    -- Risk factors
    common_injury_types JSONB, -- Array of most frequent injuries
    high_risk_job_categories JSONB,
    seasonal_risk_patterns JSONB,

    -- Benchmarking metadata
    data_quality_score INTEGER CHECK (data_quality_score BETWEEN 1 AND 5),
    sample_size INTEGER,
    confidence_interval DECIMAL(5,2),

    created_at TIMESTAMP DEFAULT NOW()
);

-- Predictive model results
CREATE TABLE predictive_analytics_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_lifecycle_id UUID NOT NULL REFERENCES employee_lifecycles(id),

    -- Model identification
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(20) NOT NULL,
    prediction_date DATE NOT NULL,
    prediction_horizon_days INTEGER NOT NULL,

    -- Input data
    input_features JSONB NOT NULL, -- All features used in prediction
    feature_importance JSONB, -- Which features most influenced result

    -- Predictions
    injury_probability DECIMAL(5,2),
    injury_type_probabilities JSONB, -- Probability for each injury type
    cost_prediction DECIMAL(12,2),
    rtw_success_probability DECIMAL(5,2),

    -- Model performance
    confidence_score DECIMAL(5,2),
    prediction_uncertainty DECIMAL(5,2),
    model_accuracy_score DECIMAL(5,2),

    -- Recommendations
    risk_mitigation_recommendations JSONB,
    intervention_priority_score DECIMAL(5,2),
    recommended_monitoring_frequency VARCHAR(20),

    created_at TIMESTAMP DEFAULT NOW()
);

-- Cost analytics and ROI tracking
CREATE TABLE cost_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_lifecycle_id UUID NOT NULL REFERENCES employee_lifecycles(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Cost categories
    pre_employment_cost DECIMAL(12,2) DEFAULT 0, -- Screening and assessment costs
    prevention_cost DECIMAL(12,2) DEFAULT 0, -- Ongoing prevention interventions
    injury_cost_actual DECIMAL(12,2) DEFAULT 0, -- Actual injury costs incurred
    injury_cost_predicted DECIMAL(12,2) DEFAULT 0, -- Predicted injury costs

    -- ROI calculations
    prevention_savings DECIMAL(12,2) DEFAULT 0, -- Estimated prevented costs
    roi_percentage DECIMAL(8,4), -- Return on investment
    cost_per_injury_prevented DECIMAL(12,2),

    -- Time period
    cost_period_start DATE NOT NULL,
    cost_period_end DATE NOT NULL,

    -- Comparison metrics
    industry_average_cost DECIMAL(12,2),
    cost_vs_industry_percentage DECIMAL(8,4),

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 💾 Memory System

### Infinite Context API Tables

```sql
-- Strategic decisions storage
CREATE TABLE memory_decisions (
    id VARCHAR(20) PRIMARY KEY, -- d_001, d_002, etc.
    decision_type VARCHAR(50) NOT NULL DEFAULT 'decision',
    content TEXT NOT NULL,
    rationale TEXT,
    applies_to JSONB, -- Array of project names
    created_at TIMESTAMP NOT NULL,
    session_id VARCHAR(100),
    metadata JSONB,
    outcome VARCHAR(50) CHECK (outcome IN ('pending', 'good', 'revisit')) DEFAULT 'pending'
);

-- Technical learnings storage
CREATE TABLE memory_learnings (
    id VARCHAR(20) PRIMARY KEY, -- l_001, l_002, etc.
    learning_type VARCHAR(50) NOT NULL DEFAULT 'learning',
    pattern TEXT NOT NULL,
    source TEXT,
    success_rate VARCHAR(50),
    created_at TIMESTAMP NOT NULL,
    details TEXT,
    applies_to JSONB, -- Array of domains/technologies
    technical_patterns JSONB,
    expansion_opportunities JSONB
);

-- Session context storage
CREATE TABLE memory_sessions (
    id VARCHAR(20) PRIMARY KEY, -- c_001, c_002, etc.
    session_name VARCHAR(100) NOT NULL,
    context_type VARCHAR(50) NOT NULL DEFAULT 'context',
    content TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL,
    metadata JSONB
);

-- Project context storage
CREATE TABLE memory_project (
    id VARCHAR(20) PRIMARY KEY, -- p_001, etc.
    project_name VARCHAR(255) NOT NULL,
    project_description TEXT,
    core_value TEXT,
    current_status JSONB,
    key_decisions JSONB,
    technical_context JSONB,
    business_context JSONB,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Memory access audit log
CREATE TABLE memory_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accessed_at TIMESTAMP DEFAULT NOW(),
    accessor_type VARCHAR(50), -- claude_code, clawdbot, api_client
    accessor_id VARCHAR(255), -- session_id or client_id
    operation VARCHAR(20) CHECK (operation IN ('read', 'write', 'update', 'delete')),
    table_name VARCHAR(100),
    record_id VARCHAR(20),
    changes_made JSONB -- before/after for updates
);
```

---

## 🔗 Integration Tables

### External System Integration

```sql
-- HR system integration
CREATE TABLE hr_system_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Integration details
    hr_system_name VARCHAR(100), -- Workday, BambooHR, etc.
    integration_type VARCHAR(50) CHECK (integration_type IN ('api', 'csv_import', 'manual')),
    api_endpoint VARCHAR(500),
    api_key_hash VARCHAR(255), -- Encrypted

    -- Sync configuration
    sync_frequency VARCHAR(20) CHECK (sync_frequency IN ('real_time', 'daily', 'weekly', 'manual')),
    last_sync_at TIMESTAMP,
    next_sync_at TIMESTAMP,
    sync_status VARCHAR(30) DEFAULT 'active',

    -- Field mappings
    field_mappings JSONB NOT NULL, -- How HR fields map to our schema

    created_at TIMESTAMP DEFAULT NOW()
);

-- Insurance integration
CREATE TABLE insurance_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Insurance details
    insurance_provider VARCHAR(255),
    policy_number VARCHAR(100),
    premium_calculation_method VARCHAR(50),

    -- Integration settings
    send_risk_assessments BOOLEAN DEFAULT FALSE,
    send_injury_predictions BOOLEAN DEFAULT FALSE,
    receive_premium_adjustments BOOLEAN DEFAULT FALSE,

    -- API configuration
    api_endpoint VARCHAR(500),
    api_credentials_hash VARCHAR(255),

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📈 Indexes & Performance

### Critical Performance Indexes

```sql
-- Employee lifecycle queries
CREATE INDEX idx_employee_lifecycles_org_stage ON employee_lifecycles(organization_id, current_stage);
CREATE INDEX idx_employee_lifecycles_hire_date ON employee_lifecycles(hire_date);

-- Pre-employment assessments
CREATE INDEX idx_pre_assessments_employee ON pre_employment_assessments(employee_lifecycle_id);
CREATE INDEX idx_pre_assessments_date ON pre_employment_assessments(assessment_date);
CREATE INDEX idx_pre_assessments_clearance ON pre_employment_assessments(clearance_status);

-- Risk assessments
CREATE INDEX idx_risk_assessments_employee ON employment_risk_assessments(employee_lifecycle_id);
CREATE INDEX idx_risk_assessments_date ON employment_risk_assessments(assessment_date);
CREATE INDEX idx_risk_assessments_score ON employment_risk_assessments(injury_risk_score);

-- Exit assessments
CREATE INDEX idx_exit_assessments_employee ON exit_assessments(employee_lifecycle_id);
CREATE INDEX idx_exit_assessments_date ON exit_assessments(exit_date);

-- Analytics queries
CREATE INDEX idx_predictive_results_employee ON predictive_analytics_results(employee_lifecycle_id);
CREATE INDEX idx_predictive_results_model ON predictive_analytics_results(model_name, model_version);
CREATE INDEX idx_industry_benchmarks_code_year ON industry_benchmarks(industry_code, benchmark_year);

-- Memory system
CREATE INDEX idx_memory_decisions_session ON memory_decisions(session_id);
CREATE INDEX idx_memory_learnings_type ON memory_learnings(learning_type);
CREATE INDEX idx_memory_sessions_active ON memory_sessions(active, priority);
```

---

## 🔒 Security & Compliance

### Data Protection & Audit

```sql
-- Audit trail for all health data changes
CREATE TABLE health_data_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(20) NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),

    -- Change details
    old_values JSONB,
    new_values JSONB,
    changed_fields JSONB,

    -- User context
    user_id UUID REFERENCES users(id),
    user_email VARCHAR(255),
    user_role VARCHAR(100),
    session_id VARCHAR(255),

    -- System context
    ip_address INET,
    user_agent TEXT,
    api_endpoint VARCHAR(255),

    -- Compliance
    reason_for_change TEXT,
    legal_basis VARCHAR(100), -- HIPAA, consent, etc.
    data_retention_category VARCHAR(100),

    created_at TIMESTAMP DEFAULT NOW()
);

-- Data access logging
CREATE TABLE health_data_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accessed_at TIMESTAMP DEFAULT NOW(),

    -- What was accessed
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    fields_accessed JSONB,

    -- Who accessed it
    user_id UUID REFERENCES users(id),
    user_email VARCHAR(255),
    access_reason VARCHAR(255),

    -- How it was accessed
    access_method VARCHAR(50), -- web_ui, api, export, etc.
    ip_address INET,
    session_id VARCHAR(255),

    -- Legal compliance
    consent_reference VARCHAR(255),
    legal_basis VARCHAR(100),

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🚀 Migration Strategy

### Phase 1: Foundation
1. Create employee lifecycle core tables
2. Add lifecycle_id to existing worker_cases
3. Create memory system API tables
4. Set up audit logging

### Phase 2: Pre-Employment
1. Pre-employment assessment tables
2. Health requirements management
3. Risk scoring infrastructure
4. Basic reporting

### Phase 3: Analytics Enhancement
1. Predictive analytics tables
2. Industry benchmarking data
3. Enhanced employment risk tracking
4. Cost analysis infrastructure

### Phase 4: Exit Module
1. Exit assessment tables
2. Documentation management
3. Liability closure tracking
4. Complete lifecycle reporting

### Phase 5: Integration
1. External system integration tables
2. Advanced analytics
3. Performance optimization
4. Enterprise features

---

*Database schema designed: 2026-02-03*
*Strategic foundation: Longitudinal health data competitive moat*
*Compliance: HIPAA, WorkSafe Victoria, audit-ready*