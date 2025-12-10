# Branch Management

Create and manage feature branches for GPNet3:

## Create New Branch

For new features:
```bash
git checkout main
git pull origin main
git checkout -b wip-gpnet-<feature-name>
```

Branch naming convention: `wip-gpnet-<feature>`

Examples:
- `wip-gpnet-email-templates`
- `wip-gpnet-rtw-wizard`
- `wip-gpnet-bulk-actions`

## When to Branch

Create a new branch when:
- Task affects >5 files
- Adding new API endpoints
- Schema changes required
- High-priority work that needs isolation
- Task estimated >2 hours

## Merge Back

After feature complete:
1. Run full test suite: `npm test && npm run test:e2e`
2. Ensure build passes: `npm run build`
3. Push branch: `git push -u origin wip-gpnet-<feature>`
4. Create PR to main
5. Wait for review/CI

## Cleanup

After merge:
```bash
git checkout main
git pull origin main
git branch -d wip-gpnet-<feature>
```

## Current Branches

List all branches:
```bash
git branch -a
```
