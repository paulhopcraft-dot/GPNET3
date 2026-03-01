# Preventli Pricing Model Analysis

**Date:** 2026-01-10
**Status:** Draft Analysis
**Purpose:** Evaluate optimal pricing strategy for Preventli workers compensation compliance platform

---

## Executive Summary

Preventli offers significant value to multiple customer segments through automated compliance management, AI-powered case summaries, and streamlined RTW processes. The optimal pricing strategy should:

1. **Capture value proportional to time/cost savings delivered**
2. **Scale with customer size and usage patterns**
3. **Enable market penetration through accessible entry points**
4. **Support multiple distribution channels (direct, partner, insurer)**

**Recommended Approach:** Hybrid tiered + usage-based model with freemium entry point.

---

## Current Value Proposition Analysis

### Core Value Drivers

| Feature Category | Value Delivered | Quantifiable Benefit |
|------------------|-----------------|---------------------|
| **Compliance Automation** | Reduces manual compliance tracking | 5-10 hours/week saved per case manager |
| **AI Smart Summaries** | Eliminates manual case review time | 30-45 min saved per case update |
| **Certificate Tracking** | Prevents compliance violations | Avoids $5K-50K penalty costs |
| **RTW Management** | Accelerates return-to-work | 10-20% faster RTW = cost reduction |
| **Notification System** | Proactive alerts prevent issues | Reduces reactive crisis management |
| **Centralized Dashboard** | Single pane of glass visibility | 2-3 hours/week saved in reporting |

### Value by Customer Segment

**Enterprise (100+ cases/year)**
- Value: $50K-200K annually in time savings + compliance cost avoidance
- Pain: Complex multi-system workflows, compliance risk, manual processes
- Willingness to pay: High ($500-2000/month)

**SMB (10-50 cases/year)**
- Value: $5K-20K annually in time savings
- Pain: Limited resources, manual tracking, compliance uncertainty
- Willingness to pay: Moderate ($50-300/month)

**Insurance Agents**
- Value: Improved client service, reduced administrative burden
- Pain: Managing multiple client systems, compliance oversight
- Willingness to pay: Revenue-share or per-client model

**Insurers**
- Value: Risk reduction, client satisfaction, market differentiation
- Pain: Supporting diverse client needs, compliance monitoring
- Willingness to pay: High for white-label or partnership models

---

## Pricing Model Options

### Option 1: Freemium + Tiered Subscriptions

**Structure:**
```
FREE TIER (Starter)
├── Up to 5 active cases
├── Basic compliance tracking
├── Email notifications
├── Standard support
└── Preventli branding

PROFESSIONAL ($99/month)
├── Up to 50 active cases
├── AI smart summaries
├── Certificate automation
├── Advanced notifications
├── API access
├── Priority support
└── Custom branding

ENTERPRISE ($499/month + usage)
├── Unlimited cases
├── Advanced compliance engine
├── Custom workflows
├── SSO integration
├── Dedicated support
├── White-label options
└── Usage-based overage: $2/case
```

**Pros:**
- Low barrier to entry drives adoption
- Clear upgrade path as customers grow
- Predictable recurring revenue

**Cons:**
- Free tier may cannibalize paid users
- Complex feature gating required
- Support costs for free users

### Option 2: Pure Usage-Based Pricing

**Structure:**
```
PAY-PER-CASE MODEL
├── $5-15 per active case/month
├── Volume discounts:
│   ├── 1-10 cases: $15/case
│   ├── 11-50 cases: $10/case
│   ├── 51+ cases: $5/case
├── All features included
└── Monthly minimum: $50
```

**Pros:**
- Scales directly with customer value
- Simple to understand and justify
- Natural growth revenue

**Cons:**
- Harder to predict revenue
- May discourage heavy usage
- Complex billing implementation

### Option 3: Hybrid Tiered + Usage

**Structure:**
```
STARTER ($49/month)
├── Base: 10 cases included
├── Overage: $3/additional case
├── Core features
└── Email support

PROFESSIONAL ($149/month)
├── Base: 30 cases included
├── Overage: $2/additional case
├── AI features + automation
└── Priority support

ENTERPRISE ($399/month)
├── Base: 100 cases included
├── Overage: $1/additional case
├── Advanced features + integrations
├── Dedicated support
└── Custom SLAs
```

