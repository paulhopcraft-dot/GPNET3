import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ArrowLeft, Save, Loader2, X } from "lucide-react";
import { DemandMatrix } from "@/components/DemandMatrix";

type DemandFrequency = "never" | "occasionally" | "frequently" | "constantly";

const dutySchema = z.object({
  name: z.string().min(1, "Duty name is required"),
  description: z.string().optional(),
  isModifiable: z.boolean().default(false),
  riskFlags: z.array(z.string()).default([]),
  demands: z.object({
    // Physical demands
    bending: z.string().default("never"),
    squatting: z.string().default("never"),
    kneeling: z.string().default("never"),
    twisting: z.string().default("never"),
    reachingOverhead: z.string().default("never"),
    reachingForward: z.string().default("never"),
    lifting: z.string().default("never"),
    liftingMaxKg: z.number().nullable().optional(),
    carrying: z.string().default("never"),
    carryingMaxKg: z.number().nullable().optional(),
    standing: z.string().default("never"),
    sitting: z.string().default("never"),
    walking: z.string().default("never"),
    repetitiveMovements: z.string().default("never"),
    // Cognitive demands
    concentration: z.string().default("never"),
    stressTolerance: z.string().default("never"),
    workPace: z.string().default("never"),
  }),
});

type DutyFormData = z.infer<typeof dutySchema>;

interface Duty {
  id: string;
  name: string;
  description: string | null;
  isModifiable: boolean;
  riskFlags: string[];
}

interface DutyDemands {
  bending: DemandFrequency;
  squatting: DemandFrequency;
  kneeling: DemandFrequency;
  twisting: DemandFrequency;
  reachingOverhead: DemandFrequency;
  reachingForward: DemandFrequency;
  lifting: DemandFrequency;
  liftingMaxKg: number | null;
  carrying: DemandFrequency;
  carryingMaxKg: number | null;
  standing: DemandFrequency;
  sitting: DemandFrequency;
  walking: DemandFrequency;
  repetitiveMovements: DemandFrequency;
  concentration: DemandFrequency;
  stressTolerance: DemandFrequency;
  workPace: DemandFrequency;
}

interface JobRole {
  id: string;
  name: string;
}

const RISK_FLAG_SUGGESTIONS = [
  "Lifting Hazard",
  "Fall Risk",
  "Repetitive Strain",
  "Hearing Protection Required",
  "Chemical Exposure",
  "Working at Heights",
  "Confined Space",
  "Heavy Machinery",
  "Manual Handling",
  "PPE Required",
];

