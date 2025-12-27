# GPNet3 Product Requirements Document (PRD)

**Version:** 1.3
**Last Updated:** 2025-12-20
**Status:** Build-Ready (Authoritative)
**Owner:** GPNet Product Team

---

## Document Navigation & Section Codes

This PRD uses a strict hierarchical coding system.
All implementation work, tickets, commits, and reviews MUST reference the relevant PRD code(s).

| Code | Section | Description |
|------|--------|-------------|
| **PRD-1** | Executive Summary & Vision | Purpose, scope, operating principles |
| **PRD-2** | Stakeholders & Personas | Roles, access, visibility |
| **PRD-3** | Functional Requirements | Core system capabilities |
| **PRD-4** | Logical Architecture | System responsibilities |
| **PRD-5** | Data Models | Core entities & relationships |
| **PRD-6** | Non-Functional Requirements | Security, auditability, retention |
| **PRD-7** | Integrations | External systems |
| **PRD-8** | User Journeys & Workflows | End-to-end flows |
| **PRD-9** | AI & Intelligence Layer | Predictive & advisory intelligence |
| **PRD-10** | Success Metrics & KPIs | Measurement & outcomes |

---

# PRD-1: Executive Summary & Vision

## PRD-1.1: Product Overview

GPNet is a B2B **case intelligence and case management system** designed for complex worker injury, illness, and return-to-work (RTW) cases, operating primarily within the Australian (Victoria WorkCover) regulatory environment.

GPNet is not a passive record-keeping tool.
It is an **active coordination, evidence, and reasoning platform**.

---

## PRD-1.2: Core Mission

> **No worker lost in the system**

GPNet exists to ensure that no worker, obligation, or critical decision point disappears due to fragmentation, delay, or poor coordination.

---

## PRD-1.3: Strategic Goals

| ID | Goal | Description |
|----|------|-------------|
| PRD-1.3.1 | Earlier RTW | Enable earlier and safer return-to-work outcomes where clinically appropriate |
| PRD-1.3.2 | Reduced Admin | Reduce administrative burden and communication chaos |
| PRD-1.3.3 | Defensible Records | Produce regulator- and dispute-ready evidence |
| PRD-1.3.4 | Single Source of Truth | Maintain one authoritative timeline per case |
| PRD-1.3.5 | Case Intelligence | Support predictive, advisory reasoning over cases |

---

## PRD-1.4: Product Surfaces

### PRD-1.4.1: Marketing Site (`gpnet.au`)
- Brand, education, lead capture
- No case data exposure

### PRD-1.4.2: Secure Portal (`portal.gpnet.au`)
- Authenticated access only
- All case operations occur under `/app/*`

---

## PRD-1.5: Value Proposition

| Stakeholder | Value |
|------------|-------|
| Employers | Compliance clarity, coordination, defensibility |
| Insurers | Structured evidence, reduced ambiguity |
| Workers | Consistency, reduced repetition |
| Providers | Clear context and expectations |

---

## PRD-1.6: Out-of-Scope & Explicit Non-Capabilities

GPNet explicitly does **not**:
- Make legal or liability determinations
- Provide medical diagnosis or treatment
- Override or reinterpret medical certificates
- Process payments, payroll, or reimbursements
- Replace insurer core claims platforms
- Make autonomous decisions

Any feature exceeding coordination, documentation, or advisory support MUST be rejected unless the PRD is formally amended.

---

## PRD-1.7: Core Operating Principle

GPNet is organised around **time**, not documents.

Every case is continuously evaluated against:
- An anticipated recovery timeline
- Observable compliance signals
- Evidence recorded in chronological order

---

## PRD-1.8: Case Intelligence System

GPNet operates as a **Case Intelligence System**.

It MAY use predictive analytics (e.g. gradient-boosted models, Bayesian reasoning) in an **advisory** capacity to:
- Assess case progression vs expectation
- Identify early risk of delay or dispute
- Suggest likely readiness for finalisation (human-confirmed)

Predictions are:
- Non-medical
- Non-legal
- Explainable
- Advisory only

---

# PRD-2: Stakeholders & Personas

## PRD-2.1: Personas

- Employer HR / RTW Coordinator
- Host Site Supervisor
- Insurer / Claims Manager
- RTW Consultant
- Worker
- Clinical Provider

---

## PRD-2.2: Role-Based Access Control (RBAC)

| Role | Capabilities |
|------|-------------|
| Admin | Full system control |
| Manager | Case operations |
| Viewer | Read-only |

---

## PRD-2.3: Visibility Rules

- Least-privilege access enforced
- Workers see only worker-safe data
- Insurers do not see employer-only notes unless shared

---

# PRD-3: Functional Requirements

## PRD-3.1: Authentication & Onboarding

### PRD-3.1.1: Authentication
- Email/password login
- JWT with refresh rotation
- Optional MFA

