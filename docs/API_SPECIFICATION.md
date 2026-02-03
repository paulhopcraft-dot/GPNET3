# Employee Health Lifecycle Platform - API Specification

**Strategic Foundation**: Blue Ocean market opportunity with 6-12 month competitive window
**Platform Approach**: Comprehensive lifecycle APIs supporting hire-to-retire health intelligence

**Design Principles**:
- **Lifecycle Integration**: APIs span pre-employment → employment → exit phases
- **Predictive First**: AI/ML capabilities built into core API design
- **Insurance Ready**: Direct integration capabilities for premium reductions
- **Network Effects**: APIs designed to improve with more customer data

---

## 🏗️ API Architecture Overview

### Base Configuration

**Base URL**: `https://api.preventli.com/v1`
**Authentication**: JWT Bearer tokens + API keys
**Rate Limiting**: 1000 requests/minute per organization
**Response Format**: JSON with consistent error schemas

### Core API Categories

```
/api/v1/
├── lifecycle/          # Employee lifecycle management
├── pre-employment/     # Pre-employment health assessments
├── employment/         # Current injury management (existing + enhanced)
├── exit/              # Exit health documentation
├── analytics/         # Predictive analytics and insights
├── benchmarking/      # Industry comparison APIs
├── memory/            # Infinite context system (NEW)
├── integrations/      # External system APIs
└── admin/             # Platform administration
```

---

## 👤 Employee Lifecycle Management

### Core Lifecycle Operations

```typescript
// Employee lifecycle tracking
interface EmployeeLifecycle {
  id: string;
  organizationId: string;
  employeeExternalId: string; // From HR system
  employeeName: string;
  hireDate: string; // ISO date
  exitDate?: string;
  currentStage: 'pre_employment' | 'employment' | 'exit_processing' | 'exited';
  positionTitle: string;
  department: string;
  managerEmail: string;
  lifecycleMetadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
```

### Lifecycle Endpoints

```http
# Create employee lifecycle
POST /api/v1/lifecycle/employees
Content-Type: application/json
{
  "employeeExternalId": "EMP001",
  "employeeName": "John Smith",
  "hireDate": "2026-03-01",
  "positionTitle": "Warehouse Supervisor",
  "department": "Operations",
  "managerEmail": "manager@company.com"
}

# Response: 201 Created
{
  "id": "lc_123",
  "currentStage": "pre_employment",
  "recommendations": [
    {
      "type": "pre_employment_assessment",
      "priority": "high",
      "description": "Health screening required for warehouse position"
    }
  ]
}

# Get employee lifecycle
GET /api/v1/lifecycle/employees/{id}

# Response: 200 OK
{
  "id": "lc_123",
  "employeeExternalId": "EMP001",
  "currentStage": "employment",
  "healthJourney": {
    "preEmploymentRisk": 2.3,
    "currentRisk": 1.8,
    "injuryHistory": [],
    "interventions": ["ergonomic_training"],
    "predictedOutcomes": {
      "injuryProbability6Months": 0.15,
      "rtwSuccessProbability": 0.92
    }
  }
}

# Update lifecycle stage
PUT /api/v1/lifecycle/employees/{id}/stage
{
  "newStage": "employment",
  "effectiveDate": "2026-03-15",
  "notes": "Pre-employment assessment cleared"
}

# List employees by stage
GET /api/v1/lifecycle/employees?stage=pre_employment&limit=50
```

---

## 🔍 Pre-Employment Health Assessment APIs

### Assessment Management

```typescript
interface PreEmploymentAssessment {
  id: string;
  employeeLifecycleId: string;
  healthRequirementsId: string;
  assessmentDate: string;
  assessorType: 'occupational_physician' | 'nurse' | 'physiotherapist' | 'automated';
  healthBaseline: HealthBaseline;
  riskAssessment: RiskAssessment;
  clearanceStatus: 'cleared' | 'cleared_with_restrictions' | 'not_cleared' | 'pending_review';
  clearanceDetails?: ClearanceDetails;
}

interface RiskAssessment {
  overallRiskScore: number; // 0-100
  jobFitnessPercentage: number; // 0-100
  riskFactors: string[];
  recommendations: string[];
}
```

