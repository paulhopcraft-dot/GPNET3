# Setup Context7 MCP Server

Install and configure Context7 for ecosystem-wide code intelligence.

## What is Context7?

Context7 is an MCP (Model Context Protocol) server that provides:
- 🔍 **Cross-project code search** - Search across all 7 modules simultaneously
- 🧠 **Semantic understanding** - Finds code by meaning, not just keywords
- 🔗 **Relationship mapping** - Understands how modules interact
- 🚀 **Intelligent retrieval** - Automatically fetches relevant context
- ⚡ **Fast performance** - Faster than manual grep/glob

## Quick Start

```bash
# Dry run (see what will happen)
.\setup-context7.ps1 -DryRun

# Install and configure
.\setup-context7.ps1

# Update config only (skip npm install)
.\setup-context7.ps1 -SkipInstall
```

## What It Does

**Step 1: Prerequisites Check**
- Verifies npm and Node.js are installed

**Step 2: Read Project Registry**
- Automatically reads all project paths from `toolkit-config.yaml`
- Finds all 7 ecosystem projects (gpnet3, goassist3, govertical, goconnect, GoAgent, gomemory, gocontrol)

**Step 3: Install Context7**
- Runs: `npm install -g @context7/mcp-server`
- Installs Context7 globally for all projects

**Step 4: Generate Config**
- Creates/updates Claude Desktop config at: `%APPDATA%\Claude\claude_desktop_config.json`
- Backs up existing config (timestamped)
- Adds Context7 with workspace paths for all 7 projects

**Step 5: Verification**
- Checks Context7 installation
- Displays generated configuration
- Provides next steps

## Configuration Generated

The script creates this config in Claude Desktop:

```json
{
  "mcpServers": {
    "context7-ecosystem": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"],
      "env": {
        "WORKSPACE_PATHS": "C:\\Dev\\gpnet3;C:\\Dev\\goconnect;C:\\Dev\\govertical;C:\\Dev\\GoAgent;C:\\Dev\\gocontrol;C:\\Dev\\gomemory;C:\\Dev\\goassist3"
      }
    }
  }
}
```

## After Installation

**1. Restart Claude Desktop**
- Context7 won't load until you restart
- Close all Claude windows
- Relaunch Claude Desktop

**2. Verify It's Loaded**
- Open any Claude Code session
- Context7 should appear in available MCP servers

**3. Test It Out**

Try these commands:
```
"Find all references to tenant_id across the ecosystem"
"Show me how GoAgent integrates with GoMemory"
"Where is the authorization logic used?"
"Find similar patterns to this function across all projects"
```

## Use Cases

**Cross-Module Understanding:**
```
Q: "How does GoAgent call GoMemory?"
A: Context7 finds all integration points, API calls, and data contracts
```

**Refactoring:**
```
Q: "Find all places where we check tenant_id"
A: Context7 searches across all 7 projects, returns every occurrence
```

**Architecture Review:**
```
Q: "Show me all database queries in the ecosystem"
A: Context7 finds all SQL/ORM usage across Node and Python projects
```

**Bug Investigation:**
```
Q: "Where do we handle authentication failures?"
A: Context7 finds error handling across all modules
```

## Benefits Over Manual Search

| Manual Grep/Glob | Context7 |
|------------------|----------|
| One project at a time | All projects simultaneously |
| Exact keyword match | Semantic understanding |
| Misses similar patterns | Finds related code |
| No context understanding | Understands relationships |
| Slow for large codebases | Fast indexed search |

## Troubleshooting

**"npm not found"**
- Install Node.js from: https://nodejs.org/

**"Context7 not loading"**
- Did you restart Claude Desktop?
- Check config file exists: `%APPDATA%\Claude\claude_desktop_config.json`
- Verify JSON is valid (no syntax errors)

**"Context7 can't find code"**
- Check workspace paths in config
- Ensure all project directories exist
- Try restarting Claude Desktop again

**"Config backup needed"**
- Script automatically creates backups: `claude_desktop_config.backup_YYYYMMDD_HHMMSS.json`
- Located in: `%APPDATA%\Claude\`

## Advanced Options

**Dry Run (Preview Changes):**
```bash
.\setup-context7.ps1 -DryRun
```
Shows what will happen without making changes.

**Skip Installation (Config Only):**
```bash
.\setup-context7.ps1 -SkipInstall
```
Updates config without reinstalling Context7.

**Manual Installation:**
```bash
npm install -g @context7/mcp-server
```

## Configuration Management

**View Current Config:**
```powershell
Get-Content "$env:APPDATA\Claude\claude_desktop_config.json" | ConvertFrom-Json
```

**Restore Backup:**
```powershell
Copy-Item "$env:APPDATA\Claude\claude_desktop_config.backup_*.json" "$env:APPDATA\Claude\claude_desktop_config.json"
```

**Remove Context7:**
Edit `claude_desktop_config.json` and remove the `context7-ecosystem` entry from `mcpServers`.

## Integration with Toolkit

Context7 works seamlessly with existing toolkit features:

- `/eval` - Use Context7 to quickly navigate to failing tests
- `/review` - Context7 helps find related code during review
- `/tdd` - Find similar test patterns across projects
- `/security-scan` - Context7 helps find all security-sensitive code

## Notes

- Context7 is **read-only** - never modifies code
- Configuration is **global** - available in all Claude sessions
- Workspace paths **automatically sync** from toolkit-config.yaml
- Works with both **Node.js and Python** projects
- **No API keys** required - runs locally

## Resources

- Context7 GitHub: https://github.com/context7/mcp-server
- MCP Documentation: https://modelcontextprotocol.io/
- Toolkit Config: `toolkit-config.yaml`

$ARGUMENTS
