# Discoveries

Your personal knowledge base of actionable insights from videos, articles, and research.

## What This Is

**Discoveries** = Content analyzed for relevance to your ecosystem + PRDs for implementation

Instead of:
- ❌ Watching videos → Forgetting ideas
- ❌ Taking notes → Never acting on them
- ❌ Bookmarking → Losing track

You get:
- ✅ Video → Transcript → Analysis → PRD → Code
- ✅ Relevance scoring (only save what matters)
- ✅ Implementation-ready specs
- ✅ Searchable archive with tags

---

## How It Works

```
YouTube Video
     ↓
/analyze-video [URL]
     ↓
Transcribe (local Whisper)
     ↓
Analyze (Claude evaluates relevance)
     ↓
Score (0-10 per project)
     ↓
Generate PRD (if score ≥7)
     ↓
Save to discoveries/
```

---

## File Structure

```
discoveries/
├── README.md                                    (this file)
├── index.md                                     (searchable index)
├── _analysis-prep.md                            (temp file for Claude)
├── 2026-01-06-agent-orchestration-patterns.md   (9/10 - GoAgent)
├── 2026-01-07-memory-optimization-techniques.md (8/10 - GoMemory)
└── 2026-01-08-vector-search-best-practices.md   (7/10 - GoMemory)
```

---

## Discovery Format

Each discovery includes:

### Header
- **Source:** YouTube URL
- **Date:** When discovered
- **Relevance:** Overall score + primary projects
- **Tags:** Searchable keywords

### Content
- **Problem:** What does this solve?
- **Solution:** High-level approach
- **Benefits:** Per-project breakdown
- **Implementation Plan:** Step-by-step with code examples
- **Effort Estimate:** Time to implement
- **Priority:** HIGH/MEDIUM/LOW
- **Implementation Prompt:** Ready-to-use prompt for building

---

## Usage

### Analyze a Video
```bash
.\analyze-video.ps1 -Url "https://youtube.com/watch?v=..."
```

### List Recent Discoveries
```bash
.\analyze-video.ps1 -List
```

### Quick Analysis (No PRD)
```bash
.\analyze-video.ps1 -Url "https://youtube.com/watch?v=..." -Quick
```

### Implement a Discovery
```bash
# Read the PRD
cat discoveries/2026-01-06-topic.md

# Then either:
/build-prd 2026-01-06-topic   # Auto-implement
# Or manually follow the implementation plan
```

---

## Relevance Scoring

**9-10: Critical** ⭐⭐⭐
- Directly solves current problem
- Fills major capability gap
- Industry best practice worth adopting

**7-8: High** ⭐⭐
- Useful technique or pattern
- Clear performance improvement
- Quality of life enhancement

**5-6: Medium** ⭐
- Interesting idea
- Might be useful later
- Good reference material

**0-4: Low**
- Not applicable to ecosystem
- Wrong tech stack
- Too generic or basic

---

## Tags

Common tags for filtering:

**By Project:**
- #goagent #gomemory #gpnet3 #goconnect #govertical #gocontrol #goassist #toolkit

**By Category:**
- #architecture #optimization #patterns #security #testing #deployment

**By Technique:**
- #orchestration #memory #agents #vector-search #transcription #api-design

---

## Weekly Review

Recommended workflow:

**Every Sunday:**
1. Run `.\analyze-video.ps1 -List`
2. Review discoveries from past week
3. Pick 1-2 high-priority items
4. Add to sprint planning
5. Archive low-relevance items (score <5)

---

## Integration

**Feeds into:**
- `/build-prd` - Implement discoveries
- `/remember` - Save insights to long-term memory
- TODO.md - Add to task backlog
- Sprint planning - Prioritize work

**Fed by:**
- `/analyze-video` - Video analysis
- `/analyze-brief` - Morning AI news
- Manual additions - Your own insights

---

## Best Practices

### When Analyzing
- Be critical (only save what's truly useful)
- Score honestly (don't inflate relevance)
- Tag thoroughly (future searchability)
- Note effort realistically

### When Implementing
- Start with HIGH priority discoveries
- Group related discoveries
- Test thoroughly
- Update discovery with results

### When Archiving
- Keep discoveries with score ≥7
- Archive score <5 after 30 days
- Update index when moving files

---

## Examples

### High-Value Discovery
```markdown
# Discovery: Hierarchical Agent Orchestration

**Relevance:** 9/10 (GoAgent, Toolkit)
**Problem:** Flat agent structure can't handle complex tasks
**Solution:** Implement coordinator + specialist + verifier pattern
**Effort:** 7 hours (~1 day)
**Priority:** HIGH

[Full PRD with code examples...]
```

### Low-Value (Skipped)
```
Video: "10 JavaScript Tips for Beginners"
Score: 2/10 - Not relevant (we use TypeScript, beyond basics)
Action: Logged but no PRD generated
```

---

## Configuration

From `toolkit-config.yaml`:
```yaml
discoveries:
  min_relevance_for_prd: 7      # Generate PRD at this score
  auto_add_to_todo: false       # Auto-add HIGH priority
  retention_days: 90            # Archive older discoveries
  primary_projects:             # Focus analysis on these
    - GoAgent
    - GoMemory
    - Toolkit
```

---

## Stats

Total Discoveries: 0
High Priority (≥9): 0
Medium Priority (7-8): 0
Implemented: 0

Last Updated: 2026-01-06

---

**Start discovering!** Run: `.\analyze-video.ps1 -Url "https://youtube.com/watch?v=..."`