### Pre-Employment Endpoints

```http
# Create health requirements template for position
POST /api/v1/pre-employment/requirements
{
  "positionTitle": "Warehouse Supervisor",
  "department": "Operations",
  "physicalDemands": {
    "liftingMaxKg": 25,
    "standingHoursMax": 8,
    "bendingFrequency": "frequently",
    "reachingOverheadFrequency": "occasionally"
  },
  "cognitiveDemands": {
    "concentrationLevel": "high",
    "stressTolerance": "medium",
    "multitaskingRequired": true
  }
}

# Start pre-employment assessment
POST /api/v1/pre-employment/assessments
{
  "employeeLifecycleId": "lc_123",
  "healthRequirementsId": "req_456",
  "assessmentDate": "2026-03-01",
  "assessorType": "occupational_physician"
}

# Record assessment results
PUT /api/v1/pre-employment/assessments/{id}/results
{
  "healthBaseline": {
    "heightCm": 175,
    "weightKg": 80,
    "bmi": 26.1,
    "bloodPressure": "120/80",
    "functionalCapacity": {
      "liftingCapacityKg": 30,
      "gripStrengthKg": 45,
      "cardiovascularFitness": "good"
    }
  },
  "riskFactors": ["previous_back_injury", "high_bmi"],
  "clearanceStatus": "cleared_with_restrictions",
  "restrictions": [
    {
      "type": "lifting_limit",
      "value": 20,
      "units": "kg",
      "duration": "first_90_days"
    }
  ]
}

# Get job fitness analysis
GET /api/v1/pre-employment/job-fitness/{assessmentId}

# Response: AI-powered job fitness analysis
{
  "jobFitnessPercentage": 78,
  "suitabilityAnalysis": {
    "suitable": ["communication", "problem_solving", "basic_lifting"],
    "suitableWithModification": ["heavy_lifting", "prolonged_standing"],
    "notSuitable": [],
    "modifications": [
      "Implement lifting aids for items >20kg",
      "Provide anti-fatigue mats for standing stations"
    ]
  },
  "riskPrediction": {
    "injuryProbability12Months": 0.23,
    "likelyInjuryTypes": ["lower_back_strain", "shoulder_impingement"],
    "preventiveRecommendations": ["ergonomic_training", "strengthening_program"]
  }
}
```

---

## 💼 Employment Health Management APIs (Enhanced Existing)

### Enhanced Case Management

```typescript
interface EnhancedWorkerCase extends WorkerCase {
  // New predictive fields
  predictiveRiskScore: number;
  injuryProbability6Months: number;
  rtwSuccessProbability: number;
  costPredictionTotal: number;
  interventionRecommendations: Intervention[];
  benchmarkComparison: BenchmarkData;
}

interface Intervention {
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  estimatedCost: number;
  expectedOutcome: string;
  confidence: number;
}
```

### Employment Health Endpoints

