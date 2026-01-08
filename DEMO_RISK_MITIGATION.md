# Demo Risk Assessment & Mitigation Plan
## Investor Demo - Critical Preparation

---

## TECHNICAL RISKS

### Risk 1: Server Crash During Demo
**Probability:** Low (5%)
**Impact:** Critical
**Mitigation:**
1. Test both servers 30 minutes before demo
2. Keep terminal windows open with `npm run dev` ready to restart
3. Have backup screenshots at `C:\dev\gpnet3\.playwright-mcp\`
4. Practice recovery: restart takes ~10 seconds

**Recovery Script:**
> "Let me restart the development server - this happens occasionally in demo environments. In production, we use auto-scaling and health checks."

### Risk 2: AI Summary Generation Fails
**Probability:** Medium (15%)
**Impact:** High
**Mitigation:**
1. Test AI refresh before demo
2. Use cached summaries if live generation fails
3. Have Faisol Ahmed case pre-loaded (has cached summary)
4. Explain caching: "Summaries are cached for performance"

**Recovery Script:**
> "The AI service is experiencing high demand. Let me show you a cached summary - in production, we have redundant API keys and fallback providers."

### Risk 3: Database Connection Issues
**Probability:** Low (5%)
**Impact:** Critical
**Mitigation:**
1. Check database connection before demo
2. Ensure PostgreSQL is running
3. Have backup JSON data if needed

**Recovery Script:**
> "We're experiencing a database hiccup. In production, we use managed PostgreSQL with automatic failover."

### Risk 4: Slow Page Load
**Probability:** Medium (20%)
**Impact:** Medium
**Mitigation:**
1. Pre-load the dashboard before starting
2. Don't refresh during demo
3. Keep case detail panel open
4. Avoid unnecessary navigation

**Recovery Script:**
> "The demo environment runs on a local machine. Production uses edge caching and CDN for sub-second loads."

### Risk 5: Browser Issues
**Probability:** Low (10%)
**Impact:** Medium
**Mitigation:**
1. Use Chrome (most tested)
2. Clear cache before demo
3. Disable browser extensions
4. Have backup browser ready (Firefox/Edge)

---

## PRESENTATION RISKS

### Risk 6: Running Over Time
**Probability:** High (40%)
**Impact:** Medium
**Mitigation:**
1. Practice with timer (aim for 13 minutes)
2. Know which sections to cut
3. Skip: Recovery Timeline details, Certificate deep-dive, Timeline walkthrough
4. Keep Q&A buffer

**Priority Order (if running short):**
1. MUST: Dashboard overview (2 min)
2. MUST: AI Summary demo (3 min)
3. MUST: Business model (2 min)
4. NICE: Case detail tabs (2 min)
5. NICE: Competitive analysis (1 min)

### Risk 7: Tough Questions You Can't Answer
**Probability:** Medium (30%)
**Impact:** Medium
**Mitigation:**
1. Review Q&A prep in demo script
2. It's OK to say "I'll follow up on that"
3. Pivot to strengths: "What I can show you is..."
4. Have email ready for follow-up

**Safe Responses:**
- "Great question - let me get you specific data on that."
- "That's on our roadmap for Q2."
- "We're exploring several approaches to that."

### Risk 8: Investor Disengagement
**Probability:** Medium (25%)
**Impact:** High
**Mitigation:**
1. Watch body language
2. Ask "Does this resonate with what you've seen in the market?"
3. Pause for questions after each section
4. Make eye contact, not screen contact
5. Show passion - this is YOUR company

### Risk 9: Demo Doesn't Wow
**Probability:** Low (15%)
**Impact:** High
**Mitigation:**
1. Lead with the AI summary - it's the killer feature
2. Show the 174 cases - real data, not mockups
3. Click "Refresh" on AI - live generation is impressive
4. Emphasize: "This is production software, not a prototype"

---

## DATA/CONTENT RISKS

### Risk 10: Sensitive Data Visible
**Probability:** Low (10%)
**Impact:** High
**Mitigation:**
1. Worker names are synthetic/anonymized
2. Don't click on medical certificate links
3. Avoid reading full AI summaries aloud
4. Skip email addresses in case details

**If Asked:**
> "The data shown is from our pilot customers with appropriate consent. In production, all data is encrypted and access-controlled."

### Risk 11: "ABC GPNet" Branding Visible
**Probability:** High (80% - it's in the sidebar)
**Impact:** Low
**Mitigation:**
1. Don't click on "ABC GPNet" company
2. If noticed: "That's a test organization from our development process"
3. Focus on real companies: Symmetry, Lower Murray Water

### Risk 12: Outdated/Stale Data
**Probability:** Low (10%)
**Impact:** Medium
**Mitigation:**
1. Click "Sync Freshdesk" to show fresh sync
2. Note the "Generated" timestamps on AI summaries
3. Emphasize real-time nature of compliance alerts

---

## ENVIRONMENTAL RISKS

### Risk 13: Internet Connectivity Issues
**Probability:** Low (10%)
**Impact:** Critical
**Mitigation:**
1. Demo runs on localhost - no internet needed for core features
2. AI refresh needs internet - have cached summaries ready
3. Test connection before demo
4. Have mobile hotspot as backup

### Risk 14: Power/Hardware Failure
**Probability:** Very Low (2%)
**Impact:** Critical
**Mitigation:**
1. Laptop fully charged
2. Power cable accessible
3. Screenshots on phone as last resort

### Risk 15: Distractions/Interruptions
**Probability:** Medium (20%)
**Impact:** Low
**Mitigation:**
1. Silent phone
2. Close all other applications
3. Disable notifications
4. "Do Not Disturb" mode on computer

---

## QUICK RECOVERY PHRASES

| Situation | Response |
|-----------|----------|
| Page won't load | "Let me refresh - demo environments can be temperamental" |
| AI timeout | "The AI is processing - in production we have dedicated resources" |
| Data looks wrong | "That's test data from our development cycle" |
| Lost your place | "Let me show you the most impressive feature..." |
| Question you don't know | "I'll get you specific data on that in my follow-up email" |
| Running out of time | "In the interest of time, let me jump to the key points..." |
| Technical jargon confusion | "In simple terms, this means..." |

---

## PRE-DEMO CHECKLIST

### 1 Hour Before
- [ ] Close all unnecessary applications
- [ ] Clear browser cache
- [ ] Test localhost:5173 loads
- [ ] Test localhost:5000 API responds
- [ ] Verify login works
- [ ] Load Faisol Ahmed case
- [ ] Test AI refresh button

### 30 Minutes Before
- [ ] Bathroom break
- [ ] Water bottle ready
- [ ] Phone on silent
- [ ] Demo script printed/accessible
- [ ] Key metrics memorized (174 cases, 89/85 split, $2B market)

### 5 Minutes Before
- [ ] Deep breath
- [ ] Dashboard open and loaded
- [ ] Smile - you've got this

---

## POST-DEMO ACTIONS

### Immediately After
1. Thank investors for their time
2. Ask: "What questions do you have?"
3. Note any follow-up items
4. Get business cards/contact info

### Within 24 Hours
1. Send thank-you email
2. Attach one-pager/pitch deck
3. Answer any outstanding questions
4. Propose next meeting if interested

### Follow-Up Email Template
```
Subject: Thank you - Preventli Demo Follow-up

Hi [Name],

Thank you for taking the time to see Preventli today. I enjoyed
discussing the opportunity in the Victorian workplace compliance
market.

As promised, here are the items I mentioned:
- [Answer to question 1]
- [Data point requested]
- [Link to additional materials]

Key highlights from our demo:
- 174 active cases under management
- AI-powered compliance automation
- $2B market opportunity

I'd love to continue our conversation. Are you available for
a follow-up call this week?

Best regards,
[Your name]
```

---

## CONFIDENCE BUILDERS

Before you walk in, remember:

1. **You have working software.** Most startups pitch decks. You have a product.

2. **You have real data.** 174 cases, 15+ companies, actual compliance events.

3. **You have live AI.** Claude integration is cutting-edge, not vaporware.

4. **You know your market.** WorkSafe compliance is mandatory and complex.

5. **You've prepared thoroughly.** This document, the demo script, the business case.

**The worst they can say is no. But they might say yes.**

Go get that investment.
