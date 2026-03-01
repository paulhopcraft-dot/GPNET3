---
name: v
version: 1.0.0
description: Quick Vault Capture - Instantly save thoughts to Obsidian vault
aliases: [vault-capture, quick-note]
tags: [obsidian, capture, productivity]
---

# Vault Capture Command

**Instantly capture thoughts, todos, and ideas to your Obsidian vault.**

Quick capture with automatic categorization and YAML frontmatter generation.

---

## Usage

**Basic Capture:**
```
/v "your thought here"
```

**Examples:**
```
/v "fix authentication bug"          → tasks/inbox/
/v "what if we used Redis?"          → ideas/
/v "meeting notes from standup"     → notes/
```

---

## Implementation

Execute the vault capture using Bash tool:

```
Use Bash tool to run:
powershell -ExecutionPolicy Bypass -File "./vault-writer.ps1" -Content "$ARGUMENTS" -ConfigPath "./vault-config.json"
```

Report success with:
- File path created
- Category assigned
- Content preview
- Performance timing

---

## Auto-Categorization Rules

**→ Tasks/Todos** (tasks/inbox/): fix, add, update, create, build, todo, implement, remove, delete
**→ Ideas** (ideas/): what if, maybe, could, idea:, consider, explore
**→ Notes** (notes/): note, meeting, call, summary, recap
**→ Default** (tasks/inbox/): Everything else

---

## Expected Output Format

```
✅ Vault Capture Complete

File: 2026-01-22-1905-fix-authentication-bug.md
Location: C:\Users\Paul\Documents\Obsidian Vault\tasks\inbox\
Category: todo (detected: "fix")
Time: 0.8s

Preview:
---
created: 2026-01-22T19:05:00Z
type: todo
tags: [quick-capture, task]
---

# Fix Authentication Bug

fix authentication bug
```

---

**Instant thought-to-vault workflow for seamless capture.**
