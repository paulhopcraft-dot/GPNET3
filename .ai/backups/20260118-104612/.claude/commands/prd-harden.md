# PRD Hardening Command

## Metadata
```yaml
name: prd-harden
description: Mandatory PRD validation gate for Ralph autonomous execution
version: 1.0.0
category: ralph
requires_project: true
blocks_ralph: true
```

## Purpose

Validates and hardens PRDs through mandatory questions before allowing Ralph autonomous execution.
This is a **critical safety gate** - Ralph cannot execute without a validated PRD.

## Usage

```bash
/prd-harden
```

## How It Works

1. **Validates PRD exists** (features.json with userStories)
2. **Forces validation questions** for each user story:
   - Atomic completeness (≤30 min per story)
   - Browser-verifiable acceptance criteria
   - Prerequisites and dependencies
   - Rollback procedures
   - Edge case handling
3. **System-level validation**:
   - Integration testing plan
   - Environment requirements
   - Complete feature rollback
4. **Creates approval file** (`.ralph-approved.json`) only after full validation
5. **Blocks Ralph execution** until PRD is approved

## Validation Questions (Mandatory)

### Per User Story:
- **Atomic Completeness**: Can Ralph complete this in one 30-min iteration?
- **Browser Testability**: What exact elements will Ralph check for success?
- **Prerequisites**: What must exist before Ralph starts this story?
- **Failure Recovery**: How does Ralph undo this story if it fails?
- **Edge Cases**: How to handle network failures, user states, etc.?

### System Level:
- **Integration Impact**: What existing features could this break?
- **Data Dependencies**: Database changes, migrations needed?
- **Environment Setup**: Services, env vars, ports required?
- **Testing Strategy**: Which tests should Ralph run?
- **Complete Rollback**: How to undo the entire feature?

## Output

Creates `.ralph-approved.json` with:
- Validated user stories
- Browser verification criteria
- Rollback procedures
- Prerequisites checklist
- Approval timestamp

## Integration

**Blocks Ralph**: `/ralph-loop` command checks for `.ralph-approved.json` and refuses to run without it.

**No Bypasses**: This validation cannot be skipped - Ralph safety depends on hardened PRDs.

## Examples

### Valid Browser Verification Criteria:
```json
"acceptanceCriteria": [
  "browser_verify: exists #login-form",
  "browser_verify: text .error-msg contains 'Invalid email'",
  "browser_verify: url contains '/dashboard'"
]
```

### Invalid Criteria (Will Be Rejected):
```json
"acceptanceCriteria": [
  "user experience should be smooth",  // Not testable
  "performance should be good",        // No clear success measure
  "should look nice"                   // Subjective
]
```

## Error Handling

- **No features.json**: Guides to `/prd-generator`
- **Missing userStories**: Shows schema and examples
- **Untestable criteria**: Helps convert to browser-verifiable
- **Missing dependencies**: Blocks until mapped and verified
- **User skips questions**: Forces completion

This command ensures Ralph only executes on bulletproof PRDs.