import express from "express";
import { authorize } from "../middleware/auth";
import { storage } from "../storage";
import { db } from "../db";
import { workerCases, medicalCertificates, caseDiscussionNotes, terminationProcesses } from "../../shared/schema";
import { eq, sql, desc, and, gte, lte } from "drizzle-orm";

const router = express.Router();

// All report routes require authentication
router.use(authorize());

// GET /api/reports/overview - Dashboard overview statistics
router.get("/overview", async (req, res) => {
  try {
    const cases = await storage.getGPNet2Cases();

    // Calculate metrics
    const totalCases = cases.length;
    const atWorkCases = cases.filter(c => c.workStatus === "At work").length;
    const offWorkCases = cases.filter(c => c.workStatus === "Off work").length;

    const highRiskCases = cases.filter(c => c.riskLevel === "High").length;
    const mediumRiskCases = cases.filter(c => c.riskLevel === "Medium").length;
    const lowRiskCases = cases.filter(c => c.riskLevel === "Low").length;

    const complianceBreakdown = {
      veryHigh: cases.filter(c => c.complianceIndicator === "Very High").length,
      high: cases.filter(c => c.complianceIndicator === "High").length,
      medium: cases.filter(c => c.complianceIndicator === "Medium").length,
      low: cases.filter(c => c.complianceIndicator === "Low").length,
      veryLow: cases.filter(c => c.complianceIndicator === "Very Low").length,
    };

    // Cases by company
    const casesByCompany: Record<string, number> = {};
    cases.forEach(c => {
      const company = c.company || "Unknown";
      casesByCompany[company] = (casesByCompany[company] || 0) + 1;
    });

    // Employment status breakdown
    const employmentStatus = {
      active: cases.filter(c => c.employmentStatus === "ACTIVE").length,
      suspended: cases.filter(c => c.employmentStatus === "SUSPENDED").length,
      terminationInProgress: cases.filter(c => c.employmentStatus === "TERMINATION_IN_PROGRESS").length,
      terminated: cases.filter(c => c.employmentStatus === "TERMINATED").length,
    };

    res.json({
      success: true,
      data: {
        totalCases,
        workStatus: {
          atWork: atWorkCases,
          offWork: offWorkCases,
        },
        riskLevel: {
          high: highRiskCases,
          medium: mediumRiskCases,
          low: lowRiskCases,
        },
        compliance: complianceBreakdown,
        casesByCompany,
        employmentStatus,
      },
    });
  } catch (error) {
    console.error("Failed to fetch overview:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch overview statistics",
    });
  }
});

// GET /api/reports/certificates - Certificate statistics
router.get("/certificates", async (req, res) => {
  try {
    const certificates = await db.select().from(medicalCertificates).orderBy(desc(medicalCertificates.issueDate));

    // Calculate capacity breakdown
    const capacityBreakdown = {
      fit: certificates.filter(c => c.capacity === "fit").length,
      partial: certificates.filter(c => c.capacity === "partial").length,
      unfit: certificates.filter(c => c.capacity === "unfit").length,
      unknown: certificates.filter(c => c.capacity === "unknown").length,
    };

    // Certificates by month (last 6 months)
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const recentCerts = certificates.filter(c => new Date(c.issueDate) >= sixMonthsAgo);

    const certsByMonth: Record<string, number> = {};
    recentCerts.forEach(cert => {
      const month = new Date(cert.issueDate).toLocaleString("en-AU", { month: "short", year: "2-digit" });
      certsByMonth[month] = (certsByMonth[month] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        totalCertificates: certificates.length,
        capacityBreakdown,
        recentCertificates: recentCerts.length,
        certsByMonth,
      },
    });
  } catch (error) {
    console.error("Failed to fetch certificate stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch certificate statistics",
    });
  }
});

