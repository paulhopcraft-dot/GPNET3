import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { fetchWithCsrf } from "../lib/queryClient";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { Loader2, Monitor, Smartphone, Globe, Trash2, LogOut, ArrowLeft } from "lucide-react";
import { useToast } from "../hooks/use-toast";

interface Session {
  id: string;
  deviceName: string | null;
  ipAddress: string | null;
  browser: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

interface SessionsResponse {
  success: boolean;
  data: {
    sessions: Session[];
  };
}

export default function SessionsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [sessionToRevoke, setSessionToRevoke] = useState<Session | null>(null);
  const [showLogoutAllDialog, setShowLogoutAllDialog] = useState(false);

  const { data, isLoading, error } = useQuery<SessionsResponse>({
    queryKey: ["/api/auth/sessions"],
    queryFn: async () => {
      const response = await fetch("/api/auth/sessions", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch sessions");
      }
      return response.json();
    },
  });

  const revokeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetchWithCsrf(`/api/auth/sessions/${sessionId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to revoke session");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/sessions"] });
      toast({
        title: "Session revoked",
        description: "The session has been logged out successfully.",
      });
      setSessionToRevoke(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetchWithCsrf("/api/auth/logout-all", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to logout from all devices");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Logged out from all devices",
        description: "All sessions have been revoked. You will be redirected to login.",
      });
      setShowLogoutAllDialog(false);
      // Logout will redirect to login
      setTimeout(() => {
        logout();
      }, 1500);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sessions = data?.data?.sessions || [];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

    return date.toLocaleDateString();
  };

  const getDeviceIcon = (browser: string) => {
    if (browser.toLowerCase().includes("mobile")) {
      return <Smartphone className="h-5 w-5" />;
    }
    return <Monitor className="h-5 w-5" />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Active Sessions</h1>
          <p className="text-muted-foreground mt-2">
            Manage your active login sessions across devices
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>Failed to load sessions. Please try again.</AlertDescription>
          </Alert>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Your Sessions</CardTitle>
            <CardDescription>
              {sessions.length === 0
                ? "No active sessions found"
                : `You have ${sessions.length} active session${sessions.length === 1 ? "" : "s"}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  data-testid={`session-item-${session.id}`}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1 text-muted-foreground">
                      {getDeviceIcon(session.browser)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{session.browser}</span>
                        {session.isCurrent && (
                          <Badge variant="secondary" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        <div className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          <span>{session.ipAddress || "Unknown IP"}</span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Last active: {formatDate(session.lastUsedAt)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Signed in: {formatDate(session.createdAt)}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setSessionToRevoke(session)}
                    disabled={revokeSessionMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {sessions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No active sessions found
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {sessions.length > 1 && (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Log out from all devices including this one
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={() => setShowLogoutAllDialog(true)}
                disabled={logoutAllMutation.isPending}
              >
                {logoutAllMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging out...
                  </>
                ) : (
                  <>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out all devices
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Revoke Session Dialog */}
        <Dialog open={!!sessionToRevoke} onOpenChange={() => setSessionToRevoke(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Revoke this session?</DialogTitle>
              <DialogDescription>
                This will log out the {sessionToRevoke?.browser} session
                {sessionToRevoke?.ipAddress && ` from ${sessionToRevoke.ipAddress}`}.
                {sessionToRevoke?.isCurrent && " This is your current session - you will be logged out."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSessionToRevoke(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (sessionToRevoke) {
                    revokeSessionMutation.mutate(sessionToRevoke.id);
                  }
                }}
                disabled={revokeSessionMutation.isPending}
              >
                {revokeSessionMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Revoke"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Logout All Dialog */}
        <Dialog open={showLogoutAllDialog} onOpenChange={setShowLogoutAllDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log out from all devices?</DialogTitle>
              <DialogDescription>
                This will revoke all {sessions.length} active sessions, including your current session.
                You will need to sign in again.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLogoutAllDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => logoutAllMutation.mutate()}
                disabled={logoutAllMutation.isPending}
              >
                {logoutAllMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Log out all"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
