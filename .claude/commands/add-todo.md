Add a to-do item and auto-sync to GitHub.

Arguments: $ARGUMENTS

1. Get project name from git remote or folder name

2. Read ~/claude-code-toolkit/global-todos.md

3. Add under "## Pending":
   - [ ] **[project-name]** $ARGUMENTS

4. Save the file

5. Auto-sync (run in ~/claude-code-toolkit):
   git add global-todos.md && git commit -m "todo: $ARGUMENTS" && git pull --rebase && git push

6. Confirm: "Added and synced. View on iPhone via GitHub."