```http
# Get enhanced case with predictions
GET /api/v1/employment/cases/{id}

# Response: Enhanced case data
{
  "id": "case_789",
  "employeeLifecycleId": "lc_123",
  "workStatus": "off_work",
  "injuryType": "lower_back_strain",
  "predictiveAnalytics": {
    "rtwSuccessProbability": 0.87,
    "estimatedRtwDays": 14,
    "totalCostPrediction": 8500,
    "riskFactors": ["previous_injury", "high_physical_demands"],
    "interventionRecommendations": [
      {
        "type": "early_physiotherapy",
        "priority": "high",
        "estimatedCost": 800,
        "expectedOutcome": "25% faster RTW",
        "confidence": 0.89
      }
    ]
  },
  "benchmarkData": {
    "industryAverage": {
      "rtwDays": 21,
      "totalCost": 12000
    },
    "yourPerformance": "above_average",
    "improvementOpportunities": ["earlier_intervention", "ergonomic_assessment"]
  }
}

# Create ongoing risk assessment
POST /api/v1/employment/risk-assessments
{
  "employeeLifecycleId": "lc_123",
  "assessmentType": "routine",
  "riskFactors": ["repetitive_work", "high_stress_period"],
  "observationalData": {
    "workloadIncrease": true,
    "posturalChanges": ["forward_head"],
    "reportedDiscomfort": ["lower_back", "neck"]
  }
}

# Response: Risk analysis with recommendations
{
  "riskScore": 67,
  "injuryProbability": {
    "30Days": 0.12,
    "90Days": 0.31,
    "365Days": 0.58
  },
  "preventiveInterventions": [
    {
      "intervention": "ergonomic_workstation_assessment",
      "urgency": "within_7_days",
      "expectedRiskReduction": 0.23
    },
    {
      "intervention": "stress_management_program",
      "urgency": "within_30_days",
      "expectedRiskReduction": 0.15
    }
  ]
}

# Get industry benchmarking
GET /api/v1/employment/benchmarking?industry=manufacturing&size=500-1000

# Response: Industry comparison data
{
  "yourPerformance": {
    "injuryFrequencyRate": 4.2,
    "averageClaimCost": 8500,
    "rtwSuccessRate": 89
  },
  "industryBenchmarks": {
    "injuryFrequencyRate": {
      "average": 7.8,
      "top25Percent": 3.1,
      "bottom25Percent": 15.2
    },
    "averageClaimCost": {
      "average": 12000,
      "top25Percent": 6500,
      "bottom25Percent": 21000
    }
  },
  "ranking": {
    "overall": "top_25_percent",
    "injuryPrevention": "top_10_percent",
    "costManagement": "above_average"
  }
}
```

---

## 🚪 Exit Health Documentation APIs

### Exit Assessment Management

```typescript
interface ExitAssessment {
  id: string;
  employeeLifecycleId: string;
  exitDate: string;
  exitReason: 'resignation' | 'termination' | 'retirement' | 'redundancy';
  assessmentDate: string;
  healthStatusAtExit: HealthStatus;
  workplaceExposureSummary: ExposureSummary;
  injuryHistorySummary: InjurySummary;
  documentationStatus: DocumentationStatus;
  liabilityClosure: LiabilityClosureStatus;
}
```

### Exit Documentation Endpoints

```http
# Create exit assessment
POST /api/v1/exit/assessments
{
  "employeeLifecycleId": "lc_123",
  "exitDate": "2026-12-15",
  "exitReason": "resignation",
  "assessmentDate": "2026-12-10",
  "assessorType": "occupational_physician"
}

# Complete exit health assessment
PUT /api/v1/exit/assessments/{id}/health-status
{
  "currentHealthStatus": "good",
  "activeHealthIssues": [],
  "ongoingTreatments": [],
  "workRelatedConditions": [
    {
      "condition": "mild_lower_back_stiffness",
      "workRelated": "possibly",
      "severity": "mild",
      "treatment": "physiotherapy_completed"
    }
  ],
  "fitnessForFutureWork": "full_capacity",
  "restrictionsForFutureWork": []
}

# Generate comprehensive health journey report
GET /api/v1/exit/health-journey/{employeeLifecycleId}

# Response: Complete health lifecycle report
{
  "employeeLifecycle": {
    "duration": "2_years_9_months",
    "totalExposureHours": 5760,
    "positionsHeld": ["warehouse_supervisor"]
  },
  "preEmploymentBaseline": {
    "riskScore": 2.3,
    "healthStatus": "good",
    "restrictions": ["lifting_limit_20kg"]
  },
  "employmentSummary": {
    "injuryCount": 1,
    "lostTimeInjuries": 0,
    "totalClaimCost": 1200,
    "preventiveInterventions": ["ergonomic_training", "back_care_program"]
  },
  "exitComparison": {
    "healthImprovement": ["improved_fitness", "reduced_back_pain"],
    "healthDeterioriation": [],
    "overallHealthChange": "improved"
  },
  "liabilityAssessment": {
    "futureClaimRisk": "low",
    "documentationComplete": true,
    "statuteLimitationsDate": "2029-12-15",
    "recommendedFollowUp": "none_required"
  }
}

# Generate legal documentation
POST /api/v1/exit/documentation
{
  "assessmentId": "exit_456",
  "documentTypes": ["medical_summary", "exposure_record", "liability_release"],
  "recipientEmail": "legal@company.com",
  "employeeAcknowledgmentRequired": true
}
```

