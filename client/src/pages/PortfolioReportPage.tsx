/**
 * PortfolioReportPage - Charter-Compliant Portfolio View
 *
 * This component follows the Post-Frontend Architecture Charter:
 * - Narrative summary replaces interactive dashboards
 * - Single page shows complete portfolio status
 * - Actions embedded in narrative context
 * - No charts, filters, or complex interactivity
 *
 * Replaces: RiskDashboardPage, FinancialsPage, ReportsPage
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/PageLayout";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  RefreshCw,
  ChevronRight,
  Users,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";

interface PortfolioReport {
  generatedAt: string;
  organizationId: string;
  executiveSummary: string;
  attentionRequired: Array<{
    caseId: string;
    workerName: string;
    company: string;
    issue: string;
    action: string;
  }>;
  riskDistribution: {
    high: number;
    medium: number;
    low: number;
    complianceRisk: number;
  };
  workStatus: {
    atWork: number;
    offWork: number;
  };
  financialSummary: {
    estimatedWeeklyCost: number;
    potentialWeeklySavings: number;
    narrative: string;
  };
  meta: {
    totalCases: number;
    closedCases: number;
  };
}

export default function PortfolioReportPage() {
  const {
    data: report,
    isLoading,
    error,
    refetch,
  } = useQuery<PortfolioReport>({
    queryKey: ["/api/reports/portfolio"],
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <PageLayout title="Portfolio Report">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Generating portfolio report...</span>
        </div>
      </PageLayout>
    );
  }

  if (error || !report) {
    return (
      <PageLayout title="Portfolio Report">
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">Unable to generate portfolio report.</p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(value);

  return (
    <PageLayout
      title="Portfolio Report"
      action={
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      }
    >
      <div className="space-y-6 max-w-4xl">
        {/* Executive Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg leading-relaxed">{report.executiveSummary}</p>
            <p className="text-sm text-muted-foreground mt-4">
              Generated {new Date(report.generatedAt).toLocaleString("en-AU")}
            </p>
          </CardContent>
        </Card>

        {/* Key Metrics - Compact Display */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-6 w-6 mx-auto text-primary" />
              <p className="text-2xl font-bold mt-2">{report.meta.totalCases}</p>
              <p className="text-xs text-muted-foreground">Active Cases</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-6 w-6 mx-auto text-red-600" />
              <p className="text-2xl font-bold mt-2">{report.riskDistribution.high}</p>
              <p className="text-xs text-muted-foreground">High Risk</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 mx-auto text-amber-600" />
              <p className="text-2xl font-bold mt-2">{report.workStatus.offWork}</p>
              <p className="text-xs text-muted-foreground">Off Work</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-6 w-6 mx-auto text-emerald-600" />
              <p className="text-2xl font-bold mt-2">{report.workStatus.atWork}</p>
              <p className="text-xs text-muted-foreground">At Work</p>
            </CardContent>
          </Card>
        </div>

        {/* Cases Requiring Attention */}
        {report.attentionRequired.length > 0 && (
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
                Attention Required ({report.attentionRequired.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {report.attentionRequired.map((item) => (
                <div
                  key={item.caseId}
                  className="p-4 rounded-lg bg-amber-50 border border-amber-100"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium">{item.workerName}</p>
                      <p className="text-sm text-muted-foreground">{item.company}</p>
                      <p className="text-sm text-amber-700 mt-1">{item.issue}</p>
                    </div>
                    <Link to={`/summary/${item.caseId}`}>
                      <Button variant="outline" size="sm">
                        {item.action}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Risk Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="p-3 rounded-lg bg-red-50">
                <p className="text-2xl font-bold text-red-700">{report.riskDistribution.high}</p>
                <p className="text-xs text-red-600">High Risk</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50">
                <p className="text-2xl font-bold text-amber-700">{report.riskDistribution.medium}</p>
                <p className="text-xs text-amber-600">Medium Risk</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50">
                <p className="text-2xl font-bold text-emerald-700">{report.riskDistribution.low}</p>
                <p className="text-xs text-emerald-600">Low Risk</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50">
                <p className="text-2xl font-bold text-slate-700">{report.riskDistribution.complianceRisk}</p>
                <p className="text-xs text-slate-600">Compliance Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{report.financialSummary.narrative}</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground uppercase">Estimated Weekly Cost</p>
                <p className="text-xl font-bold">
                  {formatCurrency(report.financialSummary.estimatedWeeklyCost)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-emerald-50">
                <p className="text-xs text-emerald-600 uppercase">Potential Weekly Savings</p>
                <p className="text-xl font-bold text-emerald-700">
                  {formatCurrency(report.financialSummary.potentialWeeklySavings)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Work Status Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Work Status Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1 p-4 rounded-lg bg-emerald-50 flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
                <div>
                  <p className="text-2xl font-bold text-emerald-700">{report.workStatus.atWork}</p>
                  <p className="text-sm text-emerald-600">Workers at work</p>
                </div>
              </div>
              <div className="flex-1 p-4 rounded-lg bg-amber-50 flex items-center gap-3">
                <Clock className="h-8 w-8 text-amber-600" />
                <div>
                  <p className="text-2xl font-bold text-amber-700">{report.workStatus.offWork}</p>
                  <p className="text-sm text-amber-600">Workers off work</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
