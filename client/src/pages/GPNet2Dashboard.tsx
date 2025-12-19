import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CompanyNav } from "@/components/CompanyNav";
import { SearchBar } from "@/components/SearchBar";
import { CasesTable } from "@/components/CasesTable";
import { CaseDetailPanel } from "@/components/CaseDetailPanel";
import { AIAssistant } from "@/components/ai-assistant";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { DashboardStats } from "@/components/dashboard-stats";
import { ActionQueueCard } from "@/components/ActionQueueCard";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { WorkerCase } from "@shared/schema";
import { isLegitimateCase, getSurname } from "@shared/schema";

export default function GPNet2Dashboard() {
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: cases = [], isLoading } = useQuery<WorkerCase[]>({
    queryKey: ["/api/gpnet2/cases"],
    refetchInterval: 30000,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/freshdesk/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to sync with Freshdesk");
      }
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/gpnet2/cases"] });
      // Only show toast if Freshdesk is configured or if manually triggered
      if (data.configured === false) {
        // Silently skip notification for unconfigured Freshdesk on initial load
        return;
      }
      toast({
        title: "Sync Complete",
        description: `Successfully synced ${data.synced} cases from Freshdesk`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync with Freshdesk",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    syncMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCases = useMemo(() => {
    const filtered = cases.filter((c) => {
      // Filter out non-legitimate cases (generic emails, etc.) - defense in depth
      if (!isLegitimateCase(c)) {
        return false;
      }
      const matchesCompany = !selectedCompany || c.company === selectedCompany;
      const matchesSearch =
        !searchQuery ||
        c.workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.company.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCompany && matchesSearch;
    });
    
    // Sort by surname (last name) within each company
    return filtered.sort((a, b) => {
      const surnameA = getSurname(a.workerName);
      const surnameB = getSurname(b.workerName);
      return surnameA.localeCompare(surnameB);
    });
  }, [cases, selectedCompany, searchQuery]);

  const availableCompanies = useMemo(() => {
    const companySet = new Set(
      cases
        .filter((c) => isLegitimateCase(c))
        .map((c) => c.company)
    );
    return Array.from(companySet).sort();
  }, [cases]);

  const selectedCase = useMemo(() => {
    return cases.find((c) => c.id === selectedCaseId) || null;
  }, [cases, selectedCaseId]);

  const handleCaseClick = (caseId: string) => {
    setSelectedCaseId(caseId);
  };

  const handleClosePanel = () => {
    setSelectedCaseId(null);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading cases...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <aside className="hidden lg:block w-64 flex-shrink-0 bg-sidebar p-4 border-r border-sidebar-border">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 rounded-full size-10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">corporate_fare</span>
            </div>
            <h1 className="text-sidebar-foreground text-xl font-bold">GPNet 2</h1>
          </div>
          <div className="mt-1 ml-13 text-xs text-sidebar-foreground/60">
            v2024.11.05 • {cases.length} cases loaded
          </div>
        </div>
        <CompanyNav companies={availableCompanies} selectedCompany={selectedCompany} onSelectCompany={setSelectedCompany} />
      </aside>

      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col p-3 sm:p-6 overflow-y-auto">
          <div className="lg:hidden mb-4 pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-primary/20 rounded-full size-8 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-lg">corporate_fare</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold">GPNet 2</h1>
                  <div className="text-xs text-muted-foreground">
                    {cases.length} cases loaded
                  </div>
                </div>
              </div>
              <ThemeToggle />
            </div>
          </div>
          
          {/* Dashboard Stats - Overview metrics */}
          <div className="mb-6">
            <DashboardStats cases={filteredCases} />
          </div>

          {/* Action Queue and Search Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <SearchBar value={searchQuery} onChange={setSearchQuery} />
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => syncMutation.mutate()}
                    disabled={syncMutation.isPending}
                    data-testid="button-sync-freshdesk"
                    size="sm"
                  >
                    <span className="material-symbols-outlined text-base">
                      {syncMutation.isPending ? "sync" : "refresh"}
                    </span>
                    <span className="font-bold hidden sm:inline">
                      {syncMutation.isPending ? "Syncing..." : "Sync Freshdesk"}
                    </span>
                  </Button>
                  <ThemeToggle className="hidden lg:block" />
                </div>
              </div>
            </div>
            <div className="lg:col-span-1">
              <ActionQueueCard onCaseClick={handleCaseClick} limit={5} />
            </div>
          </div>

          <CasesTable
            cases={filteredCases}
            selectedCaseId={selectedCaseId}
            onCaseClick={handleCaseClick}
          />
        </div>

        {selectedCase && (
          <CaseDetailPanel workerCase={selectedCase} onClose={handleClosePanel} />
        )}
      </main>
      
      <AIAssistant />
    </div>
  );
}
