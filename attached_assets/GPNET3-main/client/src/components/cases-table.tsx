import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type CaseStatus = "pending" | "in_progress" | "verification_required" | "completed" | "rejected";

interface Case {
  id: string;
  candidateName: string;
  organization: string;
  status: CaseStatus;
  riskScore: number;
  assignedTo: string;
  dateSubmitted: string;
}

const statusConfig: Record<CaseStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default" },
  verification_required: { label: "Verification Required", variant: "outline" },
  completed: { label: "Completed", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

const getRiskColor = (score: number) => {
  if (score >= 70) return "text-red-600 dark:text-red-500";
  if (score >= 40) return "text-yellow-600 dark:text-yellow-500";
  return "text-green-600 dark:text-green-500";
};

export function CasesTable() {
  // TODO: remove mock functionality
  const [cases] = useState<Case[]>([
    {
      id: "CS-2024-001",
      candidateName: "Sarah Johnson",
      organization: "TechCorp Inc",
      status: "in_progress",
      riskScore: 25,
      assignedTo: "John Doe",
      dateSubmitted: "2024-10-28",
    },
    {
      id: "CS-2024-002",
      candidateName: "Michael Chen",
      organization: "Global Solutions",
      status: "verification_required",
      riskScore: 68,
      assignedTo: "Jane Smith",
      dateSubmitted: "2024-10-27",
    },
    {
      id: "CS-2024-003",
      candidateName: "Emma Williams",
      organization: "StartUp Labs",
      status: "pending",
      riskScore: 15,
      assignedTo: "John Doe",
      dateSubmitted: "2024-10-26",
    },
    {
      id: "CS-2024-004",
      candidateName: "James Brown",
      organization: "Enterprise Co",
      status: "completed",
      riskScore: 10,
      assignedTo: "Mike Wilson",
      dateSubmitted: "2024-10-25",
    },
    {
      id: "CS-2024-005",
      candidateName: "Lisa Anderson",
      organization: "TechCorp Inc",
      status: "in_progress",
      riskScore: 82,
      assignedTo: "Jane Smith",
      dateSubmitted: "2024-10-24",
    },
  ]);

  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
    console.log(`Sorting by ${column} ${sortDirection}`);
  };

  return (
    <div className="border rounded-md">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              <th className="text-left p-4">
                <button 
                  onClick={() => handleSort("id")} 
                  className="flex items-center gap-1 font-medium text-sm hover-elevate rounded px-2 py-1"
                  data-testid="button-sort-case-id"
                >
                  Case ID
                  {sortColumn === "id" && (
                    sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  )}
                </button>
              </th>
              <th className="text-left p-4">
                <button 
                  onClick={() => handleSort("candidate")} 
                  className="flex items-center gap-1 font-medium text-sm hover-elevate rounded px-2 py-1"
                  data-testid="button-sort-candidate"
                >
                  Candidate Name
                  {sortColumn === "candidate" && (
                    sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  )}
                </button>
              </th>
              <th className="text-left p-4 hidden md:table-cell">
                <span className="font-medium text-sm">Organization</span>
              </th>
              <th className="text-left p-4">
                <span className="font-medium text-sm">Status</span>
              </th>
              <th className="text-left p-4 hidden lg:table-cell">
                <button 
                  onClick={() => handleSort("risk")} 
                  className="flex items-center gap-1 font-medium text-sm hover-elevate rounded px-2 py-1"
                  data-testid="button-sort-risk"
                >
                  Risk Score
                  {sortColumn === "risk" && (
                    sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  )}
                </button>
              </th>
              <th className="text-left p-4 hidden xl:table-cell">
                <span className="font-medium text-sm">Assigned To</span>
              </th>
              <th className="text-left p-4 hidden md:table-cell">
                <button 
                  onClick={() => handleSort("date")} 
                  className="flex items-center gap-1 font-medium text-sm hover-elevate rounded px-2 py-1"
                  data-testid="button-sort-date"
                >
                  Date Submitted
                  {sortColumn === "date" && (
                    sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  )}
                </button>
              </th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {cases.map((case_) => (
              <tr key={case_.id} className="border-t hover-elevate" data-testid={`row-case-${case_.id}`}>
                <td className="p-4">
                  <span className="font-mono text-sm font-medium" data-testid={`text-case-id-${case_.id}`}>
                    {case_.id}
                  </span>
                </td>
                <td className="p-4">
                  <span className="font-medium" data-testid={`text-candidate-${case_.id}`}>
                    {case_.candidateName}
                  </span>
                </td>
                <td className="p-4 hidden md:table-cell text-sm text-muted-foreground" data-testid={`text-organization-${case_.id}`}>
                  {case_.organization}
                </td>
                <td className="p-4">
                  <Badge variant={statusConfig[case_.status].variant} data-testid={`badge-status-${case_.id}`}>
                    {statusConfig[case_.status].label}
                  </Badge>
                </td>
                <td className="p-4 hidden lg:table-cell">
                  <span className={`font-semibold ${getRiskColor(case_.riskScore)}`} data-testid={`text-risk-${case_.id}`}>
                    {case_.riskScore}
                  </span>
                </td>
                <td className="p-4 hidden xl:table-cell">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {case_.assignedTo.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm" data-testid={`text-assigned-${case_.id}`}>
                      {case_.assignedTo}
                    </span>
                  </div>
                </td>
                <td className="p-4 hidden md:table-cell text-sm text-muted-foreground" data-testid={`text-date-${case_.id}`}>
                  {new Date(case_.dateSubmitted).toLocaleDateString()}
                </td>
                <td className="p-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid={`button-actions-${case_.id}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => console.log(`View details for ${case_.id}`)}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => console.log(`Edit ${case_.id}`)}>
                        Edit Case
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => console.log(`Assign ${case_.id}`)}>
                        Reassign
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
