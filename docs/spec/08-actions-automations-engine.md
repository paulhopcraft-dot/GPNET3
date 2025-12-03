# 08 — Action, Notification & Automations Engine

The automations engine operates in two primary modes: Suggest mode as the default, where actions are recommended for case manager review before execution, and Auto-Send mode for high-confidence scenarios where actions can be executed automatically. The system generates three primary action types including emails to workers, host sites, or GPs, internal task assignments for case managers, and scheduled reminders for follow-up activities. Actions are created based on rule triggers and utilize customizable templates to ensure consistent communication.

Rules evaluate case state changes, time-based conditions, and data patterns to generate appropriate actions at the right moments in the case lifecycle. Each action is logged with full audit trails capturing what was suggested, what was executed, who approved it, and when it occurred. This comprehensive logging supports both operational oversight and compliance documentation requirements.

The template system allows organisations to customize communication tone, branding, and content while maintaining required legal and regulatory language. Templates support variable substitution for personalizing communications with case-specific details, and can be configured with approval workflows for sensitive or high-risk communications.
