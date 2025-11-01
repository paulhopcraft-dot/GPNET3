import type { InsertCase, Case, InsertCertificate, Certificate } from "@shared/schema";

export interface IStorage {
  getCases(): Promise<Case[]>;
  getCaseById(id: string): Promise<Case | undefined>;
  insertCase(case_: InsertCase): Promise<Case>;
  getCertificatesByCaseId(caseId: string): Promise<Certificate[]>;
  insertCertificate(certificate: InsertCertificate): Promise<Certificate>;
}

class MemStorage implements IStorage {
  private cases: Case[] = [];
  private certificates: Certificate[] = [];

  constructor() {
    // Initialize with mock data
    this.cases = [
      {
        id: "1",
        companyName: "Acme Corp",
        workerName: "John Smith",
        injuryDate: new Date("2024-01-15"),
        latestCertificate: "Fit for work",
        status: "Open",
        riskLevel: "Low",
        notes: "Minor workplace injury",
      },
      {
        id: "2",
        companyName: "Tech Industries",
        workerName: "Sarah Johnson",
        injuryDate: new Date("2024-02-20"),
        latestCertificate: "Modified duties",
        status: "Pending",
        riskLevel: "Medium",
        notes: "Follow-up required",
      },
      {
        id: "3",
        companyName: "Global Manufacturing",
        workerName: "Mike Davis",
        injuryDate: new Date("2024-03-10"),
        latestCertificate: "Unfit for work",
        status: "Open",
        riskLevel: "High",
        notes: "Serious injury - ongoing treatment",
      },
      {
        id: "4",
        companyName: "Retail Solutions",
        workerName: "Emma Wilson",
        injuryDate: new Date("2024-01-05"),
        latestCertificate: "Fit for work",
        status: "Closed",
        riskLevel: "Low",
        notes: "Fully recovered",
      },
      {
        id: "5",
        companyName: "Construction Ltd",
        workerName: "David Brown",
        injuryDate: new Date("2024-02-28"),
        latestCertificate: "Capacity certificate",
        status: "Open",
        riskLevel: "Medium",
        notes: "Return to work plan in progress",
      },
    ];

    this.certificates = [
      { id: "c1", caseId: "1", type: "Fit for work", expiry: new Date("2024-06-15") },
      { id: "c2", caseId: "2", type: "Modified duties", expiry: new Date("2024-05-20") },
      { id: "c3", caseId: "2", type: "Capacity certificate", expiry: new Date("2024-04-15") },
      { id: "c4", caseId: "3", type: "Unfit for work", expiry: new Date("2024-04-30") },
      { id: "c5", caseId: "3", type: "Medical certificate", expiry: new Date("2024-03-25") },
      { id: "c6", caseId: "5", type: "Capacity certificate", expiry: new Date("2024-05-10") },
    ];
  }

  async getCases(): Promise<Case[]> {
    return this.cases;
  }

  async getCaseById(id: string): Promise<Case | undefined> {
    return this.cases.find(c => c.id === id);
  }

  async insertCase(case_: InsertCase): Promise<Case> {
    const newCase: Case = {
      id: String(this.cases.length + 1),
      ...case_,
      notes: case_.notes ?? null,
    };
    this.cases.push(newCase);
    return newCase;
  }

  async getCertificatesByCaseId(caseId: string): Promise<Certificate[]> {
    return this.certificates.filter(c => c.caseId === caseId);
  }

  async insertCertificate(certificate: InsertCertificate): Promise<Certificate> {
    const newCert: Certificate = {
      id: String(this.certificates.length + 1),
      ...certificate,
    };
    this.certificates.push(newCert);
    return newCert;
  }
}

export const storage: IStorage = new MemStorage();
