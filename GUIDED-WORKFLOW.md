# Guided Development Workflow
## Your Interactive Development Teacher

This guide transforms the Claude Code Toolkit into an **interactive teacher** that walks you through development, testing, and deployment with best practices built-in.

**For:** Non-technical users who want to learn proper development workflows
**Mode:** `guided_mode: enabled` in `toolkit-config.yaml`

---

## 🎓 How Guided Mode Works

When guided mode is enabled, I will:

1. ✅ **Explain WHY** we do each step (not just WHAT)
2. ✅ **Suggest which tools** to use from the toolkit
3. ✅ **Ask for approval** before risky actions
4. ✅ **Show best practices** as we work
5. ✅ **Verify each step** and explain how
6. ✅ **Teach you** to recognize when to use which features

---

## 📊 The Development Lifecycle

Every development task follows this flow:

```
START → PLAN → BUILD → TEST → REVIEW → COMMIT → DEPLOY → REFLECT
  ↑                                                            ↓
  └────────────────────── LEARN & IMPROVE ←───────────────────┘
```

Let me explain each stage and which toolkit features to use:

---

## 1️⃣ START - Understanding What to Build

### What Happens
- You describe what you want to build or fix
- I help clarify requirements
- We agree on scope and success criteria

### Toolkit Features to Use

| Situation | Command | Why |
|-----------|---------|-----|
| Starting any session | `/status` | Shows project state, recent work, what's next |
| Need project context | `/reload` | Loads all project files and memory |
| Forgot where we left off | Read `claude-progress.txt` | See what we did last session |
| Complex requirements | Ask questions | Clarify before building |

### Example Dialog

**You:** "I want to add a login feature"

**Me (Guided Mode):**
> 📋 **CLARIFYING REQUIREMENTS**
>
> Before we start, let me understand what you need:
> 1. What type of login? (Email/password, OAuth, magic link?)
> 2. Where does user data come from? (New database, existing system?)
> 3. What happens after successful login? (Redirect, show dashboard?)
>
> **Why I'm asking:** Different login types need different tools and security practices.
>
> **Next:** Once clarified, I'll suggest whether to use `/decide` (choose auth library) or spawn an Opus agent (design auth architecture).

---

## 2️⃣ PLAN - Designing the Solution

### What Happens
- I break down the task into steps
- We identify which files need changes
- We spot potential risks
- We agree on the approach

### Toolkit Features to Use

| Situation | Command | Why |
|-----------|---------|-----|
| Need to explore codebase | Spawn **Explore agent** | Fast, thorough codebase search |
| Choosing libraries/frameworks | `/decide` with Opus | Architectural decisions need deep reasoning |
| Risky change (auth, payment, data) | `/anticipate` | Devil's advocate - what could go wrong? |
| Multiple approaches possible | Spawn **Plan agent** | Designs implementation strategy |
| Complex multi-step task | `/think` or `/think-parallel` | Deep reasoning for complex problems |
| Need architectural design | Use Task tool with `model: "opus"` | Opus excels at design decisions |

### When to Use Which Agent

**Explore Agent (subagent_type: Explore):**
- "How does authentication work in this codebase?"
- "Find all API endpoints that handle payments"
- "What files handle database connections?"

**Plan Agent (subagent_type: Plan):**
- "Plan how to implement user notifications"
- "Design the architecture for real-time chat"
- "How should we refactor this module?"

**Opus Model (model: "opus"):**
- "Should we use Redis or Memcached for caching?"
- "Design the database schema for multi-tenant system"
- "What's the best authentication strategy for our use case?"

### Example Dialog

**You:** "Add password reset functionality"

**Me (Guided Mode):**
> 📐 **PLANNING PHASE**
>
> Let me explore how authentication currently works:
> 1. **Using Explore agent** to find auth-related code
> 2. **Why:** Need to understand existing patterns before adding features
>
> [Agent explores codebase...]
>
> ✅ **Found:** Login system uses JWT tokens, email service is configured
>
> **Plan:**
> 1. Create password reset token system (new database table)
> 2. Add API endpoint POST /auth/reset-password
> 3. Send email with reset link
> 4. Create reset password form
> 5. Add tests for security (token expiry, one-time use)
>
> **Risky areas:** Email delivery, token security, timing attacks
>
> **Recommendation:** Let's run `/anticipate` to check what could go wrong
>
> **Proceed with this plan?**

