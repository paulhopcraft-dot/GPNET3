# Smart Commit - Batched Git Operations

## Purpose
Batch git operations into single optimized workflow for token efficiency.

## Usage
```bash
/smart-commit "commit message"
/smart-commit "feat: add user authentication"
```

## Implementation
Single command that efficiently handles:
1. `git add .` - Stage all changes
2. `git commit -m "message"` - Create commit
3. `git push` - Push to remote (if tracking branch exists)
4. Run test suite to verify commit didn't break anything
5. Update progress tracking

## Token Savings
- **Before**: 5 separate commands = ~15K tokens
- **After**: 1 batched workflow = ~4K tokens
- **Savings**: 73% reduction on commit workflows

## Safety Features
- Checks for uncommitted changes first
- Validates commit message format
- Runs tests before pushing
- Provides rollback if tests fail
- Updates claude-progress.txt automatically

## Example Output
```
🔄 Smart Commit: "feat: add user authentication"
✅ Staged 12 files
✅ Created commit a1b2c3d
✅ Pushed to origin/main
✅ Tests passing (25/25)
✅ Updated progress tracking

Token usage: 3.2K (saved 11.8K vs separate commands)
```