import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  MessageSquare,
  User,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  Loader2,
  ChevronRight,
} from "lucide-react";
import type { WorkerCase } from "@shared/schema";

interface CheckInQuestion {
  id: string;
  category: string;
  question: string;
  type: "scale" | "yes_no" | "text";
  scaleMin?: number;
  scaleMax?: number;
  scaleLabels?: { min: string; max: string };
}

interface CheckIn {
  id: string;
  caseId: string;
  createdAt: string;
  completedAt?: string;
  status: "pending" | "in_progress" | "completed";
  responses: CheckInResponse[];
  scores?: {
    pain: number;
    mood: number;
    adl: number;
    work: number;
    overall: number;
  };
  riskSignals?: string[];
  trendSummary?: string;
}

interface CheckInResponse {
  questionId: string;
  value: number | string | boolean;
}

interface TrendData {
  date: string;
  pain: number;
  mood: number;
  adl: number;
  work: number;
  overall: number;
}

export default function CheckinsPage() {
  const { toast } = useToast();
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [currentCheckinId, setCurrentCheckinId] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, number | string | boolean>>({});

  // Fetch all cases
  const { data: cases = [] } = useQuery<WorkerCase[]>({
    queryKey: ["/api/gpnet2/cases"],
  });

  // Fetch check-in questions
  const { data: questions = [] } = useQuery<CheckInQuestion[]>({
    queryKey: ["/api/checkin/questions"],
  });

  // Fetch check-ins for selected case
  const { data: checkins = [], refetch: refetchCheckins } = useQuery<CheckIn[]>({
    queryKey: [`/api/cases/${selectedCaseId}/checkins`],
    enabled: !!selectedCaseId,
  });

  // Create new check-in
  const createCheckinMutation = useMutation({
    mutationFn: async (caseId: string) => {
      const response = await fetch(`/api/cases/${caseId}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to create check-in");
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentCheckinId(data.id);
      setResponses({});
      toast({ title: "Check-in Started", description: "Complete the questionnaire below." });
    },
  });

  // Submit check-in
  const submitCheckinMutation = useMutation({
    mutationFn: async ({ checkinId, responses }: { checkinId: string; responses: CheckInResponse[] }) => {
      const response = await fetch(`/api/checkin/${checkinId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses }),
      });
      if (!response.ok) throw new Error("Failed to submit check-in");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Check-in Submitted", description: "Responses have been recorded." });
      setCurrentCheckinId(null);
      setResponses({});
      refetchCheckins();
    },
  });

  const handleStartCheckin = () => {
    if (selectedCaseId) {
      createCheckinMutation.mutate(selectedCaseId);
    }
  };

  const handleResponseChange = (questionId: string, value: number | string | boolean) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmitCheckin = () => {
    if (!currentCheckinId) return;

    const responseArray: CheckInResponse[] = Object.entries(responses).map(([questionId, value]) => ({
      questionId,
      value,
    }));

    submitCheckinMutation.mutate({ checkinId: currentCheckinId, responses: responseArray });
  };

  const groupedQuestions = questions.reduce((acc, q) => {
    if (!acc[q.category]) acc[q.category] = [];
    acc[q.category].push(q);
    return acc;
  }, {} as Record<string, CheckInQuestion[]>);

  const latestCheckin = checkins.length > 0 ? checkins[0] : null;
  const selectedCase = cases.find((c) => c.id === selectedCaseId);

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return "bg-green-100";
    if (score >= 40) return "bg-yellow-100";
    return "bg-red-100";
  };

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Weekly Check-ins</h1>
          <p className="text-muted-foreground mt-2">
            Monitor worker progress with regular wellness questionnaires
          </p>
        </div>

        {/* Case Selector */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Select Worker
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
              <SelectTrigger className="w-full md:w-96">
                <SelectValue placeholder="Select a worker to manage check-ins" />
              </SelectTrigger>
              <SelectContent>
                {cases.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.workerName}</span>
                      <span className="text-muted-foreground">- {c.company}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCaseId && !currentCheckinId && (
              <Button onClick={handleStartCheckin} disabled={createCheckinMutation.isPending}>
                {createCheckinMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <MessageSquare className="mr-2 h-4 w-4" />
                New Check-in
              </Button>
            )}
          </CardContent>
        </Card>

        {selectedCaseId && (
          <Tabs defaultValue={currentCheckinId ? "questionnaire" : "history"}>
            <TabsList>
              <TabsTrigger value="history">History ({checkins.length})</TabsTrigger>
              <TabsTrigger value="questionnaire" disabled={!currentCheckinId}>
                Current Check-in
              </TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
            </TabsList>

            {/* History Tab */}
            <TabsContent value="history" className="mt-6">
              {latestCheckin?.scores && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Latest Scores</CardTitle>
                    <CardDescription>
                      From {new Date(latestCheckin.completedAt || latestCheckin.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-5 gap-4">
                      {[
                        { label: "Pain", score: latestCheckin.scores.pain, icon: Activity },
                        { label: "Mood", score: latestCheckin.scores.mood, icon: TrendingUp },
                        { label: "Daily Activities", score: latestCheckin.scores.adl, icon: CheckCircle2 },
                        { label: "Work Readiness", score: latestCheckin.scores.work, icon: Clock },
                        { label: "Overall", score: latestCheckin.scores.overall, icon: Activity },
                      ].map((item) => (
                        <div key={item.label} className={`text-center p-4 rounded-lg ${getScoreBg(item.score)}`}>
                          <item.icon className={`h-6 w-6 mx-auto mb-2 ${getScoreColor(item.score)}`} />
                          <div className={`text-2xl font-bold ${getScoreColor(item.score)}`}>
                            {item.score}
                          </div>
                          <div className="text-xs text-muted-foreground">{item.label}</div>
                        </div>
                      ))}
                    </div>

                    {latestCheckin.riskSignals && latestCheckin.riskSignals.length > 0 && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                          <AlertTriangle className="h-4 w-4" />
                          Risk Signals Detected
                        </div>
                        <ul className="list-disc list-inside text-sm text-red-600">
                          {latestCheckin.riskSignals.map((signal, i) => (
                            <li key={i}>{signal}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {latestCheckin.trendSummary && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <p className="text-sm">{latestCheckin.trendSummary}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Check-in History</CardTitle>
                </CardHeader>
                <CardContent>
                  {checkins.length > 0 ? (
                    <ScrollArea className="h-96">
                      <div className="space-y-3">
                        {checkins.map((checkin) => (
                          <div
                            key={checkin.id}
                            className="flex items-center justify-between p-4 rounded-lg border"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                checkin.status === "completed" ? "bg-green-100" : "bg-yellow-100"
                              }`}>
                                {checkin.status === "completed" ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                ) : (
                                  <Clock className="h-5 w-5 text-yellow-600" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">
                                  {new Date(checkin.createdAt).toLocaleDateString("en-AU", {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {checkin.status === "completed"
                                    ? `Completed • Overall score: ${checkin.scores?.overall || "N/A"}`
                                    : "In progress"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {checkin.scores && (
                                <Badge variant={checkin.scores.overall >= 60 ? "default" : "destructive"}>
                                  {checkin.scores.overall}%
                                </Badge>
                              )}
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-12">
                      <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">No Check-ins Yet</p>
                      <p className="text-muted-foreground mb-4">
                        Start tracking this worker's progress
                      </p>
                      <Button onClick={handleStartCheckin}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Start First Check-in
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Questionnaire Tab */}
            <TabsContent value="questionnaire" className="mt-6">
              {currentCheckinId && (
                <Card>
                  <CardHeader>
                    <CardTitle>Weekly Wellness Questionnaire</CardTitle>
                    <CardDescription>
                      For {selectedCase?.workerName} • {new Date().toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    {Object.entries(groupedQuestions).map(([category, categoryQuestions]) => (
                      <div key={category}>
                        <h3 className="text-lg font-semibold mb-4 capitalize">{category}</h3>
                        <div className="space-y-6">
                          {categoryQuestions.map((question) => (
                            <div key={question.id} className="space-y-3">
                              <Label className="text-base">{question.question}</Label>

                              {question.type === "scale" && (
                                <div className="space-y-2">
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>{question.scaleLabels?.min || "Low"}</span>
                                    <span>{question.scaleLabels?.max || "High"}</span>
                                  </div>
                                  <RadioGroup
                                    value={String(responses[question.id] || "")}
                                    onValueChange={(val) => handleResponseChange(question.id, parseInt(val))}
                                    className="flex justify-between"
                                  >
                                    {Array.from(
                                      { length: (question.scaleMax || 10) - (question.scaleMin || 1) + 1 },
                                      (_, i) => i + (question.scaleMin || 1)
                                    ).map((num) => (
                                      <div key={num} className="flex flex-col items-center gap-1">
                                        <RadioGroupItem value={String(num)} id={`${question.id}-${num}`} />
                                        <Label htmlFor={`${question.id}-${num}`} className="text-xs">
                                          {num}
                                        </Label>
                                      </div>
                                    ))}
                                  </RadioGroup>
                                </div>
                              )}

                              {question.type === "yes_no" && (
                                <RadioGroup
                                  value={responses[question.id] === true ? "yes" : responses[question.id] === false ? "no" : ""}
                                  onValueChange={(val) => handleResponseChange(question.id, val === "yes")}
                                  className="flex gap-4"
                                >
                                  <div className="flex items-center gap-2">
                                    <RadioGroupItem value="yes" id={`${question.id}-yes`} />
                                    <Label htmlFor={`${question.id}-yes`}>Yes</Label>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <RadioGroupItem value="no" id={`${question.id}-no`} />
                                    <Label htmlFor={`${question.id}-no`}>No</Label>
                                  </div>
                                </RadioGroup>
                              )}

                              {question.type === "text" && (
                                <Textarea
                                  value={String(responses[question.id] || "")}
                                  onChange={(e) => handleResponseChange(question.id, e.target.value)}
                                  placeholder="Enter your response..."
                                  rows={3}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                        <Separator className="mt-6" />
                      </div>
                    ))}

                    <div className="flex justify-end gap-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCurrentCheckinId(null);
                          setResponses({});
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmitCheckin}
                        disabled={submitCheckinMutation.isPending || Object.keys(responses).length === 0}
                      >
                        {submitCheckinMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Check-in
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Trends Tab */}
            <TabsContent value="trends" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Progress Trends</CardTitle>
                  <CardDescription>
                    Track improvement over time based on check-in responses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {checkins.length >= 2 ? (
                    <div className="space-y-6">
                      {["pain", "mood", "adl", "work", "overall"].map((metric) => {
                        const scores = checkins
                          .filter((c) => c.scores)
                          .slice(0, 8)
                          .reverse()
                          .map((c) => c.scores![metric as keyof typeof c.scores]);

                        const latest = scores[scores.length - 1] || 0;
                        const previous = scores[scores.length - 2] || latest;
                        const trend = latest - previous;

                        return (
                          <div key={metric} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium capitalize">{metric === "adl" ? "Daily Activities" : metric}</span>
                              <div className="flex items-center gap-2">
                                <span className={`font-bold ${getScoreColor(latest)}`}>{latest}%</span>
                                {trend !== 0 && (
                                  <Badge variant={trend > 0 ? "default" : "destructive"} className="text-xs">
                                    {trend > 0 ? (
                                      <TrendingUp className="h-3 w-3 mr-1" />
                                    ) : (
                                      <TrendingDown className="h-3 w-3 mr-1" />
                                    )}
                                    {trend > 0 ? "+" : ""}{trend}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Progress value={latest} className="h-2" />
                            <div className="flex gap-1">
                              {scores.map((score, i) => (
                                <div
                                  key={i}
                                  className={`flex-1 h-8 rounded ${getScoreBg(score)}`}
                                  title={`Week ${i + 1}: ${score}%`}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">Not Enough Data</p>
                      <p className="text-muted-foreground">
                        Complete at least 2 check-ins to see trends
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {!selectedCaseId && (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Select a Worker</p>
              <p className="text-muted-foreground">
                Choose a case from the dropdown above to manage their check-ins
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