---

## 3️⃣ BUILD - Writing the Code

### What Happens
- I write code following best practices
- I explain what each piece does
- I show you patterns to learn from
- We use TDD when appropriate

### Toolkit Features to Use

| Situation | Command | Why |
|-----------|---------|-----|
| Building new function/class | `/tdd` | Test-driven development teaches good habits |
| Need to match existing style | Read similar code first | Consistency matters |
| Working on separate feature | `/branch` or `/worktree` | Isolate changes from main code |
| Complex implementation | Break into small steps | Easier to test and understand |
| Need specific functionality | Check if library exists | Don't reinvent the wheel |

### Best Practices I'll Teach

✅ **Security:**
- Never commit passwords or API keys
- Validate all user input
- Use parameterized queries (prevent SQL injection)
- Hash passwords with bcrypt/argon2

✅ **Code Quality:**
- Clear variable names (`getUserById` not `f2`)
- Small functions (one responsibility)
- Comments explain WHY, not WHAT
- Handle errors gracefully

✅ **Testing:**
- Test happy path (success)
- Test edge cases (empty input, null, huge numbers)
- Test error conditions (network fails, disk full)

### Example Dialog

**You:** "Build the password reset endpoint"

**Me (Guided Mode):**
> 🏗️ **BUILDING: Password Reset Endpoint**
>
> **Using TDD approach** (test-first development):
>
> **Why TDD?** Writing tests first helps us think through:
> - What should happen when token is valid?
> - What if token is expired?
> - What if user doesn't exist?
>
> **Step 1: Write the test**
> ```javascript
> test('should reset password with valid token', async () => {
>   // We're testing the BEHAVIOR we want
> })
> ```
>
> **Step 2: Write minimal code to pass test**
>
> **Step 3: Refactor (clean up code)**
>
> **Toolkit Command:** `/tdd password-reset-endpoint`
>
> **Security Best Practice:** I'll use bcrypt for password hashing (never store plain text!)
>
> **Proceed?**

---

## 4️⃣ TEST - Verifying It Works

### What Happens
- Run automated tests
- Manual testing if needed
- Check for edge cases
- Verify security

### Toolkit Features to Use

| Situation | Command | Why |
|-----------|---------|-----|
| Before any commit | Run tests automatically | Catch bugs before they go to production |
| Feature complete | `/verify` | Runs full test suite + checks |
| Tests failing | Debug and fix | Never commit broken code |
| New feature works | `/validate` | Independent verification |
| Load/performance test needed | Spawn test agent | Check scalability |

### What I'll Check

✅ **Functionality:** Does it do what it's supposed to?
✅ **Edge Cases:** Empty input, huge input, special characters
✅ **Errors:** What happens when things go wrong?
✅ **Security:** Can it be exploited?
✅ **Performance:** Is it fast enough?

### Example Dialog

**You:** "Is the password reset working?"

**Me (Guided Mode):**
> 🧪 **TESTING PHASE**
>
> **Running Test Suite:**
> ```
> npm test
> ```
>
> **Why:** Automated tests catch regressions (breaking existing features)
>
> ✅ All 47 tests passing
>
> **Manual Verification Checklist:**
> 1. ✅ Can request password reset with valid email
> 2. ✅ Email received with reset link
> 3. ✅ Reset link works and changes password
> 4. ✅ Can login with new password
> 5. ✅ Old password no longer works
>
> **Security Checks:**
> 1. ✅ Token expires after 1 hour
> 2. ✅ Token only works once
> 3. ✅ Invalid email doesn't reveal user existence (timing attack prevention)
>
> **Recommendation:** Run `/security-scan` since we touched auth code
>
> **All checks passed! Ready to commit?**

---

## 5️⃣ REVIEW - Quality Check

### What Happens
- I review the code for issues
- Check for security problems
- Verify best practices followed
- Get your approval

