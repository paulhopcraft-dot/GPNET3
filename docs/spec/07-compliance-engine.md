# 07 — Compliance & Breach Detection Engine

The compliance engine continuously monitors case data against a comprehensive set of business rules to detect potential breaches and compliance issues. Key detection scenarios include certificate expiry, workers cleared to return-to-work without assigned duties, missed medical appointments, missed RTW shifts, assignment of unsafe duties that exceed medical restrictions, and slow response times to critical communications. These rules operate across all active cases, providing real-time visibility into compliance risks.

When potential issues are detected, the engine generates compliance flags with appropriate severity levels, creates recommended actions for case managers to address the issues, and escalates critical items according to configured escalation paths. The system maintains detailed audit logs of all detected compliance events, supporting both operational management and regulatory reporting requirements.

The rule engine is configurable at the organisation level, allowing customization of thresholds and detection criteria to match specific industry requirements, insurance policies, or regulatory frameworks. This flexibility ensures the platform can adapt to diverse operational contexts while maintaining consistent monitoring and escalation capabilities.
