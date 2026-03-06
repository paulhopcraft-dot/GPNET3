# GPNet3 Worktrees

## Active

| Path | Branch | Purpose |
|------|--------|---------|
| `/mnt/d/dev/gpnet3` | `main` | Bug fixes, general development |
| `/mnt/d/dev/gpnet3-deploy` | `wip-deployment` | Staging/production deployment setup |
| `/mnt/c/Dev/worktrees/onboarding` | `feature/onboarding` | Onboarding feature work |

## How to use

Start Claude in the directory for the work you want:

- Bug fixes: `cd /mnt/d/dev/gpnet3` then `/continue`
- Deployment: `cd /mnt/d/dev/gpnet3-deploy` then `/continue`
- Onboarding: `cd /mnt/c/Dev/worktrees/onboarding` then `/continue`

## Dead (prunable)

These directories no longer exist — safe to prune:

- `C:/Dev/gpnet3-dashboard-fix` [fix/dashboard-issues]
- `C:/Dev/gpnet3-summary-fix` [fix/summary-improvements]
- `C:/Dev/gpnet3-testing` [fix/testing-improvements]
- `C:/Dev/worktrees/missing-info-prompts` [feature/missing-info-prompts]
- `C:/Dev/worktrees/presentations-work` [feature/presentations-work]

To clean up dead worktrees:
```
git -C /mnt/d/dev/gpnet3 worktree prune
```
