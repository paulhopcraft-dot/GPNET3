import express, { type Request, type Response, type Router } from "express";
import { authorize, type AuthRequest } from "../middleware/auth";
import { storage } from "../storage";
import { createLogger } from "../lib/logger";

const logger = createLogger("DiscordAnalytics");
const router: Router = express.Router();

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";

interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  timestamp: string;
  footer?: {
    text: string;
  };
}

const postToDiscord = async (content: string, embeds?: DiscordEmbed[]) => {
  if (!DISCORD_WEBHOOK_URL) {
    throw new Error("Discord webhook URL not configured");
  }

  const payload: any = {
    content,
    username: "Preventli Analytics Bot",
    avatar_url: "https://via.placeholder.com/128x128/059669/FFFFFF?text=📊"
  };

  if (embeds) {
    payload.embeds = embeds;
  }

  const response = await fetch(DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Discord API error: ${response.status} - ${errorText}`);
  }

  return response.json();
};

/**
 * @route POST /api/discord-analytics/daily-summary
 * @desc Post daily business summary to Discord
 */
router.post("/daily-summary", authorize(), async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    // Get today's date range
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // Fetch real data from your system
    const [
      totalCases,
      activeCases,
      todaysCases,
      recentCertificates,
      complianceActions,
      organizations
    ] = await Promise.all([
      storage.getTotalCasesCount(organizationId),
      storage.getActiveCasesCount(organizationId),
      storage.getTodaysCases(organizationId, todayStart, todayEnd),
      storage.getRecentCertificates(organizationId, 7), // Last 7 days
      storage.getPendingActions(organizationId),
      storage.getOrganizations()
    ]);

    // Get case breakdown by status
    const casesByStatus = await storage.getCasesByStatus(organizationId);
    const rtwCases = casesByStatus.filter(c => c.status === 'rtw_planning' || c.status === 'rtw_active');
    const criticalCases = casesByStatus.filter(c => c.priority === 'critical' || c.urgency === 'high');

    const embed: DiscordEmbed = {
      title: "📊 Preventli Daily Analytics Summary",
      description: `Business intelligence for ${today.toDateString()}`,
      color: 0x059669, // Green
      fields: [
        {
          name: "📈 Case Overview",
          value: [
            `**Total Cases:** ${totalCases}`,
            `**Active Cases:** ${activeCases}`,
            `**New Today:** ${todaysCases.length}`,
            `**RTW in Progress:** ${rtwCases.length}`
          ].join('\n'),
          inline: true
        },
        {
          name: "⚠️ Priority Items",
          value: [
            `**Critical Cases:** ${criticalCases.length}`,
            `**Pending Actions:** ${complianceActions.length}`,
            `**Overdue Certificates:** ${recentCertificates.filter(c => c.isOverdue).length}`,
            `**Compliance Alerts:** ${complianceActions.filter(a => a.priority === 'high').length}`
          ].join('\n'),
          inline: true
        },
        {
          name: "🏢 Client Portfolio",
          value: [
            `**Active Organizations:** ${organizations.length}`,
            `**Cases per Client (avg):** ${Math.round(totalCases / Math.max(organizations.length, 1))}`,
            `**Top Client:** ${organizations[0]?.name || 'N/A'}`,
            `**Platform Utilization:** ${activeCases > 0 ? 'Active' : 'Low'}`
          ].join('\n'),
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: `Preventli Analytics • Generated ${today.toLocaleDateString()}`
      }
    };

    // Add case details if there are new cases today
    if (todaysCases.length > 0) {
      const newCasesDetails = todaysCases.slice(0, 5).map(c =>
        `• **${c.workerName}** - ${c.injuryType} (${c.employerName})`
      ).join('\n');

      embed.fields.push({
        name: `🆕 Today's New Cases (${todaysCases.length})`,
        value: todaysCases.length > 5
          ? newCasesDetails + `\n... and ${todaysCases.length - 5} more`
          : newCasesDetails,
        inline: false
      });
    }

    const content = `📊 **Daily Preventli Analytics** - ${today.toDateString()}`;

    await postToDiscord(content, [embed]);

    logger.info(`Posted daily analytics summary to Discord`, {
      userId: req.user!.id,
      organizationId,
      totalCases,
      activeCases,
      newCases: todaysCases.length
    });

    res.json({
      success: true,
      message: "Daily summary posted to Discord",
      data: {
        totalCases,
        activeCases,
        newCases: todaysCases.length,
        organizations: organizations.length
      }
    });

  } catch (error) {
    logger.error("Error posting daily summary to Discord:", undefined, error);
    res.status(500).json({
      error: "Failed to post daily summary to Discord",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * @route POST /api/discord-analytics/client-report
 * @desc Post detailed client analytics to Discord
 */
router.post("/client-report", authorize(), async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    // Get comprehensive client data
    const [
      organizations,
      casesByOrganization,
      certificatesByOrganization,
      actionsByOrganization
    ] = await Promise.all([
      storage.getOrganizations(),
      storage.getCasesByOrganization(organizationId),
      storage.getCertificatesByOrganization(organizationId),
      storage.getActionsByOrganization(organizationId)
    ]);

    // Calculate client metrics
    const clientMetrics = organizations.map(org => {
      const cases = casesByOrganization.filter(c => c.organizationId === org.id);
      const certificates = certificatesByOrganization.filter(c => c.organizationId === org.id);
      const actions = actionsByOrganization.filter(a => a.organizationId === org.id);

      return {
        name: org.name,
        totalCases: cases.length,
        activeCases: cases.filter(c => ['active', 'rtw_planning', 'rtw_active'].includes(c.status)).length,
        certificates: certificates.length,
        pendingActions: actions.filter(a => a.status === 'pending').length,
        compliance: actions.filter(a => a.status === 'completed').length / Math.max(actions.length, 1) * 100
      };
    }).sort((a, b) => b.totalCases - a.totalCases); // Sort by case count

    const embed: DiscordEmbed = {
      title: "🏢 Preventli Client Portfolio Report",
      description: `Detailed analytics for ${clientMetrics.length} active clients`,
      color: 0x3B82F6, // Blue
      fields: [
        {
          name: "📊 Portfolio Overview",
          value: [
            `**Total Clients:** ${clientMetrics.length}`,
            `**Total Cases:** ${clientMetrics.reduce((sum, c) => sum + c.totalCases, 0)}`,
            `**Active Cases:** ${clientMetrics.reduce((sum, c) => sum + c.activeCases, 0)}`,
            `**Avg Cases per Client:** ${Math.round(clientMetrics.reduce((sum, c) => sum + c.totalCases, 0) / Math.max(clientMetrics.length, 1))}`
          ].join('\n'),
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: `Preventli Client Analytics • ${new Date().toLocaleDateString()}`
      }
    };

    // Add top clients
    const topClients = clientMetrics.slice(0, 8);
    if (topClients.length > 0) {
      embed.fields.push({
        name: "🏆 Top Clients by Case Volume",
        value: topClients.map(client =>
          `**${client.name}**\n` +
          `  └ Cases: ${client.totalCases} (${client.activeCases} active)\n` +
          `  └ Compliance: ${Math.round(client.compliance)}%\n` +
          `  └ Pending: ${client.pendingActions} actions`
        ).join('\n\n'),
        inline: false
      });
    }

    // Add client activity breakdown
    const activeClients = clientMetrics.filter(c => c.activeCases > 0);
    const dormantClients = clientMetrics.filter(c => c.activeCases === 0 && c.totalCases > 0);

    embed.fields.push({
      name: "📈 Client Activity Status",
      value: [
        `**🟢 Active Clients:** ${activeClients.length} (${Math.round(activeClients.length / Math.max(clientMetrics.length, 1) * 100)}%)`,
        `**🟡 Monitoring Only:** ${dormantClients.length}`,
        `**📊 High Volume (10+ cases):** ${clientMetrics.filter(c => c.totalCases >= 10).length}`,
        `**🎯 High Compliance (>90%):** ${clientMetrics.filter(c => c.compliance > 90).length}`
      ].join('\n'),
      inline: false
    });

    const content = `🏢 **Client Portfolio Report** - ${clientMetrics.length} clients analyzed`;

    await postToDiscord(content, [embed]);

    logger.info(`Posted client report to Discord`, {
      userId: req.user!.id,
      organizationId,
      clientCount: clientMetrics.length,
      totalCases: clientMetrics.reduce((sum, c) => sum + c.totalCases, 0)
    });

    res.json({
      success: true,
      message: "Client report posted to Discord",
      data: {
        clientCount: clientMetrics.length,
        topClients: topClients.map(c => ({ name: c.name, cases: c.totalCases }))
      }
    });

  } catch (error) {
    logger.error("Error posting client report to Discord:", undefined, error);
    res.status(500).json({
      error: "Failed to post client report to Discord",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * @route POST /api/discord-analytics/weekly-insights
 * @desc Post weekly business insights to Discord
 */
router.post("/weekly-insights", authorize(), async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    // Get week date range
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);

    // Fetch weekly data
    const [
      weeklyCases,
      weeklyActions,
      weeklyCertificates,
      rtwCompletions,
      complianceMetrics
    ] = await Promise.all([
      storage.getCasesInDateRange(organizationId, weekStart, today),
      storage.getActionsInDateRange(organizationId, weekStart, today),
      storage.getCertificatesInDateRange(organizationId, weekStart, today),
      storage.getRTWCompletionsInDateRange(organizationId, weekStart, today),
      storage.getComplianceMetrics(organizationId)
    ]);

    // Calculate trends
    const previousWeekStart = new Date(weekStart);
    previousWeekStart.setDate(weekStart.getDate() - 7);
    const previousWeekCases = await storage.getCasesInDateRange(organizationId, previousWeekStart, weekStart);

    const caseGrowth = weeklyCases.length - previousWeekCases.length;
    const caseGrowthPercent = previousWeekCases.length > 0
      ? Math.round((caseGrowth / previousWeekCases.length) * 100)
      : 0;

    const embed: DiscordEmbed = {
      title: "📈 Weekly Business Insights",
      description: `Performance analytics for ${weekStart.toLocaleDateString()} - ${today.toLocaleDateString()}`,
      color: 0x8B5CF6, // Purple
      fields: [
        {
          name: "📊 This Week's Activity",
          value: [
            `**New Cases:** ${weeklyCases.length} ${caseGrowth >= 0 ? '📈' : '📉'} (${caseGrowth >= 0 ? '+' : ''}${caseGrowth})`,
            `**Actions Completed:** ${weeklyActions.filter(a => a.status === 'completed').length}`,
            `**Certificates Processed:** ${weeklyCertificates.length}`,
            `**RTW Completions:** ${rtwCompletions.length}`
          ].join('\n'),
          inline: true
        },
        {
          name: "🎯 Performance Metrics",
          value: [
            `**Case Growth:** ${caseGrowthPercent >= 0 ? '+' : ''}${caseGrowthPercent}% vs last week`,
            `**Avg Case Resolution:** ${Math.round(complianceMetrics.avgResolutionDays || 0)} days`,
            `**Compliance Rate:** ${Math.round(complianceMetrics.complianceRate || 0)}%`,
            `**Action Completion:** ${Math.round((weeklyActions.filter(a => a.status === 'completed').length / Math.max(weeklyActions.length, 1)) * 100)}%`
          ].join('\n'),
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: `Preventli Weekly Insights • Week ending ${today.toLocaleDateString()}`
      }
    };

    // Add trend analysis
    const insights = [];
    if (caseGrowth > 0) {
      insights.push(`📈 Case volume increased by ${caseGrowth} cases (${caseGrowthPercent}% growth)`);
    } else if (caseGrowth < 0) {
      insights.push(`📉 Case volume decreased by ${Math.abs(caseGrowth)} cases (${Math.abs(caseGrowthPercent)}% reduction)`);
    } else {
      insights.push(`📊 Case volume remained stable`);
    }

    if (rtwCompletions.length > 0) {
      insights.push(`🎯 ${rtwCompletions.length} successful return-to-work completions`);
    }

    if (complianceMetrics.complianceRate > 90) {
      insights.push(`✅ High compliance rate maintained (${Math.round(complianceMetrics.complianceRate)}%)`);
    }

    if (insights.length > 0) {
      embed.fields.push({
        name: "💡 Key Insights",
        value: insights.join('\n'),
        inline: false
      });
    }

    const content = `📈 **Weekly Business Insights** - Performance summary for week ending ${today.toLocaleDateString()}`;

    await postToDiscord(content, [embed]);

    logger.info(`Posted weekly insights to Discord`, {
      userId: req.user!.id,
      organizationId,
      weeklyCases: weeklyCases.length,
      caseGrowth,
      complianceRate: complianceMetrics.complianceRate
    });

    res.json({
      success: true,
      message: "Weekly insights posted to Discord",
      data: {
        weeklyCases: weeklyCases.length,
        caseGrowth,
        complianceRate: complianceMetrics.complianceRate
      }
    });

  } catch (error) {
    logger.error("Error posting weekly insights to Discord:", undefined, error);
    res.status(500).json({
      error: "Failed to post weekly insights to Discord",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;