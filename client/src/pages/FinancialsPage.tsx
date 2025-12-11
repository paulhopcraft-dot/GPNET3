import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calculator,
  PiggyBank,
  FileText,
  BarChart3,
  Clock,
  User,
  Building2,
  Loader2,
} from "lucide-react";
import type { WorkerCase } from "@shared/schema";

interface RTWScenario {
  name: string;
  totalWeeks: number;
  phases: { name: string; hoursPerDay: number; daysPerWeek: number; durationWeeks: number }[];
}

interface CostProjection {
  id: string;
  scenarioName: string;
  projectedWeeks: number;
  totalWageCost: number;
  totalCompCost: number;
  totalTopUpCost: number;
  totalEmployerCost: number;
  weeklyBreakdown: {
    week: number;
    phase: string;
    wageCost: number;
    compPayment: number;
    employerCost: number;
  }[];
}

interface FinancialSummary {
  caseId: string;
  workerName: string;
  hasFinancialData: boolean;
  baseWageInfo?: {
    hourlyRate: number;
    normalHoursPerWeek: number;
    payPeriod: string;
  };
  totalPaid?: {
    regularWages: number;
    rtwWages: number;
    topUpPayments: number;
    workersCompPayments: number;
    totalPaid: number;
    totalEmployerCost: number;
    periodsCount: number;
  };
  currentStatus?: {
    currentCapacity: number;
    currentHoursPerWeek: number;
    weeklyWage: number;
    weeklyTopUp: number;
    weeklyTotal: number;
  };
}

