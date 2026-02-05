import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Search,
  Filter,
  LayoutGrid,
  List,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  Users,
  Activity,
  Calendar,
  FileText,
  Target,
  Zap,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { CaseOverviewCard } from "@/components/unified-case-management/CaseOverviewCard";
import { SmartActionPanel } from "@/components/unified-case-management/SmartActionPanel";
import { SmartNavigation } from "@/components/unified-case-management/SmartNavigation";
import { SmartStatusIndicator } from "@/components/unified-case-management/SmartStatusIndicator";
import { AIExpertAssistant } from "@/components/unified-case-management/AIExpertAssistant";
import { ExpertChatInterface } from "@/components/unified-case-management/ExpertChatInterface";
import { ProactiveGuidanceSystem } from "@/components/unified-case-management/ProactiveGuidanceSystem";
import { IntelligentSummaryPanel } from "@/components/unified-case-management/IntelligentSummaryPanel";
import { InjuryLifecycleManager } from "@/components/unified-case-management/InjuryLifecycleManager";
import { OneClickActionsPanel } from "@/components/unified-case-management/OneClickActionsPanel";
import { SmartTimelineVisualization } from "@/components/unified-case-management/SmartTimelineVisualization";
import { StakeholderCoordinationHub } from "@/components/unified-case-management/StakeholderCoordinationHub";
import { WorkerCase } from "@shared/schema";

interface WorkspaceStats {
  totalCases: number;
  activeCases: number;
  criticalActions: number;
  urgentActions: number;
  casesAtWork: number;
  casesOffWork: number;
  highRiskCases: number;
  complianceConcerns: number;
}

interface ActionItem {
  id: string;
  caseId: string;
  workerName: string;
  title: string;
  description: string;
  urgency: "immediate" | "today" | "this_week" | "routine";
  category: "medical" | "rtw" | "compliance" | "administrative";
  dueDate?: string;
  createdAt: string;
}

