# Add Feature

Add a new feature to GPNet3 domain memory:

## Gather Information

1. Feature name (short, descriptive)
2. Feature description (1-2 sentences)
3. Related files (existing or to be created)
4. Acceptance criteria (testable requirements)
5. Dependencies on other features

## Add to Domain Memory

Update `.claude/domain_memory.json`:

```json
{
  "id": "F0XX",
  "name": "Feature Name",
  "description": "Brief description of what this feature does",
  "passes": false,
  "files": ["server/routes/feature.ts", "client/src/components/Feature.tsx"],
  "acceptanceCriteria": [
    "Criterion 1",
    "Criterion 2",
    "Criterion 3"
  ],
  "notes": "Optional implementation notes"
}
```

## Update Dependencies

If this feature depends on others, add to dependencies map:

```json
"dependencies": {
  "F0XX": ["F001", "F002"]
}
```

## Start Implementation

After adding to domain memory:
1. Create branch: `git checkout -b wip-gpnet-<feature>`
2. Implement feature
3. Test against acceptance criteria
4. Update `passes: true` when complete
