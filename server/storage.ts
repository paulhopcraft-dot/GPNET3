import type { WorkerCase } from "@shared/schema";

export interface IStorage {
  getGPNet2Cases(): Promise<WorkerCase[]>;
}

class MemStorage implements IStorage {
  async getGPNet2Cases(): Promise<WorkerCase[]> {
    return [
      {
        id: "1",
        workerName: "Sarah Johnson",
        company: "Symmetry",
        riskLevel: "Low",
        workStatus: "At work",
        hasCertificate: true,
        certificateUrl: "/certificates/sarah-johnson.pdf",
        complianceIndicator: "Very High",
        currentStatus: "Employee has completed all pre-employment health assessments",
        nextStep: "Final clearance review",
        owner: "Dr. Smith",
        dueDate: "2025-11-15",
        summary: "All medical assessments completed. No restrictions identified. Cleared for full duties.",
      },
      {
        id: "2",
        workerName: "Michael Chen",
        company: "Allied Health",
        riskLevel: "Medium",
        workStatus: "At work",
        hasCertificate: true,
        certificateUrl: "/certificates/michael-chen.pdf",
        complianceIndicator: "High",
        currentStatus: "Minor restrictions identified - modified duties plan in place",
        nextStep: "Follow-up assessment in 30 days",
        owner: "Dr. Williams",
        dueDate: "2025-12-01",
        summary: "Employee cleared for work with minor lifting restrictions. Modified duties plan implemented.",
        clcLastFollowUp: "2025-10-15",
        clcNextFollowUp: "2025-11-15",
      },
      {
        id: "3",
        workerName: "Emma Brown",
        company: "Apex Labour",
        riskLevel: "High",
        workStatus: "Off work",
        hasCertificate: false,
        complianceIndicator: "Low",
        currentStatus: "Awaiting specialist assessment results",
        nextStep: "Obtain specialist medical report",
        owner: "Dr. Jones",
        dueDate: "2025-11-08",
        summary: "Pre-existing condition identified. Specialist assessment required before clearance can be issued.",
      },
      {
        id: "4",
        workerName: "David Wilson",
        company: "SafeWorks",
        riskLevel: "Low",
        workStatus: "At work",
        hasCertificate: true,
        certificateUrl: "/certificates/david-wilson.pdf",
        complianceIndicator: "Very High",
        currentStatus: "All assessments complete - fully cleared",
        nextStep: "Annual review",
        owner: "Dr. Davis",
        dueDate: "2026-11-01",
        summary: "Comprehensive medical assessment completed. No restrictions. Employee cleared for all duties.",
      },
      {
        id: "5",
        workerName: "Lisa Anderson",
        company: "Core Industrial",
        riskLevel: "Medium",
        workStatus: "At work",
        hasCertificate: true,
        certificateUrl: "/certificates/lisa-anderson.pdf",
        complianceIndicator: "Medium",
        currentStatus: "Temporary restrictions in place - monitoring required",
        nextStep: "Review modified duties effectiveness",
        owner: "Dr. Taylor",
        dueDate: "2025-11-20",
        summary: "Employee on modified duties due to recent injury recovery. Regular monitoring required.",
        clcLastFollowUp: "2025-10-28",
        clcNextFollowUp: "2025-11-10",
      },
    ];
  }
}

export const storage: IStorage = new MemStorage();
