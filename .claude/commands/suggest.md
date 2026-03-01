---
description: Intelligent tool suggestion system - analyzes context and recommends optimal commands
---

# Intelligent Tool Suggestion System

Automatically analyze your current situation and suggest the best commands to use.

## Usage

```bash
/suggest                    # Analyze current context and suggest tools
/suggest [task-description] # Get suggestions for specific task
/suggest --mode=workflow    # Suggest workflow for current phase
/suggest --mode=emergency   # Emergency/recovery suggestions
```

## How It Works

The suggestion system analyzes multiple factors:

### Context Analysis
- **Git state**: Dirty working directory, current branch, commits ahead/behind
- **Project structure**: Presence of features.json, PRD files, test directories
- **File patterns**: Recently modified files, error logs, TODO comments
- **Session history**: Recent commands used, current workflow phase
- **Performance**: Context usage, response times, error frequency

### Intelligent Recommendations

#### 🚀 **Project Start Scenarios**
```
Detected: Empty/new project directory
→ Suggests: /prd-generator → /init-project → /branch create
```

#### 🔧 **Development Workflow**
```
Detected: features.json exists, clean git state
→ Suggests: /continue → /status → /add-feature
```

#### 🐛 **Problem Detection**
```
Detected: Modified files, failing tests, error logs
→ Suggests: /recover → /review → /validate
```

#### 🎯 **Feature Completion**
```
Detected: Feature branch, passing tests, ready files
→ Suggests: /verify → /review → /smart-commit → /branch merge
```

#### ⚡ **Performance Issues**
```
Detected: High context usage, slow responses
→ Suggests: /context-monitor → /fast-path → /auto-optimize
```

#### 🤖 **Automation Opportunities**
```
Detected: Repetitive tasks, complex features, overnight work
→ Suggests: /ralph-loop → /autonomous → /smart-batch
```

## Suggestion Algorithms

### 1. **State-Based Suggestions**
```python
def analyze_git_state():
    if dirty_working_directory():
        return ["/smart-commit", "/recover", "/validate"]
    elif feature_branch_ahead():
        return ["/verify", "/review", "/branch merge"]
    elif behind_main():
        return ["/branch sync", "/resolve", "/worktree"]
    else:
        return ["/continue", "/add-feature", "/status"]
```

### 2. **Pattern-Based Suggestions**
```python
def analyze_file_patterns():
    if has_failing_tests():
        return ["/tdd", "/review", "/recover"]
    elif has_new_requirements():
        return ["/prd-check", "/add-feature", "/constraints"]
    elif has_performance_issues():
        return ["/auto-optimize", "/fast-path", "/context-monitor"]
    else:
        return ["/continue", "/verify"]
```

### 3. **Workflow-Based Suggestions**
```python
def analyze_workflow_phase():
    if starting_new_feature():
        return ["/prd-check", "/constraints", "/branch create"]
    elif implementing_feature():
        return ["/continue", "/tdd", "/validate"]
    elif reviewing_work():
        return ["/verify", "/review", "/security-scan"]
    elif preparing_release():
        return ["/verify", "/smart-commit", "/handoff"]
```

## Example Suggestions

### **Scenario**: First time in project
```
🔍 Analysis:
- No features.json found
- Empty git repository
- No recent activity

💡 Suggestions:
1. /prd-generator "Describe your project" - Create project specification
2. /init-project - Set up project structure
3. /index - Generate codebase overview
4. /branch create feature/setup - Create first feature branch
```

### **Scenario**: Stuck on complex problem
```
🔍 Analysis:
- Multiple file modifications
- No recent commits
- High context usage

💡 Suggestions:
1. /think "Analyze current problem" - Extended thinking
2. /constraints - Define problem boundaries
3. /perspectives - Multi-viewpoint analysis
4. /expert - Consult domain specialist
5. /fresh - Reset context if needed
```

### **Scenario**: Ready for overnight development
```
🔍 Analysis:
- features.json with pending stories
- PRD validation passed
- Dev server configured

💡 Suggestions:
1. /prd-harden - Final PRD validation
2. /ralph-loop --max-iterations 10 - Autonomous overnight development
3. /autonomous - Alternative workflow orchestrator
4. /smart-batch - Optimized batch processing
```

### **Scenario**: Performance concerns
```
🔍 Analysis:
- Context usage >70%
- Slow response times
- Repetitive operations

💡 Suggestions:
1. /auto-optimize - Enable token optimization
2. /fast-path - Route simple tasks to Haiku
3. /context-monitor - Track usage patterns
4. /smart-batch - Optimize operations
5. /fresh - Consider context reset
```

## Integration with Other Commands

### **Proactive Suggestions**
- Other commands can trigger suggestions automatically
- `/status` shows relevant next steps
- `/verify` suggests follow-up actions
- `/recover` provides recovery options

### **Learning System**
- Tracks which suggestions you use
- Adapts recommendations based on your patterns
- Improves accuracy over time
- Learns project-specific workflows

## Advanced Features

### **Emergency Mode**
```bash
/suggest --mode=emergency
# When things are broken, prioritizes recovery commands
```

### **Workflow Planning**
```bash
/suggest --mode=workflow
# Plans entire workflows, not just next command
```

### **Performance Mode**
```bash
/suggest --mode=performance
# Focuses on speed and optimization suggestions
```

## Command Priority Matrix

### **High Priority** (Always suggest when applicable)
- `/recover` - When errors detected
- `/verify` - Before merging/releasing
- `/prd-check` - Before starting work
- `/context` - When approaching limits

### **Medium Priority** (Contextually relevant)
- `/continue` - During development
- `/review` - After significant changes
- `/think` - For complex problems
- `/autonomous` - For large tasks

### **Low Priority** (Optimization/convenience)
- `/auto-optimize` - Performance enhancement
- `/smart-commit` - Workflow efficiency
- `/fast-path` - Speed optimization
- `/remember` - Context preservation

This intelligent suggestion system ensures you always know which tool to use when, making the full command set discoverable and contextually relevant.