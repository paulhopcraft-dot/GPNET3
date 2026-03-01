import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Send, CheckCircle, ArrowLeft, Loader2 } from "lucide-react";

interface AssessmentDraft {
  id: string;
  candidateName: string;
  candidateEmail: string;
  positionTitle: string;
  accessToken: string;
  status: string;
}

export default function NewAssessmentPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"form" | "created" | "sent">("form");
  const [assessment, setAssessment] = useState<AssessmentDraft | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fields, setFields] = useState({
    candidateName: "",
    candidateEmail: "",
    positionTitle: "",
    startDate: "",
    jobDescription: "",
  });

  function set(key: keyof typeof fields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/assessments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      const data = await res.json();
      setAssessment(data.assessment);
      setStep("created");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSend() {
    if (!assessment) return;
    setError(null);
    setSending(true);
    try {
      const res = await fetch(`/api/assessments/${assessment.id}/send`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      setStep("sent");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  if (step === "sent") {
    return (
      <PageLayout title="Assessment Sent" subtitle="Pre-employment health check">
        <div className="max-w-lg mx-auto">
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <h2 className="text-xl font-semibold">Questionnaire sent!</h2>
              <p className="text-muted-foreground text-sm">
                A secure link has been emailed to{" "}
                <span className="font-medium text-foreground">{assessment?.candidateEmail}</span>.
                <br />
                You'll be notified automatically once they complete it.
              </p>
              <div className="flex gap-3 justify-center pt-2">
                <Button variant="outline" onClick={() => navigate("/checks")}>
                  Back to Checks
                </Button>
                <Button
                  onClick={() => {
                    setStep("form");
                    setAssessment(null);
                    setFields({ candidateName: "", candidateEmail: "", positionTitle: "", startDate: "", jobDescription: "" });
                  }}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  New Assessment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  if (step === "created" && assessment) {
    return (
      <PageLayout title="Assessment Created" subtitle="Pre-employment health check">
        <div className="max-w-lg mx-auto space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Ready to send</CardTitle>
                <Badge variant="outline">Created</Badge>
              </div>
              <CardDescription>Review the details below, then send the questionnaire link to the worker.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Candidate</p>
                  <p className="font-medium">{assessment.candidateName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{assessment.candidateEmail}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Position</p>
                  <p className="font-medium">{assessment.positionTitle}</p>
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => navigate("/checks")} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Not now
                </Button>
                <Button onClick={handleSend} disabled={sending} className="flex-1">
                  {sending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {sending ? "Sending…" : "Send to Worker"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="New Pre-Employment Assessment" subtitle="Send a health questionnaire to a candidate">
      <div className="max-w-lg mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Candidate Details
            </CardTitle>
            <CardDescription>
              Enter the candidate's details. They'll receive a secure link by email to complete their health check.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="candidateName">Full Name *</Label>
                  <Input
                    id="candidateName"
                    value={fields.candidateName}
                    onChange={(e) => set("candidateName", e.target.value)}
                    placeholder="Jane Smith"
                    required
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="candidateEmail">Email Address *</Label>
                  <Input
                    id="candidateEmail"
                    type="email"
                    value={fields.candidateEmail}
                    onChange={(e) => set("candidateEmail", e.target.value)}
                    placeholder="jane.smith@email.com"
                    required
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="positionTitle">Role / Position *</Label>
                  <Input
                    id="positionTitle"
                    value={fields.positionTitle}
                    onChange={(e) => set("positionTitle", e.target.value)}
                    placeholder="Warehouse Operator"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="startDate">Proposed Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={fields.startDate}
                    onChange={(e) => set("startDate", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="jobDescription">Job Description / Physical Demands</Label>
                <Textarea
                  id="jobDescription"
                  value={fields.jobDescription}
                  onChange={(e) => set("jobDescription", e.target.value)}
                  placeholder="Describe the role's physical requirements, lifting limits, environmental conditions, etc."
                  rows={4}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate("/checks")} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  {submitting ? "Creating…" : "Create Assessment"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
