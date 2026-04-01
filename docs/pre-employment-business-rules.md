# Pre-Employment Health Check — Business Rules

## Workflow (Status Flow)

1. **Pending** — Assessment created, questionnaire link sent to candidate, awaiting response
2. **Questionnaire Received** (`in_progress`) — Candidate submitted health questionnaire, AI has generated report comparing responses against job description
3. **Completed** — Human has made final approve/reject decision

## AI Report Generation

- Triggered automatically when candidate submits questionnaire via magic link
- AI compares health responses against the **job description** attached to the assessment
- Always sets clearance to `cleared_conditional` — never auto-approves or auto-rejects
- Report includes: executive summary, health status, fitness assessment, flags/concerns, conditions, notes
- AI's actual recommendation stored in `reportJson.aiRecommendation` for display

## Clearance Levels

| Level | Meaning |
|-------|---------|
| `cleared_conditional` | AI has reviewed, **human approval still required** |
| `cleared_unconditional` | Human has approved — candidate cleared to start |
| `not_cleared` | Human has rejected |
| `cleared_with_restrictions` | Cleared but with specific work restrictions |
| `requires_review` | Flagged for additional clinical review |

## Human Approval

- HR manager reads the AI report (via **View Report** button)
- Two actions: **Approve — Cleared to Start** or **Reject — Not Cleared**
- No auto-approval — a human must always make the final call
- Approval sets `status = completed` + `clearanceLevel = cleared_unconditional`
- Rejection sets `status = completed` + `clearanceLevel = not_cleared`

## Dashboard List Rules

- Show only assessments **awaiting action** (hide fully approved/completed)
- Maximum **5 records** displayed, newest first
- Cleared/approved candidates disappear from active list but remain in database as permanent record
- "Awaiting Action" stat counts: pending + in_progress (anything not yet completed)

## Assessment Setup

- Create assessment with: candidate name, position title, assessment type, job description
- Job description is used by AI to assess fitness for the specific role
- System generates a magic link (`/check/:token`) for the candidate to fill in their health questionnaire

## Follow-Up Reminders (TODO)

- Day 1 after sending link → reminder email to candidate
- Day 2 → second reminder to candidate
- Day 3 → alert to HR that candidate hasn't responded

## Production Deployment

- Local dev: `LLM_PROVIDER=claude-cli` (uses Max plan OAuth, free)
- Production: `LLM_PROVIDER=openrouter` + `OPENROUTER_API_KEY` (pay-per-use, ~$0.003/report)
- Email: SendGrid via SMTP (`SMTP_HOST=smtp.sendgrid.net`, `SMTP_USER=apikey`)