### Toolkit Features to Use

| Situation | Command | Why |
|-----------|---------|-----|
| Before every commit | `/review` | Catch issues early |
| 100+ lines changed | Mandatory review | Bigger changes = more risk |
| Touched auth/payment code | `/security-scan` | Security is critical |
| Complex logic added | Explain the code | Make sure it's understandable |

### What Gets Reviewed

✅ **Security vulnerabilities**
✅ **Performance issues**
✅ **Code complexity** (too complicated?)
✅ **Test coverage** (is everything tested?)
✅ **Documentation** (can others understand it?)

### Example Dialog

**You:** "Ready to commit"

**Me (Guided Mode):**
> 👀 **CODE REVIEW**
>
> **Why:** Catch bugs before they reach production (fixing bugs in production is 10x harder!)
>
> **Changes:** 3 files, 127 lines added
>
> **Toolkit Command:** `/review` (automatic for 100+ line changes)
>
> **Review Results:**
> ✅ Security: No vulnerabilities found
> ✅ Tests: All new code covered
> ✅ Performance: No issues
> ⚠️ Suggestion: Add JSDoc comment to resetPassword function
>
> **Should I add the documentation comment before committing?**

---

## 6️⃣ COMMIT - Saving Your Work

### What Happens
- Save changes to git with clear message
- Follow conventional commit format
- Update progress log

### Toolkit Features to Use

| Situation | Command | Why |
|-----------|---------|-----|
| Ready to save work | Git commit (automatic) | Track changes, enable rollback |
| Need good commit message | I'll write it | Clear history helps future debugging |
| Multiple features done | Separate commits | One feature = one commit |

### Commit Message Format