---

## 🧠 Analytics & Intelligence APIs

### Predictive Analytics

```http
# Generate injury risk prediction
POST /api/v1/analytics/predict/injury-risk
{
  "employeeLifecycleId": "lc_123",
  "predictionHorizon": "6_months",
  "includeInterventions": ["ergonomic_training", "strength_program"],
  "modelVersion": "v2.1"
}

# Response: Risk prediction with confidence intervals
{
  "injuryProbability": 0.23,
  "confidenceInterval": {
    "lower": 0.18,
    "upper": 0.31
  },
  "riskFactors": {
    "primaryFactors": ["repetitive_motion", "previous_injury"],
    "secondaryFactors": ["workplace_stress", "poor_ergonomics"],
    "protectiveFactors": ["good_fitness", "safety_training"]
  },
  "interventionImpact": {
    "ergonomic_training": {
      "riskReduction": 0.08,
      "confidence": 0.87
    },
    "strength_program": {
      "riskReduction": 0.12,
      "confidence": 0.92
    },
    "combined": {
      "riskReduction": 0.18,
      "newRiskScore": 0.15
    }
  },
  "modelMetadata": {
    "version": "v2.1",
    "trainingData": "50000_cases",
    "accuracy": 0.89,
    "lastUpdated": "2026-01-15"
  }
}

# Get cost-benefit analysis
POST /api/v1/analytics/cost-benefit
{
  "organizationId": "org_789",
  "timePeriod": "12_months",
  "interventions": ["pre_employment_screening", "predictive_monitoring", "early_intervention"],
  "currentBaseline": {
    "averageClaimCost": 12000,
    "claimFrequency": 0.08,
    "totalEmployees": 500
  }
}

# Response: ROI analysis
{
  "costAnalysis": {
    "interventionCosts": {
      "preEmploymentScreening": 25000,
      "predictiveMonitoring": 42000,
      "earlyIntervention": 18000,
      "total": 85000
    },
    "preventedCosts": {
      "injuriesPrevented": 15,
      "costPrevented": 180000,
      "indirectSavings": 67000,
      "total": 247000
    }
  },
  "roiMetrics": {
    "roi": 1.91,
    "paybackPeriod": "6.2_months",
    "netBenefit": 162000,
    "confidenceLevel": 0.84
  }
}

# Industry benchmarking with insights
GET /api/v1/analytics/benchmarking/insights?industry=manufacturing&employeeCount=500

# Response: Comprehensive benchmarking with actionable insights
{
  "benchmarkSummary": {
    "overallRanking": "top_25_percent",
    "strengths": ["injury_prevention", "rtw_success"],
    "improvementAreas": ["cost_per_claim", "prevention_investment"]
  },
  "detailedComparison": {
    "injuryFrequency": {
      "yourRate": 4.2,
      "industryAverage": 7.8,
      "top10Percent": 2.1,
      "percentileRank": 78
    },
    "costPerClaim": {
      "yourAverage": 8500,
      "industryAverage": 12000,
      "top10Percent": 5200,
      "percentileRank": 65
    }
  },
  "actionableInsights": [
    {
      "insight": "Your injury frequency is excellent, but claim costs are higher than top performers",
      "recommendation": "Investigate early intervention protocols to reduce claim severity",
      "potentialImpact": "20-30% reduction in average claim cost",
      "priority": "high"
    }
  ]
}
```

---

## 💾 Memory System APIs (Infinite Context)

### Memory Management

