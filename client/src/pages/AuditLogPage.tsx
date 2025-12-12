import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WorkerCase } from "@shared/schema";
import { isLegitimateCase } from "@shared/schema";

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  caseId: string;
  workerName: string;
  details: string;
  category: string;
}

export default function AuditLogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateRange, setDateRange] = useState("7d");

  const { data: cases = [], isLoading } = useQuery<WorkerCase[]>({
    queryKey: ["/api/gpnet2/cases"],
  });

  // Generate mock audit entries based on case data
  const auditEntries = useMemo(() => {
    const legitimate = cases.filter(isLegitimateCase);
    const entries: AuditEntry[] = [];
    const users = ["System", "CLC Team", "Case Manager", "Admin"];
    const now = new Date();

    legitimate.forEach((c, index) => {
      // Case created
      entries.push({
        id: `audit-${c.id}-created`,
        timestamp: c.dateOfInjury,
        action: "Case Created",
        user: "System",
        caseId: c.id,
        workerName: c.workerName,
        details: `New case created for ${c.workerName} at ${c.company}`,
        category: "case",
      });

      // Status updates
      if (c.ticketLastUpdatedAt) {
        entries.push({
          id: `audit-${c.id}-updated`,
          timestamp: c.ticketLastUpdatedAt,
          action: "Case Updated",
          user: users[index % users.length],
          caseId: c.id,
          workerName: c.workerName,
          details: `Case status updated: ${c.currentStatus}`,
          category: "status",
        });
      }

      // AI summary generated
      if (c.aiSummary) {
        const summaryDate = new Date(c.ticketLastUpdatedAt || now);
        summaryDate.setHours(summaryDate.getHours() + 1);
        entries.push({
          id: `audit-${c.id}-summary`,
          timestamp: summaryDate.toISOString(),
          action: "AI Summary Generated",
          user: "System",
          caseId: c.id,
          workerName: c.workerName,
          details: "AI case summary was generated using Claude",
          category: "ai",
        });
      }

      // Compliance check
      if (c.compliance) {
        entries.push({
          id: `audit-${c.id}-compliance`,
          timestamp: c.compliance.lastChecked,
          action: "Compliance Check",
          user: "System",
          caseId: c.id,
          workerName: c.workerName,
          details: `Compliance: ${c.compliance.indicator} - ${c.compliance.reason}`,
          category: "compliance",
        });
      }
    });

    // Sort by timestamp descending
    return entries.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [cases]);

  const filteredEntries = useMemo(() => {
    const now = new Date();
    const daysMap: Record<string, number> = {
      "1d": 1,
      "7d": 7,
      "30d": 30,
      "90d": 90,
      "all": 365 * 10,
    };
    const days = daysMap[dateRange] || 7;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return auditEntries.filter((entry) => {
      const entryDate = new Date(entry.timestamp);
      const withinDateRange = entryDate >= cutoff;
      const matchesSearch =
        !searchQuery ||
        entry.workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.details.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || entry.category === categoryFilter;

      return withinDateRange && matchesSearch && matchesCategory;
    });
  }, [auditEntries, searchQuery, categoryFilter, dateRange]);

  const categoryColor = (category: string) => {
    switch (category) {
      case "case":
        return "bg-blue-100 text-blue-800";
      case "status":
        return "bg-amber-100 text-amber-800";
      case "ai":
        return "bg-purple-100 text-purple-800";
      case "compliance":
        return "bg-emerald-100 text-emerald-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <PageLayout title="Audit Log" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">
            progress_activity
          </span>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Audit Log" subtitle="System activity and change history">
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="Search by worker name, action, or details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="case">Case</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="ai">AI</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("all");
                  setDateRange("7d");
                }}
              >
                Reset Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredEntries.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Case Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {filteredEntries.filter((e) => e.category === "case").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                AI Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {filteredEntries.filter((e) => e.category === "ai").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Compliance Checks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {filteredEntries.filter((e) => e.category === "compliance").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Audit Log Entries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">history</span>
              Activity Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredEntries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <span className="material-symbols-outlined text-4xl mb-4">search_off</span>
                <p>No audit entries found matching your filters.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEntries.slice(0, 50).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-lg">
                        {entry.category === "case"
                          ? "folder"
                          : entry.category === "status"
                            ? "sync"
                            : entry.category === "ai"
                              ? "psychology"
                              : "verified"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{entry.action}</span>
                        <Badge className={categoryColor(entry.category)}>
                          {entry.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {entry.details}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Worker: {entry.workerName}</span>
                        <span>By: {entry.user}</span>
                        <span>{formatTimestamp(entry.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredEntries.length > 50 && (
                  <p className="text-center text-sm text-muted-foreground pt-4">
                    Showing first 50 entries. Refine your filters to see more specific results.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