// GET /api/reports/terminations - Termination process statistics
router.get("/terminations", async (req, res) => {
  try {
    const processes = await db.select().from(terminationProcesses);

    const statusBreakdown = {
      notStarted: processes.filter(p => p.status === "NOT_STARTED").length,
      prepEvidence: processes.filter(p => p.status === "PREP_EVIDENCE").length,
      agentMeeting: processes.filter(p => p.status === "AGENT_MEETING").length,
      consultantConfirmation: processes.filter(p => p.status === "CONSULTANT_CONFIRMATION").length,
      preTerminationInviteSent: processes.filter(p => p.status === "PRE_TERMINATION_INVITE_SENT").length,
      preTerminationMeetingCompleted: processes.filter(p => p.status === "PRE_TERMINATION_MEETING_COMPLETED").length,
      decisionPending: processes.filter(p => p.status === "DECISION_PENDING").length,
      terminated: processes.filter(p => p.status === "TERMINATED").length,
      aborted: processes.filter(p => p.status === "TERMINATION_ABORTED").length,
    };

    const decisionBreakdown = {
      noDecision: processes.filter(p => p.decision === "NO_DECISION").length,
      terminate: processes.filter(p => p.decision === "TERMINATE").length,
      defer: processes.filter(p => p.decision === "DEFER").length,
      alternativeRoleFound: processes.filter(p => p.decision === "ALTERNATIVE_ROLE_FOUND").length,
    };

    res.json({
      success: true,
      data: {
        totalProcesses: processes.length,
        statusBreakdown,
        decisionBreakdown,
        activeProcesses: processes.filter(p =>
          !["TERMINATED", "TERMINATION_ABORTED", "NOT_STARTED"].includes(p.status)
        ).length,
      },
    });
  } catch (error) {
    console.error("Failed to fetch termination stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch termination statistics",
    });
  }
});

// GET /api/reports/insights - AI-powered insights and trends
router.get("/insights", async (req, res) => {
  try {
    const cases = await storage.getGPNet2Cases();

    // Calculate trends and insights
    const insights: Array<{
      type: "info" | "warning" | "critical";
      title: string;
      description: string;
      metric?: number;
    }> = [];

    // High risk cases
    const highRiskCases = cases.filter(c => c.riskLevel === "High");
    if (highRiskCases.length > 0) {
      insights.push({
        type: highRiskCases.length > 5 ? "critical" : "warning",
        title: "High Risk Cases",
        description: `${highRiskCases.length} case${highRiskCases.length !== 1 ? "s" : ""} flagged as high risk requiring immediate attention`,
        metric: highRiskCases.length,
      });
    }

    // Off work cases
    const offWorkCases = cases.filter(c => c.workStatus === "Off work");
    if (offWorkCases.length > 0) {
      const offWorkPercentage = Math.round((offWorkCases.length / cases.length) * 100);
      insights.push({
        type: offWorkPercentage > 50 ? "warning" : "info",
        title: "Off Work Cases",
        description: `${offWorkPercentage}% of cases (${offWorkCases.length}) are currently off work`,
        metric: offWorkCases.length,
      });
    }

    // Low compliance cases
    const lowComplianceCases = cases.filter(c =>
      c.complianceIndicator === "Low" || c.complianceIndicator === "Very Low"
    );
    if (lowComplianceCases.length > 0) {
      insights.push({
        type: "warning",
        title: "Compliance Concerns",
        description: `${lowComplianceCases.length} case${lowComplianceCases.length !== 1 ? "s" : ""} with low or very low compliance`,
        metric: lowComplianceCases.length,
      });
    }

    // Active termination processes
    const cases_with_termination = cases.filter(c => c.employmentStatus === "TERMINATION_IN_PROGRESS");
    if (cases_with_termination.length > 0) {
      insights.push({
        type: "info",
        title: "Active Termination Processes",
        description: `${cases_with_termination.length} case${cases_with_termination.length !== 1 ? "s" : ""} with active termination proceedings`,
        metric: cases_with_termination.length,
      });
    }

    // Cases without certificates
    const noCertCases = cases.filter(c => !c.hasCertificate);
    if (noCertCases.length > 0) {
      insights.push({
        type: "warning",
        title: "Missing Certificates",
        description: `${noCertCases.length} case${noCertCases.length !== 1 ? "s" : ""} without current medical certificate`,
        metric: noCertCases.length,
      });
    }

    res.json({
      success: true,
      data: {
        insights,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Failed to generate insights:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate insights",
    });
  }
});

// GET /api/reports/export - Export data as CSV
router.get("/export", async (req, res) => {
  try {
    const cases = await storage.getGPNet2Cases();

    // Create CSV header
    const headers = [
      "Worker Name",
      "Company",
      "Date of Injury",
      "Work Status",
      "Risk Level",
      "Compliance",
      "Employment Status",
      "Current Status",
      "Next Step",
      "Owner",
    ];

    // Create CSV rows
    const rows = cases.map(c => [
      c.workerName,
      c.company,
      c.dateOfInjury,
      c.workStatus,
      c.riskLevel,
      c.complianceIndicator,
      c.employmentStatus || "ACTIVE",
      c.currentStatus,
      c.nextStep,
      c.owner,
    ].map(field => `"${String(field || "").replace(/"/g, '""')}"`).join(","));

    const csv = [headers.join(","), ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=gpnet-cases-export.csv");
    res.send(csv);
  } catch (error) {
    console.error("Failed to export data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export data",
    });
  }
});

export default router;
