/**
 * ManagerEmailSection
 * Displays and allows editing of manager notification email
 * OUT-07: Generate manager email from plan
 * OUT-08: Email editable only before approval
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Copy, RefreshCw, Loader2, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ManagerEmailSectionProps {
  planId: string;
  planStatus: string;
}

interface EmailDraft {
  subject: string;
  body: string;
}

export function ManagerEmailSection({ planId, planStatus }: ManagerEmailSectionProps): JSX.Element {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // OUT-08: Email editable only before approval
  const isLocked = planStatus === "approved";

  // Fetch email draft
  const { data: emailDraft, isLoading } = useQuery<EmailDraft>({
    queryKey: ["rtw-plan-email", planId],
    queryFn: async () => {
      const response = await fetch(`/api/rtw-plans/${planId}/email`);
      if (!response.ok) {
        throw new Error("Failed to fetch email");
      }
      const result = await response.json();
      return result.data || result;
    },
  });

  // Sync local state with fetched data
  useEffect(() => {
    if (emailDraft) {
      setSubject(emailDraft.subject);
      setBody(emailDraft.body);
    }
  }, [emailDraft]);

  // Regenerate email mutation
  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/rtw-plans/${planId}/email/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error("Failed to regenerate email");
      }
      const result = await response.json();
      return result.data || result;
    },
    onSuccess: (data) => {
      setSubject(data.subject);
      setBody(data.body);
      queryClient.invalidateQueries({ queryKey: ["rtw-plan-email", planId] });
      toast({ title: "Email regenerated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to regenerate email", variant: "destructive" });
    },
  });

  // Copy to clipboard
  const handleCopy = async () => {
    const fullEmail = `Subject: ${subject}\n\n${body}`;
    await navigator.clipboard.writeText(fullEmail);
    toast({ title: "Email copied to clipboard" });
  };

  if (isLoading) {
    return (
      <Card className="print:hidden">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Generating email...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="print:hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Manager Notification Email
        </CardTitle>
        <CardDescription>
          {isLocked ? (
            <span className="flex items-center gap-1 text-amber-600">
              <Lock className="h-3 w-3" />
              Email locked after plan approval
            </span>
          ) : (
            "Edit the email before sending to the manager"
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subject line */}
        <div className="space-y-2">
          <Label htmlFor="email-subject">Subject</Label>
          <Input
            id="email-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={isLocked}
            placeholder="Email subject"
          />
        </div>

        {/* Email body */}
        <div className="space-y-2">
          <Label htmlFor="email-body">Body</Label>
          <Textarea
            id="email-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={isLocked}
            rows={12}
            className="font-mono text-sm"
            placeholder="Email body will be generated..."
          />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleCopy} variant="outline" size="sm">
            <Copy className="h-4 w-4 mr-2" />
            Copy to Clipboard
          </Button>
          {!isLocked && (
            <Button
              onClick={() => regenerateMutation.mutate()}
              variant="outline"
              size="sm"
              disabled={regenerateMutation.isPending}
            >
              {regenerateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Regenerate
            </Button>
          )}
        </div>

        {isLocked && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertDescription className="text-amber-800 text-sm">
              This plan has been approved. Email content cannot be modified.
              You can still copy the email to your clipboard.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
