# Vault Todos

List all pending tasks from your Obsidian vault.

## Usage
```
/vault-todos [filter]
```

## Behavior
- Finds all `[ ]` items across vault
- Groups by source file
- Shows pending vs completed count
- Optional filter by folder/project name

## Examples
```
/vault-todos              # All todos
/vault-todos govertical   # Only govertical project
```

## Execute

```powershell
.\vault-reader.ps1 -Action todos -Filter "$ARGUMENTS"
```

Report the todo list to the user.
