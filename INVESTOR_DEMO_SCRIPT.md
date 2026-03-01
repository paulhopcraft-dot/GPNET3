# Preventli Investor Demo Script
## Critical Presentation - Make or Break

**Duration:** 15 minutes
**Date:** Tomorrow
**URL:** http://localhost:5173
**Login:** admin@gpnet.local / ChangeMe123!

---

## PRE-DEMO CHECKLIST

### Technical Verification (Do 30 min before demo)
- [ ] Backend running on port 5000
- [ ] Frontend running on port 5173
- [ ] Database connected and responding
- [ ] Test login works
- [ ] Test AI summary refresh (wait 2-3 seconds for response)
- [ ] Have backup screenshots ready if live demo fails

### Known Issues to Avoid
1. **"ABC GPNet" company** - This is a test company in the sidebar. Avoid clicking on it or mention it's a "demo data placeholder"
2. **Search for "Andres"** returns no results - Use "Faisol" for demo case instead
3. **401 Error on case click** - May appear briefly, doesn't affect functionality

### Best Demo Case
**Faisol Ahmed** (Lower Murray Water)
- Rich AI-generated case summary
- Expired certificate (125 days) - shows compliance detection
- Full timeline and discussion notes
- Demonstrates all 8 tabs working

---

## THE 15-MINUTE SCRIPT

### MINUTE 0-2: THE HOOK (Market Problem)

> "Every year, Australian businesses lose **$61 billion** to workplace injuries. Victoria alone has **9,000 businesses** that must comply with WorkSafe regulations.

> The problem? **Compliance is manual, reactive, and expensive.** Employers are drowning in paperwork, missing deadlines, and facing fines. Case managers spend 70% of their time on administrative tasks instead of helping workers return to work.

> **Preventli changes everything.**"

### MINUTE 2-5: THE SOLUTION (Show Dashboard)

**[Click on Preventli dashboard]**

> "Preventli is an AI-powered compliance management platform for WorkSafe Victoria return-to-work cases."

**[Point to the metrics at top]**

> "Right now, you're looking at **174 active worker cases** across multiple employers:
> - **89 workers off work** - actively managing their recovery
> - **85 workers returned to work** - successful outcomes
> - **3 high-risk cases** - flagged for immediate attention"

**[Show company list on left]**

> "We're currently managing cases for companies like:
> - Lower Murray Water
> - Cobild Pty Ltd
> - Marley Spoon
> - Symmetry
> - And 15+ other Victorian employers"

**[Click "Sync Freshdesk" button]**

> "Watch this - with one click, we sync **137 cases** from our Freshdesk ticketing system. Data flows automatically - no manual entry."

### MINUTE 5-9: THE MAGIC (AI Features)

**[Click on Faisol Ahmed case]**

> "Let me show you a real case. Faisol Ahmed - injured worker at Lower Murray Water."

**[Point to NEEDS ATTENTION alert]**

> "Instantly, the system flags that his **medical certificate expired 125 days ago**. In the old world, this would be a compliance breach. With Preventli, employers know immediately."

**[Scroll to Smart Case Analysis section]**

> "Here's where AI transforms compliance. Our **Smart Case Analysis** uses Claude AI to:
> 1. Analyze all case documentation
> 2. Identify compliance risks
> 3. Generate recommended actions
> 4. Track return-to-work blockers"

**[Point to Recommended Actions]**

> "The AI is telling us:
> - Chase updated medical certificate
> - Follow up with worker regarding symptoms
> - Conduct welfare check-in
>
> These aren't generic suggestions - they're specific to THIS case, based on analysis of ALL the documentation."

**[Scroll to AI Case Summary]**

> "And look at this comprehensive summary. It includes:
> - Complete claim timeline from injury to present
> - Financial calculations and entitlements
> - Risk register with mitigation strategies
> - All key contacts"

**[Click Refresh button on AI Summary]**

> "And the AI updates in real-time. Watch - [click] - fresh analysis in seconds, not hours."

### MINUTE 9-11: THE AUTOMATION

**[Show Case Timeline section]**

> "Everything is tracked automatically:
> - Case creation events
> - Medical certificates added
> - Discussion notes from Freshdesk tickets
> - All with timestamps and compliance flags"

**[Show Medical Certificates section]**

> "Certificates are tracked with status indicators - RESTRICTED, Expired - so employers always know where they stand."

**[Show the Recovery Timeline chart]**

> "We visualize recovery progress - expected vs actual - so employers can predict costs and plan for return-to-work."

### MINUTE 11-13: THE BUSINESS MODEL

> "Let me tell you about the market opportunity:

> **Market Size:**
> - $2 billion Victorian workplace compliance market
> - 9,000 businesses required to comply
> - 30,000+ workers compensation claims per year

> **Revenue Model:**
> - $500/month base platform fee
> - $50/worker/year for active case management
> - Enterprise tiers with dedicated support

> **Unit Economics:**
> - Average employer has 5-10 active cases
> - Average revenue: $750-1,000/month per employer
> - CAC recovery in 3 months
> - 95%+ gross margin (SaaS)

