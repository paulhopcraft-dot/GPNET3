# Toolkit Configuration

View and manage toolkit settings from `toolkit-config.yaml`.

## Usage

- `/config` - Show all settings
- `/config model` - Show/change model setting
- `/config brief` - Show morning brief settings
- `/config projects` - Show project registry
- `/config sync` - Show sync settings
- `/config tests` - Show test runner settings

## Instructions

1. Read `toolkit-config.yaml` from the toolkit root
2. Parse the YAML and display settings based on the argument
3. If user wants to change a setting, edit the YAML file

## Display Format

```
TOOLKIT CONFIGURATION
=====================
Model: sonnet
Thinking: normal

Morning Brief:
  Channels: 4 configured
  Max videos: 5
  Lookback: 24h

Projects: 7 registered
  HIGH: gpnet3, goconnect, govertical, GoAgent, gocontrol
  CRITICAL: gomemory
  LOW: goassist3

Sync: auto=off, on_commit=off
Tests: parallel=off, verbose=off
```

## Changing Settings

When user asks to change a setting:
1. Read current toolkit-config.yaml
2. Use Edit tool to modify the specific value
3. Confirm the change

Example:
- "set model to opus" -> Edit model: opus
- "add channel @anthropic" -> Add to morning_brief.channels list

$ARGUMENTS
