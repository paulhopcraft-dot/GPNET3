import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CompanyNav } from "@/components/CompanyNav";
import { SearchBar } from "@/components/SearchBar";
import { CasesTable } from "@/components/CasesTable";
import { CaseDetailPanel } from "@/components/CaseDetailPanel";
import { AIAssistant } from "@/components/ai-assistant";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { DashboardStats, type StatFilter } from "@/components/dashboard-stats";
import { ActionQueueCard } from "@/components/ActionQueueCard";
import { useToast } from "@/hooks/use-toast";
import { queryClient, fetchWithCsrf } from "@/lib/queryClient";
import type { WorkerCase, PaginatedCasesResponse } from "@shared/schema";
import { isLegitimateCase, getSurname } from "@shared/schema";
import { Link } from "react-router-dom";

export default function GPNet2Dashboard() {
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [statFilter, setStatFilter] = useState<StatFilter>('all');
  const [directFetchCase, setDirectFetchCase] = useState<WorkerCase | null>(null);
  const { toast } = useToast();

  const { data: paginatedData, isLoading } = useQuery<PaginatedCasesResponse>({
    queryKey: ["/api/gpnet2/cases?limit=200"],
    refetchInterval: 30000,
    staleTime: 0, // Always fetch fresh data
  });
  const cases = paginatedData?.cases ?? [];

  // Debug log to verify we're getting all cases
  console.log(`Dashboard loaded ${cases.length} cases, total: ${paginatedData?.total}`);

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetchWithCsrf("/api/freshdesk/sync", {
        method: "POST",
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

  const sendCertificateAlertsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetchWithCsrf("/api/notifications/send-certificate-alerts", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to send certificate alerts");
      }
      return await response.json();
    },
    onSuccess: (data: { sent: number; failed: number }) => {
      toast({
        title: "Certificate Alerts Sent",
        description: `Sent ${data.sent} worker email alerts${data.failed > 0 ? `, ${data.failed} failed` : ''}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Alert Failed",
        description: error.message || "Failed to send certificate alerts",
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

      // Apply stat filter
      let matchesStatFilter = true;
      if (statFilter === 'off-work') {
        matchesStatFilter = c.workStatus === 'Off work';
      } else if (statFilter === 'at-work') {
        matchesStatFilter = c.workStatus === 'At work';
      } else if (statFilter === 'high-risk') {
        matchesStatFilter = c.complianceIndicator === 'High';
      }

      return matchesCompany && matchesSearch && matchesStatFilter;
    });

    // Sort by surname (last name) within each company
    return filtered.sort((a, b) => {
      const surnameA = getSurname(a.workerName);
      const surnameB = getSurname(b.workerName);
      return surnameA.localeCompare(surnameB);
    });
  }, [cases, selectedCompany, searchQuery, statFilter]);

  const availableCompanies = useMemo(() => {
    const companySet = new Set(
      cases
        .filter((c) => isLegitimateCase(c))
        .map((c) => c.company)
    );
    return Array.from(companySet).sort();
  }, [cases]);

  // Use loaded case if available, otherwise use directly fetched case
  const selectedCase = useMemo(() => {
    const loadedCase = cases.find((c) => c.id === selectedCaseId);
    return loadedCase || directFetchCase;
  }, [cases, selectedCaseId, directFetchCase]);

  const handleCaseClick = async (caseId: string) => {
    setSelectedCaseId(caseId);
    setDirectFetchCase(null); // Reset any previously fetched case

    // Check if case exists in loaded cases
    const existsInLoaded = cases.some((c) => c.id === caseId);
    if (!existsInLoaded) {
      // Fetch the case directly from API
      try {
        const response = await fetchWithCsrf(`/api/cases/${caseId}`);
        if (response.ok) {
          const fetchedCase = await response.json();
          setDirectFetchCase(fetchedCase);
        } else {
          toast({
            title: "Case Not Found",
            description: `Could not load case ${caseId}`,
            variant: "destructive",
          });
        }
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to fetch case details",
          variant: "destructive",
        });
      }
    }
  };

  const handleClosePanel = () => {
    setSelectedCaseId(null);
    setDirectFetchCase(null);
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
            <h1 className="text-sidebar-foreground text-xl font-bold">Preventli</h1>
          </div>
          <div className="mt-1 ml-13 text-xs text-sidebar-foreground/60">
            v2024.11.05 • {cases.length} cases loaded
          </div>
        </div>

        {/* Quick Links */}
        <div className="mb-4 pb-4 border-b border-sidebar-border">
          <Link
            to="/reports"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <span className="material-symbols-outlined text-lg">analytics</span>
            Reports & Analytics
          </Link>
          <Link
            to="/audit"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <span className="material-symbols-outlined text-lg">history</span>
            Audit Log
          </Link>
        </div>

        <CompanyNav companies={availableCompanies} selectedCompany={selectedCompany} onSelectCompany={setSelectedCompany} />
      </aside>

      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col p-3 sm:p-4 overflow-y-auto">
          {/* Mobile Header */}
          <div className="lg:hidden mb-3 pb-2 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-primary/20 rounded-full size-8 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-lg">corporate_fare</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold">Preventli</h1>
                  <div className="text-xs text-muted-foreground">
                    {cases.length} cases loaded
                  </div>
                </div>
              </div>
              <ThemeToggle />
            </div>
          </div>

          {/* Dashboard Stats - Full width overview */}
          <div className="mb-4">
            <DashboardStats
              cases={cases.filter(c => isLegitimateCase(c))}
              activeFilter={statFilter}
              onFilterChange={setStatFilter}
            />
          </div>

          {/* Search and Sync Row - Full width */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
            <div className="flex items-center gap-2">
              <Button
                onClick={() => sendCertificateAlertsMutation.mutate()}
                disabled={sendCertificateAlertsMutation.isPending}
                data-testid="button-send-certificate-alerts"
                size="sm"
                variant="outline"
              >
                <span className="material-symbols-outlined text-base">
                  {sendCertificateAlertsMutation.isPending ? "sync" : "notification_important"}
                </span>
                <span className="font-bold hidden sm:inline">
                  {sendCertificateAlertsMutation.isPending ? "Sending..." : "Send Cert Alerts"}
                </span>
              </Button>
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

          {/* Main Content: Cases Table + Action Queue Sidebar */}
          <div className="flex-1 flex gap-4 min-h-0">
            {/* Cases Table - Takes most of the space */}
            <div className="flex-1 min-w-0">
              <CasesTable
                cases={filteredCases}
                selectedCaseId={selectedCaseId}
                onCaseClick={handleCaseClick}
              />
            </div>

            {/* Action Queue Sidebar - Fixed width on larger screens */}
            <div className="hidden xl:block w-80 flex-shrink-0">
              <ActionQueueCard onCaseClick={handleCaseClick} limit={8} />
            </div>
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
