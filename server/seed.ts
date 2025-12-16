import "dotenv/config";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { db, pool } from "./db";
import {
  workerCases,
  caseAttachments,
  users,
  type CaseCompliance,
} from "@shared/schema";

type SeedAttachment = {
  name: string;
  type: string;
  url: string;
};

type RiskCategory = "High" | "Medium" | "Low";
type WorkStatus = "At work" | "Off work";

type SeedCase = {
  workerName: string;
  company: string;
  dateOfInjury: string;
  riskLevel: RiskCategory;
  workStatus: WorkStatus;
  compliance: CaseCompliance;
  currentStatus: string;
  nextStep: string;
  owner: string;
  dueDate: string;
  summary: string;
  ticketIds: string[];
  ticketLastUpdatedAt: string;
  clcLastFollowUp: string;
  clcNextFollowUp: string;
  aiSummary: string;
  aiWorkStatusClassification: string;
  attachments: SeedAttachment[];
};

const employers = [
  { id: "empl-symmetry", name: "Symmetry Manufacturing" },
  { id: "empl-core", name: "Core Industrial Solutions" },
  { id: "empl-harbor", name: "Harbor Logistics" },
  { id: "empl-northwind", name: "Northwind Foods" },
  { id: "empl-apex", name: "Apex Labour Hire" },
] as const;

