import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/MainLayout";
import { CasesTable } from "@/components/CasesTable";
import { CaseDetailPanel } from "@/components/CaseDetailPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Plus, RefreshCw } from "lucide-react";
import type { WorkerCase } from "@shared/schema";
import { isLegitimateCase, getSurname } from "@shared/schema";
import { Link } from "react-router-dom";

export default function CasesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedRisk, setSelectedRisk] = useState<string>("all");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const { data: cases = [], isLoading, refetch } = useQuery<WorkerCase[]>({
    queryKey: ["/api/gpnet2/cases"],
    refetchInterval: 30000,
  });

  const filteredCases = useMemo(() => {
    return cases
      .filter((c) => {
        if (!isLegitimateCase(c)) return false;

        const matchesSearch = !searchQuery ||
          c.workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.diagnosis?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCompany = selectedCompany === "all" || c.company === selectedCompany;
        const matchesStatus = selectedStatus === "all" || c.workStatus === selectedStatus;
        const matchesRisk = selectedRisk === "all" || c.riskLevel === selectedRisk;

        return matchesSearch && matchesCompany && matchesStatus && matchesRisk;
      })
      .sort((a, b) => getSurname(a.workerName).localeCompare(getSurname(b.workerName)));
  }, [cases, searchQuery, selectedCompany, selectedStatus, selectedRisk]);

  const companies = useMemo(() => {
    const companySet = new Set(cases.filter(isLegitimateCase).map((c) => c.company));
    return Array.from(companySet).sort();
  }, [cases]);

  const workStatuses = useMemo(() => {
    const statusSet = new Set(cases.filter(isLegitimateCase).map((c) => c.workStatus));
    return Array.from(statusSet);
  }, [cases]);

  const selectedCase = useMemo(() => {
    return cases.find((c) => c.id === selectedCaseId) || null;
  }, [cases, selectedCaseId]);

  const stats = useMemo(() => {
    const legitimate = cases.filter(isLegitimateCase);
    return {
      total: legitimate.length,
      high: legitimate.filter((c) => c.riskLevel === "High").length,
      medium: legitimate.filter((c) => c.riskLevel === "Medium").length,
      atWork: legitimate.filter((c) => c.workStatus === "At work").length,
      offWork: legitimate.filter((c) => c.workStatus === "Off work").length,
    };
  }, [cases]);

  return (
    <MainLayout>
      <div className="flex h-full">
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Cases</h1>
              <p className="text-muted-foreground">
                {filteredCases.length} of {stats.total} cases
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Link to="/claims/new">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Claim
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Total Cases</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-red-600">{stats.high}</div>
                <p className="text-xs text-muted-foreground">High Risk</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-yellow-600">{stats.medium}</div>
                <p className="text-xs text-muted-foreground">Medium Risk</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-green-600">{stats.atWork}</div>
                <p className="text-xs text-muted-foreground">At Work</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-orange-600">{stats.offWork}</div>
                <p className="text-xs text-muted-foreground">Off Work</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, company, or diagnosis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company} value={company}>
                    {company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {workStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedRisk} onValueChange={setSelectedRisk}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>

            {(searchQuery || selectedCompany !== "all" || selectedStatus !== "all" || selectedRisk !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCompany("all");
                  setSelectedStatus("all");
                  setSelectedRisk("all");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Cases Table */}
          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Loading cases...</p>
              </div>
            ) : (
              <CasesTable
                cases={filteredCases}
                selectedCaseId={selectedCaseId}
                onCaseClick={setSelectedCaseId}
              />
            )}
          </div>
        </div>

        {/* Detail Panel */}
        {selectedCase && (
          <CaseDetailPanel
            workerCase={selectedCase}
            onClose={() => setSelectedCaseId(null)}
          />
        )}
      </div>
    </MainLayout>
  );
}
