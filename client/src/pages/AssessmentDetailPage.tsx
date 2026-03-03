import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Briefcase, Mail, Calendar, FileText, CheckCircle, Clock, Send } from "lucide-react";

interface Assessment {
  id: string;
  candidateName: string;
  candidateEmail: string;
  positionTitle: string;
  departmentName: string | null;
  status: string;
  assessmentType: string;
  jobDescription: string | null;
  jobDescriptionFileUrl: string | null;
  questionnaireResponses: Record<string, string> | null;
  clearanceLevel: string | null;
  notes: string | null;
  sentAt: string | null;
  completedDate: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  created:   { label: "Ready to Send", color: "bg-yellow-100 text-yellow-800" },
  sent:      { label: "Sent",          color: "bg-blue-100 text-blue-800" },
  completed: { label: "Completed",     color: "bg-green-100 text-green-800" },
  cleared:   { label: "Cleared",       color: "bg-emerald-100 text-emerald-800" },
  flagged:   { label: "Flagged",       color: "bg-red-100 text-red-800" },
};

const QUESTION_LABELS: Record<string, string> = {
  general_health:               "Overall health rating",
  current_conditions:           "Current medical conditions or injuries",
  current_conditions_detail:    "Conditions detail",
  medications:                  "Currently taking medications",
  medications_detail:           "Medications detail",
  physical_limitations:         "Physical limitations affecting work",
  physical_limitations_detail:  "Limitations detail",
  mental_health:                "Mental health and wellbeing rating",
};

export default function AssessmentDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery<{ assessment: Assessment }>({
    queryKey: ["assessment", id],
    queryFn: () => fetch(`/api/assessments/${id}`, { credentials: "include" }).then(r => {
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    }),
  });

  if (isLoading) {
    return (
      <PageLayout title="Assessment" subtitle="Loading...">
        <div className="flex items-center justify-center min-h-64">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </PageLayout>
    );
  }

  if (error || !data?.assessment) {
    return (
      <PageLayout title="Assessment" subtitle="Not found">
        <div className="text-center py-12 text-gray-500">Assessment not found.</div>
      </PageLayout>
    );
  }

  const a = data.assessment;
  const status = STATUS_LABELS[a.status] ?? { label: a.status, color: "bg-gray-100 text-gray-800" };
  const responses = a.questionnaireResponses as Record<string, string> | null;

  return (
    <PageLayout title="Assessment Detail" subtitle={a.candidateName}>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Back button */}
        <Link to="/checks">
          <Button variant="ghost" size="sm" className="gap-2 text-gray-600">
            <ArrowLeft className="w-4 h-4" /> Back to Checks
          </Button>
        </Link>

        {/* Header card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">{a.candidateName}</CardTitle>
                  <p className="text-gray-500 text-sm flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3" />{a.candidateEmail}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                {status.label}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Briefcase className="w-4 h-4" />
                <span>{a.positionTitle}{a.departmentName ? ` — ${a.departmentName}` : ""}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Created {new Date(a.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
              {a.sentAt && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Send className="w-4 h-4" />
                  <span>Sent {new Date(a.sentAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</span>
                </div>
              )}
              {a.completedDate && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Completed {new Date(a.completedDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Job description */}
        {(a.jobDescription || a.jobDescriptionFileUrl) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" /> Job Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              {a.jobDescription && (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{a.jobDescription}</p>
              )}
              {a.jobDescriptionFileUrl && (
                <a href={a.jobDescriptionFileUrl} target="_blank" rel="noreferrer"
                  className="text-blue-600 text-sm underline mt-2 inline-block">
                  View uploaded document
                </a>
              )}
            </CardContent>
          </Card>
        )}

        {/* Questionnaire responses */}
        {responses && Object.keys(responses).length > 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" /> Health Questionnaire Responses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(responses).map(([key, value]) => {
                  if (!value) return null;
                  const label = QUESTION_LABELS[key] ?? key.replace(/_/g, " ");
                  const isDetail = key.endsWith("_detail");
                  return (
                    <div key={key} className={`${isDetail ? "pl-4 border-l-2 border-gray-200" : ""}`}>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                      <p className="text-sm font-medium text-gray-900">{value}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-gray-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Awaiting worker response</p>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {a.notes && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">{a.notes}</p>
            </CardContent>
          </Card>
        )}

      </div>
    </PageLayout>
  );
}