### PRD-3.1.2: Organisation Onboarding
Multi-step wizard:
- Organisation details
- Sites
- Contacts
- Integrations
- Defaults
- Branding

---

## PRD-3.2: Case Management

### PRD-3.2.1: Case Creation
Sources:
- Forms
- Tickets
- Email
- Manual

On creation:
- Worker linked/created
- Case created
- Initial timeline entry logged

---

### PRD-3.2.2: Case Types
- Injury
- Mental Health
- General Health
- Pre-Employment
- Exit Assessment

---

### PRD-3.2.3: Case Lifecycle States

| State | Description |
|------|-------------|
| NEW | Intake received |
| OPEN_NO_CAPACITY | No current capacity |
| OPEN_PARTIAL_CAPACITY | Partial capacity |
| SUITABLE_DUTIES_ACTIVE | Duties in place |
| DISPUTE_REVIEW | Under dispute/review |
| CLOSED_RTW | RTW completed |
| CLOSED_EXIT | Administrative exit |

Rules:
- Exactly one state at all times
- All transitions logged
- Closed states terminal unless admin override (reason required)

---

## PRD-3.3: Timeline & Evidence Engine

### PRD-3.3.1: Unified Timeline
- One authoritative timeline per case
- Chronological, append-only

### PRD-3.3.2: Evidence Classification
Each entry classified as:
- Clinical
- Administrative
- Communication
- Compliance
- AI-Advisory

### PRD-3.3.3: Immutability
- No edits or deletes
- Corrections via new entries referencing prior ones

### PRD-3.3.4: Dispute Locking
- Timeline locked on dispute
- New entries flagged post-dispute

### PRD-3.3.5: Attribution
Every entry records:
- Who
- When
- Source

---

## PRD-3.4: Task & Obligation Engine

### PRD-3.4.1: Task Generation
From:
- State changes
- Certificates
- Compliance rules
- Manual creation
- AI advisory suggestions

### PRD-3.4.2: Obligation Tracking
- Statutory
- Procedural
- Organisational

### PRD-3.4.3: Escalation
- Reminders
- Escalation paths
- Manager visibility

---

## PRD-3.5: Certificate & Work Capacity Engine

### PRD-3.5.1: Ingestion
- Upload
- Email
- Provider submission

### PRD-3.5.2: Interpretation
- Capacity level
- Dates
- Restrictions

AI assist permitted, human confirmation mandatory.

### PRD-3.5.3: Versioning
- All certificates retained
- Historical view preserved

---

## PRD-3.6: Communication Ingestion

- Email
- Tickets
- Forms

Original content preserved as evidence.

---

## PRD-3.7: Worker Interaction Logging

### PRD-3.7.1: Channels
- Forms
- Email
- Conversational interfaces

### PRD-3.7.2: Audit
All interactions logged to timeline.

### PRD-3.7.3: Voice & Avatar Interviews (Planned)
- Structured
- Recorded
- Transcribed
- Information-gathering only
- Immutable evidence

---

## PRD-3.8: Evidence Pack & Export

- Full case export
- Read-only
- Timestamped
- Defensible

---

## PRD-3.9: Manual Overrides

Overrides require:
- User
- Timestamp
- Reason

---

## PRD-3.10: Notifications

- In-app
- Email
Triggers:
- Missed obligations
- Expiry dates
- Inactivity

---

# PRD-4: Logical Architecture

Core components:
- Case Core
- Timeline Engine
- Task Engine
- Certificate Engine
- Communication Ingestion
- Visibility Enforcement
- AI Advisory Layer

---

# PRD-5: Data Models

Core entities:
- Organisation
- User
- Site
- Worker
- Case
- Certificate
- TimelineEntry
- Task
- Obligation
- Contact
- Document

All entities scoped by `organisation_id`.

---

# PRD-6: Non-Functional Requirements

## PRD-6.1: Security
- RBAC
- Tenant isolation

## PRD-6.2: Auditability
- Full action logging
- Evidence immutability

## PRD-6.3: Data Retention
- Long-term retention
- Archival without mutation

## PRD-6.4: Performance
- Reliable timeline access
- Scalable ingestion

## PRD-6.5: Privacy
- Least-privilege visibility
- Worker-safe views

---

# PRD-7: Integrations

- Freshdesk
- Forms/Webhooks
- Email

---

# PRD-8: User Journeys

- Intake → Case Creation
- Certificate → Capacity Update
- RTW Duties → Monitoring
- Dispute → Evidence Lock
- Closure → Retention

---

# PRD-9: AI & Intelligence Layer

- Advisory only
- Explainable
- No autonomous decisions
- Supports predictive case intelligence

---

# PRD-10: Success Metrics

| Metric | Description |
|-------|-------------|
| RTW Time | Reduction vs baseline |
| Compliance | Obligations met |
| Evidence | Export readiness |
| Risk Detection | Early flags usefulness |

---

## Document Control

All development MUST reference PRD codes.
Any scope change requires PRD amendment and approval.
