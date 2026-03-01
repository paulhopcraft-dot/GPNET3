# Plan: Set Up Remote Access for GPNet Testing

## Goal
Establish Cloudflare tunnel to expose the local GPNet development server for remote testing access.

## Constraints
- Do not modify server code or CORS settings (already configured from previous setup)
- Do not create new user accounts (use existing)
- Do not commit tunnel URLs or temporary access details to git
- Keep tunnel process running in background terminal

## Execution Briefing (Auto-Generated)
📋 TASK SUMMARY: Create Cloudflare tunnel for remote GPNet access
📊 WORK BREAKDOWN: 6 total steps
🧠 MODEL ALLOCATION: Primary=SONNET | OPUS:0 SONNET:6 HAIKU:0
⚡ APPROACH: Infrastructure setup with verification
🎯 KEY COMMANDS: Bash commands for tunnel, browser verification
⏱️ ESTIMATED SCOPE: Low complexity - expect 1 session (~10 min)
🔍 CRITICAL PATHS: Step 3 (tunnel creation), Step 5 (verification)

## Steps
1. [SONNET] Verify backend server is running on localhost:5000 (check with curl or browser)
2. [SONNET] Verify frontend dev server is running on localhost:5173
3. [SONNET] Start Cloudflare tunnel pointing to backend: cloudflared tunnel --url http://localhost:5000
4. [SONNET] Copy the generated tunnel URL (format: https://[random-words].trycloudflare.com)
5. [SONNET] Test tunnel URL responds - verify login page loads at tunnel URL
6. [SONNET] Document access credentials and tunnel URL for tester

## Done When
- Cloudflare tunnel URL is accessible from external network
- Login page loads at tunnel URL
- Authentication works with existing test credentials
- Dashboard displays after successful login
- Tunnel URL and credentials documented for sharing

## Test Credentials (Existing)
- Admin: natalie@preventli.com / TestUser123!
- Employer: employer@symmetry.local / ChangeMe123!

## Notes
- Tunnel URL changes each time cloudflared restarts
- Tunnel stays active as long as terminal process runs
- Previous successful tunnel: https://joel-facial-aqua-productivity.trycloudflare.com (expired)