**Pros:**
- Predictable base + scales with usage
- Clear value tiers
- Growth-friendly pricing

**Cons:**
- More complex billing
- Requires usage tracking

### Option 4: Market-Specific Models

**For Insurance Partners:**
```
REVENUE SHARE MODEL
├── 20-30% of compliance savings achieved
├── Shared risk/reward approach
├── Performance-based pricing
└── Long-term partnership structure

WHITE-LABEL LICENSING
├── $50K setup fee
├── $5K-15K/month licensing
├── Revenue share: 10-15%
└── Custom development: $150K-300K
```

**For SMB Market:**
```
SIMPLIFIED PRICING
├── $1-3 per employee/month
├── All features included
├── Self-service onboarding
└── Community support
```

---

## Competitive Analysis

### Current Market Pricing

| Competitor Category | Typical Pricing | Feature Comparison |
|---------------------|-----------------|-------------------|
| **Case Management Systems** | $50-200/user/month | Basic case tracking, no compliance focus |
| **Compliance Software** | $100-500/month flat | Industry-specific, limited integration |
| **Claims Management** | $5-25/claim | Transactional, no ongoing management |
| **Legal Practice Management** | $50-150/user/month | Billing focus, limited compliance |

### Preventli Advantages

1. **Industry Specialization**: WorkSafe Victoria specific
2. **AI Integration**: Smart summaries and automation
3. **End-to-end Workflow**: From injury to RTW
4. **Multi-stakeholder Platform**: Employers, insurers, clinicians
5. **Compliance Focus**: Regulatory requirements built-in

---

## Recommended Pricing Strategy

### Phase 1: Market Entry (Months 1-12)

**Freemium + Professional Tiers**

```
FREE (Market Entry)
├── Up to 3 active cases
├── Basic compliance tracking
├── Email notifications
├── 90-day trial of AI features
└── Community support

PROFESSIONAL ($149/month)
├── Up to 25 cases included
├── $4 per additional case
├── Full AI smart summaries
├── Automated certificate tracking
├── Advanced notifications
├── API access
├── Priority support
└── Custom branding
```

**Rationale:**
- Free tier drives adoption and market education
- Single paid tier reduces decision complexity
- Usage-based overage captures growth value
- Price point accessible to SMB market

### Phase 2: Market Expansion (Year 2)

**Add Enterprise Tier + Partnership Models**

```
ENTERPRISE ($499/month)
├── Up to 100 cases included
├── $2 per additional case
├── Advanced compliance engine
├── Custom workflows
├── SSO integration
├── Dedicated customer success
├── White-label options
└── SLA guarantees

INSURANCE PARTNER
├── Revenue share: 25% of savings
├── White-label licensing available
├── Co-marketing opportunities
└── Preferred integration status
```

### Phase 3: Market Leadership (Year 3+)

**Industry Platform + Ecosystem**

```
PLATFORM PRICING
├── Core subscription tiers maintained
├── Marketplace for third-party apps
├── API usage fees for high-volume integrations
├── Professional services: $200-300/hour
├── Training and certification programs
└── Industry consulting services
```

---

## Implementation Roadmap

### Technical Requirements

**Month 1-2: Basic Usage Tracking**
- [ ] Case counting and billing logic
- [ ] Usage dashboard for customers
- [ ] Basic subscription management
- [ ] Payment processing integration

**Month 3-4: Advanced Pricing Features**
- [ ] Feature flags for tier enforcement
- [ ] Overage calculations and alerts
- [ ] Volume discount automation
- [ ] Revenue reporting and analytics

**Month 5-6: Enterprise Features**
- [ ] SSO integration
- [ ] White-label customization
- [ ] Advanced billing and invoicing
- [ ] Customer success dashboards

### Go-to-Market Strategy

**Phase 1: Direct Sales + Freemium**
- Target: SMB employers and case managers
- Channel: Direct sales, content marketing, freemium conversion
- Goal: 50 paid customers in 6 months

**Phase 2: Insurance Partnerships**
- Target: Regional insurers and brokers
- Channel: Partner sales, revenue sharing
- Goal: 2-3 insurance partners with 200+ clients

