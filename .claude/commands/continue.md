# Continue Development

Resume work on GPNet3:

1. Read `.claude/domain_memory.json` to check feature status
2. Find the next incomplete feature (`passes: false`) or highest priority item
3. Read the feature's files to understand current state
4. Implement or fix the feature
5. Run verification: `npm test && npm run build`
6. Update domain_memory.json if feature is now complete
7. Create a focused commit with conventional prefix

## Priority Order

1. Features with `passes: false`
2. Items in `incomplete` array (TODOs)
3. User-requested features
4. Enhancements to existing features

## Before Starting

- Check git status for uncommitted changes
- Ensure dev server is running: `npm run dev`
- Review recent commits for context

## After Completing

- Mark feature as `passes: true` in domain_memory.json
- Run full test suite
- Commit with descriptive message
