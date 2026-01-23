Mark a to-do as complete and auto-sync.

Arguments: $ARGUMENTS (search term)

1. Read ~/claude-code-toolkit/global-todos.md

2. Find matching item(s) in "## Pending"
   - If multiple matches, ask user to pick

3. Move to "## Completed" with date:
   - [x] YYYY-MM-DD **[project]** task

4. Save the file

5. Auto-sync (run in ~/claude-code-toolkit):
   git add global-todos.md && git commit -m "done: $ARGUMENTS" && git pull --rebase && git push

6. Confirm: "Completed and synced."