```typescript
interface MemoryDecision {
  id: string; // d_001, d_002, etc.
  type: 'decision';
  content: string;
  rationale: string;
  appliesTo: string[];
  createdAt: string;
  sessionId: string;
  metadata?: Record<string, any>;
  outcome: 'pending' | 'good' | 'revisit';
}

interface MemoryLearning {
  id: string; // l_001, l_002, etc.
  type: 'learning';
  pattern: string;
  source: string;
  successRate?: string;
  createdAt: string;
  details?: string;
  appliesTo?: string[];
}
```

### Memory Endpoints

```http
# Get all strategic decisions
GET /api/v1/memory/decisions

# Response: Array of decisions with strategic context
[
  {
    "id": "d_002",
    "content": "Strategic pivot from WorkCover compliance → Employee Health Lifecycle Platform",
    "rationale": "Much larger market opportunity ($100M+ vs point solution). Longitudinal health data creates unbreachable competitive moat.",
    "appliesTo": ["preventli", "gpnet3"],
    "outcome": "pending",
    "metadata": {
      "marketImpact": "Much larger TAM with lifecycle approach",
      "technicalReadiness": "Pre-employment module proves architecture works"
    }
  }
]

# Create new strategic decision
POST /api/v1/memory/decisions
{
  "content": "Implement industry benchmarking as key differentiator",
  "rationale": "Competitive analysis shows no players offering real-time industry comparison. Creates customer stickiness and justifies premium pricing.",
  "appliesTo": ["preventli"],
  "sessionId": "session-44",
  "metadata": {
    "competitive_advantage": "Blue ocean positioning",
    "implementation_priority": "high"
  }
}

# Get technical learnings
GET /api/v1/memory/learnings?appliesTo=ai-architecture

# Create new learning
POST /api/v1/memory/learnings
{
  "pattern": "Predictive injury models improve accuracy by 23% when incorporating longitudinal pre-employment health data",
  "source": "Implementation testing phase 3",
  "successRate": "89% accuracy on test dataset",
  "appliesTo": ["predictive-analytics", "machine-learning"],
  "details": "Baseline health metrics from pre-employment screening significantly enhance prediction accuracy for injury risk models."
}

# Get session context for infinite context continuity
GET /api/v1/memory/sessions/session-43

# Create session context
POST /api/v1/memory/sessions
{
  "sessionName": "session-44",
  "content": "Employee Health Lifecycle Platform architecture design completion",
  "priority": "high",
  "metadata": {
    "focus": "API design and implementation planning",
    "strategic_context": "Blue ocean market opportunity confirmed",
    "next_actions": ["Complete implementation roadmap", "Begin phase 1 development"]
  }
}
```

---

## 🔗 Integration APIs

### External System Integration

```http
# HR System Integration
POST /api/v1/integrations/hr-systems
{
  "systemType": "workday",
  "organizationId": "org_789",
  "apiEndpoint": "https://company.workday.com/api/v1",
  "authentication": {
    "type": "oauth2",
    "clientId": "encrypted_client_id"
  },
  "syncFrequency": "daily",
  "fieldMappings": {
    "employeeId": "Employee_ID",
    "hireDate": "Hire_Date",
    "positionTitle": "Job_Title",
    "department": "Cost_Center"
  }
}

# Insurance Integration
POST /api/v1/integrations/insurance
{
  "insuranceProvider": "Allianz",
  "policyNumber": "POL123456",
  "integrationLevel": "risk_sharing",
  "dataSharing": {
    "sendRiskAssessments": true,
    "sendPredictions": true,
    "receivePremiumAdjustments": true
  }
}

# WorkSafe Victoria API Integration
GET /api/v1/integrations/worksafe/industry-data?industry=manufacturing&year=2026

# Response: Real-time industry benchmarking data
{
  "industryStatistics": {
    "injuryFrequencyRate": 7.8,
    "averageClaimCost": 12000,
    "commonInjuryTypes": ["lower_back_strain", "cuts_lacerations", "shoulder_injury"]
  },
  "regulatoryUpdates": [
    {
      "date": "2026-01-15",
      "type": "requirement_change",
      "description": "New early intervention requirements for psychological injuries"
    }
  ]
}
```

---

## 🔒 Security & Compliance

### Authentication & Authorization

