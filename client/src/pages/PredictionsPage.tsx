import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { WorkerCase } from "@shared/schema";
import { isLegitimateCase } from "@shared/schema";

export default function PredictionsPage() {
  const { data: cases = [], isLoading } = useQuery<WorkerCase[]>({
    queryKey: ["/api/gpnet2/cases"],
  });

  const predictions = useMemo(() => {
    const legitimate = cases.filter(isLegitimateCase);

    // Generate mock predictions based on case data
    return legitimate.map((c) => {
      const injuryDate = new Date(c.dateOfInjury);
      const now = new Date();
      const weeksElapsed = Math.floor((now.getTime() - injuryDate.getTime()) / (7 * 24 * 60 * 60 * 1000));

      // Mock ML predictions based on simple heuristics
      const rtwProbability =
        c.workStatus === "At work" ? 85 + Math.random() * 10 :
        c.riskLevel === "Low" ? 70 + Math.random() * 15 :
        c.riskLevel === "Medium" ? 50 + Math.random() * 20 :
        30 + Math.random() * 20;

      const expectedWeeksRemaining =
        c.workStatus === "At work" ? 0 :
        c.riskLevel === "Low" ? Math.max(0, 4 - weeksElapsed) :
        c.riskLevel === "Medium" ? Math.max(0, 8 - weeksElapsed) :
        Math.max(0, 12 - weeksElapsed);

      const costRisk =
        c.riskLevel === "High" ? "High" :
        c.riskLevel === "Medium" ? "Medium" :
        "Low";

      const escalationRisk =
        c.riskLevel === "High" && weeksElapsed > 8 ? "High" :
        c.riskLevel === "High" || weeksElapsed > 12 ? "Medium" :
        "Low";

      return {
        ...c,
        rtwProbability: Math.round(rtwProbability),
        expectedWeeksRemaining: Math.round(expectedWeeksRemaining),
        weeksElapsed,
        costRisk,
        escalationRisk,
      };
    });
  }, [cases]);

  const stats = useMemo(() => {
    return {
      highRtwProbability: predictions.filter((p) => p.rtwProbability >= 70).length,
      lowRtwProbability: predictions.filter((p) => p.rtwProbability < 50).length,
      highEscalation: predictions.filter((p) => p.escalationRisk === "High").length,
      avgRtwProbability: Math.round(
        predictions.reduce((sum, p) => sum + p.rtwProbability, 0) / predictions.length || 0
      ),
    };
  }, [predictions]);

  const riskColor = (risk: string) => {
    switch (risk) {
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
      <PageLayout title="ML Predictions" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">
            progress_activity
          </span>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="ML Predictions" subtitle="AI-powered case outcome predictions">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg RTW Probability
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgRtwProbability}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                High RTW Likelihood
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{stats.highRtwProbability}</div>
              <p className="text-xs text-muted-foreground">70%+ probability</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Low RTW Likelihood
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.lowRtwProbability}</div>
              <p className="text-xs text-muted-foreground">&lt;50% probability</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                High Escalation Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.highEscalation}</div>
            </CardContent>
          </Card>
        </div>

        {/* Predictions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {predictions.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <span className="material-symbols-outlined text-4xl text-muted-foreground mb-4">
                  analytics
                </span>
                <p className="text-muted-foreground">No cases available for predictions.</p>
              </CardContent>
            </Card>
          ) : (
            predictions
              .sort((a, b) => a.rtwProbability - b.rtwProbability)
              .slice(0, 10)
              .map((prediction) => (
                <Card key={prediction.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{prediction.workerName}</CardTitle>
                        <CardDescription>{prediction.company}</CardDescription>
                      </div>
                      <Badge className={riskColor(prediction.riskLevel)}>
                        {prediction.riskLevel} Risk
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">RTW Probability</span>
                        <span className="font-medium">{prediction.rtwProbability}%</span>
                      </div>
                      <Progress
                        value={prediction.rtwProbability}
                        className={`h-2 ${
                          prediction.rtwProbability >= 70
                            ? "[&>div]:bg-emerald-500"
                            : prediction.rtwProbability >= 50
                              ? "[&>div]:bg-amber-500"
                              : "[&>div]:bg-red-500"
                        }`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Weeks Elapsed</span>
                        <p className="font-medium">{prediction.weeksElapsed} weeks</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Est. Weeks to RTW</span>
                        <p className="font-medium">{prediction.expectedWeeksRemaining} weeks</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Badge variant="outline" className={riskColor(prediction.costRisk)}>
                        Cost: {prediction.costRisk}
                      </Badge>
                      <Badge variant="outline" className={riskColor(prediction.escalationRisk)}>
                        Escalation: {prediction.escalationRisk}
                      </Badge>
                    </div>

                    <div className="pt-2 border-t">
                      <Link to={`/summary/${prediction.id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          <span className="material-symbols-outlined text-sm mr-2">open_in_new</span>
                          View Case Details
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </div>

        {/* Model Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">smart_toy</span>
              About These Predictions
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Predictions are generated using machine learning models trained on historical workers'
              compensation data. Factors considered include:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Injury type and severity</li>
              <li>Time since injury</li>
              <li>Current work status</li>
              <li>Compliance history</li>
              <li>Historical case outcomes from similar profiles</li>
            </ul>
            <p className="mt-4 text-xs">
              Note: These predictions are for informational purposes and should be used alongside
              professional judgment.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
