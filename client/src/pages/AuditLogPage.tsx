import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Shield,
  Search,
  Filter,
  Download,
  Calendar as CalendarIcon,
  User,
  FileText,
  Clock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  LogIn,
  LogOut,
} from "lucide-react";

interface AuditEvent {
  id: string;
  eventType: string;
  category: string;
  actor: string;
  actorType: string;
  target?: string;
  targetType?: string;
  action: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  success: boolean;
}

interface AuditStats {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByCategory: Record<string, number>;
  recentActivity: { hour: string; count: number }[];
}

interface ComplianceCheck {
  id: string;
  name: string;
  status: "pass" | "fail" | "warning";
  description: string;
  lastChecked: string;
  details?: string;
}

const EVENT_TYPE_ICONS: Record<string, any> = {
  auth_login: LogIn,
  auth_logout: LogOut,
  case_view: Eye,
  case_create: FileText,
  case_update: Edit,
  case_delete: Trash2,
  rtw_plan_created: Activity,
  rtw_plan_updated: Activity,
  certificate_uploaded: FileText,
  default: Shield,
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  auth_login: "bg-blue-100 text-blue-700",
  auth_logout: "bg-slate-100 text-slate-700",
  case_view: "bg-purple-100 text-purple-700",
  case_create: "bg-green-100 text-green-700",
  case_update: "bg-yellow-100 text-yellow-700",
  case_delete: "bg-red-100 text-red-700",
  rtw_plan_created: "bg-indigo-100 text-indigo-700",
  rtw_plan_updated: "bg-indigo-100 text-indigo-700",
  certificate_uploaded: "bg-teal-100 text-teal-700",
  default: "bg-slate-100 text-slate-700",
};

export default function AuditLogPage() {
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    eventType: "all",
    actor: "",
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined,
    search: "",
  });

  // Fetch audit events
  const { data: events = [], isLoading, refetch, isRefetching } = useQuery<AuditEvent[]>({
    queryKey: ["/api/audit/events", filters],
  });

  // Fetch audit stats
  const { data: stats } = useQuery<AuditStats>({
    queryKey: ["/api/audit/stats"],
  });

  // Fetch compliance checks
  const { data: complianceChecks = [] } = useQuery<ComplianceCheck[]>({
    queryKey: ["/api/audit/compliance"],
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async (format: "json" | "csv") => {
      const response = await fetch(`/api/audit/export?format=${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters),
      });
      if (!response.ok) throw new Error("Export failed");
      return response.blob();
    },
    onSuccess: (blob, format) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().split("T")[0]}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast({ title: "Export Complete", description: `Audit log exported as ${format.toUpperCase()}` });
    },
    onError: () => {
      toast({ title: "Export Failed", description: "Could not export audit log", variant: "destructive" });
    },
  });

  const getEventIcon = (eventType: string) => {
    const Icon = EVENT_TYPE_ICONS[eventType] || EVENT_TYPE_ICONS.default;
    return <Icon className="h-4 w-4" />;
  };

  const getEventColor = (eventType: string) => {
    return EVENT_TYPE_COLORS[eventType] || EVENT_TYPE_COLORS.default;
  };

  const filteredEvents = events.filter((event) => {
    if (filters.eventType !== "all" && event.eventType !== filters.eventType) return false;
    if (filters.actor && !event.actor.toLowerCase().includes(filters.actor.toLowerCase())) return false;
    if (filters.search && !JSON.stringify(event).toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.dateFrom && new Date(event.timestamp) < filters.dateFrom) return false;
    if (filters.dateTo && new Date(event.timestamp) > filters.dateTo) return false;
    return true;
  });

  const eventTypes = [...new Set(events.map((e) => e.eventType))];

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Audit Log</h1>
            <p className="text-muted-foreground mt-2">
              Track all system activity for compliance and security
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isRefetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40">
                <div className="space-y-2">
                  <Button variant="ghost" className="w-full justify-start" onClick={() => exportMutation.mutate("csv")}>
                    Export as CSV
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => exportMutation.mutate("json")}>
                    Export as JSON
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEvents.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Auth Events</CardTitle>
                <LogIn className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(stats.eventsByCategory?.authentication || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Login/logout</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Case Changes</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(stats.eventsByCategory?.case_management || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Create/update/delete</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Today</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.recentActivity?.reduce((sum, h) => sum + h.count, 0) || 0}
                </div>
                <p className="text-xs text-muted-foreground">Events in last 24h</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="events">
          <TabsList>
            <TabsTrigger value="events">Event Log</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
          </TabsList>

          {/* Events Tab */}
          <TabsContent value="events" className="mt-6 space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-5">
                  <div className="space-y-2">
                    <Label>Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search events..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Event Type</Label>
                    <Select value={filters.eventType} onValueChange={(v) => setFilters({ ...filters, eventType: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {eventTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Actor</Label>
                    <Input
                      placeholder="Filter by user..."
                      value={filters.actor}
                      onChange={(e) => setFilters({ ...filters, actor: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>From Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {filters.dateFrom ? format(filters.dateFrom, "PP") : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={filters.dateFrom}
                          onSelect={(d) => setFilters({ ...filters, dateFrom: d })}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>To Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {filters.dateTo ? format(filters.dateTo, "PP") : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={filters.dateTo}
                          onSelect={(d) => setFilters({ ...filters, dateTo: d })}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {(filters.search || filters.eventType !== "all" || filters.actor || filters.dateFrom || filters.dateTo) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-4"
                    onClick={() => setFilters({ eventType: "all", actor: "", dateFrom: undefined, dateTo: undefined, search: "" })}
                  >
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Events Table */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Events ({filteredEvents.length.toLocaleString()})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-40">Timestamp</TableHead>
                        <TableHead className="w-40">Event Type</TableHead>
                        <TableHead>Actor</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead className="w-20">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            Loading events...
                          </TableCell>
                        </TableRow>
                      ) : filteredEvents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-lg font-medium">No Events Found</p>
                            <p className="text-muted-foreground">Adjust filters or check back later</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEvents.slice(0, 100).map((event) => (
                          <TableRow key={event.id}>
                            <TableCell className="text-sm">
                              <div>{new Date(event.timestamp).toLocaleDateString()}</div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(event.timestamp).toLocaleTimeString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getEventColor(event.eventType)}>
                                <span className="mr-1">{getEventIcon(event.eventType)}</span>
                                {event.eventType.replace(/_/g, " ")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span>{event.actor}</span>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-48 truncate">{event.action}</TableCell>
                            <TableCell>{event.target || "-"}</TableCell>
                            <TableCell>
                              {event.success ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Checks</CardTitle>
                <CardDescription>Automated compliance verification status</CardDescription>
              </CardHeader>
              <CardContent>
                {complianceChecks.length > 0 ? (
                  <div className="space-y-4">
                    {complianceChecks.map((check) => (
                      <div key={check.id} className="flex items-start justify-between p-4 rounded-lg border">
                        <div className="flex items-start gap-3">
                          {check.status === "pass" ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                          ) : check.status === "warning" ? (
                            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                          )}
                          <div>
                            <p className="font-medium">{check.name}</p>
                            <p className="text-sm text-muted-foreground">{check.description}</p>
                            {check.details && (
                              <p className="text-sm mt-1">{check.details}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={check.status === "pass" ? "default" : check.status === "warning" ? "secondary" : "destructive"}
                          >
                            {check.status.toUpperCase()}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            Last: {new Date(check.lastChecked).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No Compliance Checks</p>
                    <p className="text-muted-foreground">Compliance checks will appear here</p>
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