```
type(scope): short description

Longer explanation of what changed and why.

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code cleanup (no behavior change)
- `test:` Add or fix tests
- `docs:` Documentation only

### Example Dialog

**You:** "Commit the changes"

**Me (Guided Mode):**
> 💾 **COMMITTING CHANGES**
>
> **Why commit often?** Small commits make it easy to:
> - Undo mistakes (just revert one commit)
> - Track when bugs were introduced
> - Review history of changes
>
> **Commit Message:**
> ```
> feat(auth): add password reset functionality
>
> - Created reset token system with 1-hour expiry
> - Added POST /auth/reset-password endpoint
> - Integrated with email service
> - Added comprehensive security tests
> - Prevents timing attacks on user enumeration
> ```
>
> **Best Practice:** One feature per commit (easier to review and revert)
>
> **After commit:** Will update `claude-progress.txt` so we remember what we did
>
> **Commit now?**

---

## 7️⃣ DEPLOY - Releasing to Production

### What Happens
- Push code to repository
- Deploy to server
- Monitor for issues
- Have rollback plan

### Toolkit Features to Use

| Situation | Command | Why |
|-----------|---------|-----|
| Before any deploy | Run tests one more time | Final safety check |
| Deploying to production | Ask for confirmation | Destructive action needs approval |
| Feature complete | Create pull request | Get team review |
| After deploy | Monitor logs/errors | Catch issues early |

### Deployment Checklist

✅ **All tests passing?**
✅ **Code reviewed?**
✅ **Database migrations tested?**
✅ **Rollback plan ready?**
✅ **Monitoring enabled?**

### Example Dialog

**You:** "Deploy to production"

**Me (Guided Mode):**
> 🚀 **DEPLOYMENT - SAFETY CHECK**
>
> **⚠️ This is a risky action!** Let me verify we're ready:
>
> **Pre-Deploy Checklist:**
> ✅ All tests passing (47/47)
> ✅ Code reviewed and approved
> ✅ Changes committed to git
> ⚠️ **REQUIRED:** Database migration (add reset_tokens table)
>
> **Deployment Plan:**
> 1. Run database migration on production DB
> 2. Deploy new code to server
> 3. Test password reset on production
> 4. Monitor error logs for 10 minutes
>
> **Rollback Plan:**
> - If issues occur: `git revert HEAD` and redeploy
> - Database migration is reversible
>
> **Best Practice:** Deploy during low-traffic hours (fewer users affected if issues)
>
> **Current time:** 2:30 PM (medium traffic)
>
> **Recommendation:** Wait until 10 PM (low traffic) OR proceed now with extra caution?
>
> **Your decision:**

---

## 8️⃣ REFLECT - Learning & Improvement

### What Happens
- Review what went well
- Note what to improve
- Save learnings for future
- Update documentation

### Toolkit Features to Use

| Situation | Command | Why |
|-----------|---------|-----|
| After completing feature | `/reflect` | Capture learnings |
| Important decision made | `/remember` | Save to memory for future sessions |
| Found useful pattern | Document it | Help future development |
| Session ending | `/handoff` | Clean session end, save state |

### What We Learn

✅ **Patterns that worked** (reuse them!)
✅ **Mistakes made** (avoid repeating)
✅ **Tools that helped** (use again)
✅ **Areas to improve** (focus next time)

### Example Dialog

**You:** "Password reset is deployed and working"

**Me (Guided Mode):**
> 🎓 **REFLECTION - What Did We Learn?**
>
> **What Went Well:**
> ✅ TDD approach caught security issue early (expired token handling)
> ✅ Using existing email service saved time
> ✅ Comprehensive tests prevented production bugs
>
> **What We Learned:**
> 📚 **Pattern:** Token-based workflows need:
>    - Expiry mechanism
>    - One-time use enforcement
>    - Secure random generation
>
> 📚 **Security:** Always prevent user enumeration (timing attacks)
>
> 📚 **Toolkit Usage:** `/anticipate` helped us think through edge cases
>
> **Saving to Memory:**
> Using `/remember` to save this auth pattern for future features
>
> **Documentation:**
> Should I add a README section on "How Password Reset Works" for the team?
>
> **Next Steps:**
> - Monitor production for 24 hours
> - Consider adding 2FA (two-factor auth) next
>
> **Anything else before I run `/handoff`?**

---

## 🔧 Toolkit Features - Quick Reference

### When Starting

| I Want To... | Use This | Example |
|--------------|----------|---------|
| See project status | `/status` | "What's the current state?" |
| Continue previous work | `/continue` | "What should I work on?" |
| Load full context | `/reload` | "Show me everything" |
| Work autonomously | `/autonomous` | "Keep working until done" |

### When Planning

| I Want To... | Use This | Example |
|--------------|----------|---------|
| Explore codebase | Explore agent | "How does auth work here?" |
| Design architecture | Opus agent | "Design a caching strategy" |
| Plan implementation | Plan agent | "Plan how to add notifications" |
| Make decision | `/decide` | "Should we use REST or GraphQL?" |
| Check risks | `/anticipate` | "What could go wrong with this change?" |

### When Building

| I Want To... | Use This | Example |
|--------------|----------|---------|
| Test-driven development | `/tdd` | "Build with tests first" |
| Work in isolation | `/branch` or `/worktree` | "Create feature branch" |
| Complex problem | `/think` | "Need deep reasoning" |
| Parallel planning | `/think-parallel` | "Consider multiple approaches" |

### When Testing

| I Want To... | Use This | Example |
|--------------|----------|---------|
| Run tests | `npm test` / `pytest` | "Check if it works" |
| Verify feature | `/verify` | "Comprehensive check" |
| Independent validation | `/validate` | "Blind verification" |
| Security check | `/security-scan` | "Check for vulnerabilities" |

### When Reviewing

| I Want To... | Use This | Example |
|--------------|----------|---------|
| Code review | `/review` | "Check code quality" |
| Merge conflicts | `/resolve` | "Help fix conflicts" |

### When Finishing

| I Want To... | Use This | Example |
|--------------|----------|---------|
| Save learning | `/reflect` | "What did we learn?" |
| Store context | `/remember` | "Save this for later" |
| End session | `/handoff` | "Clean session end" |
| Check progress | `claude-progress.txt` | "What did we accomplish?" |

---

## 🎯 Decision Trees

### "Should I Use an Agent?"

```
Do you need to explore/search the codebase?
├─ YES → Use Explore agent (fast, thorough)
└─ NO ↓

