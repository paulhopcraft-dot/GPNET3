import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { getAuthToken } from "../contexts/AuthContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface OverviewData {
  totalCases: number;
  workStatus: { atWork: number; offWork: number };
  riskLevel: { high: number; medium: number; low: number };
  compliance: {
    veryHigh: number;
    high: number;
    medium: number;
    low: number;
    veryLow: number;
  };
  casesByCompany: Record<string, number>;
  employmentStatus: {
    active: number;
    suspended: number;
    terminationInProgress: number;
    terminated: number;
  };
}

interface Insight {
  type: "info" | "warning" | "critical";
  title: string;
  description: string;
  metric?: number;
}

const COLORS = {
  primary: "#3b82f6",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  muted: "#94a3b8",
};

const PIE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#94a3b8"];

export default function ReportsDashboard() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "charts" | "insights">("overview");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const token = getAuthToken();
    if (!token) return;

    setLoading(true);
    try {
      const [overviewRes, insightsRes] = await Promise.all([
        fetch("/api/reports/overview", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/reports/insights", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setOverview(data.data);
      }

      if (insightsRes.ok) {
        const data = await insightsRes.json();
        setInsights(data.data.insights);
      }
    } catch (err) {
      setError("Failed to load report data");
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch("/api/reports/export", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "gpnet-cases-export.csv";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error("Export failed:", err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="material-symbols-outlined animate-spin">progress_activity</span>
          Loading reports...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <span className="material-symbols-outlined">error</span>
              {error}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const workStatusData = overview ? [
    { name: "At Work", value: overview.workStatus.atWork, color: COLORS.success },
    { name: "Off Work", value: overview.workStatus.offWork, color: COLORS.danger },
  ] : [];

  const riskData = overview ? [
    { name: "High", value: overview.riskLevel.high, color: COLORS.danger },
    { name: "Medium", value: overview.riskLevel.medium, color: COLORS.warning },
    { name: "Low", value: overview.riskLevel.low, color: COLORS.success },
  ] : [];

  const companyData = overview ? Object.entries(overview.casesByCompany)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10) : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")}>
              <span className="material-symbols-outlined mr-2">arrow_back</span>
              Back to Dashboard
            </Button>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">analytics</span>
              Reports & Analytics
            </h1>
          </div>
          <Button onClick={handleExport} variant="outline">
            <span className="material-symbols-outlined mr-2 text-sm">download</span>
            Export CSV
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex gap-2 border-b pb-4 mb-6">
          <Button
            variant={activeTab === "overview" ? "default" : "ghost"}
            onClick={() => setActiveTab("overview")}
          >
            <span className="material-symbols-outlined mr-2 text-sm">dashboard</span>
            Overview
          </Button>
          <Button
            variant={activeTab === "charts" ? "default" : "ghost"}
            onClick={() => setActiveTab("charts")}
          >
            <span className="material-symbols-outlined mr-2 text-sm">bar_chart</span>
            Charts
          </Button>
          <Button
            variant={activeTab === "insights" ? "default" : "ghost"}
            onClick={() => setActiveTab("insights")}
          >
            <span className="material-symbols-outlined mr-2 text-sm">lightbulb</span>
            Insights
          </Button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && overview && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Cases</CardDescription>
                  <CardTitle className="text-3xl">{overview.totalCases}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Active worker cases
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>At Work</CardDescription>
                  <CardTitle className="text-3xl text-success">{overview.workStatus.atWork}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    {Math.round((overview.workStatus.atWork / overview.totalCases) * 100) || 0}% of total
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Off Work</CardDescription>
                  <CardTitle className="text-3xl text-warning">{overview.workStatus.offWork}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    {Math.round((overview.workStatus.offWork / overview.totalCases) * 100) || 0}% of total
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>High Risk</CardDescription>
                  <CardTitle className="text-3xl text-destructive">{overview.riskLevel.high}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Require immediate attention
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Risk Level Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Level Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-destructive" />
                      <span>High Risk</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-destructive"
                          style={{ width: `${(overview.riskLevel.high / overview.totalCases) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-10 text-right">{overview.riskLevel.high}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-warning" />
                      <span>Medium Risk</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-warning"
                          style={{ width: `${(overview.riskLevel.medium / overview.totalCases) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-10 text-right">{overview.riskLevel.medium}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-success" />
                      <span>Low Risk</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-success"
                          style={{ width: `${(overview.riskLevel.low / overview.totalCases) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-10 text-right">{overview.riskLevel.low}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Employment Status */}
            <Card>
              <CardHeader>
                <CardTitle>Employment Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-success">{overview.employmentStatus.active}</div>
                    <div className="text-sm text-muted-foreground">Active</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-warning">{overview.employmentStatus.suspended}</div>
                    <div className="text-sm text-muted-foreground">Suspended</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-500">{overview.employmentStatus.terminationInProgress}</div>
                    <div className="text-sm text-muted-foreground">Termination In Progress</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-destructive">{overview.employmentStatus.terminated}</div>
                    <div className="text-sm text-muted-foreground">Terminated</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts Tab */}
        {activeTab === "charts" && overview && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Work Status Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Work Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={workStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {workStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Risk Level Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Risk Level Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={riskData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {riskData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Cases by Company Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Cases by Company</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={companyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill={COLORS.primary} name="Cases" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === "insights" && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium">AI-Powered Insights</h2>
            {insights.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <span className="material-symbols-outlined text-4xl mb-2">lightbulb</span>
                  <p>No insights available at this time.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {insights.map((insight, index) => (
                  <Card
                    key={index}
                    className={
                      insight.type === "critical"
                        ? "border-destructive bg-destructive/5"
                        : insight.type === "warning"
                        ? "border-warning bg-warning/5"
                        : ""
                    }
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            insight.type === "critical"
                              ? "bg-destructive/20 text-destructive"
                              : insight.type === "warning"
                              ? "bg-warning/20 text-warning"
                              : "bg-primary/20 text-primary"
                          }`}
                        >
                          <span className="material-symbols-outlined">
                            {insight.type === "critical"
                              ? "warning"
                              : insight.type === "warning"
                              ? "priority_high"
                              : "info"}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{insight.title}</h3>
                            {insight.metric !== undefined && (
                              <Badge
                                variant={
                                  insight.type === "critical"
                                    ? "destructive"
                                    : insight.type === "warning"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {insight.metric}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{insight.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
