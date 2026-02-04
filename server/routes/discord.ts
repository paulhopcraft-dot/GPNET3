import express, { type Request, type Response, type Router } from "express";
import { z } from "zod";
import { authorize, type AuthRequest } from "../middleware/auth";
import { createLogger } from "../lib/logger";

const logger = createLogger("DiscordRoutes");
const router: Router = express.Router();

// Discord webhook configuration
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";

interface DiscordEmbed {
  title: string;
  description: string;
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

const createDiscordEmbed = (doc: any): DiscordEmbed => {
  const priorityColors = {
    'Critical': 0xFF0000, // Red
    'Urgent': 0xFF8C00,   // Orange
    'High': 0xFFD700,     // Gold
    'Medium': 0x00BFFF,   // Blue
    'Low': 0x808080      // Gray
  };

  return {
    title: `${getDocumentEmoji(doc.category)} ${doc.title}`,
    description: doc.description,
    color: priorityColors[doc.priority as keyof typeof priorityColors] || 0x00BFFF,
    fields: [
      {
        name: "📋 Category",
        value: doc.category,
        inline: true
      },
      {
        name: "⚡ Priority",
        value: doc.priority,
        inline: true
      },
      {
        name: "✅ Status",
        value: doc.status,
        inline: true
      },
      {
        name: "📊 Key Points",
        value: doc.keyPoints.map((point: string) => `• ${point}`).join('\n'),
        inline: false
      },
      {
        name: "📖 Summary",
        value: doc.content,
        inline: false
      }
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: `Preventli Marketing Docs • Updated ${doc.lastUpdated}`
    }
  };
};

const getDocumentEmoji = (category: string): string => {
  const emojiMap: { [key: string]: string } = {
    'Strategy': '🎯',
    'Execution': '🚀',
    'Research': '📋',
    'Business Model': '💰',
    'Marketing': '📈',
    'Market': '🏢'
  };
  return emojiMap[category] || '📄';
};

const postToDiscord = async (content: string, embeds?: DiscordEmbed[]) => {
  if (!DISCORD_WEBHOOK_URL) {
    throw new Error("Discord webhook URL not configured");
  }

  const payload: any = {
    content,
    username: "Preventli Marketing Bot",
    avatar_url: "https://via.placeholder.com/128x128/4F46E5/FFFFFF?text=P"
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

// Marketing documents data
const getMarketingDocs = () => [
  {
    id: "launch-action-plan",
    title: "Launch Action Plan",
    description: "48-hour deployment sequence for customer validation survey",
    category: "Execution",
    priority: "Critical",
    status: "Deploy Ready",
    lastUpdated: "2026-02-04",
    content: "Complete 48-hour launch sequence ready for immediate execution. All survey assets, email campaigns, and tracking systems prepared.",
    keyPoints: [
      "48-hour deployment timeline ready",
      "174 customers segmented and targeted",
      "All email templates and SMS reminders complete",
      "Response tracking dashboard configured"
    ]
  },
  {
    id: "customer-validation",
    title: "Customer Validation Survey",
    description: "12-question validation survey targeting 174 existing customers",
    category: "Research",
    priority: "Critical",
    status: "Deploy Ready",
    lastUpdated: "2026-02-04",
    content: "Comprehensive validation survey ready to deploy to entire customer base. Targeting $2.5M ARR opportunity validation.",
    keyPoints: [
      "12 comprehensive validation questions",
      "174 existing customers targeted",
      "35% response rate target (61 responses)",
      "60%+ positive threshold for GO decision"
    ]
  },
  {
    id: "go-to-market",
    title: "Go-To-Market Strategy",
    description: "Multi-segment approach targeting Victorian workers' compensation stakeholders",
    category: "Strategy",
    priority: "High",
    status: "Complete",
    lastUpdated: "2026-02-04",
    content: "Comprehensive market entry strategy with 3-tier segmentation: Employers (SMB), Self-Insurers, Insurance Companies.",
    keyPoints: [
      "3-segment market targeting strategy",
      "Fastest sales cycle with SMB employers",
      "Higher ACV with self-insurers",
      "Enterprise deals with insurance companies"
    ]
  },
  {
    id: "pricing-model",
    title: "Pricing Strategy",
    description: "Revenue model for Employee Health Lifecycle Platform",
    category: "Business Model",
    priority: "High",
    status: "Complete",
    lastUpdated: "2026-02-04",
    content: "Tiered SaaS pricing structure targeting $2.5M ARR opportunity with employee-based pricing model.",
    keyPoints: [
      "Employee-based SaaS pricing structure",
      "3-tier feature differentiation",
      "Enterprise premium for advanced analytics",
      "$2.5M ARR opportunity validation"
    ]
  }
];

/**
 * @route POST /api/discord/post-document
 * @desc Post a marketing document to Discord
 */
router.post("/post-document", authorize(), async (req: AuthRequest, res: Response) => {
  try {
    const { documentId, channelMessage } = req.body;

    const docs = getMarketingDocs();
    const doc = docs.find(d => d.id === documentId);

    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    const embed = createDiscordEmbed(doc);
    const content = channelMessage || `📢 **${doc.title}** has been shared from Preventli Marketing Dashboard`;

    await postToDiscord(content, [embed]);

    logger.info(`Posted document ${documentId} to Discord`, {
      userId: req.user!.id,
      documentId,
      organizationId: req.user!.organizationId
    });

    res.json({
      success: true,
      message: "Document posted to Discord successfully",
      documentTitle: doc.title
    });

  } catch (error) {
    logger.error("Error posting to Discord:", undefined, error);
    res.status(500).json({
      error: "Failed to post to Discord",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * @route POST /api/discord/post-summary
 * @desc Post a summary of all marketing documents to Discord
 */
router.post("/post-summary", authorize(), async (req: AuthRequest, res: Response) => {
  try {
    const { channelMessage, includeDeployReady } = req.body;

    const docs = getMarketingDocs();
    let filteredDocs = docs;

    if (includeDeployReady) {
      filteredDocs = docs.filter(doc => doc.status === "Deploy Ready");
    }

    const summaryContent = `🚀 **Preventli Marketing Strategy Dashboard**

📊 **${filteredDocs.length} Documents ${includeDeployReady ? '(Deploy Ready)' : 'Available'}**

${filteredDocs.map(doc =>
  `${getDocumentEmoji(doc.category)} **${doc.title}**\n` +
  `   └ ${doc.description}\n` +
  `   └ Priority: ${doc.priority} | Status: ${doc.status}\n`
).join('\n')}

💰 **Market Opportunity:** $2.5M ARR validation target
🎯 **Customer Base:** 174 existing customers ready for survey
⏰ **Status:** Ready for immediate deployment

---
*Generated from Preventli Marketing Dashboard*`;

    const content = channelMessage || "📢 **Marketing Strategy Update from Preventli**";

    await postToDiscord(summaryContent);

    logger.info(`Posted marketing summary to Discord`, {
      userId: req.user!.id,
      documentCount: filteredDocs.length,
      deployReadyOnly: includeDeployReady,
      organizationId: req.user!.organizationId
    });

    res.json({
      success: true,
      message: "Marketing summary posted to Discord successfully",
      documentCount: filteredDocs.length
    });

  } catch (error) {
    logger.error("Error posting summary to Discord:", undefined, error);
    res.status(500).json({
      error: "Failed to post summary to Discord",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * @route POST /api/discord/post-urgent-action
 * @desc Post urgent action items to Discord
 */
router.post("/post-urgent-action", authorize(), async (req: AuthRequest, res: Response) => {
  try {
    const urgentContent = `🚨 **URGENT ACTION REQUIRED: Customer Validation Survey**

⏰ **READY TO DEPLOY NOW** - All assets complete

📋 **What's Ready:**
✅ 12-question validation survey configured
✅ 174 customers segmented (Top 20, Active, Remaining)
✅ 3-phase email campaign templates ready
✅ SMS reminder systems configured
✅ Response tracking dashboard prepared
✅ Professional Preventli branding applied

🎯 **48-Hour Launch Sequence:**
**Step 1:** Survey platform setup (2 hours)
**Step 2:** Customer database prep (1 hour)
**Step 3:** Email campaign deployment (1 hour)

📊 **Success Metrics:**
• Target: 35% response rate (61/174 responses)
• GO Decision: 60%+ positive responses
• Market Validation: $2.5M ARR opportunity

💰 **Business Impact:**
This survey validates our Employee Health Lifecycle Platform expansion and $2.5M ARR opportunity.

🚀 **IMMEDIATE ACTION:**
Reply with 👍 to proceed with deployment or 📞 to schedule strategy call.

---
*Priority: CRITICAL | Status: Deploy Ready | Team: @here*`;

    await postToDiscord(urgentContent);

    logger.info(`Posted urgent action to Discord`, {
      userId: req.user!.id,
      organizationId: req.user!.organizationId
    });

    res.json({
      success: true,
      message: "Urgent action posted to Discord successfully"
    });

  } catch (error) {
    logger.error("Error posting urgent action to Discord:", undefined, error);
    res.status(500).json({
      error: "Failed to post urgent action to Discord",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * @route GET /api/discord/test-connection
 * @desc Test Discord webhook connection
 */
router.get("/test-connection", authorize(), async (req: AuthRequest, res: Response) => {
  try {
    if (!DISCORD_WEBHOOK_URL) {
      return res.status(400).json({
        error: "Discord webhook not configured",
        details: "Please set DISCORD_WEBHOOK_URL environment variable"
      });
    }

    await postToDiscord("🤖 **Connection Test from Preventli**\n\nDiscord integration is working correctly! Marketing documents can now be posted automatically.");

    res.json({
      success: true,
      message: "Discord connection test successful",
      webhookConfigured: true
    });

  } catch (error) {
    logger.error("Discord connection test failed:", undefined, error);
    res.status(500).json({
      error: "Discord connection test failed",
      details: error instanceof Error ? error.message : "Unknown error",
      webhookConfigured: !!DISCORD_WEBHOOK_URL
    });
  }
});

export default router;