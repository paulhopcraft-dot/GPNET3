import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { getAuthToken } from "../contexts/AuthContext";

interface User {
  id: string;
  email: string;
  role: string;
  subrole: string | null;
  companyId: string | null;
  insurerId: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Stats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalCases: number;
  usersByRole: {
    admin: number;
    employer: number;
    clinician: number;
    insurer: number;
  };
}

interface AuditEvent {
  id: string;
  timestamp: string;
  userId: string | null;
  eventType: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, any> | null;
}

export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "stats" | "audit">("users");

  // Create user form state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    role: "employer" as string,
    subrole: "",
  });
  const [createError, setCreateError] = useState<string | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/");
    }
  }, [user, navigate]);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const token = getAuthToken();
    if (!token) return;

    setLoading(true);
    try {
      const [usersRes, statsRes, auditRes] = await Promise.all([
        fetch("/api/admin/users", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/admin/stats", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/admin/audit-log?limit=20", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.data);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.data);
      }

      if (auditRes.ok) {
        const data = await auditRes.json();
        setAuditLog(data.data);
      }
    } catch (err) {
      setError("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newUser),
      });

      const data = await res.json();

      if (res.ok) {
        setShowCreateDialog(false);
        setNewUser({ email: "", password: "", role: "employer", subrole: "" });
        fetchData();
      } else {
        setCreateError(data.message || "Failed to create user");
      }
    } catch (err) {
      setCreateError("Network error");
    }
  }

  async function handleToggleActive(userId: string, currentlyActive: boolean) {
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !currentlyActive }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Failed to toggle user status");
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getRoleBadgeVariant(role: string): "default" | "secondary" | "outline" | "destructive" {
    switch (role) {
      case "admin":
        return "destructive";
      case "employer":
        return "default";
      case "clinician":
        return "secondary";
      case "insurer":
        return "outline";
      default:
        return "outline";
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="material-symbols-outlined animate-spin">progress_activity</span>
          Loading admin panel...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <span className="material-symbols-outlined">error</span>
              {error}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")}>
              <span className="material-symbols-outlined mr-2">arrow_back</span>
              Back to Dashboard
            </Button>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">admin_panel_settings</span>
              Admin Panel
            </h1>
          </div>
          <div className="text-sm text-muted-foreground">
            Logged in as {user?.email}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex gap-2 border-b pb-4 mb-6">
          <Button
            variant={activeTab === "users" ? "default" : "ghost"}
            onClick={() => setActiveTab("users")}
          >
            <span className="material-symbols-outlined mr-2 text-sm">group</span>
            Users
          </Button>
          <Button
            variant={activeTab === "stats" ? "default" : "ghost"}
            onClick={() => setActiveTab("stats")}
          >
            <span className="material-symbols-outlined mr-2 text-sm">analytics</span>
            Statistics
          </Button>
          <Button
            variant={activeTab === "audit" ? "default" : "ghost"}
            onClick={() => setActiveTab("audit")}
          >
            <span className="material-symbols-outlined mr-2 text-sm">history</span>
            Audit Log
          </Button>
        </div>

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium">User Management</h2>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <span className="material-symbols-outlined mr-2 text-sm">person_add</span>
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                    <DialogDescription>
                      Add a new user to the system. They will receive an email with login instructions.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateUser} className="space-y-4 pt-4">
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <input
                        type="email"
                        required
                        className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Password</label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Role</label>
                      <select
                        className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                      >
                        <option value="employer">Employer</option>
                        <option value="clinician">Clinician</option>
                        <option value="insurer">Insurer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Subrole (optional)</label>
                      <input
                        type="text"
                        placeholder="e.g., doctor, physio"
                        className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                        value={newUser.subrole}
                        onChange={(e) => setNewUser({ ...newUser, subrole: e.target.value })}
                      />
                    </div>
                    {createError && (
                      <div className="text-sm text-destructive flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">error</span>
                        {createError}
                      </div>
                    )}
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Create User</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-3">
              {users.map((u) => (
                <Card key={u.id} className={!u.isActive ? "opacity-60" : ""}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary">person</span>
                        </div>
                        <div>
                          <div className="font-medium">{u.email}</div>
                          <div className="text-sm text-muted-foreground">
                            Created {formatDate(u.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={getRoleBadgeVariant(u.role)}>
                          {u.role}
                        </Badge>
                        {u.subrole && (
                          <Badge variant="outline">{u.subrole}</Badge>
                        )}
                        {!u.isActive && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        {u.id !== user?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(u.id, u.isActive)}
                          >
                            {u.isActive ? (
                              <span className="material-symbols-outlined text-sm text-warning">block</span>
                            ) : (
                              <span className="material-symbols-outlined text-sm text-success">check_circle</span>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === "stats" && stats && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium">System Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Users</CardDescription>
                  <CardTitle className="text-3xl">{stats.totalUsers}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    {stats.activeUsers} active, {stats.inactiveUsers} inactive
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Cases</CardDescription>
                  <CardTitle className="text-3xl">{stats.totalCases}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Worker compensation cases
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Admin Users</CardDescription>
                  <CardTitle className="text-3xl">{stats.usersByRole.admin}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Full system access
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Clinicians</CardDescription>
                  <CardTitle className="text-3xl">{stats.usersByRole.clinician}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Medical professionals
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Users by Role</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.usersByRole).map(([role, count]) => (
                    <div key={role} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant={getRoleBadgeVariant(role)}>{role}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${(count / stats.totalUsers) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Audit Log Tab */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Recent Activity</h2>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {auditLog.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      No audit events recorded yet.
                    </div>
                  ) : (
                    auditLog.map((event) => (
                      <div key={event.id} className="p-4 flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-sm">
                            {event.eventType.includes("CREATE") ? "add" :
                             event.eventType.includes("UPDATE") ? "edit" :
                             event.eventType.includes("DELETE") ? "delete" :
                             "info"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">
                            {event.eventType.replace(/_/g, " ")}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {event.resourceType && (
                              <span>
                                {event.resourceType}: {event.resourceId?.slice(0, 8)}...
                              </span>
                            )}
                          </div>
                          {event.metadata && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {JSON.stringify(event.metadata)}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(event.timestamp)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