const demoCases: SeedCase[] = [
  {
    workerName: "Ava Thompson",
    company: employers[0].name,
    dateOfInjury: "2025-01-03T00:00:00.000Z",
    riskLevel: "High",
    workStatus: "Off work",
    compliance: {
      indicator: "High",
      reason: "Surgery scheduled; requires two-step RTW ramp",
      source: "claude",
      lastChecked: "2025-02-10T09:00:00.000Z",
    },
    currentStatus: "Awaiting orthopedic clearance",
    nextStep: "Confirm post-op physio plan",
    owner: "Renee Valdez",
    dueDate: "2025-02-05",
    summary:
      "Shoulder reconstruction following pallet strike. Weekly check-ins keep engagement high.",
    ticketIds: ["FD-43120", "FD-43190"],
    ticketLastUpdatedAt: "2025-02-10T08:20:00.000Z",
    clcLastFollowUp: "2025-01-27",
    clcNextFollowUp: "2025-02-03",
    aiSummary:
      "XGBoost risk index 0.78 warns of relapse without staged duties; maintain weekly coaching.",
    aiWorkStatusClassification: "Off work - post surgery",
    attachments: [
      {
        name: "Medical Certificate - Initial 03 Jan",
        type: "medical-certificate",
        url: "https://files.gpnet.local/certificates/ava-thompson-initial.pdf",
      },
      {
        name: "Medical Certificate - Extension 18 Jan",
        type: "medical-certificate",
        url: "https://files.gpnet.local/certificates/ava-thompson-extension.pdf",
      },
      {
        name: "RTW Plan - Graduated Duties",
        type: "rtw-plan",
        url: "https://files.gpnet.local/rtw/ava-thompson-plan.pdf",
      },
      {
        name: "Case Notes - Site Supervisor",
        type: "case-note",
        url: "https://files.gpnet.local/notes/ava-thompson-2025-01-20.txt",
      },
    ],
  },
  {
    workerName: "Marcus Reid",
    company: employers[1].name,
    dateOfInjury: "2024-12-19T00:00:00.000Z",
    riskLevel: "Medium",
    workStatus: "At work",
    compliance: {
      indicator: "Medium",
      reason: "Awaiting ergonomic audit sign-off",
      source: "manual",
      lastChecked: "2025-01-28T14:30:00.000Z",
    },
    currentStatus: "Modified forklift duties approved",
    nextStep: "Close loop with insurer nurse",
    owner: "Liam Cortez",
    dueDate: "2025-01-26",
    summary:
      "Lower back strain. Working 4-hour shifts with sit/stand rotation; needs RTW docs filed.",
    ticketIds: ["FD-43210"],
    ticketLastUpdatedAt: "2025-01-28T13:10:00.000Z",
    clcLastFollowUp: "2025-01-21",
    clcNextFollowUp: "2025-01-30",
    aiSummary:
      "XGBoost probability 0.32 indicates stable progress if ergonomics controls stay in place.",
    aiWorkStatusClassification: "At work - modified duties",
    attachments: [
      {
        name: "Medical Certificate - Stabilisation",
        type: "medical-certificate",
        url: "https://files.gpnet.local/certificates/marcus-reid-stabilisation.pdf",
      },
      {
        name: "Case Notes - Shift Debrief",
        type: "case-note",
        url: "https://files.gpnet.local/notes/marcus-reid-2025-01-24.txt",
      },
    ],
  },
  {
    workerName: "Priya Nair",
    company: employers[2].name,
    dateOfInjury: "2025-01-09T00:00:00.000Z",
    riskLevel: "High",
    workStatus: "Off work",
    compliance: {
      indicator: "Very High",
      reason: "Complex fracture requires staged rehabilitation",
      source: "freshdesk",
      lastChecked: "2025-02-12T07:45:00.000Z",
    },
    currentStatus: "In hydrotherapy block",
    nextStep: "Upgrade to light transport duties",
    owner: "Sarah Patel",
    dueDate: "2025-02-18",
    summary:
      "Foot fracture after dock plate collapse; insurer approved RTW stipend pending compliance audit.",
    ticketIds: ["FD-43301", "FD-43325"],
    ticketLastUpdatedAt: "2025-02-11T16:05:00.000Z",
    clcLastFollowUp: "2025-02-05",
    clcNextFollowUp: "2025-02-13",
    aiSummary:
      "XGBoost risk 0.71 flags schedule slip if transport duties not locked in within 10 days.",
    aiWorkStatusClassification: "Off work - graduated duties pending",
    attachments: [
      {
        name: "Medical Certificate - Orthopedic",
        type: "medical-certificate",
        url: "https://files.gpnet.local/certificates/priya-nair-ortho.pdf",
      },
      {
        name: "RTW Plan - Dock Support",
        type: "rtw-plan",
        url: "https://files.gpnet.local/rtw/priya-nair-plan.pdf",
      },
      {
        name: "Case Notes - Hydrotherapy Update",
        type: "case-note",
        url: "https://files.gpnet.local/notes/priya-nair-2025-02-07.txt",
      },
    ],
  },
  {
    workerName: "Leo Gutierrez",
    company: employers[3].name,
    dateOfInjury: "2025-01-15T00:00:00.000Z",
    riskLevel: "Medium",
    workStatus: "At work",
    compliance: {
      indicator: "High",
      reason: "Food safety training outstanding",
      source: "manual",
      lastChecked: "2025-02-11T10:20:00.000Z",
    },
    currentStatus: "On reduced lifting protocol",
    nextStep: "Document competency sign-off",
    owner: "Kara Mills",
    dueDate: "2025-02-14",
    summary:
      "Hand laceration; sutures removed and worker covering QA console shifts with no gripping tasks.",
    ticketIds: ["FD-43388"],
    ticketLastUpdatedAt: "2025-02-11T11:10:00.000Z",
    clcLastFollowUp: "2025-02-08",
    clcNextFollowUp: "2025-02-15",
    aiSummary:
      "XGBoost risk 0.28 indicates low relapse probability once competency tick completed.",
    aiWorkStatusClassification: "At work - reduced lifting",
    attachments: [
      {
        name: "Medical Certificate - RTW clearance",
        type: "medical-certificate",
        url: "https://files.gpnet.local/certificates/leo-gutierrez-clearance.pdf",
      },
    ],
  },
  {
    workerName: "Harper Lin",
    company: employers[4].name,
    dateOfInjury: "2025-01-05T00:00:00.000Z",
    riskLevel: "Medium",
    workStatus: "Off work",
    compliance: {
      indicator: "High",
      reason: "Awaiting psych clearance for RTW plan",
      source: "claude",
      lastChecked: "2025-02-09T15:02:00.000Z",
    },
    currentStatus: "Participating in RTW case conference",
    nextStep: "Confirm host placement",
    owner: "Darren Ekstrom",
    dueDate: "2025-02-20",
    summary:
      "Psychological injury from customer incident. Voc provider engaged; RTW staged across host employer.",
    ticketIds: ["FD-43410", "FD-43422"],
    ticketLastUpdatedAt: "2025-02-09T13:45:00.000Z",
    clcLastFollowUp: "2025-02-04",
    clcNextFollowUp: "2025-02-18",
    aiSummary:
      "XGBoost resilience score 0.44 suggests positive RTW if host placement confirmed this cycle.",
    aiWorkStatusClassification: "Off work - psychosocial",
    attachments: [
      {
        name: "RTW Plan - Host Placement",
        type: "rtw-plan",
        url: "https://files.gpnet.local/rtw/harper-lin-plan.pdf",
      },
      {
        name: "Medical Certificate - Psych Consult",
        type: "medical-certificate",
        url: "https://files.gpnet.local/certificates/harper-lin-psych.pdf",
      },
    ],
  },
  {
    workerName: "Noah Bennett",
    company: employers[0].name,
    dateOfInjury: "2025-01-11T00:00:00.000Z",
    riskLevel: "Low",
    workStatus: "At work",
    compliance: {
      indicator: "Medium",
      reason: "Needs fortnightly capacity form",
      source: "manual",
      lastChecked: "2025-02-10T08:00:00.000Z",
    },
    currentStatus: "Working 6-hour shifts",
    nextStep: "Upload GP capacity form",
    owner: "Isla Boyd",
    dueDate: "2025-02-12",
    summary:
      "Mild ankle sprain; worker overseeing training bay and avoiding ladder work per restrictions.",
    ticketIds: ["FD-43455"],
    ticketLastUpdatedAt: "2025-02-10T07:40:00.000Z",
    clcLastFollowUp: "2025-02-06",
    clcNextFollowUp: "2025-02-13",
    aiSummary:
      "XGBoost stability score 0.18 indicates minimal escalation risk once paperwork completed.",
    aiWorkStatusClassification: "At work - reduced hours",
    attachments: [
      {
        name: "Medical Certificate - Duty review",
        type: "medical-certificate",
        url: "https://files.gpnet.local/certificates/noah-bennett-duty.pdf",
      },
      {
        name: "Case Notes - Toolbox Talk",
        type: "case-note",
        url: "https://files.gpnet.local/notes/noah-bennett-2025-02-05.txt",
      },
    ],
  },
  {
    workerName: "Sofia Marin",
    company: employers[2].name,
    dateOfInjury: "2024-11-29T00:00:00.000Z",
    riskLevel: "High",
    workStatus: "Off work",
    compliance: {
      indicator: "Very Low",
      reason: "Overdue case conference actions",
      source: "freshdesk",
      lastChecked: "2025-01-15T12:00:00.000Z",
    },
    currentStatus: "Overdue - awaiting psychiatric review",
    nextStep: "Escalate to insurer specialist",
    owner: "Nate Holloway",
    dueDate: "2024-12-20",
    summary:
      "PTSD following near-miss; worker disengaged and certificates exhausted. Immediate escalation required.",
    ticketIds: ["FD-43002", "FD-43044"],
    ticketLastUpdatedAt: "2025-01-15T11:32:00.000Z",
    clcLastFollowUp: "2025-01-05",
    clcNextFollowUp: "2025-01-19",
    aiSummary:
      "XGBoost risk 0.91 indicates high probability of extended incapacity without psych review.",
    aiWorkStatusClassification: "Off work - overdue",
    attachments: [
      {
        name: "Medical Certificate - Psychiatrist",
        type: "medical-certificate",
        url: "https://files.gpnet.local/certificates/sofia-marin-psych.pdf",
      },
      {
        name: "Case Notes - Escalation",
        type: "case-note",
        url: "https://files.gpnet.local/notes/sofia-marin-2025-01-10.txt",
      },
    ],
  },
  {
    workerName: "Ethan Wells",
    company: employers[1].name,
    dateOfInjury: "2024-11-15T00:00:00.000Z",
    riskLevel: "Medium",
    workStatus: "Off work",
    compliance: {
      indicator: "Low",
      reason: "No updated medical received in 6 weeks",
      source: "manual",
      lastChecked: "2025-01-12T09:20:00.000Z",
    },
    currentStatus: "Overdue - chasing medical",
    nextStep: "Arrange GP booking",
    owner: "Jules Kramer",
    dueDate: "2024-11-30",
    summary:
      "Knee injury stuck in limbo; worker unreachable and certificates expired. Needs escalation.",
    ticketIds: ["FD-42940"],
    ticketLastUpdatedAt: "2025-01-12T09:05:00.000Z",
    clcLastFollowUp: "2024-12-22",
    clcNextFollowUp: "2025-01-08",
    aiSummary:
      "XGBoost risk 0.84 suggests probable long-tail cost without immediate contact.",
    aiWorkStatusClassification: "Off work - disengaged",
    attachments: [
      {
        name: "Medical Certificate - Expired",
        type: "medical-certificate",
        url: "https://files.gpnet.local/certificates/ethan-wells-expired.pdf",
      },
      {
        name: "Case Notes - Worksite Attempt",
        type: "case-note",
        url: "https://files.gpnet.local/notes/ethan-wells-2024-12-20.txt",
      },
    ],
  },
];

