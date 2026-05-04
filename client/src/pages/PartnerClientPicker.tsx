import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, LogOut, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fetchWithCsrf } from "@/lib/queryClient";

interface ClientOrg {
  id: string;
  name: string;
  logoUrl: string | null;
  openCaseCount: number;
}

interface PartnerOrgInfo {
  id: string;
  name: string;
  logoUrl: string | null;
  kind: "employer" | "partner";
}

/**
 * Partner-tier client picker — Task D in PLAN.md.
 * Partner-role users land here after login (and after clicking "Switch
 * client" in the header). Selecting a client mints a new JWT with
 * activeOrganizationId set, then navigates into the standard case
 * dashboard for that client.
 */
export default function PartnerClientPicker() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, refreshAuth, logout } = useAuth();

  // Guard: only partner-role users belong on this page.
  useEffect(() => {
    if (user && user.role !== "partner") {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const meQuery = useQuery<{ partnerOrg: PartnerOrgInfo | null; activeOrg: unknown }>({
    queryKey: ["partner", "me"],
    queryFn: async () => {
      const res = await fetch("/api/partner/me", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load partner context");
      return res.json();
    },
    enabled: user?.role === "partner",
  });

  const clientsQuery = useQuery<{ clients: ClientOrg[] }>({
    queryKey: ["partner", "clients"],
    queryFn: async () => {
      const res = await fetch("/api/partner/clients", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load clients");
      return res.json();
    },
    enabled: user?.role === "partner",
  });

  const pickClientMutation = useMutation({
    mutationFn: async (organizationId: string) => {
      const res = await fetchWithCsrf("/api/partner/active-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ organizationId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed to set active client");
      }
      return res.json();
    },
    onSuccess: async () => {
      // Refresh user info from /api/auth/me so activeOrganizationId
      // shows up on the auth context, then navigate into the dashboard.
      await refreshAuth();
      queryClient.invalidateQueries({ queryKey: ["partner"] });
      navigate("/");
    },
  });

  const partnerName = meQuery.data?.partnerOrg?.name ?? "Partner";
  const partnerLogoUrl = meQuery.data?.partnerOrg?.logoUrl ?? null;
  const clients = clientsQuery.data?.clients ?? [];
  const isLoading = meQuery.isLoading || clientsQuery.isLoading;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar with partner brand */}
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            {partnerLogoUrl ? (
              <img
                src={partnerLogoUrl}
                alt={`${partnerName} logo`}
                className="h-9 w-9 rounded object-contain"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded bg-primary text-primary-foreground">
                <Building2 className="h-5 w-5" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold leading-tight">{partnerName}</p>
              <p className="text-xs text-muted-foreground">Partner portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={() => logout()} data-testid="sign-out">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Pick a client</h1>
          <p className="mt-2 text-muted-foreground">
            Select the client organisation you want to work on. You can switch any time
            from the header.
          </p>
        </div>

        {pickClientMutation.error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>
              {pickClientMutation.error instanceof Error
                ? pickClientMutation.error.message
                : "Failed to set active client"}
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : clients.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Building2 className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <h2 className="text-lg font-semibold">No clients assigned</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Contact your partner admin to be granted access to a client organisation.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map((c) => (
              <Card
                key={c.id}
                className="cursor-pointer transition hover:border-primary hover:shadow-md"
                role="button"
                tabIndex={0}
                onClick={() => pickClientMutation.mutate(c.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    pickClientMutation.mutate(c.id);
                  }
                }}
                data-testid={`client-card-${c.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    {c.logoUrl ? (
                      <img
                        src={c.logoUrl}
                        alt={`${c.name} logo`}
                        className="h-10 w-10 rounded object-contain"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-muted-foreground">
                        <Building2 className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-base">{c.name}</CardTitle>
                      <CardDescription className="text-xs">Client organisation</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between pt-0">
                  <Badge variant="secondary">
                    {c.openCaseCount} open case{c.openCaseCount === 1 ? "" : "s"}
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {pickClientMutation.isPending && (
          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Switching client…
          </div>
        )}
      </main>
    </div>
  );
}