Is this an architectural decision?
├─ YES → Use Opus agent or /decide
└─ NO ↓

Is this a multi-step implementation?
├─ YES → Use Plan agent
└─ NO → Just ask me directly
```

### "Which Model Should I Use?"

```
Is this a big decision? (architecture, library choice, schema design)
├─ YES → Spawn Opus agent
└─ NO ↓

Is this routine coding? (CRUD, API endpoints, tests)
├─ YES → Use Sonnet (default)
└─ NO ↓

Do you need it fast and cheap? (simple tasks, exploration)
└─ YES → Use Haiku
```

### "Should I Use TDD?"

```
Are you building a new function or class?
├─ YES → Use /tdd
└─ NO ↓

Is the logic complex with edge cases?
├─ YES → Use /tdd
└─ NO ↓

Is this security-critical? (auth, payment, data access)
├─ YES → Use /tdd
└─ NO → Regular development is fine
```

---

## 🛡️ Safety Rails (Guided Mode)

When `guided_mode.safety_prompts: true`, I will **always ask** before:

⚠️ **Destructive Actions:**
- Deleting files or directories
- Force pushing to git
- Dropping database tables
- Removing dependencies

⚠️ **Production Actions:**
- Deploying to production
- Running database migrations on prod
- Changing production config

⚠️ **Security Sensitive:**
- Committing files with secrets
- Changing auth/authorization code
- Modifying payment processing

⚠️ **Large Changes:**
- Changing >100 lines of code
- Refactoring multiple files
- Upgrading major dependencies

---

## 💡 Best Practices (Taught Automatically)

### Security
✅ Never commit API keys, passwords, or secrets
✅ Validate all user input
✅ Use parameterized queries (prevent SQL injection)
✅ Hash passwords with bcrypt/argon2
✅ Implement rate limiting on auth endpoints
✅ Use HTTPS for all production traffic

### Testing
✅ Test happy path (things work)
✅ Test edge cases (empty, null, huge values)
✅ Test error conditions (network fails, disk full)
✅ Test security (injection, unauthorized access)
✅ Aim for >80% code coverage

### Git Workflow
✅ Commit often (small, focused commits)
✅ Use conventional commit messages
✅ One feature = one commit
✅ Test before committing
✅ Review before merging to main

### Code Quality
✅ Clear naming (getUserById not f2)
✅ Small functions (one responsibility)
✅ Comments explain WHY, not WHAT
✅ Handle errors gracefully
✅ Keep it simple (avoid over-engineering)

---

## 📚 How to Get the Most from Guided Mode

### 1. Ask "Why?"
If I don't explain something, ask! "Why are we using TDD here?" or "Why spawn an Opus agent?"

### 2. Request Explanations
Say "Explain this like I'm new to coding" and I'll break it down further.

### 3. Challenge Recommendations
If something doesn't make sense, question it! "Why can't we just deploy now?"

### 4. Learn the Patterns
After a few tasks, you'll recognize: "Ah, this is a `/decide` moment" or "I should use `/anticipate` here"

### 5. Adjust Verbosity
Too much explanation? Say "Be more concise"
Not enough detail? Say "Explain more"

---

## 🎓 Your Learning Journey

### Week 1: Following Along
- I guide every step
- You learn the workflow
- Focus: Understanding WHY

### Week 2-3: Recognizing Patterns
- You start to predict: "Should we use /tdd here?"
- I confirm and explain
- Focus: Building intuition

### Week 4+: Growing Independence
- You suggest which tools to use
- I validate your choices
- Focus: Confident decision-making

**Goal:** Eventually you'll think: "This is risky, let me run /anticipate first" without prompting!

---

## 🚀 Ready to Start!

With guided mode enabled, every development task becomes a **learning opportunity**.

**Try it now!**
Tell me: "I want to add [feature]" and watch how I guide you through the entire process with explanations, tool suggestions, and best practices.

**You'll learn:**
- When to use which toolkit features
- How to think about development systematically
- Best practices for security, testing, and deployment
- Confidence in making technical decisions

---

**Remember:** There are no stupid questions in guided mode. Ask "why" anytime! 🎓