**Phase 3: Platform Expansion**
- Target: Enterprise + ecosystem partners
- Channel: Enterprise sales + marketplace
- Goal: Platform with 1000+ organizations

---

## Financial Projections

### Revenue Model Scenarios

**Conservative (Year 1)**
```
Customer Mix:
├── 100 Free tier users (conversion target)
├── 40 Professional subscribers ($149/month)
├── 3 Enterprise subscribers ($499/month)
└── Annual Revenue: ~$85K

Assumptions:
├── 15% free-to-paid conversion
├── $50 average overage per Professional customer
└── 5% monthly churn rate
```

**Optimistic (Year 2)**
```
Customer Mix:
├── 500 Free tier users
├── 150 Professional subscribers
├── 15 Enterprise subscribers
├── 2 Insurance partnerships (revenue share)
└── Annual Revenue: ~$450K

Growth drivers:
├── Partner channel activation
├── Feature expansion and pricing optimization
└── Market expansion beyond WorkSafe Victoria
```

**Target (Year 3)**
```
Customer Mix:
├── 1000+ Platform users across all tiers
├── 300 Professional subscribers
├── 50 Enterprise subscribers
├── 5 Insurance partnerships
├── Marketplace revenue stream
└── Annual Revenue: ~$1.2M

Platform benefits:
├── Network effects and vendor lock-in
├── Multiple revenue streams
└── Predictable recurring revenue base
```

---

## Risk Analysis

### Pricing Risks

**Risk: Free tier cannibalization**
- Mitigation: Clear feature limitations, upgrade prompts, time-limited trials

**Risk: Market price sensitivity**
- Mitigation: Value-based pricing, ROI calculators, flexible payment terms

**Risk: Competitive pricing pressure**
- Mitigation: Differentiation through AI and industry specialization

**Risk: Complex billing implementation**
- Mitigation: Phased rollout, third-party billing platforms, extensive testing

### Market Risks

**Risk: Regulatory changes affecting value proposition**
- Mitigation: Platform approach enabling quick adaptation

**Risk: Insurance industry consolidation**
- Mitigation: Multi-partner strategy, direct-pay options

**Risk: Economic downturn affecting customer spending**
- Mitigation: Clear ROI value proposition, flexible pricing options

---

## Success Metrics

### Key Performance Indicators

**Customer Metrics:**
- Customer acquisition cost (CAC) by channel
- Lifetime value (LTV) by customer segment
- Free-to-paid conversion rate
- Net Promoter Score (NPS)
- Customer satisfaction scores

**Financial Metrics:**
- Monthly recurring revenue (MRR)
- Annual recurring revenue (ARR)
- Revenue per customer
- Gross margin by customer tier
- Churn rate by segment

**Product Metrics:**
- Feature usage rates by tier
- Overage frequency and amounts
- Support ticket volume by tier
- Time to value (activation metrics)
- API usage growth

### Target Benchmarks (Year 1)

| Metric | Target | Notes |
|--------|--------|-------|
| Free-to-paid conversion | 15% | Industry standard for B2B freemium |
| Monthly churn rate | <5% | Acceptable for SMB market |
| CAC payback period | <12 months | Sustainable growth model |
| NPS Score | >50 | Strong customer satisfaction |
| Gross margin | >80% | SaaS industry standard |

---

## Conclusion

**Recommended Strategy: Hybrid Freemium + Tiered + Usage-Based**

The optimal pricing approach for Preventli combines:

1. **Freemium entry point** to drive market education and adoption
2. **Clear value tiers** that scale with customer size and needs
3. **Usage-based overage** that captures growth value
4. **Partnership models** for insurance channel distribution
5. **Platform evolution** toward industry ecosystem leadership

This strategy balances market penetration with revenue optimization while providing clear upgrade paths and value alignment across customer segments.

**Next Steps:**
1. Implement basic usage tracking and billing infrastructure
2. Launch with simplified freemium + professional tiers
3. Gather customer feedback and usage data for optimization
4. Develop insurance partnership models
5. Plan enterprise tier and platform features for year 2

**Success Criteria:**
- 50 paid customers by month 6
- $85K ARR by end of year 1
- 2-3 insurance partnerships by month 12
- Platform roadmap defined by month 9

---

*Analysis completed: 2026-01-10*
*Recommended review cycle: Quarterly*
*Next update: April 2026*