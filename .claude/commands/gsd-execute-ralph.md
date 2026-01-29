# /gsd-execute-ralph - Execute GSD Phase via Ralph Loop

Execute a GSD phase plan using Ralph's autonomous execution loop with fresh context per task.

## Usage

```
/gsd-execute-ralph --phase <N> [options]
```

## Arguments

- `--phase <N>` - Phase number to execute (required)
- `--skip-harden` - Skip PRD hardening validation step
- `--dry-run` - Preview conversion without executing
- `--verify-only` - Run verification pass on existing implementation

## Prerequisites

1. **GSD plan exists**: `.planning/PLAN.md` or `.planning/phases/{phase}/PLAN.md`
2. **Bridge configured**: `.claude/gsd-ralph-bridge.json` must exist
3. **Ralph available**: `ralph/ralph.sh` must be executable
4. **Dev server running** (if browser verification enabled)

## Execution Flow

```
Step 1: Convert GSD Plan → features.json
        ./ralph/gsd-to-ralph.ps1 -Phase {N}

Step 2: Validate with PRD Hardening (unless --skip-harden)
        /prd-harden

Step 3: Execute via Ralph Loop
        ./ralph/ralph.sh --gsd-mode

Step 4: Sync Results → .planning/RESULTS.md
        ./ralph/ralph-to-gsd.ps1 -Phase {N}

Step 5: Report completion status
```

## Instructions

When the user runs `/gsd-execute-ralph`, execute these steps:

### Step 1: Validate Prerequisites

1. Check `.claude/gsd-ralph-bridge.json` exists
2. Check GSD plan exists at `.planning/PLAN.md` or phase-specific path
3. Verify `ralph/ralph.sh` is available

If prerequisites missing, report what's needed.

### Step 2: Convert Plan to Features

Run the converter:
```powershell
./ralph/gsd-to-ralph.ps1 -Phase {phase_number} -Merge
```

Report: number of tasks converted, stories generated.

### Step 3: PRD Hardening (unless --skip-harden)

Run `/prd-harden` to validate the generated features.json.

If validation fails, stop and report issues.

### Step 4: Execute Ralph

For bash environments:
```bash
./ralph/ralph.sh --gsd-mode
```

For Windows/PowerShell (WSL):
```powershell
wsl -d Ubuntu bash -c "cd /mnt/d/dev/claude-code-toolkit && ./ralph/ralph.sh --gsd-mode"
```

Monitor execution and report progress.

### Step 5: Sync Results

Run the results synchronizer:
```powershell
./ralph/ralph-to-gsd.ps1 -Phase {phase_number}
```

### Step 6: Report Completion

Provide summary:
- Phase number
- Tasks completed vs total
- Success rate
- Path to RESULTS.md
- Next steps recommendation

## Examples

### Execute Phase 1
```
/gsd-execute-ralph --phase 1
```

### Preview Conversion Only
```
/gsd-execute-ralph --phase 2 --dry-run
```

### Verify Existing Implementation
```
/gsd-execute-ralph --phase 1 --verify-only
```

### Skip PRD Validation
```
/gsd-execute-ralph --phase 3 --skip-harden
```

## Error Handling

| Error | Resolution |
|-------|------------|
| Plan not found | Run `/gsd:plan-phase {N}` first |
| Bridge config missing | Create `.claude/gsd-ralph-bridge.json` |
| PRD validation fails | Fix issues reported by /prd-harden |
| Ralph execution fails | Check ralph/progress.txt for details |
| No dev server | Start server or disable browser_verify |

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    /gsd-execute-ralph                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  GSD PLAN.md │ -> │ gsd-to-ralph │ -> │ features.json│  │
│  │  (input)     │    │ (converter)  │    │  (Ralph fmt) │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                    │         │
│                                                    v         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ RESULTS.md   │ <- │ralph-to-gsd  │ <- │  ralph.sh    │  │
│  │ (GSD format) │    │ (sync)       │    │  (execute)   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Related Commands

- `/gsd:plan-phase` - Create phase plan (prerequisite)
- `/gsd:verify-work` - Validate after execution
- `/gsd:progress` - Check overall project status
- `/prd-harden` - Validate PRD before execution
- `/ralph-loop` - Direct Ralph execution (no GSD integration)

## Files Created/Modified

| File | Purpose |
|------|---------|
| `features.json` | Ralph-compatible stories (modified/created) |
| `.ralph-approved.json` | PRD approval marker |
| `.planning/RESULTS.md` | Execution results for GSD |
| `ralph/progress.txt` | Detailed execution log |
