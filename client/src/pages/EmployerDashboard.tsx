import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import type { PaginatedCasesResponse } from "@shared/schema";
import { Users, Clock, CheckCircle2, AlertTriangle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function EmployerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: paginatedData, isLoading } = useQuery<PaginatedCasesResponse>({
    queryKey: ["/api/gpnet2/cases"],
    refetchInterval: 60000,
  });
  const cases = paginatedData?.cases ?? [];

  // Filter cases for this employer's company
  const companyCases = useMemo(() => {
    // In a real implementation, filter by user's companyId
    // For now, show all cases but this would be restricted server-side
    return cases.filter((c) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "at-work") return c.workStatus === "At work";
      if (statusFilter === "off-work") return c.workStatus === "Off work";
      if (statusFilter === "attention") {
        return (
          c.complianceIndicator === "Low" ||
          c.complianceIndicator === "Very Low" ||
          !c.hasCertificate
        );
      }
      return true;
    });
  }, [cases, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: cases.length,
      atWork: cases.filter((c) => c.workStatus === "At work").length,
      offWork: cases.filter((c) => c.workStatus === "Off work").length,
      needsAttention: cases.filter(
        (c) =>
          c.complianceIndicator === "Low" ||
          c.complianceIndicator === "Very Low" ||
          !c.hasCertificate
      ).length,
    };
  }, [cases]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading your workers...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary">Preventli</h1>
              <p className="text-sm text-muted-foreground">
                {user?.email} - Employer Portal
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card
            className={`cursor-pointer transition-all ${
              statusFilter === "all" ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setStatusFilter("all")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Workers</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${
              statusFilter === "at-work" ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setStatusFilter("at-work")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.atWork}</p>
                  <p className="text-xs text-muted-foreground">At Work</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${
              statusFilter === "off-work" ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setStatusFilter("off-work")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.offWork}</p>
                  <p className="text-xs text-muted-foreground">Off Work</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${
              statusFilter === "attention" ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setStatusFilter("attention")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.needsAttention}</p>
                  <p className="text-xs text-muted-foreground">Needs Attention</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Worker List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {statusFilter === "all" && "All Workers"}
              {statusFilter === "at-work" && "Workers At Work"}
              {statusFilter === "off-work" && "Workers Off Work"}
              {statusFilter === "attention" && "Workers Needing Attention"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {companyCases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No workers in this category
              </div>
            ) : (
              <div className="space-y-2">
                {companyCases.map((workerCase) => (
                  <div
                    key={workerCase.id}
                    onClick={() => navigate(`/employer/case/${workerCase.id}`)}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {workerCase.workerName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{workerCase.workerName}</p>
                        <p className="text-sm text-muted-foreground">
                          Injury: {workerCase.dateOfInjury}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        className={
                          workerCase.workStatus === "At work"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }
                      >
                        {workerCase.workStatus}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          workerCase.complianceIndicator === "Very High" ||
                          workerCase.complianceIndicator === "High"
                            ? "border-emerald-300 text-emerald-700"
                            : workerCase.complianceIndicator === "Medium"
                            ? "border-amber-300 text-amber-700"
                            : "border-red-300 text-red-700"
                        }
                      >
                        {workerCase.complianceIndicator}
                      </Badge>
                      {!workerCase.hasCertificate && (
                        <Badge variant="destructive" className="text-xs">
                          No Cert
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