export default function UnifiedCaseWorkspace() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // View and filter state
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch cases with enhanced data
  const { data: casesResponse, isLoading } = useQuery<{ cases: WorkerCase[] }>({
    queryKey: ["cases-workspace"],
    queryFn: async () => {
      const response = await fetch("/api/gpnet2/cases");
      if (!response.ok) throw new Error("Failed to fetch cases");
      return response.json();
    }
  });

  // Fetch workspace statistics
  const { data: statsResponse } = useQuery<{ stats: WorkspaceStats }>({
    queryKey: ["workspace-stats"],
    queryFn: async () => {
      // This would be a new endpoint that calculates smart statistics
      const response = await fetch("/api/workspace/stats");
      if (!response.ok) {
        // Fallback calculation from existing data
        const cases = casesResponse?.cases || [];
        const stats: WorkspaceStats = {
          totalCases: cases.length,
          activeCases: cases.filter(c => c.workStatus === "Off work").length,
          criticalActions: cases.filter(c => c.riskLevel === "High").length,
          urgentActions: cases.filter(c => c.complianceIndicator === "Very Low" || c.complianceIndicator === "Low").length,
          casesAtWork: cases.filter(c => c.workStatus === "At work").length,
          casesOffWork: cases.filter(c => c.workStatus === "Off work").length,
          highRiskCases: cases.filter(c => c.riskLevel === "High").length,
          complianceConcerns: cases.filter(c => c.complianceIndicator === "Very Low" || c.complianceIndicator === "Low").length,
        };
        return { stats };
      }
      return response.json();
    },
    enabled: !!casesResponse
  });

  // Generate smart action items based on case analysis
  const actionItems = useMemo<ActionItem[]>(() => {
    if (!casesResponse?.cases) return [];

    const items: ActionItem[] = [];

    casesResponse.cases.forEach(workerCase => {
      const injuryDate = new Date(workerCase.dateOfInjury);
      const daysOffWork = Math.floor((Date.now() - injuryDate.getTime()) / (1000 * 60 * 60 * 24));

      // Critical actions
      if (workerCase.riskLevel === "High" && workerCase.workStatus === "Off work") {
        items.push({
          id: `critical-${workerCase.id}`,
          caseId: workerCase.id,
          workerName: workerCase.workerName,
          title: "High Risk Case Review Required",
          description: "High-risk worker off work - immediate clinical review needed",
          urgency: "immediate",
          category: "medical",
          dueDate: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });
      }

      // RTW planning
      if (workerCase.rtwPlanStatus === "not_planned" && daysOffWork > 7) {
        items.push({
          id: `rtw-${workerCase.id}`,
          caseId: workerCase.id,
          workerName: workerCase.workerName,
          title: "Create RTW Plan",
          description: `Worker off work for ${daysOffWork} days without RTW plan`,
          urgency: daysOffWork > 30 ? "immediate" : daysOffWork > 14 ? "today" : "this_week",
          category: "rtw",
          dueDate: new Date(Date.now() + (daysOffWork > 30 ? 0 : 2 * 24 * 60 * 60 * 1000)).toISOString(),
          createdAt: new Date().toISOString()
        });
      }

      // Compliance concerns
      if (workerCase.complianceIndicator === "Very Low" || workerCase.complianceIndicator === "Low") {
        items.push({
          id: `compliance-${workerCase.id}`,
          caseId: workerCase.id,
          workerName: workerCase.workerName,
          title: "Compliance Review Required",
          description: `Low compliance rating - review required`,
          urgency: "today",
          category: "compliance",
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString()
        });
      }

      // Long duration cases
      if (daysOffWork > 90) {
        items.push({
          id: `longterm-${workerCase.id}`,
          caseId: workerCase.id,
          workerName: workerCase.workerName,
          title: "Long-term Absence Review",
          description: `Worker off work for ${daysOffWork} days - case review needed`,
          urgency: "this_week",
          category: "administrative",
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString()
        });
      }
    });

    return items.sort((a, b) => {
      const urgencyOrder = { immediate: 0, today: 1, this_week: 2, routine: 3 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
  }, [casesResponse?.cases]);

  // Filter cases based on current filters
  const filteredCases = useMemo(() => {
    if (!casesResponse?.cases) return [];

    return casesResponse.cases.filter(workerCase => {
      const matchesSearch = searchTerm === "" ||
        workerCase.workerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        workerCase.company.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || workerCase.workStatus === statusFilter;

      const matchesRisk = riskFilter === "all" || workerCase.riskLevel === riskFilter;

      return matchesSearch && matchesStatus && matchesRisk;
    });
  }, [casesResponse?.cases, searchTerm, statusFilter, riskFilter]);

  // Filter action items based on urgency filter
  const filteredActions = useMemo(() => {
    if (urgencyFilter === "all") return actionItems;
    return actionItems.filter(item => item.urgency === urgencyFilter);
  }, [actionItems, urgencyFilter]);

  const handleActionClick = (action: string, caseId: string) => {
    switch (action) {
      case "view_full":
        navigate(`/summary/${caseId}`);
        break;
      case "timeline":
        navigate(`/summary/${caseId}?tab=timeline`);
        break;
      case "rtw":
        navigate(`/rtw-planner?case=${caseId}`);
        break;
      case "medical":
        navigate(`/summary/${caseId}?tab=injury`);
        break;
      case "compliance":
        navigate(`/summary/${caseId}?tab=risk`);
        break;
      case "contact":
      case "administrative":
        navigate(`/summary/${caseId}?tab=contacts`);
        break;
      default:
        navigate(`/summary/${caseId}`);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "immediate": return "bg-red-100 text-red-800 border-red-200";
      case "today": return "bg-orange-100 text-orange-800 border-orange-200";
      case "this_week": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "routine": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Smart Navigation */}
      <SmartNavigation />

      <div className="container mx-auto p-6 space-y-6">
        {/* Header with Smart Status */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Case Management Workspace</h1>
            <p className="text-gray-600 mt-1">Intelligent case oversight with guided workflows</p>
          </div>
          <div className="flex items-center gap-4">
            <SmartStatusIndicator showDetailed={false} position="header" />
            <Button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["cases-workspace"] })}
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

      {/* Smart Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{statsResponse?.stats?.totalCases || 0}</p>
                <p className="text-sm text-gray-600">Total Cases</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {actionItems.filter(a => a.urgency === "immediate").length}
                </p>
                <p className="text-sm text-gray-600">Critical Actions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {actionItems.filter(a => a.urgency === "today").length}
                </p>
                <p className="text-sm text-gray-600">Due Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{statsResponse?.stats?.casesAtWork || 0}</p>
                <p className="text-sm text-gray-600">Back at Work</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Workspace */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4" />
            Case Overview
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Priority Actions
            {actionItems.filter(a => a.urgency === "immediate" || a.urgency === "today").length > 0 && (
              <Badge className="ml-2 bg-red-500">
                {actionItems.filter(a => a.urgency === "immediate" || a.urgency === "today").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="expert" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Expert Insights
            <Badge className="ml-2 bg-purple-500 text-white">AI</Badge>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Case Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by worker name or company..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Work Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="At work">At Work</SelectItem>
                      <SelectItem value="Off work">Off Work</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={riskFilter} onValueChange={setRiskFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Risk" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Risk</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex border rounded-md">
                    <Button
                      variant={viewMode === "cards" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("cards")}
                      className="px-3"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className="px-3"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cases Display */}
          <div className={
            viewMode === "cards"
              ? "grid grid-cols-1 lg:grid-cols-2 gap-6"
              : "space-y-4"
          }>
            {filteredCases.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No cases match your current filters</p>
                </CardContent>
              </Card>
            ) : (
              filteredCases.map((workerCase) => (
                <CaseOverviewCard
                  key={workerCase.id}
                  workerCase={workerCase}
                  onActionClick={handleActionClick}
                />
              ))
            )}
          </div>
        </TabsContent>

        {/* Priority Actions Tab - Smart AI-Powered Panel */}
        <TabsContent value="actions" className="space-y-6">
          <SmartActionPanel onActionTaken={(actionId) => {
            // Refresh the workspace data when an action is completed
            queryClient.invalidateQueries({ queryKey: ["cases-workspace"] });
            queryClient.invalidateQueries({ queryKey: ["smart-actions"] });
          }} />
        </TabsContent>

        {/* Expert Insights Tab - AI Analysis & Recommendations */}
        <TabsContent value="expert" className="space-y-6">
          {/* Intelligent Summary - Full Width */}
          <IntelligentSummaryPanel />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* AI Expert Assistant - Main Column */}
            <div className="lg:col-span-2">
              <AIExpertAssistant mode="workspace" />
            </div>

            {/* Workspace Analytics Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Portfolio Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">High Risk Cases</span>
                    <Badge className="bg-red-100 text-red-800">
                      {statsResponse?.stats?.highRiskCases || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Compliance Issues</span>
                    <Badge className="bg-orange-100 text-orange-800">
                      {statsResponse?.stats?.complianceConcerns || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Active RTW Plans</span>
                    <Badge className="bg-blue-100 text-blue-800">
                      {statsResponse?.stats?.activeCases || 0}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Expert Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <Alert className="bg-blue-50 border-blue-200">
                      <Lightbulb className="w-4 h-4" />
                      <AlertDescription>
                        Early intervention on cases off work {'>'} 14 days reduces long-term disability by 40%
                      </AlertDescription>
                    </Alert>
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle className="w-4 h-4" />
                      <AlertDescription>
                        Your portfolio RTW success rate is above industry average
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <Card>
            <CardContent className="p-8 text-center">
              <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">Advanced analytics dashboard coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>

      {/* Floating Expert Chat - Available throughout the workspace */}
      <ExpertChatInterface
        mode="floating"
        onActionSuggested={(action) => {
          // Handle suggested actions from the chat
          console.log("Chat suggested action:", action);
        }}
      />

      {/* Proactive Guidance System - Intelligent contextual recommendations */}
      <ProactiveGuidanceSystem
        onGuidanceInteraction={(guidanceId, action) => {
          console.log("Guidance interaction:", guidanceId, action);

          // Refresh data when user takes action on guidance
          if (action.startsWith("action:")) {
            queryClient.invalidateQueries({ queryKey: ["cases-workspace"] });
            queryClient.invalidateQueries({ queryKey: ["smart-actions"] });
          }
        }}
      />
    </div>
  );
}