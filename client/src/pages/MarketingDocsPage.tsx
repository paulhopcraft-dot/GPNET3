import React, { useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Download,
  Share2,
  ExternalLink,
  Target,
  DollarSign,
  Users,
  Rocket,
  BarChart3,
  Mail,
  Calendar,
  Copy,
  CheckCircle
} from "lucide-react";

export default function MarketingDocsPage() {
  const [copiedDoc, setCopiedDoc] = useState<string | null>(null);

  const marketingDocs = [
    {
      id: "go-to-market",
      title: "Go-To-Market Strategy",
      description: "Comprehensive market entry strategy targeting Victorian workers' compensation stakeholders",
      category: "Strategy",
      priority: "Critical",
      icon: Target,
      status: "Complete",
      lastUpdated: "2026-02-04",
      content: "Multi-segment, phased approach focusing on reference customers in each segment. Primary targets: Employers (SMB), Self-Insurers, Insurance Companies.",
      keyPoints: [
        "3-tier market segmentation approach",
        "Fastest sales cycle with SMB employers",
        "Higher ACV with self-insurers",
        "Largest deals with insurance companies"
      ]
    },
    {
      id: "pricing-model",
      title: "Pricing Model",
      description: "Revenue strategy and pricing structure for employee health lifecycle platform",
      category: "Business Model",
      priority: "High",
      icon: DollarSign,
      status: "Complete",
      lastUpdated: "2026-02-04",
      content: "$2.5M ARR opportunity validation with tiered pricing model based on employee count and feature access.",
      keyPoints: [
        "Tiered SaaS pricing structure",
        "Employee-based pricing model",
        "Enterprise feature differentiation",
        "Competitive market positioning"
      ]
    },
    {
      id: "marketing-strategy",
      title: "Marketing Strategy",
      description: "Brand positioning and customer acquisition strategy",
      category: "Marketing",
      priority: "High",
      icon: BarChart3,
      status: "Complete",
      lastUpdated: "2026-02-04",
      content: "Preventli brand positioning as comprehensive employee health lifecycle platform from hire-to-retire.",
      keyPoints: [
        "Professional Preventli branding system",
        "Employee lifecycle value proposition",
        "Competitive differentiation strategy",
        "Customer acquisition channels"
      ]
    },
    {
      id: "lifecycle-marketing",
      title: "Lifecycle Marketing Strategy",
      description: "Employee lifecycle platform marketing approach",
      category: "Strategy",
      priority: "Medium",
      icon: Users,
      status: "Complete",
      lastUpdated: "2026-02-04",
      content: "Strategic positioning transformation from compliance tool to comprehensive employee health platform.",
      keyPoints: [
        "Hire-to-retire positioning",
        "Health intelligence platform",
        "Longitudinal data competitive moat",
        "$100M+ market opportunity"
      ]
    },
    {
      id: "customer-validation",
      title: "Customer Validation Survey",
      description: "12-question validation survey for existing customer base",
      category: "Research",
      priority: "Critical",
      icon: CheckCircle,
      status: "Deploy Ready",
      lastUpdated: "2026-02-04",
      content: "Ready-to-deploy survey targeting 174 existing customers to validate $2.5M ARR opportunity.",
      keyPoints: [
        "12 comprehensive validation questions",
        "174 existing customers targeted",
        "60%+ positive threshold for GO decision",
        "3-phase deployment strategy"
      ]
    },
    {
      id: "survey-deployment",
      title: "Survey Deployment Kit",
      description: "Complete deployment assets for customer validation campaign",
      category: "Execution",
      priority: "Critical",
      icon: Mail,
      status: "Deploy Ready",
      lastUpdated: "2026-02-04",
      content: "Professional email templates, SMS reminders, and tracking systems with Preventli branding.",
      keyPoints: [
        "3-phase email campaign templates",
        "SMS reminder systems",
        "Response tracking dashboard",
        "Professional Preventli branding"
      ]
    },
    {
      id: "launch-action-plan",
      title: "Launch Action Plan",
      description: "Immediate 48-hour deployment plan for customer validation",
      category: "Execution",
      priority: "Urgent",
      icon: Rocket,
      status: "Deploy Ready",
      lastUpdated: "2026-02-04",
      content: "Step-by-step deployment sequence ready for immediate execution within next 48 hours.",
      keyPoints: [
        "48-hour deployment timeline",
        "All assets deployment-ready",
        "Customer segmentation strategy",
        "Success metrics defined"
      ]
    },
    {
      id: "saal-lifecycle",
      title: "SAAL Lifecycle Strategy",
      description: "Specialized strategy for SAAL insurance market",
      category: "Market",
      priority: "Medium",
      icon: Target,
      status: "Complete",
      lastUpdated: "2026-02-04",
      content: "Targeted approach for South Australian insurance market with lifecycle platform positioning.",
      keyPoints: [
        "SAAL market analysis",
        "Regulatory compliance approach",
        "Competitive positioning",
        "Market entry strategy"
      ]
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Critical": return "bg-red-100 text-red-800 border-red-300";
      case "Urgent": return "bg-orange-100 text-orange-800 border-orange-300";
      case "High": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default: return "bg-blue-100 text-blue-800 border-blue-300";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Deploy Ready": return "bg-green-100 text-green-800 border-green-300";
      case "Complete": return "bg-blue-100 text-blue-800 border-blue-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const copyToClipboard = async (docId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedDoc(docId);
      setTimeout(() => setCopiedDoc(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const generateDiscordEmbed = (doc: any) => {
    return `**${doc.title}**
📋 ${doc.description}

**Category:** ${doc.category} | **Priority:** ${doc.priority} | **Status:** ${doc.status}

**Key Points:**
${doc.keyPoints.map((point: string) => `• ${point}`).join('\n')}

**Content:** ${doc.content}

---
*Last updated: ${doc.lastUpdated}*`;
  };

  return (
    <PageLayout title="Marketing Documents" subtitle="Business strategy and deployment assets for Employee Health Lifecycle Platform">
      <div className="space-y-6">

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{marketingDocs.length}</div>
              <p className="text-xs text-muted-foreground">Business strategy assets</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deploy Ready</CardTitle>
              <Rocket className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{marketingDocs.filter(doc => doc.status === "Deploy Ready").length}</div>
              <p className="text-xs text-muted-foreground">Ready for immediate use</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Priority</CardTitle>
              <Target className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{marketingDocs.filter(doc => doc.priority === "Critical" || doc.priority === "Urgent").length}</div>
              <p className="text-xs text-muted-foreground">High-impact documents</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Market Opportunity</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$2.5M</div>
              <p className="text-xs text-muted-foreground">ARR validation target</p>
            </CardContent>
          </Card>
        </div>

        {/* Document Categories */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All Documents</TabsTrigger>
            <TabsTrigger value="strategy">Strategy</TabsTrigger>
            <TabsTrigger value="execution">Execution</TabsTrigger>
            <TabsTrigger value="research">Research</TabsTrigger>
            <TabsTrigger value="discord">Discord Sharing</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <div className="grid gap-4">
              {marketingDocs.map((doc) => {
                const IconComponent = doc.icon;
                return (
                  <Card key={doc.id} className="transition-shadow hover:shadow-lg">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <IconComponent className="h-6 w-6 text-blue-600 mt-1" />
                          <div>
                            <CardTitle className="text-lg">{doc.title}</CardTitle>
                            <CardDescription className="text-sm text-muted-foreground mt-1">
                              {doc.description}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline" className={getPriorityColor(doc.priority)}>
                            {doc.priority}
                          </Badge>
                          <Badge variant="outline" className={getStatusColor(doc.status)}>
                            {doc.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="text-sm">{doc.content}</p>

                        <div>
                          <h4 className="text-sm font-medium mb-2">Key Points:</h4>
                          <ul className="space-y-1">
                            {doc.keyPoints.map((point, index) => (
                              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                                <CheckCircle className="h-3 w-3 text-green-600 mt-1 flex-shrink-0" />
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t">
                          <div className="text-xs text-muted-foreground">
                            Category: {doc.category} | Updated: {doc.lastUpdated}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(doc.id, generateDiscordEmbed(doc))}
                              className="flex items-center gap-1"
                            >
                              {copiedDoc === doc.id ? (
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                              {copiedDoc === doc.id ? "Copied!" : "Copy for Discord"}
                            </Button>
                            <Button variant="outline" size="sm">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View Full
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="strategy" className="space-y-4">
            <div className="grid gap-4">
              {marketingDocs.filter(doc => doc.category === "Strategy").map((doc) => {
                const IconComponent = doc.icon;
                return (
                  <Card key={doc.id}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <IconComponent className="h-6 w-6 text-blue-600" />
                        <div>
                          <CardTitle>{doc.title}</CardTitle>
                          <CardDescription>{doc.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm mb-4">{doc.content}</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                        <Button variant="outline" size="sm">
                          <Share2 className="h-3 w-3 mr-1" />
                          Share
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="execution" className="space-y-4">
            <div className="grid gap-4">
              {marketingDocs.filter(doc => doc.category === "Execution").map((doc) => {
                const IconComponent = doc.icon;
                return (
                  <Card key={doc.id} className="border-l-4 border-l-green-500">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <IconComponent className="h-6 w-6 text-green-600" />
                        <div>
                          <CardTitle>{doc.title}</CardTitle>
                          <CardDescription>{doc.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm mb-4">{doc.content}</p>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-green-800">Ready for Deployment</p>
                        <p className="text-xs text-green-700 mt-1">All assets complete and ready for immediate use</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="research" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer Validation Survey</CardTitle>
                <CardDescription>Ready to deploy to 174 existing customers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900">Survey Details</h4>
                    <ul className="text-sm text-blue-800 mt-2 space-y-1">
                      <li>• 12 comprehensive validation questions</li>
                      <li>• 174 existing customers targeted</li>
                      <li>• 35% response rate target (61 responses)</li>
                      <li>• 60%+ positive threshold for GO decision</li>
                    </ul>
                  </div>
                  <Button className="w-full">
                    <Rocket className="h-4 w-4 mr-2" />
                    Deploy Customer Validation Survey
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="discord" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Discord Sharing Instructions</CardTitle>
                <CardDescription>How to share your marketing documents on Discord</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">📱 Easy Sharing Steps:</h4>
                    <ol className="text-sm space-y-2">
                      <li>1. Click "Copy for Discord" on any document above</li>
                      <li>2. Go to your Discord channel</li>
                      <li>3. Paste the formatted content</li>
                      <li>4. The document will appear with proper formatting</li>
                    </ol>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">💡 Pro Tips:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Use threads for detailed discussions</li>
                      <li>• Pin important documents for easy access</li>
                      <li>• Create separate channels for different document types</li>
                      <li>• Use reactions for quick feedback</li>
                    </ul>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">🚀 Ready to Deploy:</h4>
                    <p className="text-sm text-green-800">
                      Your customer validation survey and deployment kit are ready for immediate use.
                      Copy the Launch Action Plan to Discord to coordinate with your team!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </PageLayout>
  );
}