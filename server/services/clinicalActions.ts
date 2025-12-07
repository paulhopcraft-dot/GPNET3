import {
  WorkerCase,
  ClinicalEvidenceEvaluation,
  ClinicalActionRecommendation,
  ClinicalActionType,
  ActionTarget,
} from "../../shared/schema";

function actionId(caseId: string, type: ClinicalActionType, target: ActionTarget): string {
  return `${caseId}:${type}:${target}`;
}

export function buildClinicalActionRecommendations(
  workerCase: WorkerCase,
  evaluation: ClinicalEvidenceEvaluation,
): ClinicalActionRecommendation[] {
  const actions: ClinicalActionRecommendation[] = [];

  const add = (
    type: ClinicalActionType,
    target: ActionTarget,
    label: string,
    explanation: string,
    relatedFlagCodes: ClinicalActionRecommendation["relatedFlagCodes"],
    suggested?: Partial<Pick<ClinicalActionRecommendation, "suggestedSubject" | "suggestedBody" | "suggestedScript">>,
  ) => {
    const id = actionId(evaluation.caseId, type, target);
    if (actions.find((a) => a.id === id)) return;
    actions.push({
      id,
      type,
      target,
      label,
      explanation,
      relatedFlagCodes,
      ...suggested,
    });
  };

  const flagCodes = evaluation.flags.map((f) => f.code);

  if (flagCodes.includes("MISSING_TREATMENT_PLAN")) {
    add(
      "REQUEST_TREATMENT_PLAN",
      "GP",
      "Request formal treatment plan",
      "There is no documented treatment plan or constraints, but the worker has an active injury.",
      ["MISSING_TREATMENT_PLAN"],
      {
        suggestedSubject: `Request for formal treatment plan – ${workerCase.workerName}`,
        suggestedBody:
          `Dear Doctor,\n\nWe do not yet have a formal treatment plan for ${workerCase.workerName}. Please provide diagnosis, treatment plan, functional capacity, expected recovery timeline, and duties the worker can and cannot perform.\n\nThank you.`,
      },
    );
  }

  if (flagCodes.includes("NO_RECENT_CERTIFICATE") || flagCodes.includes("CERTIFICATE_OUT_OF_DATE")) {
    add(
      "REQUEST_UPDATED_CERTIFICATE",
      "GP",
      "Request updated medical certificate",
      "Latest certificate is missing or out of date.",
      ["NO_RECENT_CERTIFICATE", "CERTIFICATE_OUT_OF_DATE"],
    );
  }

  if (flagCodes.includes("NOT_IMPROVING_AGAINST_EXPECTED_TIMELINE") || flagCodes.includes("RTW_PLAN_FAILING")) {
    add(
      "REQUEST_CLINICAL_EXPLANATION_FOR_DELAY",
      "GP",
      "Request explanation for delayed improvement",
      "Worker is not improving as expected or RTW plan is failing.",
      ["NOT_IMPROVING_AGAINST_EXPECTED_TIMELINE", "RTW_PLAN_FAILING"],
      {
        suggestedBody:
          `Dear Doctor,\n\nThe worker is not improving as expected. Please advise why, any barriers to recovery, whether imaging or specialist referral is needed, and your updated expectations.\n\nThank you.`,
      },
    );
    add(
      "REVIEW_RTW_PLAN_WITH_GP",
      "GP",
      "Review current RTW plan",
      "Current duties are not working; RTW plan may need to change.",
      ["RTW_PLAN_FAILING"],
    );
  }

  if (flagCodes.includes("SPECIALIST_REFERRED_NO_APPOINTMENT") || flagCodes.includes("SPECIALIST_APPOINTMENT_OVERDUE")) {
    add(
      "REQUEST_SPECIALIST_APPOINTMENT_STATUS",
      "WORKER",
      "Confirm specialist appointment status",
      "Specialist referral is on record, but attendance has not been confirmed.",
      ["SPECIALIST_REFERRED_NO_APPOINTMENT", "SPECIALIST_APPOINTMENT_OVERDUE"],
      {
        suggestedScript:
          "Hi, we have a specialist referral on file. Have you booked an appointment? If yes, when is it scheduled? Is there anything preventing you from booking or attending (transport, cost, availability)?",
      },
    );
  }

  if (flagCodes.includes("SPECIALIST_SEEN_NO_REPORT") || flagCodes.includes("SPECIALIST_REPORT_OUTDATED")) {
    add(
      "REQUEST_SPECIALIST_REPORT",
      "SPECIALIST",
      "Request specialist summary report",
      "Specialist has seen the worker, but a current summary report is not on file.",
      ["SPECIALIST_SEEN_NO_REPORT", "SPECIALIST_REPORT_OUTDATED"],
      {
        suggestedBody:
          `Dear Specialist,\n\nPlease provide a brief summary for ${workerCase.workerName}: diagnosis, current condition, functional capacity, likelihood of surgery, and return-to-work recommendations.\n\nThank you.`,
      },
    );
  }

  if (flagCodes.includes("WORKER_NON_COMPLIANT")) {
    add(
      "ESCALATE_NON_COMPLIANCE_TO_INSURER",
      "INSURER",
      "Prepare non-compliance report",
      "Worker is marked as non-compliant; insurer may need to review entitlements.",
      ["WORKER_NON_COMPLIANT"],
      {
        suggestedBody:
          `Non-compliance report for ${workerCase.workerName}:\n- Case summary\n- Timeline of non-compliant behaviour\n- References to relevant legislation/claims manual [insert section]\n- Statement of non-participation as required.`,
      },
    );
    add(
      "REVIEW_DUTIES_WITH_WORKER",
      "WORKER",
      "Discuss duties and barriers with worker",
      "Understand the worker's perspective and constraints before further escalation.",
      ["WORKER_NON_COMPLIANT"],
      {
        suggestedScript:
          "Let's review your current duties. Were they explained? Are there any barriers stopping you from doing them? What duties do you feel you can and cannot do safely?",
      },
    );
  }

  if (flagCodes.includes("EVIDENCE_INCOMPLETE")) {
    add(
      "DOCUMENT_EVIDENCE_GAP",
      "EMPLOYER_INTERNAL",
      "Document missing clinical evidence",
      "Clinical evidence is incomplete; internal note should record what is missing.",
      ["EVIDENCE_INCOMPLETE"],
    );
  }

  // NEW: Certificate expiring soon
  if (flagCodes.includes("CERTIFICATE_EXPIRING_SOON")) {
    add(
      "REQUEST_UPDATED_CERTIFICATE",
      "GP",
      "Request certificate renewal",
      "Current certificate is expiring soon; request updated certificate to avoid gap.",
      ["CERTIFICATE_EXPIRING_SOON"],
      {
        suggestedSubject: `Certificate renewal request – ${workerCase.workerName}`,
        suggestedBody:
          `Dear Doctor,\n\nThe current medical certificate for ${workerCase.workerName} is expiring soon. Please provide an updated certificate with current capacity assessment and expected recovery timeline.\n\nThank you.`,
      },
    );
  }

  // NEW: Overdue follow-up
  if (flagCodes.includes("OVERDUE_FOLLOW_UP")) {
    add(
      "OTHER",
      "WORKER",
      "Contact worker for overdue check-in",
      "Scheduled CLC follow-up is overdue; attempt contact to assess current status.",
      ["OVERDUE_FOLLOW_UP"],
      {
        suggestedScript:
          "Hi, we were due to check in with you but haven't been able to connect. How are you going? Any changes to your condition or treatment? Is there anything you need help with?",
      },
    );
  }

  // NEW: Worker disengaged
  if (flagCodes.includes("WORKER_DISENGAGED")) {
    add(
      "OTHER",
      "WORKER",
      "Re-engage with worker",
      "No case activity for extended period; worker may need support or escalation.",
      ["WORKER_DISENGAGED"],
      {
        suggestedScript:
          "Hi, we noticed we haven't heard from you in a while. We want to make sure you're okay and your case is progressing. Can we schedule a time to chat about how things are going?",
      },
    );
    add(
      "OTHER",
      "EMPLOYER_INTERNAL",
      "Document disengagement",
      "Record attempts to contact worker and plan for escalation if needed.",
      ["WORKER_DISENGAGED"],
    );
  }

  // NEW: Long-tail case
  if (flagCodes.includes("LONG_TAIL_CASE")) {
    add(
      "OTHER",
      "INSURER",
      "Request case review meeting",
      "Case has been open for extended period; may need insurer review or specialist IME.",
      ["LONG_TAIL_CASE"],
      {
        suggestedBody:
          `Case review request for ${workerCase.workerName}:\n\nThis case has been open for an extended period with the worker still off work. We recommend a case conference to review:\n- Current clinical status and barriers to recovery\n- Whether an IME is warranted\n- Alternative RTW pathways or redeployment options\n- Cost projections and intervention strategies`,
      },
    );
  }

  // NEW: Psychological injury marker
  if (flagCodes.includes("PSYCHOLOGICAL_INJURY_MARKER")) {
    add(
      "OTHER",
      "EMPLOYER_INTERNAL",
      "Consider psychological support referral",
      "Case shows psychological injury markers; may benefit from EAP or psych referral.",
      ["PSYCHOLOGICAL_INJURY_MARKER"],
    );
  }

  return actions;
}
