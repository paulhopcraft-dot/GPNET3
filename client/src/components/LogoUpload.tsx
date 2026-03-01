import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Upload, X, Building2 } from "lucide-react";
import { fetchWithCsrf } from "../lib/queryClient";

interface LogoUploadProps {
  currentLogoUrl?: string | null;
  organizationName?: string;
  uploadUrl: string;
  onUploadSuccess: (logoUrl: string) => void;
  onUploadError?: (error: string) => void;
  size?: "sm" | "md" | "lg";
}

export function LogoUpload({
  currentLogoUrl,
  organizationName,
  uploadUrl,
  onUploadSuccess,
  onUploadError,
  size = "md",
}: LogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: "h-12 w-12",
    md: "h-20 w-20",
    lg: "h-32 w-32",
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      onUploadError?.("Invalid file type. Please upload JPEG, PNG, GIF, WebP, or SVG.");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      onUploadError?.("File too large. Maximum size is 5MB.");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);

      const response = await fetchWithCsrf(uploadUrl, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.data?.logoUrl) {
        onUploadSuccess(data.data.logoUrl);
        setPreviewUrl(null);
      } else {
        throw new Error(data.message || "Upload failed");
      }
    } catch (error) {
      console.error("Logo upload error:", error);
      onUploadError?.(error instanceof Error ? error.message : "Failed to upload logo");
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const clearPreview = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const displayUrl = previewUrl || currentLogoUrl;
  const initials = organizationName
    ? organizationName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "ORG";

  return (
    <div className="flex items-center gap-4">
      <Avatar className={sizeClasses[size]}>
        {displayUrl ? (
          <AvatarImage src={displayUrl} alt={organizationName || "Logo"} />
        ) : null}
        <AvatarFallback className="bg-muted">
          {currentLogoUrl ? (
            initials
          ) : (
            <Building2 className="h-1/2 w-1/2 text-muted-foreground" />
          )}
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={triggerFileInput}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm mr-1">
                  progress_activity
                </span>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-1" />
                {currentLogoUrl ? "Change Logo" : "Upload Logo"}
              </>
            )}
          </Button>

          {previewUrl && !isUploading && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearPreview}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          JPEG, PNG, GIF, WebP, or SVG. Max 5MB.
        </p>
      </div>
    </div>
  );
}
