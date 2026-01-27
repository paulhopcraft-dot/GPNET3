import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, Search, Pencil, Trash2, ListTodo, ArrowLeft, Copy } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface Duty {
  id: string;
  name: string;
  description: string | null;
  isModifiable: boolean;
  riskFlags: string[];
  demandCount: number;
  isActive: boolean;
}

interface JobRole {
  id: string;
  name: string;
}

export default function DutiesList() {
  const { roleId } = useParams<{ roleId: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [copyRoleName, setCopyRoleName] = useState("");
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch role data
  const { data: roleData } = useQuery<{ data: JobRole }>({
    queryKey: [`/api/admin/roles/${roleId}`],
    enabled: !!roleId,
  });

  const role = roleData?.data;

  // Fetch duties for this role
  const { data, isLoading, error } = useQuery<{ data: Duty[] }>({
    queryKey: [`/api/admin/duties/role/${roleId}`, { search }],
    enabled: !!roleId,
  });

  const duties = data?.data || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/duties/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete duty");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Duty deleted successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/duties/role/${roleId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Copy role mutation
  const copyRoleMutation = useMutation({
    mutationFn: async (newRoleName: string) => {
      const response = await fetch(`/api/admin/duties/role/${roleId}/copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newRoleName }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to copy role");
      }
      return response.json();
    },
    onSuccess: (result) => {
      toast({ title: "Role copied successfully" });
      setCopyDialogOpen(false);
      setCopyRoleName("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      // Navigate to the new role's duties page
      navigate(`/admin/roles/${result.data.roleId}/duties`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleCopyRole = () => {
    if (!copyRoleName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a role name",
        variant: "destructive",
      });
      return;
    }
    copyRoleMutation.mutate(copyRoleName);
  };

  const getDemandsSummary = (demandCount: number) => {
    if (demandCount === 0) return "No demands set";
    return `${demandCount} demand${demandCount === 1 ? "" : "s"} set`;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button
            variant="ghost"
            className="mb-2 -ml-2"
            onClick={() => navigate("/admin/roles")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Roles
          </Button>
          <h1 className="text-2xl font-bold">
            Duties for {role?.name || "Role"}
          </h1>
          <p className="text-muted-foreground">
            Manage duties and their physical/cognitive demand requirements
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Copy className="h-4 w-4 mr-2" />
                Copy Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Copy Role with Duties</DialogTitle>
                <DialogDescription>
                  Create a new role with all duties from "{role?.name}". Enter a name for the new role.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="newRoleName">New Role Name</Label>
                  <Input
                    id="newRoleName"
                    placeholder="e.g., Warehouse Worker - Night Shift"
                    value={copyRoleName}
                    onChange={(e) => setCopyRoleName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCopyDialogOpen(false);
                    setCopyRoleName("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCopyRole}
                  disabled={copyRoleMutation.isPending}
                >
                  {copyRoleMutation.isPending ? "Copying..." : "Copy Role"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Link to={`/admin/roles/${roleId}/duties/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Duty
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search duties..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {duties.length} {duties.length === 1 ? "duty" : "duties"}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading duties...
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              Error loading duties
            </div>
          ) : duties.length === 0 ? (
            <div className="text-center py-12">
              <ListTodo className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No duties yet</h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first duty for this role
              </p>
              <Link to={`/admin/roles/${roleId}/duties/new`}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Duty
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Name</TableHead>
                  <TableHead className="w-[120px]">Modifiable</TableHead>
                  <TableHead className="w-[200px]">Risk Flags</TableHead>
                  <TableHead>Demands Summary</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {duties.map((duty) => (
                  <TableRow key={duty.id}>
                    <TableCell>
                      <p className="font-medium">{duty.name}</p>
                      {duty.description && (
                        <p className="text-sm text-muted-foreground truncate max-w-xs">
                          {duty.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {duty.isModifiable ? (
                        <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {duty.riskFlags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {duty.riskFlags.slice(0, 2).map((flag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {flag}
                            </Badge>
                          ))}
                          {duty.riskFlags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{duty.riskFlags.length - 2} more
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {getDemandsSummary(duty.demandCount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link to={`/admin/roles/${roleId}/duties/${duty.id}`}>
                          <Button variant="ghost" size="sm">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Duty</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{duty.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(duty.id)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