```http
# OAuth 2.0 Authentication Flow
POST /api/v1/auth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&
client_id=your_client_id&
client_secret=your_client_secret&
scope=pre_employment employment exit analytics

# Response: Access token with scoped permissions
{
  "access_token": "jwt_token_here",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "pre_employment employment exit analytics"
}

# API Request with token
GET /api/v1/employment/cases/123
Authorization: Bearer jwt_token_here
X-Organization-ID: org_789
```

### Audit & Compliance APIs

```http
# Health data access audit
GET /api/v1/audit/health-data-access?employeeId=lc_123&fromDate=2026-01-01

# Response: Complete audit trail
{
  "accessRecords": [
    {
      "accessedAt": "2026-01-15T10:30:00Z",
      "userId": "user_456",
      "userEmail": "doctor@clinic.com",
      "accessReason": "Pre-employment assessment review",
      "dataAccessed": ["health_baseline", "risk_assessment"],
      "legalBasis": "employment_medical_assessment",
      "consentReference": "consent_789"
    }
  ],
  "complianceStatus": "compliant",
  "retentionPolicy": "7_years_post_employment"
}

# Generate compliance report
POST /api/v1/compliance/reports
{
  "reportType": "hipaa_audit",
  "dateRange": {
    "from": "2026-01-01",
    "to": "2026-12-31"
  },
  "includeCategories": ["data_access", "consent_management", "retention_compliance"]
}
```

---

## 📊 API Response Standards

### Standard Response Structure

```typescript
// Success Response
interface APIResponse<T> {
  success: true;
  data: T;
  metadata?: {
    pagination?: PaginationInfo;
    requestId: string;
    processingTime: number;
    cacheStatus?: 'hit' | 'miss' | 'bypass';
  };
}

// Error Response
interface APIError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string;
    field?: string; // For validation errors
    helpUrl?: string;
  };
  metadata: {
    requestId: string;
    timestamp: string;
  };
}
```

### Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `EMPLOYEE_NOT_FOUND` | Employee lifecycle record not found | 404 |
| `ASSESSMENT_INCOMPLETE` | Required assessment data missing | 400 |
| `PREDICTION_UNAVAILABLE` | Insufficient data for prediction | 422 |
| `INTEGRATION_FAILED` | External system integration error | 502 |
| `CONSENT_REQUIRED` | Employee consent needed for operation | 403 |
| `RETENTION_EXPIRED` | Data retention period exceeded | 410 |

---

## 🚀 API Versioning & Evolution

### Version Management

**Current Version**: `v1`
**Deprecation Policy**: 12 months notice for breaking changes
**Backwards Compatibility**: Maintained for 2 major versions

### Version Evolution Plan

```
v1.0 (Current): Core lifecycle + basic predictions
v1.1 (Q2 2026): Enhanced industry benchmarking
v1.2 (Q3 2026): Advanced AI predictions
v2.0 (2027): Machine learning platform APIs
```

### Feature Flags

```http
# Enable beta features
X-Feature-Flags: advanced_predictions,real_time_benchmarking

GET /api/v1/analytics/predict/injury-risk
X-Feature-Flags: ml_model_v2
```

---

## 📈 Performance & Scalability

### Performance Targets

| Endpoint Category | Target Response Time | Success Rate |
|-------------------|----------------------|--------------|
| Lifecycle Management | < 200ms | > 99.9% |
| Assessment APIs | < 500ms | > 99.5% |
| Predictive Analytics | < 2s | > 99.0% |
| Industry Benchmarking | < 1s | > 99.5% |
| Memory System | < 100ms | > 99.9% |

### Rate Limiting

```http
# Rate limit headers in responses
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1640995200
X-RateLimit-Retry-After: 60
```

### Caching Strategy

- **Employee Data**: 5 minutes cache
- **Industry Benchmarks**: 1 hour cache
- **Predictions**: 30 minutes cache
- **Memory System**: No cache (always fresh)

---

*API Specification designed: 2026-02-03*
*Strategic foundation: Blue ocean market opportunity with comprehensive lifecycle APIs*
*Competitive advantage: First comprehensive health intelligence platform*