# Vault Search

Search your Obsidian vault for text.

## Usage
```
/vault-search <query>
```

## Behavior
- Searches all .md files recursively
- Case-insensitive matching
- Shows filename, line number, and matching text
- Limited to first 20 results

## Execute

```powershell
.\vault-reader.ps1 -Action search -Query "$ARGUMENTS"
```

Report the search results to the user.