export default function DutyForm() {
  const { roleId, dutyId } = useParams<{ roleId: string; dutyId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditing = Boolean(dutyId);
  const [newRiskFlag, setNewRiskFlag] = useState("");

  // Fetch role data
  const { data: roleData } = useQuery<{ data: JobRole }>({
    queryKey: [`/api/admin/roles/${roleId}`],
    enabled: !!roleId,
  });

  const role = roleData?.data;

  // Fetch existing duty in edit mode
  const { data: dutyData, isLoading: dutyLoading } = useQuery<{
    data: { duty: Duty; demands: DutyDemands };
  }>({
    queryKey: [`/api/admin/duties/${dutyId}`],
    enabled: isEditing,
  });

  const form = useForm<DutyFormData>({
    resolver: zodResolver(dutySchema) as any,
    defaultValues: {
      name: "",
      description: "",
      isModifiable: false,
      riskFlags: [],
      demands: {
        bending: "never",
        squatting: "never",
        kneeling: "never",
        twisting: "never",
        reachingOverhead: "never",
        reachingForward: "never",
        lifting: "never",
        liftingMaxKg: null,
        carrying: "never",
        carryingMaxKg: null,
        standing: "never",
        sitting: "never",
        walking: "never",
        repetitiveMovements: "never",
        concentration: "never",
        stressTolerance: "never",
        workPace: "never",
      },
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (dutyData?.data) {
      const { duty, demands } = dutyData.data;
      form.reset({
        name: duty.name,
        description: duty.description || "",
        isModifiable: duty.isModifiable,
        riskFlags: duty.riskFlags || [],
        demands: {
          bending: demands.bending || "never",
          squatting: demands.squatting || "never",
          kneeling: demands.kneeling || "never",
          twisting: demands.twisting || "never",
          reachingOverhead: demands.reachingOverhead || "never",
          reachingForward: demands.reachingForward || "never",
          lifting: demands.lifting || "never",
          liftingMaxKg: demands.liftingMaxKg,
          carrying: demands.carrying || "never",
          carryingMaxKg: demands.carryingMaxKg,
          standing: demands.standing || "never",
          sitting: demands.sitting || "never",
          walking: demands.walking || "never",
          repetitiveMovements: demands.repetitiveMovements || "never",
          concentration: demands.concentration || "never",
          stressTolerance: demands.stressTolerance || "never",
          workPace: demands.workPace || "never",
        },
      });
    }
  }, [dutyData, form]);

  const createMutation = useMutation({
    mutationFn: async (data: DutyFormData) => {
      const response = await fetch("/api/admin/duties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          roleId,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create duty");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Duty created successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/duties/role/${roleId}`] });
      navigate(`/admin/roles/${roleId}/duties`);
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
    mutationFn: async (data: DutyFormData) => {
      const response = await fetch(`/api/admin/duties/${dutyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update duty");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Duty updated successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/duties/role/${roleId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/duties/${dutyId}`] });
      navigate(`/admin/roles/${roleId}/duties`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DutyFormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const addRiskFlag = (flag: string) => {
    const currentFlags = form.watch("riskFlags");
    if (!currentFlags.includes(flag)) {
      form.setValue("riskFlags", [...currentFlags, flag]);
    }
    setNewRiskFlag("");
  };

  const removeRiskFlag = (flag: string) => {
    const currentFlags = form.watch("riskFlags");
    form.setValue(
      "riskFlags",
      currentFlags.filter((f) => f !== flag)
    );
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isEditing && dutyLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => navigate(`/admin/roles/${roleId}/duties`)}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Duties
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>
            {isEditing ? "Edit Duty" : "Add New Duty"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? `Update duty details and demands for ${role?.name || "role"}`
              : `Create a new duty for ${role?.name || "role"}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-8">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Basic Information</h3>

              <div className="space-y-2">
                <Label htmlFor="name">Duty Name *</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="e.g., Operating forklift, Stocking shelves"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder="Optional description of the duty"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between border rounded-md p-4">
                <div>
                  <Label htmlFor="isModifiable">Modifiable Duty</Label>
                  <p className="text-sm text-muted-foreground">
                    Can this duty be modified to accommodate restrictions?
                  </p>
                </div>
                <Switch
                  id="isModifiable"
                  checked={form.watch("isModifiable")}
                  onCheckedChange={(checked) => form.setValue("isModifiable", checked)}
                />
              </div>
            </div>

            {/* Risk Flags */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Risk Flags</h3>
              <p className="text-sm text-muted-foreground">
                Identify potential hazards or requirements for this duty
              </p>

              <div className="flex flex-wrap gap-2 min-h-[40px] border rounded-md p-3">
                {form.watch("riskFlags").map((flag) => (
                  <Badge key={flag} variant="secondary" className="gap-1">
                    {flag}
                    <button
                      type="button"
                      onClick={() => removeRiskFlag(flag)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {form.watch("riskFlags").length === 0 && (
                  <span className="text-sm text-muted-foreground">
                    No risk flags added
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add custom risk flag"
                  value={newRiskFlag}
                  onChange={(e) => setNewRiskFlag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newRiskFlag.trim()) {
                        addRiskFlag(newRiskFlag.trim());
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (newRiskFlag.trim()) {
                      addRiskFlag(newRiskFlag.trim());
                    }
                  }}
                >
                  Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground mr-2">
                  Suggestions:
                </span>
                {RISK_FLAG_SUGGESTIONS.filter(
                  (s) => !form.watch("riskFlags").includes(s)
                ).map((suggestion) => (
                  <Badge
                    key={suggestion}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    onClick={() => addRiskFlag(suggestion)}
                  >
                    + {suggestion}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Demand Matrix */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-1">
                  Physical & Cognitive Demands
                </h3>
                <p className="text-sm text-muted-foreground">
                  Specify how often each demand is required for this duty
                </p>
              </div>

              <Controller
                control={form.control}
                name="demands"
                render={({ field }) => (
                  <DemandMatrix
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
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
                    {isEditing ? "Save Changes" : "Create Duty"}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/admin/roles/${roleId}/duties`)}
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
