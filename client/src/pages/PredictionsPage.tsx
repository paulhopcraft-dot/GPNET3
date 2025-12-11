import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Target,
  BarChart3,
  Info,
  User,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import type { WorkerCase } from "@shared/schema";

interface CasePredictions {
  caseId: string;
  generatedAt: string;
  duration: DurationPrediction;
  rtw: RTWPrediction;
  deterioration: DeteriorationPrediction;
}

interface DurationPrediction {
  predictedDays: number;
  confidence: number;
  range: { min: number; max: number };
  factors: PredictionFactor[];
}

interface RTWPrediction {
  probability: number;
  confidence: number;
  timeframe: string;
  factors: PredictionFactor[];
}

interface DeteriorationPrediction {
  risk: "low" | "medium" | "high";
  probability: number;
  confidence: number;
  factors: PredictionFactor[];
  warnings: string[];
}

interface PredictionFactor {
  name: string;
  impact: "positive" | "negative" | "neutral";
  weight: number;
  description: string;
}

interface CaseRanking {
  caseId: string;
  workerName: string;
  company: string;
  priorityScore: number;
  riskLevel: string;
  daysOpen: number;
  rtwProbability: number;
  deteriorationRisk: string;
}

export default function PredictionsPage() {
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");

  // Fetch all cases
  const { data: cases = [] } = useQuery<WorkerCase[]>({
    queryKey: ["/api/gpnet2/cases"],
  });

  // Fetch predictions for selected case
  const { data: predictions } = useQuery<CasePredictions>({
    queryKey: [`/api/cases/${selectedCaseId}/predictions`],
    enabled: !!selectedCaseId,
  });

  // Fetch priority rankings
  const { data: rankings = [] } = useQuery<CaseRanking[]>({
    queryKey: ["/api/predictions/rankings"],
  });

  const selectedCase = cases.find((c) => c.id === selectedCaseId);

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "high":
        return "text-red-600 bg-red-100";
      case "medium":
        return "text-yellow-600 bg-yellow-100";
      case "low":
        return "text-green-600 bg-green-100";
      default:
        return "text-slate-600 bg-slate-100";
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case "positive":
        return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      case "negative":
        return <ArrowDownRight className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">ML Predictions</h1>
          <p className="text-muted-foreground mt-2">
            AI-powered predictions for case outcomes, RTW probability, and risk assessment
          </p>
        </div>

        <Tabs defaultValue="case-predictions">
          <TabsList>
            <TabsTrigger value="case-predictions">Case Predictions</TabsTrigger>
            <TabsTrigger value="priority-rankings">Priority Rankings</TabsTrigger>
          </TabsList>

          {/* Case Predictions Tab */}
          <TabsContent value="case-predictions" className="mt-6 space-y-6">
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
                    <SelectValue placeholder="Select a case to view predictions" />
                  </SelectTrigger>
                  <SelectContent>
                    {cases.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{c.workerName}</span>
                          <span className="text-muted-foreground">- {c.company}</span>
                          <Badge variant="outline" className="ml-2">
                            {c.riskLevel}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {predictions && (
              <>
                {/* Prediction Summary Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                  {/* Duration Prediction */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Expected Duration
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {predictions.duration.predictedDays} days
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Range: {predictions.duration.range.min} - {predictions.duration.range.max} days
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>Confidence</span>
                          <span>{predictions.duration.confidence}%</span>
                        </div>
                        <Progress value={predictions.duration.confidence} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* RTW Probability */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        RTW Probability
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-3xl font-bold ${
                        predictions.rtw.probability >= 70 ? "text-green-600" :
                        predictions.rtw.probability >= 40 ? "text-yellow-600" : "text-red-600"
                      }`}>
                        {predictions.rtw.probability}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Within {predictions.rtw.timeframe}
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>Confidence</span>
                          <span>{predictions.rtw.confidence}%</span>
                        </div>
                        <Progress value={predictions.rtw.confidence} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Deterioration Risk */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Deterioration Risk
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Badge className={getRiskColor(predictions.deterioration.risk)}>
                          {predictions.deterioration.risk.toUpperCase()}
                        </Badge>
                        <span className="text-2xl font-bold">
                          {predictions.deterioration.probability}%
                        </span>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>Confidence</span>
                          <span>{predictions.deterioration.confidence}%</span>
                        </div>
                        <Progress value={predictions.deterioration.confidence} className="h-2" />
                      </div>
                      {predictions.deterioration.warnings.length > 0 && (
                        <div className="mt-3 p-2 bg-red-50 rounded text-xs text-red-700">
                          {predictions.deterioration.warnings[0]}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Factor Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      Prediction Factors
                    </CardTitle>
                    <CardDescription>
                      Key factors influencing the ML predictions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="duration-factors">
                      <TabsList>
                        <TabsTrigger value="duration-factors">Duration</TabsTrigger>
                        <TabsTrigger value="rtw-factors">RTW</TabsTrigger>
                        <TabsTrigger value="risk-factors">Risk</TabsTrigger>
                      </TabsList>

                      {["duration", "rtw", "deterioration"].map((type) => (
                        <TabsContent key={type} value={`${type === "deterioration" ? "risk" : type}-factors`} className="mt-4">
                          <div className="space-y-3">
                            {(predictions[type as keyof typeof predictions] as any).factors?.map((factor: PredictionFactor, i: number) => (
                              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                                <div className="mt-0.5">{getImpactIcon(factor.impact)}</div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">{factor.name}</span>
                                    <Badge variant="outline">
                                      Weight: {Math.round(factor.weight * 100)}%
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {factor.description}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </CardContent>
                </Card>

                {/* Model Info */}
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Info className="h-4 w-4" />
                      <span>
                        Predictions generated at {new Date(predictions.generatedAt).toLocaleString()} using XGBoost ensemble model
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {!selectedCaseId && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">Select a Case</p>
                  <p className="text-muted-foreground">
                    Choose a case from the dropdown to view ML predictions
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Priority Rankings Tab */}
          <TabsContent value="priority-rankings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Case Priority Rankings
                </CardTitle>
                <CardDescription>
                  Cases ranked by ML-computed priority score based on risk and urgency
                </CardDescription>
              </CardHeader>
              <CardContent>
                {rankings.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Worker</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead className="text-center">Priority</TableHead>
                        <TableHead className="text-center">Risk</TableHead>
                        <TableHead className="text-center">Days Open</TableHead>
                        <TableHead className="text-center">RTW %</TableHead>
                        <TableHead className="text-center">Deterioration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rankings.map((ranking, index) => (
                        <TableRow key={ranking.caseId} className={index < 3 ? "bg-red-50/50" : ""}>
                          <TableCell className="font-medium">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-medium">{ranking.workerName}</TableCell>
                          <TableCell className="text-muted-foreground">{ranking.company}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center">
                              <div className={`w-16 h-2 rounded-full ${
                                ranking.priorityScore >= 80 ? "bg-red-500" :
                                ranking.priorityScore >= 60 ? "bg-orange-500" :
                                ranking.priorityScore >= 40 ? "bg-yellow-500" : "bg-green-500"
                              }`} style={{ width: `${ranking.priorityScore}%` }} />
                              <span className="ml-2 text-sm font-medium">{ranking.priorityScore}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={getRiskColor(ranking.riskLevel)}>
                              {ranking.riskLevel}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{ranking.daysOpen}</TableCell>
                          <TableCell className="text-center">
                            <span className={
                              ranking.rtwProbability >= 70 ? "text-green-600" :
                              ranking.rtwProbability >= 40 ? "text-yellow-600" : "text-red-600"
                            }>
                              {ranking.rtwProbability}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={getRiskColor(ranking.deteriorationRisk)}>
                              {ranking.deteriorationRisk}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No Rankings Available</p>
                    <p className="text-muted-foreground">
                      Rankings will appear once cases have been analyzed
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
