import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export default function RiskDashboardPage() {
  const { data: paginatedData, isLoading } = useQuery<PaginatedCasesResponse>({
    queryKey: ["/api/gpnet2/cases"],
  });
  const cases = paginatedData?.cases ?? [];

  const riskData = useMemo(() => {
    const legitimate = cases.filter(isLegitimateCase);

    const highRisk = legitimate.filter((c) => c.riskLevel === "High");
    const mediumRisk = legitimate.filter((c) => c.riskLevel === "Medium");
    const lowRisk = legitimate.filter((c) => c.riskLevel === "Low");

    // Compliance risk (Very Low and Low indicators)
    const complianceRisk = legitimate.filter((c) =>
      c.compliance?.indicator === "Low" || c.compliance?.indicator === "Very Low"
    );

    // Stale cases (no updates in 30+ days)
    const now = new Date();
    const staleCases = legitimate.filter((c) => {
      if (!c.ticketLastUpdatedAt) return false;
      const lastUpdate = new Date(c.ticketLastUpdatedAt);
      const daysSince = Math.floor((now.getTime() - lastUpdate.getTime()) / (24 * 60 * 60 * 1000));
      return daysSince > 30;
    });

    // Long duration cases (12+ weeks)
    const longDuration = legitimate.filter((c) => {
      const injury = new Date(c.dateOfInjury);
      const weeksElapsed = Math.floor((now.getTime() - injury.getTime()) / (7 * 24 * 60 * 60 * 1000));
      return weeksElapsed >= 12 && c.workStatus === "Off work";
    });

    return {
      highRisk,
      mediumRisk,
      lowRisk,
      complianceRisk,
      staleCases,
      longDuration,
      total: legitimate.length,
    };
  }, [cases]);

  const riskBadgeColor = (level: string) => {
    switch (level) {
      case "High":
        return "bg-red-100 text-red-800";
      case "Medium":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-emerald-100 text-emerald-800";
    }
  };

  if (isLoading) {
    return (
      <PageLayout title="Risk Dashboard" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">
            progress_activity
          </span>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Risk Dashboard" subtitle="Case risk analysis and monitoring">
      <div className="space-y-6">
        {/* Risk Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Cases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{riskData.total}</div>
            </CardContent>
          </Card>
          <Card className="border-red-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">
                High Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{riskData.highRisk.length}</div>
            </CardContent>
          </Card>
          <Card className="border-amber-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-600">
                Medium Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{riskData.mediumRisk.length}</div>
            </CardContent>
          </Card>
          <Card className="border-emerald-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-600">
                Low Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{riskData.lowRisk.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Compliance Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{riskData.complianceRisk.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Long Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{riskData.longDuration.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* High Risk Cases Table */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <span className="material-symbols-outlined">warning</span>
              High Risk Cases
            </CardTitle>
          </CardHeader>
          <CardContent>
            {riskData.highRisk.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No high risk cases at this time.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Work Status</TableHead>
                    <TableHead>Compliance</TableHead>
                    <TableHead>Next Step</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {riskData.highRisk.map((workerCase) => (
                    <TableRow key={workerCase.id}>
                      <TableCell className="font-medium">{workerCase.workerName}</TableCell>
                      <TableCell>{workerCase.company}</TableCell>
                      <TableCell>
                        <Badge variant={workerCase.workStatus === "At work" ? "default" : "secondary"}>
                          {workerCase.workStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {workerCase.compliance && (
                          <Badge className={riskBadgeColor(
                            workerCase.compliance.indicator === "Very High" || workerCase.compliance.indicator === "High"
                              ? "Low"
                              : workerCase.compliance.indicator === "Low" || workerCase.compliance.indicator === "Very Low"
                                ? "High"
                                : "Medium"
                          )}>
                            {workerCase.compliance.indicator}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {workerCase.nextStep}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link to={`/summary/${workerCase.id}`}>
                          <Button variant="ghost" size="sm">
                            <span className="material-symbols-outlined text-sm">visibility</span>
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Compliance Issues */}
        {riskData.complianceRisk.length > 0 && (
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <span className="material-symbols-outlined">gpp_maybe</span>
                Compliance Concerns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {riskData.complianceRisk.slice(0, 6).map((workerCase) => (
                  <div key={workerCase.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{workerCase.workerName}</h4>
                        <p className="text-sm text-muted-foreground">{workerCase.company}</p>
                      </div>
                      <Badge className={riskBadgeColor(workerCase.riskLevel)}>
                        {workerCase.riskLevel}
                      </Badge>
                    </div>
                    {workerCase.compliance && (
                      <p className="text-sm text-muted-foreground">
                        {workerCase.compliance.reason}
                      </p>
                    )}
                    <Link to={`/summary/${workerCase.id}`}>
                      <Button variant="link" size="sm" className="p-0 h-auto">
                        View Details
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Long Duration Cases */}
        {riskData.longDuration.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">schedule</span>
                Long Duration Cases (12+ weeks)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {riskData.longDuration.slice(0, 6).map((workerCase) => {
                  const injury = new Date(workerCase.dateOfInjury);
                  const now = new Date();
                  const weeksElapsed = Math.floor((now.getTime() - injury.getTime()) / (7 * 24 * 60 * 60 * 1000));

                  return (
                    <div key={workerCase.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{workerCase.workerName}</h4>
                          <p className="text-sm text-muted-foreground">{workerCase.company}</p>
                        </div>
                        <Badge className={riskBadgeColor(workerCase.riskLevel)}>
                          {workerCase.riskLevel}
                        </Badge>
                      </div>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Duration:</span>{" "}
                        <span className="font-medium">{weeksElapsed} weeks</span>
                      </p>
                      <Link to={`/summary/${workerCase.id}`}>
                        <Button variant="link" size="sm" className="p-0 h-auto">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