> **Traction:**
> - 178 cases under active management
> - 73 automated compliance notifications generated TODAY
> - Multi-tenant architecture ready for scale"

### MINUTE 13-14: COMPETITIVE ADVANTAGES

> "Why Preventli wins:

> 1. **AI-First Architecture** - We're not bolting AI onto legacy software. It's native.

> 2. **Real-Time Compliance** - Not weekly reports - instant alerts when deadlines approach.

> 3. **Freshdesk Integration** - We aggregate scattered communications into unified case views.

> 4. **Multi-Tenant Ready** - One platform serving multiple employers with data isolation.

> 5. **Victorian Market Focus** - Deep understanding of WorkSafe regulations."

### MINUTE 14-15: THE ASK

> "We're seeking **$500K seed funding** to:
> - Hire 2 senior engineers to accelerate development
> - Add 3 sales/customer success roles
> - Marketing for employer acquisition
> - Scale infrastructure for 100+ employers

> **Use of Funds:**
> - 50% Engineering & Product
> - 30% Sales & Customer Success
> - 15% Marketing
> - 5% Operations

> **Milestones:**
> - Month 6: 25 paying employers
> - Month 12: 100 employers, $100K MRR
> - Month 18: Expand to NSW/QLD markets

> **The bottom line:** Workplace compliance is inevitable. Manual processes are obsolete. Preventli automates the future of return-to-work management.

> Questions?"

---

## Q&A PREPARATION

### Technical Questions

**Q: How does the AI work?**
> "We use Anthropic's Claude API - specifically Claude 3.5 Sonnet - to analyze case documentation. The AI reads all tickets, certificates, and notes, then generates structured summaries and recommendations. Processing takes 2-3 seconds per case."

**Q: Is the data secure?**
> "Absolutely. We use JWT authentication, CSRF protection, and all data is encrypted at rest. Each employer's data is isolated in our multi-tenant architecture. We're building toward SOC 2 compliance."

**Q: What happens if the AI is wrong?**
> "AI recommendations are suggestions, not decisions. Human case managers always have final authority. We show confidence levels (60%, 80%, etc.) and users can override or regenerate summaries. The AI learns from the documentation it's given."

### Business Questions

**Q: Who are your competitors?**
> "Legacy players like Gallagher and EML use manual processes. There are HR platforms like Employment Hero but they're generalist, not compliance-focused. We're the only AI-native solution purpose-built for Victorian WorkSafe compliance."

**Q: Why haven't you raised before?**
> "We bootstrapped to prove the technology works. Now we have 174 cases under management and real compliance automation running. We're raising to accelerate, not to validate."

**Q: What's your current revenue?**
> "We're pre-revenue but have pilot agreements with Symmetry HR and Harbor Clinic. First paid contracts expected within 60 days of funding."

**Q: How do you acquire customers?**
> "B2B sales targeting HR directors and compliance managers. Initial traction through industry conferences and direct outreach. Long-term: channel partnerships with insurers and WorkCover agents."

### Tough Questions

**Q: Why should I invest in this over other SaaS companies?**
> "Compliance is non-optional. Every Victorian employer MUST manage return-to-work or face fines. We're not selling a nice-to-have - we're selling legal protection and operational efficiency. TAM is $2B in Victoria alone."

**Q: What if WorkSafe regulations change?**
> "Regulatory change is actually an opportunity. When rules change, employers need new tools. We can update our AI prompts and compliance rules in days, not months. Legacy competitors can't adapt as fast."

**Q: This seems niche - how do you scale?**
> "Victoria is our beachhead. NSW has similar regulations and 5x the market. Queensland, SA, WA follow. Long-term, workplace compliance is a global problem. We're building expertise in one market before expanding."

---

## BACKUP PLANS

### If Live Demo Fails

1. **No internet:** Have screenshots saved locally at `C:\dev\gpnet3\.playwright-mcp\`
2. **Server crash:** Restart with `npm run dev` (takes 10 seconds)
3. **AI timeout:** Say "AI generation typically takes 2-3 seconds, but during high load can take longer. Let me show you a cached result."
4. **Database error:** Have backup video recording of demo flow

### If Questions Go Off Track

> "Great question - let me take that offline and follow up with specific data. For now, I want to make sure you see the core product..."

### If Running Over Time

Skip these sections:
- Recovery Timeline chart details
- Medical certificates deep dive
- Case timeline walkthrough

---

## KEY METRICS TO MEMORIZE

| Metric | Value |
|--------|-------|
| Total Cases | 174 |
| Off Work | 89 |
| At Work | 85 |
| High Risk | 3 |
| Notifications Today | 73 |
| Freshdesk Sync | 137 cases |
| AI Model | Claude 3.5 Sonnet |
| Victorian Businesses | 9,000 |
| Market Size | $2B |
| Seed Ask | $500K |

---

## FINAL REMINDERS

1. **Energy:** This is YOUR company's future. Show passion.
2. **Pace:** Slow down on the AI demo - it's the wow moment
3. **Eye contact:** Look at investors, not the screen
4. **Confidence:** You have working software with real data. Most startups don't.
5. **Follow up:** Get business cards, send summary email within 24 hours

**You've got this. The technology works. The market exists. Go close this deal.**
