import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { WorkerCase, PaginatedCasesResponse } from "@shared/schema";
import { isLegitimateCase } from "@shared/schema";

export default function FinancialsPage() {
  const { data: paginatedData, isLoading } = useQuery<PaginatedCasesResponse>({
    queryKey: ["/api/gpnet2/cases"],
  });
  const cases = paginatedData?.cases ?? [];

  const financialData = useMemo(() => {
    const legitimate = cases.filter(isLegitimateCase);

    // Simulated financial calculations based on case data
    const byCompany = legitimate.reduce((acc, c) => {
      if (!acc[c.company]) {
        acc[c.company] = { cases: 0, atWork: 0, offWork: 0, estimatedCost: 0 };
      }
      acc[c.company].cases += 1;
      if (c.workStatus === "At work") {
        acc[c.company].atWork += 1;
        acc[c.company].estimatedCost += 5000; // Lower cost when at work
      } else {
        acc[c.company].offWork += 1;
        acc[c.company].estimatedCost += 15000; // Higher cost when off work
      }
      return acc;
    }, {} as Record<string, { cases: number; atWork: number; offWork: number; estimatedCost: number }>);

    const totalCases = legitimate.length;
    const totalAtWork = legitimate.filter((c) => c.workStatus === "At work").length;
    const totalOffWork = legitimate.filter((c) => c.workStatus === "Off work").length;
    const totalEstimatedCost = Object.values(byCompany).reduce((sum, c) => sum + c.estimatedCost, 0);

    return { byCompany, totalCases, totalAtWork, totalOffWork, totalEstimatedCost };
  }, [cases]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <PageLayout title="Financials" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">
            progress_activity
          </span>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Financials" subtitle="Cost analysis and financial overview">
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Cases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{financialData.totalCases}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                At Work
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{financialData.totalAtWork}</div>
              <p className="text-xs text-muted-foreground">Lower cost impact</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Off Work
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{financialData.totalOffWork}</div>
              <p className="text-xs text-muted-foreground">Higher cost impact</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Estimated Total Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(financialData.totalEstimatedCost)}</div>
              <p className="text-xs text-muted-foreground">Based on current status</p>
            </CardContent>
          </Card>
        </div>

        {/* Cost by Company */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">domain</span>
              Cost by Company
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-center">Total Cases</TableHead>
                  <TableHead className="text-center">At Work</TableHead>
                  <TableHead className="text-center">Off Work</TableHead>
                  <TableHead className="text-right">Estimated Cost</TableHead>
                  <TableHead className="text-right">Cost per Case</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(financialData.byCompany)
                  .sort((a, b) => b[1].estimatedCost - a[1].estimatedCost)
                  .map(([company, data]) => (
                    <TableRow key={company}>
                      <TableCell className="font-medium">{company}</TableCell>
                      <TableCell className="text-center">{data.cases}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-emerald-50">
                          {data.atWork}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-amber-50">
                          {data.offWork}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(data.estimatedCost)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(data.estimatedCost / data.cases)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Cost Breakdown Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">info</span>
              Cost Calculation Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>At Work cases:</strong> Estimated at $5,000 per case (reduced WorkCover premiums,
              maintained productivity)
            </p>
            <p>
              <strong>Off Work cases:</strong> Estimated at $15,000 per case (income replacement,
              medical costs, administrative overhead)
            </p>
            <p>
              These are simplified estimates for demonstration purposes. Actual costs vary based on
              injury severity, duration, and treatment requirements.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
