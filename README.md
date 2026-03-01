# Preventli Development Environment

This workspace is pre-configured for the Preventli stack (Express + Vite + React + Drizzle). The repo now includes helper configuration so that Claude Code, OpenAI Codex, and GitHub Copilot can collaborate on architecture, refactors, and inline implementation work.

## Prerequisites

1. **Node.js 20+** and npm
2. **PostgreSQL** running locally on port `5432` with a `gpnet` database
3. Optional but recommended: VS Code extensions for Claude Code, OpenAI Codex (ChatGPT 5.1), GitHub Copilot, and Command Runner (for executing the custom command palette shortcuts defined in `.vscode/settings.json`)

## Environment Variables

The backend reads `.env` for critical secrets while the frontend reads `.env.local`. Only a single `DATABASE_URL` source of truth is used:

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/gpnet
NODE_ENV=development
```

Store sensitive keys such as `ANTHROPIC_API_KEY` in your OS environment or VS Code Secret Store (`Settings Sync: Edit in settings.json`), not in version control.

## Running Preventli Locally

1. Install dependencies: `npm install`
2. Apply database migrations: `npm run db:push`
3. (Optional) Seed demo data: `npm run seed`
4. Launch both backend + frontend through the background task **Run Preventli** (`Terminal → Run Task → Run Preventli`) or manually execute `npm run dev`.
5. Frontend is served from `http://localhost:5173` (Vite + HMR) via proxy to the backend at `http://localhost:5000`.

---

## Using Claude Code for Architecture, Planning, and Multi-File Refactoring

Claude Code is configured via `.vscode/claude.json` to use the `claude-3.5-sonnet` reasoning model with generous token limits and conservative temperature for predictable edits. Recommended workflow:

1. Set `ANTHROPIC_API_KEY` either in your shell environment or VS Code Secrets (`Command Palette → Preferences: Open User Settings (JSON)`).
2. Open the Command Palette and trigger the shortcuts contributed through `.vscode/settings.json`:
   - **Ask Claude About Architecture**
   - **Refactor With Claude**
   - **Review Multi-File Patch With Claude**
3. Keep `autoAcceptEdits` disabled so you can inspect Claude's change proposal before applying.
4. Reference the new README section when collaborating or delegating planning/PR review sessions.

---

## Using Codex for File and Debug Work

Codex (ChatGPT 5.1) is configured in `.vscode/codex.json` with `reasoning: "high"` to unlock multi-step code reasoning while `applyEdits: "session"` keeps control scoped to the session window.

Command Palette shortcuts exposed via `.vscode/settings.json`:

- **Use Codex for File Patch**
- **Use Codex for Debugging**
- **Use Codex for Fixing Errors**

Pair this with inline selections to request step-by-step diffs or debugging transcripts without leaving VS Code.

---

## Using Copilot for Inline Code Completions

GitHub Copilot is enabled globally plus inline suggestions/completions through `.vscode/settings.json`. Ensure you are signed in to GitHub Copilot for both editor completions and chat. Practical tips:

1. Treat Copilot as the fast path for boilerplate/primitive code.
2. Use Claude/Codex for design reviews or reasoning-heavy changes, then lean on Copilot to fill in repetitive sections.
3. When Copilot proposes a block, review diffs with `Ctrl+.` (or your OS equivalent) before confirming.

---

## Git Workflow and Automation

Branch strategy lives in `.vscode/git.json`:

- `main` – stable release-ready history
- `dev` – integration branch for in-progress work
- `feature/<name>` – short-lived feature branches

Helper VS Code tasks:

- **Create Feature Branch** prompts for a branch name and runs `git checkout -b feature/<name>`.
- **Commit & Push** stages all files, creates a `chore: workspace update` commit (edit before pushing), and pushes to the active remote.

---

## Command Palette Shortcuts Overview

The `.vscode/settings.json` file registers shortcuts (via the Command Runner extension) so they appear in `Command Palette → Command Runner: Run Command`:

- Ask Claude About Architecture
- Refactor With Claude
- Review Multi-File Patch With Claude
- Use Codex for File Patch
- Use Codex for Debugging
- Use Codex for Fixing Errors

Use these entries to kick off the appropriate AI workflow with a single keystroke.

---

## Next Steps

1. Verify PostgreSQL is running locally.
2. Run `npm run dev` (or the **Run Preventli** task).
3. Visit `http://localhost:5173` and confirm data loads from `http://localhost:5000/api/...`.
4. Experiment with the three AI assistants to establish your preferred collaboration cadence.
