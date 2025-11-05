import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CompanyNav } from "@/components/CompanyNav";
import { SearchBar } from "@/components/SearchBar";
import { CasesTable } from "@/components/CasesTable";
import { CaseDetailPanel } from "@/components/CaseDetailPanel";
import { ThemeToggle } from "@/components/theme-toggle";
import { AIAssistant } from "@/components/ai-assistant";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { WorkerCase } from "@shared/schema";

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

  const uniqueCompanies = useMemo(() => {
    const companies = Array.from(new Set(cases.map(c => c.company)))
      .filter(c => c && c !== 'Unknown' && c !== 'Unknown Company')
      .sort();
    return companies;
  }, [cases]);

  const stats = useMemo(() => {
    const total = cases.length;
    const pending = cases.filter(c => c.status === 'open' || c.status === 'pending').length;
    const completed = cases.filter(c => c.status === 'closed' || c.status === 'resolved').length;
    const highRisk = cases.filter(c => c.riskLevel === 'high').length;
    
    return {
      totalCases: total,
      pendingCases: pending,
      completedCases: completed,
      highRiskCases: highRisk,
    };
  }, [cases]);

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const matchesCompany = !selectedCompany || c.company === selectedCompany;
      const matchesSearch =
        !searchQuery ||
        c.workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.company.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCompany && matchesSearch;
    });
  }, [cases, selectedCompany, searchQuery]);

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
      <aside className="w-64 flex-shrink-0 bg-sidebar p-4 border-r border-sidebar-border">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-primary/20 rounded-full size-10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">corporate_fare</span>
          </div>
          <h1 className="text-sidebar-foreground text-xl font-bold">GPNet 2</h1>
        </div>
        <CompanyNav 
          companies={uniqueCompanies}
          selectedCompany={selectedCompany} 
          onSelectCompany={setSelectedCompany} 
        />
      </aside>

      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center gap-4">
              <SearchBar value={searchQuery} onChange={setSearchQuery} />
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                  data-testid="button-sync-freshdesk"
                >
                  <span className="material-symbols-outlined text-base">
                    {syncMutation.isPending ? "sync" : "refresh"}
                  </span>
                  <span className="font-bold">
                    {syncMutation.isPending ? "Syncing..." : "Sync Freshdesk"}
                  </span>
                </Button>
                <ThemeToggle />
              </div>
            </div>

            <CasesTable
              cases={filteredCases}
              selectedCaseId={selectedCaseId}
              onCaseClick={handleCaseClick}
            />
          </div>
        </div>

        {selectedCase && (
          <CaseDetailPanel workerCase={selectedCase} onClose={handleClosePanel} />
        )}
      </main>
      
      <AIAssistant />
    </div>
  );
}
