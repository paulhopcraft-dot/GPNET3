import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileItem {
  label: string;
  value: string;
  highlight?: boolean;
  severity?: "normal" | "warning" | "critical";
}

interface ProfileSection {
  title: string;
  items: ProfileItem[];
  severity?: "normal" | "warning" | "critical";
}

interface WorkerProfileData {
  caseId: string;
  profile: {
    workerName: string;
    company: string;
    daysSinceInjury: number;
    aiSummary: string | null;
    recommendations: string[];
  };
  sections: ProfileSection[];
  statusLine: string;
}

interface WorkerProfileCardProps {
  caseId: string;
  compact?: boolean;
}

export function WorkerProfileCard({ caseId, compact = false }: WorkerProfileCardProps) {
  const [data, setData] = useState<WorkerProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        const response = await fetch(`/api/cases/${caseId}/profile`);
        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }
        const profileData = await response.json();
        setData(profileData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    if (caseId) {
      fetchProfile();
    }
  }, [caseId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-4">
          <p className="text-red-500 text-sm">Error loading profile: {error}</p>
        </CardContent>
      </Card>
    );
  }

  const getSeverityColor = (severity?: "normal" | "warning" | "critical") => {
    switch (severity) {
      case "critical":
        return "text-red-600 bg-red-50";
      case "warning":
        return "text-amber-600 bg-amber-50";
      default:
        return "";
    }
  };

  const getSeverityBadge = (severity?: "normal" | "warning" | "critical") => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "warning":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (compact) {
    // Compact view for list items
    return (
      <Card className="hover:bg-gray-50 transition-colors">
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">{data.profile.workerName}</h3>
              <p className="text-sm text-gray-500">{data.profile.company}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">{data.statusLine}</p>
              <p className="text-xs text-gray-400">{data.profile.daysSinceInjury} days</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full profile view
  return (
    <div className="space-y-4">
      {/* Header with status line */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{data.profile.workerName}</CardTitle>
              <p className="text-sm text-gray-500">{data.profile.company}</p>
            </div>
            <Badge variant="outline" className="text-xs">
              {data.profile.daysSinceInjury} days since injury
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium text-gray-700">{data.statusLine}</p>
        </CardContent>
      </Card>

      {/* AI Summary if available */}
      {data.profile.aiSummary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">AI Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">{data.profile.aiSummary}</p>
          </CardContent>
        </Card>
      )}

      {/* Profile Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.sections.map((section, idx) => (
          <Card key={idx} className={section.severity === "critical" ? "border-red-200" : section.severity === "warning" ? "border-amber-200" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {section.title}
                {section.severity && section.severity !== "normal" && (
                  <Badge variant={getSeverityBadge(section.severity)} className="text-xs">
                    {section.severity}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-1">
                {section.items.map((item, itemIdx) => (
                  <div key={itemIdx} className={`flex justify-between text-sm py-1 ${item.severity ? getSeverityColor(item.severity) : ""} ${item.severity ? "px-2 rounded" : ""}`}>
                    <dt className="text-gray-500">{item.label}</dt>
                    <dd className={`font-medium ${item.highlight ? "text-blue-600" : ""}`}>
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recommendations */}
      {data.profile.recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recommended Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.profile.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-blue-500 font-medium">{idx + 1}.</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default WorkerProfileCard;