async function seed() {
  console.log("Seeding GPNet demo data...");

  // Default organization for seed data
  const defaultOrgId = "seed-organization";

  await db.delete(caseAttachments);
  await db.delete(workerCases);
  await db.delete(users);

  const passwordHash = await bcrypt.hash("ChangeMe123!", 10);

  await db.insert(users).values([
    {
      id: randomUUID(),
      organizationId: defaultOrgId,
      email: "admin@gpnet.local",
      password: passwordHash,
      role: "admin",
      subrole: null,
      companyId: null,
      insurerId: null,
    },
    {
      id: randomUUID(),
      organizationId: defaultOrgId,
      email: "employer@symmetry.local",
      password: passwordHash,
      role: "employer",
      subrole: "rtw-coordinator",
      companyId: employers[0].id,
      insurerId: null,
    },
    {
      id: randomUUID(),
      organizationId: defaultOrgId,
      email: "doctor@harborclinic.local",
      password: passwordHash,
      role: "clinician",
      subrole: "occupational-physician",
      companyId: null,
      insurerId: null,
    },
  ]);

  for (const seedCase of demoCases) {
    const caseId = randomUUID();
    const certificateAttachment = seedCase.attachments.find(
      (attachment) => attachment.type === "medical-certificate",
    );

    await db.insert(workerCases).values({
      id: caseId,
      organizationId: defaultOrgId,
      workerName: seedCase.workerName,
      company: seedCase.company,
      dateOfInjury: new Date(seedCase.dateOfInjury),
      riskLevel: seedCase.riskLevel,
      workStatus: seedCase.workStatus,
      hasCertificate: Boolean(certificateAttachment),
      certificateUrl: certificateAttachment?.url ?? null,
      complianceIndicator: seedCase.compliance.indicator,
      complianceJson: seedCase.compliance,
      currentStatus: seedCase.currentStatus,
      nextStep: seedCase.nextStep,
      owner: seedCase.owner,
      dueDate: seedCase.dueDate,
      summary: seedCase.summary,
      ticketIds: seedCase.ticketIds,
      ticketCount: String(seedCase.ticketIds.length),
      aiSummary: seedCase.aiSummary,
      aiSummaryGeneratedAt: new Date(),
      aiSummaryModel: "gpnet-xgboost-lab",
      aiWorkStatusClassification: seedCase.aiWorkStatusClassification,
      ticketLastUpdatedAt: new Date(seedCase.ticketLastUpdatedAt),
      clcLastFollowUp: seedCase.clcLastFollowUp,
      clcNextFollowUp: seedCase.clcNextFollowUp,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (seedCase.attachments.length > 0) {
      await db.insert(caseAttachments).values(
        seedCase.attachments.map((attachment) => ({
          id: randomUUID(),
          organizationId: defaultOrgId,
          caseId,
          name: attachment.name,
          type: attachment.type,
          url: attachment.url,
          createdAt: new Date(),
        })),
      );
    }
  }

  console.log("Demo data inserted successfully.");
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
