import type { WorkerCase, WorkStatus } from "@shared/schema";
import { RiskBadge } from "./RiskBadge";
import { WorkStatusFilter } from "./WorkStatusFilter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CasesTableProps {
  cases: WorkerCase[];
  selectedCaseId?: string | null;
  onCaseClick?: (caseId: string) => void;
}

const CASES_PER_PAGE = 20;

export function CasesTable({ cases, selectedCaseId, onCaseClick }: CasesTableProps) {
  const [workStatusFilter, setWorkStatusFilter] = useState<WorkStatus | "All">("All");
  const [currentPage, setCurrentPage] = useState(1);

  const riskOrder = { "High": 0, "Medium": 1, "Low": 2 };

  const filteredCases = cases
    .filter((c) => workStatusFilter === "All" || c.workStatus === workStatusFilter)
    .sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredCases.length / CASES_PER_PAGE);
  const startIndex = (currentPage - 1) * CASES_PER_PAGE;
  const endIndex = startIndex + CASES_PER_PAGE;
  const paginatedCases = filteredCases.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [workStatusFilter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex-1 overflow-x-auto bg-card rounded-xl border border-border">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-4 py-3 font-medium text-muted-foreground">Worker Name</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Company</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Date of Injury</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Risk Level</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>Work Status</span>
                  <WorkStatusFilter
                    selectedStatus={workStatusFilter}
                    onSelectStatus={setWorkStatusFilter}
                  />
                </div>
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Latest Certificate</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Compliance Indicator</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Next Step + Owner + Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedCases.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  No cases found
                </td>
              </tr>
            ) : (
              paginatedCases.map((workerCase) => {
              const isSelected = selectedCaseId === workerCase.id;
              return (
                <tr
                  key={workerCase.id}
                  onClick={() => onCaseClick?.(workerCase.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-primary/10 dark:bg-primary/20"
                      : "hover-elevate"
                  }`}
                  data-testid={`row-case-${workerCase.id}`}
                >
                  <td className="px-4 py-3 font-medium text-card-foreground">
                    {workerCase.workerName}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{workerCase.company}</td>
                  <td className="px-4 py-3 text-muted-foreground">{workerCase.dateOfInjury}</td>
                  <td className="px-4 py-3">
                    <RiskBadge level={workerCase.riskLevel} type="risk" />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{workerCase.workStatus}</td>
                  <td className="px-4 py-3">
                    {workerCase.hasCertificate ? (
                      <a
                        href={workerCase.certificateUrl || "#"}
                        className="text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`link-certificate-${workerCase.id}`}
                      >
                        <span className="material-symbols-outlined text-xl align-middle">link</span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge level={workerCase.complianceIndicator} type="compliance" />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {workerCase.nextStep} - {workerCase.owner} - {workerCase.dueDate}
                  </td>
                </tr>
              );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredCases.length)} of {filteredCases.length} cases
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              data-testid="button-previous-page"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="min-w-9"
                  data-testid={`button-page-${page}`}
                >
                  {page}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              data-testid="button-next-page"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
