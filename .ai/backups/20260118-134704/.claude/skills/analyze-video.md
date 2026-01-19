# Analyze Video

Intelligent video analysis pipeline: transcribe YouTube videos, analyze for ecosystem relevance, and generate PRDs for actionable insights.

## Usage

- `/analyze-video [URL]` - Full analysis of YouTube video
- `/analyze-video [URL] --quick` - Quick analysis (skip PRD generation)
- `/analyze-video list` - Show recent discoveries

## What It Does

**Complete Pipeline:**
1. **Transcribe** - Download and transcribe video (local Whisper)
2. **Analyze** - Evaluate relevance to your ecosystem (GPNet3, GoAgent, GoMemory, etc.)
3. **Score** - Rate relevance 0-10 per project
4. **Generate** - Create PRD + implementation prompt (if score ≥7)
5. **Save** - Store in `discoveries/` folder with tags
6. **Present** - Show summary and next actions

## Ecosystem Context

Analyzes against:
- **GPNet3** - AI platform foundation
- **GoAgent** - Multi-agent orchestration system
- **GoMemory** - Personal AI memory system
- **GoConnect** - Connection management
- **GoVertical** - Vertical-specific solutions
- **GoControl** - Control systems
- **GoAssist** - AI assistant platform
- **Toolkit** - Claude Code Toolkit itself

## Relevance Criteria

**Score 9-10: Critical**
- Directly solves current problem
- Fills major capability gap
- Industry best practice

**Score 7-8: High**
- Useful technique/pattern
- Performance improvement
- Quality of life enhancement

**Score 5-6: Medium**
- Interesting idea
- Might be useful later
- Reference material

**Score 0-4: Low**
- Not applicable
- Wrong tech stack
- Too generic

## Output Structure

### Analysis Summary
```
ANALYZING VIDEO
===============

Video: [Title]
Duration: [X] minutes
Transcript: [Y] words

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RELEVANCE ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overall Score: 8/10 ⭐ HIGH RELEVANCE

Project Relevance:
  GoAgent:    9/10 - [reasoning]
  Toolkit:    8/10 - [reasoning]
  GoMemory:   6/10 - [reasoning]
  Others:     3/10 - Low relevance

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KEY INSIGHTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. [Insight with explanation]
2. [Technique or pattern]
3. [Tool or approach]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ACTIONABLE ITEMS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ PRD Generated
📁 discoveries/2026-01-06-topic.md

Next Steps:
1. Review PRD
2. Run /build-prd to implement
3. Or: Add to TODO.md for later
```

### Generated PRD (if score ≥7)
```markdown
# Discovery: [Topic]

**Source:** [YouTube URL]
**Date:** [YYYY-MM-DD]
**Relevance:** [X]/10 ([Primary Projects])

## Problem

[What problem does this solve?]

## Proposed Solution

[High-level approach]

## Benefits for Ecosystem

**[Project 1]:**
- [Benefit]
- [Improvement]

**[Project 2]:**
- [Benefit]

## Implementation Plan

### Step 1: [First Step]
[Details or code example]

### Step 2: [Next Step]
[Details]

## Estimated Effort

- Research: [X] hours
- Implementation: [Y] hours
- Testing: [Z] hours
- Total: [N] hours

## Priority

[HIGH/MEDIUM/LOW] - [Reasoning]

## Tags

#[project] #[category] #[technique]

## Implementation Prompt

[Ready-to-use prompt for building this]

---

**Ready to implement?** Run: `/build-prd [filename]`
```

## Discovery Log

All discoveries saved to:
- `discoveries/YYYY-MM-DD-topic.md` - Individual discovery
- `discoveries/index.md` - Searchable index
- Tagged and scored for easy filtering

## Examples

### Example 1: High Relevance (Generate PRD)
```
/analyze-video https://youtube.com/watch?v=agent-patterns

→ Score: 9/10
→ PRD Generated
→ Saved: discoveries/2026-01-06-agent-orchestration-patterns.md
```

### Example 2: Low Relevance (Skip)
```
/analyze-video https://youtube.com/watch?v=cooking-tips

→ Score: 1/10
→ Not relevant to ecosystem
→ Logged but no PRD
```

### Example 3: Quick Analysis
```
/analyze-video https://youtube.com/watch?v=xyz --quick

→ Score: 7/10
→ Key insights shown
→ No PRD (quick mode)
```

## Integration

**Uses:**
- `/transcribe-video` - For transcription
- Ecosystem context from project files
- TODO.md for current priorities

**Feeds:**
- `/remember` - Save insights to memory
- `/build-prd` - Implement discovery
- `/morning-brief` - Can analyze brief videos

**Enhances:**
- Passive learning → Active development
- Video watching → Code implementation
- Random ideas → Structured PRDs

## Configuration

From `toolkit-config.yaml`:
```yaml
analyze_video:
  min_relevance_for_prd: 7      # Minimum score to generate PRD
  auto_add_to_todo: false       # Auto-add high-priority discoveries
  discovery_retention: 90       # Days to keep discoveries
```

## Instructions

When user runs `/analyze-video [URL]`:

1. **Validate URL**
   - Check it's a YouTube URL
   - Extract video ID

2. **Transcribe**
   - Run `.\transcribe-video.ps1 -Url "[URL]"`
   - Wait for completion
   - Get transcript path

3. **Load Context**
   - Read ecosystem project descriptions
   - Load TODO.md priorities
   - Get current sprint focus

4. **Analyze Content**
   - Read full transcript
   - Identify key concepts/techniques/tools
   - Score against each project (0-10)
   - Calculate overall relevance

5. **Generate Output**
   - Create analysis summary
   - If score ≥7: Generate full PRD
   - Save to discoveries/
   - Update index

6. **Present Results**
   - Show formatted summary
   - Highlight actionable items
   - Suggest next steps

## Best Practices

**When analyzing:**
- Be specific in reasoning (why this score?)
- Identify concrete techniques, not vague ideas
- Map to existing architecture
- Consider implementation effort

**When generating PRDs:**
- Make them actionable (ready to code from)
- Include code examples
- Estimate effort realistically
- Tag appropriately for search

**When presenting:**
- Lead with relevance score
- Show top 3 insights
- Clear next actions
- Link to full discovery

## Notes

- First transcription may take longer (downloads Whisper model)
- Analysis quality improves with ecosystem context
- PRDs are starting points, not complete specs
- Review discoveries weekly for planning

$ARGUMENTS
