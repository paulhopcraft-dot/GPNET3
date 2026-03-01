import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Building2, Save, Loader2, ArrowLeft, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { LogoUpload } from "@/components/LogoUpload";

const profileSchema = z.object({
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface OrganizationProfile {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  insurerId: string | null;
  insurerName: string | null;
  isActive: boolean;
}

export default function CompanySettings() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<{ data: OrganizationProfile }>({
    queryKey: ["/api/organization/profile"],
  });

  const profile = data?.data;

  // Update logoUrl when profile loads
  useEffect(() => {
    if (profile?.logoUrl) {
      setLogoUrl(profile.logoUrl);
    }
  }, [profile?.logoUrl]);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      contactName: "",
      contactPhone: "",
    },
  });

  // Populate form when data loads
  useEffect(() => {
    if (profile) {
      form.reset({
        contactName: profile.contactName || "",
        contactPhone: profile.contactPhone || "",
      });
    }
  }, [profile, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await fetch("/api/organization/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update profile");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Profile updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/organization/profile"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateMutation.mutate(data);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Unable to load profile</h3>
          <p className="text-muted-foreground">
            There was an error loading your company profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Company Header Card */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <Avatar className="h-16 w-16">
                    {logoUrl ? (
                      <AvatarImage src={logoUrl} alt={profile.name} />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-primary text-xl">
                      {getInitials(profile.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold">{profile.name}</h1>
                    <p className="text-muted-foreground">{profile.slug}</p>
                  </div>
                  <Badge
                    variant={profile.isActive ? "default" : "secondary"}
                    className={
                      profile.isActive
                        ? "bg-green-100 text-green-700 hover:bg-green-100"
                        : ""
                    }
                  >
                    {profile.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {profile.insurerName && (
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline">{profile.insurerName}</Badge>
                  </div>
                )}

                {/* Logo Upload */}
                <div className="border-t pt-4">
                  <Label className="mb-2 block">Company Logo</Label>
                  <LogoUpload
                    currentLogoUrl={logoUrl}
                    organizationName={profile.name}
                    uploadUrl="/api/organization/logo"
                    onUploadSuccess={(newLogoUrl) => {
                      setLogoUrl(newLogoUrl);
                      queryClient.invalidateQueries({ queryKey: ["/api/organization/profile"] });
                      toast({ title: "Logo uploaded successfully" });
                    }}
                    onUploadError={(error) => {
                      toast({
                        title: "Upload failed",
                        description: error,
                        variant: "destructive",
                      });
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information Form */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>
              Update your company's contact details. These will be used for
              communications related to worker cases.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact Name</Label>
                  <Input
                    id="contactName"
                    {...form.register("contactName")}
                    placeholder="John Smith"
                  />
                  <p className="text-xs text-muted-foreground">
                    Primary contact for case communications
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Phone Number</Label>
                  <Input
                    id="contactPhone"
                    {...form.register("contactPhone")}
                    placeholder="03 9555 1234"
                  />
                  <p className="text-xs text-muted-foreground">
                    Best number to reach the contact
                  </p>
                </div>
              </div>

              {/* Read-only fields */}
              <div className="border-t pt-6 mt-6">
                <h3 className="text-sm font-medium mb-4 text-muted-foreground">
                  Read-only Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input value={profile.name} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Email</Label>
                    <Input value={profile.contactEmail || "-"} disabled />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Contact your administrator to update these fields
                </p>
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-4 border-t">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
