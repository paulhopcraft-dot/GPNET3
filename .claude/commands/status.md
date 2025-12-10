# Project Status

Generate a status report for GPNet3:

1. Read `.claude/domain_memory.json`
2. Count features by status:
   - Working (`passes: true`)
   - Incomplete (`passes: false`)
   - TODOs in `incomplete` array
3. Check git status for pending changes
4. List recent commits
5. Report any blockers or issues

## Report Format

```
═══════════════════════════════════════════════════════════════
📊 GPNET3 STATUS REPORT
═══════════════════════════════════════════════════════════════

Branch: [current branch]
Last commit: [commit message]

FEATURES:
├── Working: X/Y
├── Incomplete: Z
└── TODOs: N

NEXT PRIORITIES:
1. [Feature name] - [brief description]
2. [Feature name] - [brief description]

GIT STATUS:
- [staged/unstaged changes summary]

═══════════════════════════════════════════════════════════════
```

## Checks

- Run `npm test` for test status
- Run `npm run build` for TypeScript status
- Check for uncommitted changes