interface AggregateFinancials {
  totalCases: number;
  totalCostThisPeriod: number;
  averageCostPerCase: number;
  costByCategory: Record<string, number>;
  topCostCases: { caseId: string; workerName: string; totalCost: number; currentCapacity: number }[];
  projectedNextPeriod: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function ScenarioComparisonCard({ scenarios, onSelect }: { scenarios: RTWScenario[]; onSelect: (s: RTWScenario) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {scenarios.map((scenario) => (
        <Card key={scenario.name} className="cursor-pointer hover:ring-2 hover:ring-primary transition-all" onClick={() => onSelect(scenario)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{scenario.name}</CardTitle>
            <CardDescription>{scenario.totalWeeks} weeks total</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {scenario.phases.slice(0, 3).map((phase, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate">{phase.name}</span>
                  <span>{phase.hoursPerDay}h x {phase.daysPerWeek}d</span>
                </div>
              ))}
              {scenario.phases.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{scenario.phases.length - 3} more phases
                </div>
              )}
            </div>
            <Button className="w-full mt-4" size="sm" variant="outline">
              Calculate Costs
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function FinancialsPage() {
  const { toast } = useToast();
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [wageForm, setWageForm] = useState({
    hourlyRate: "",
    normalHoursPerWeek: "38",
    normalDaysPerWeek: "5",
  });

  // Fetch all cases
  const { data: cases = [] } = useQuery<WorkerCase[]>({
    queryKey: ["/api/gpnet2/cases"],
  });

  // Fetch RTW scenarios
  const { data: scenarios = [] } = useQuery<RTWScenario[]>({
    queryKey: ["/api/financial/rtw-scenarios"],
  });

  // Fetch aggregate financials
  const { data: aggregate } = useQuery<AggregateFinancials>({
    queryKey: ["/api/financial/aggregate"],
  });

  // Fetch financial summary for selected case
  const { data: financialSummary, refetch: refetchSummary } = useQuery<FinancialSummary>({
    queryKey: [`/api/cases/${selectedCaseId}/financials`],
    enabled: !!selectedCaseId,
  });

  // Set wage info mutation
  const setWageMutation = useMutation({
    mutationFn: async (data: { caseId: string; wageInfo: typeof wageForm }) => {
      const response = await fetch(`/api/cases/${data.caseId}/wage-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hourlyRate: parseFloat(data.wageInfo.hourlyRate),
          normalHoursPerWeek: parseInt(data.wageInfo.normalHoursPerWeek),
          normalDaysPerWeek: parseInt(data.wageInfo.normalDaysPerWeek),
        }),
      });
      if (!response.ok) throw new Error("Failed to set wage info");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Wage Info Saved", description: "Base wage information has been configured." });
      refetchSummary();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save wage info", variant: "destructive" });
    },
  });

  // Project costs mutation
  const projectCostsMutation = useMutation({
    mutationFn: async (data: { caseId: string; scenario: RTWScenario }) => {
      const response = await fetch(`/api/cases/${data.caseId}/cost-projection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: data.scenario }),
      });
      if (!response.ok) throw new Error("Failed to project costs");
      return response.json() as Promise<CostProjection>;
    },
  });

  const handleSetWageInfo = () => {
    if (!selectedCaseId || !wageForm.hourlyRate) return;
    setWageMutation.mutate({ caseId: selectedCaseId, wageInfo: wageForm });
  };

  const handleProjectCosts = (scenario: RTWScenario) => {
    if (!selectedCaseId) return;
    projectCostsMutation.mutate({ caseId: selectedCaseId, scenario });
  };

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Financial Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Track wages, project costs, and analyze financial impact of RTW scenarios
          </p>
        </div>

        {/* Aggregate Overview */}
        {aggregate && (
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aggregate.totalCases}</div>
                <p className="text-xs text-muted-foreground">Active claims</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Period Costs</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(aggregate.totalCostThisPeriod)}</div>
                <p className="text-xs text-muted-foreground">This period</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg Cost/Case</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(aggregate.averageCostPerCase)}</div>
                <p className="text-xs text-muted-foreground">Per case average</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Next Period</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(aggregate.projectedNextPeriod)}</div>
                <p className="text-xs text-muted-foreground">Projected</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="case-financials">
          <TabsList>
            <TabsTrigger value="case-financials">Case Financials</TabsTrigger>
            <TabsTrigger value="cost-projections">Cost Projections</TabsTrigger>
            <TabsTrigger value="top-costs">Top Cost Cases</TabsTrigger>
          </TabsList>

          <TabsContent value="case-financials" className="mt-6 space-y-6">
            {/* Case Selector */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Select Case
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
                  <SelectTrigger className="w-full md:w-96">
                    <SelectValue placeholder="Select a case to view financials" />
                  </SelectTrigger>
                  <SelectContent>
                    {cases.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.workerName} - {c.company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {selectedCaseId && financialSummary && (
              <>
                {!financialSummary.hasFinancialData ? (
                  /* Wage Setup Form */
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Configure Base Wage
                      </CardTitle>
                      <CardDescription>
                        Set up the worker's pre-injury wage information to enable financial tracking
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                          <Input
                            id="hourlyRate"
                            type="number"
                            step="0.01"
                            value={wageForm.hourlyRate}
                            onChange={(e) => setWageForm({ ...wageForm, hourlyRate: e.target.value })}
                            placeholder="35.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="hoursPerWeek">Hours per Week</Label>
                          <Input
                            id="hoursPerWeek"
                            type="number"
                            value={wageForm.normalHoursPerWeek}
                            onChange={(e) => setWageForm({ ...wageForm, normalHoursPerWeek: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="daysPerWeek">Days per Week</Label>
                          <Input
                            id="daysPerWeek"
                            type="number"
                            value={wageForm.normalDaysPerWeek}
                            onChange={(e) => setWageForm({ ...wageForm, normalDaysPerWeek: e.target.value })}
                          />
                        </div>
                      </div>
                      <Button
                        className="mt-4"
                        onClick={handleSetWageInfo}
                        disabled={setWageMutation.isPending || !wageForm.hourlyRate}
                      >
                        {setWageMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Wage Information
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  /* Financial Summary */
                  <>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Base Weekly Wage</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {formatCurrency((financialSummary.baseWageInfo?.hourlyRate || 0) * (financialSummary.baseWageInfo?.normalHoursPerWeek || 0))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            ${financialSummary.baseWageInfo?.hourlyRate}/hr x {financialSummary.baseWageInfo?.normalHoursPerWeek}hrs
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Current Capacity</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{financialSummary.currentStatus?.currentCapacity || 100}%</div>
                          <Progress value={financialSummary.currentStatus?.currentCapacity || 100} className="mt-2" />
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Total Employer Cost</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {formatCurrency(financialSummary.totalPaid?.totalEmployerCost || 0)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {financialSummary.totalPaid?.periodsCount || 0} pay periods
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {financialSummary.totalPaid && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Payment Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span>Regular Wages</span>
                              <span className="font-medium">{formatCurrency(financialSummary.totalPaid.regularWages)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>RTW Wages (Reduced Hours)</span>
                              <span className="font-medium">{formatCurrency(financialSummary.totalPaid.rtwWages)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Workers' Comp Payments</span>
                              <span className="font-medium">{formatCurrency(financialSummary.totalPaid.workersCompPayments)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Top-up Payments</span>
                              <span className="font-medium">{formatCurrency(financialSummary.totalPaid.topUpPayments)}</span>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between text-lg font-bold">
                              <span>Total Paid</span>
                              <span>{formatCurrency(financialSummary.totalPaid.totalPaid)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="cost-projections" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>RTW Scenario Comparison</CardTitle>
                <CardDescription>
                  Compare projected costs across different return-to-work scenarios
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedCaseId ? (
                  <p className="text-muted-foreground">Select a case in "Case Financials" tab first</p>
                ) : !financialSummary?.hasFinancialData ? (
                  <p className="text-muted-foreground">Configure base wage information first</p>
                ) : (
                  <ScenarioComparisonCard scenarios={scenarios} onSelect={handleProjectCosts} />
                )}
              </CardContent>
            </Card>

            {projectCostsMutation.data && (
              <Card>
                <CardHeader>
                  <CardTitle>Cost Projection: {projectCostsMutation.data.scenarioName}</CardTitle>
                  <CardDescription>
                    {projectCostsMutation.data.projectedWeeks} weeks duration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4 mb-6">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(projectCostsMutation.data.totalWageCost)}
                      </div>
                      <div className="text-sm text-muted-foreground">Wage Cost</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(projectCostsMutation.data.totalCompCost)}
                      </div>
                      <div className="text-sm text-muted-foreground">Workers' Comp</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {formatCurrency(projectCostsMutation.data.totalTopUpCost)}
                      </div>
                      <div className="text-sm text-muted-foreground">Top-up Cost</div>
                    </div>
                    <div className="text-center p-4 bg-primary/10 rounded-lg">
                      <div className="text-2xl font-bold">
                        {formatCurrency(projectCostsMutation.data.totalEmployerCost)}
                      </div>
                      <div className="text-sm text-muted-foreground">Employer Total</div>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Week</TableHead>
                        <TableHead>Phase</TableHead>
                        <TableHead className="text-right">Wage Cost</TableHead>
                        <TableHead className="text-right">Comp Payment</TableHead>
                        <TableHead className="text-right">Employer Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectCostsMutation.data.weeklyBreakdown.slice(0, 12).map((week) => (
                        <TableRow key={week.week}>
                          <TableCell>Week {week.week}</TableCell>
                          <TableCell>{week.phase}</TableCell>
                          <TableCell className="text-right">{formatCurrency(week.wageCost)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(week.compPayment)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(week.employerCost)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="top-costs" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Cost Cases</CardTitle>
                <CardDescription>Cases with highest financial impact</CardDescription>
              </CardHeader>
              <CardContent>
                {aggregate?.topCostCases && aggregate.topCostCases.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Worker</TableHead>
                        <TableHead>Capacity</TableHead>
                        <TableHead className="text-right">Total Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aggregate.topCostCases.map((c, i) => (
                        <TableRow key={c.caseId}>
                          <TableCell className="font-medium">{c.workerName}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={c.currentCapacity} className="w-20" />
                              <span className="text-sm">{c.currentCapacity}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(c.totalCost)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No cost data available yet. Configure wage information for cases to see costs.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
