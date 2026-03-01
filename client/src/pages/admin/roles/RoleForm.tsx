import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

const roleSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

type RoleFormData = {
  name: string;
  description?: string;
  isActive: boolean;
};

interface JobRole {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  dutyCount: number;
  createdAt: string;
}

export default function RoleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditing = Boolean(id);

  const { data: roleData, isLoading: roleLoading } = useQuery<{ data: JobRole }>({
    queryKey: ["/api/admin/roles", id],
    enabled: isEditing,
  });

  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (roleData?.data) {
      const role = roleData.data;
      form.reset({
        name: role.name,
        description: role.description || "",
        isActive: role.isActive,
      });
    }
  }, [roleData, form]);

  const createMutation = useMutation({
    mutationFn: async (data: RoleFormData) => {
      const response = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create role");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Role created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      navigate("/admin/roles");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: RoleFormData) => {
      const response = await fetch(`/api/admin/roles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update role");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Role updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      navigate("/admin/roles");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RoleFormData) => {
    // Clean up empty strings
    const cleanData = {
      ...data,
      description: data.description || null,
    };

    if (isEditing) {
      updateMutation.mutate(cleanData as RoleFormData);
    } else {
      createMutation.mutate(cleanData as RoleFormData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isEditing && roleLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => navigate("/admin/roles")}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Roles
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Role" : "Add New Role"}</CardTitle>
          <CardDescription>
            {isEditing
              ? "Update role details and settings"
              : "Create a new job role for RTW planning"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
            {/* Role Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Role Name *</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Enter role name (e.g., Warehouse Worker, Office Administrator)"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...form.register("description")}
                placeholder="Describe the role and its typical responsibilities"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Optional. Provide additional context about this role.
              </p>
              {form.formState.errors.description && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between border-t pt-6">
              <div>
                <Label htmlFor="isActive">Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  Inactive roles are hidden from RTW planning
                </p>
              </div>
              <Switch
                id="isActive"
                checked={form.watch("isActive")}
                onCheckedChange={(checked) => form.setValue("isActive", checked)}
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-4 border-t">
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isEditing ? "Save Changes" : "Create Role"}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/admin/roles")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
