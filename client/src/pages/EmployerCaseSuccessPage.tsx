import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Eye, Mail, Home, Loader2 } from "lucide-react";
import { useState } from "react";
import { fetchWithCsrf } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CaseData {
  id: string;
  workerName: string;
  company: string;
  workStatus: string;
  dateOfInjury: string;
  summary: string;
}

export default function EmployerCaseSuccessPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sendingEmail, setSendingEmail] = useState(false);

  // Fetch case data
  const { data: caseData, isLoading } = useQuery<CaseData>({
    queryKey: ["case", id],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${id}`);
      if (!res.ok) throw new Error("Failed to fetch case");
      return res.json();
    },
  });

  const handleSendInjuryCheck = async () => {
    setSendingEmail(true);
    try {
      const response = await fetchWithCsrf(`/api/employer/cases/${id}/injury-check`, {
        method: "POST",
      });
      if (response.ok) {
        toast({
          title: "Injury Check Sent",
          description: `An injury check email has been sent to ${caseData?.workerName}.`,
        });
      } else {
        throw new Error("Failed to send email");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send injury check email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  if (isLoading) {
    return (
      <PageLayout title="Case Created" subtitle="Success">
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Case Created" subtitle="Success">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Success message */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-green-800">
                  Case Created Successfully
                </h2>
                <p className="text-green-700 mt-1">
                  The case for <span className="font-semibold">{caseData?.workerName}</span> has been submitted and is now being processed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary info */}
        <Card>
          <CardHeader>
            <CardTitle>Case Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Worker:</span>
                <span className="ml-2 font-medium">{caseData?.workerName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <span className="ml-2 font-medium">{caseData?.workStatus}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Date of Injury:</span>
                <span className="ml-2 font-medium">
                  {caseData?.dateOfInjury
                    ? new Date(caseData.dateOfInjury).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Company:</span>
                <span className="ml-2 font-medium">{caseData?.company}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action options */}
        <Card>
          <CardHeader>
            <CardTitle>What would you like to do next?</CardTitle>
            <CardDescription>
              Choose from the options below to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Option 1: View Case */}
            <Button
              className="w-full justify-start h-auto py-4"
              onClick={() => navigate(`/employer/case/${id}`)}
            >
              <Eye className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">View Case Details</div>
                <div className="text-sm text-primary-foreground/80">
                  Review the full case information and AI-generated summary
                </div>
              </div>
            </Button>

            {/* Option 2: Send Injury Check */}
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4"
              onClick={handleSendInjuryCheck}
              disabled={sendingEmail}
            >
              {sendingEmail ? (
                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
              ) : (
                <Mail className="w-5 h-5 mr-3" />
              )}
              <div className="text-left">
                <div className="font-semibold">Send Injury Check Email</div>
                <div className="text-sm text-muted-foreground">
                  Send a personalized check-in email to the worker
                </div>
              </div>
            </Button>

            {/* Option 3: Return to Dashboard */}
            <Button
              variant="secondary"
              className="w-full justify-start h-auto py-4"
              onClick={() => navigate("/")}
            >
              <Home className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Return to Dashboard</div>
                <div className="text-sm text-muted-foreground">
                  Go back to the main employer dashboard
                </div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
