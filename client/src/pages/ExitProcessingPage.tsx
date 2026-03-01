import React from "react";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Heart,
  Shield,
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  Calendar
} from "lucide-react";

export default function ExitProcessingPage() {
  // Mock data for exit processing cases
  const exitCases = [
    {
      id: "1",
      employeeName: "Sarah Chen",
      department: "Engineering",
      exitDate: "2024-02-15",
      status: "pending_health_check",
      reason: "resignation",
      finalHealthCheckRequired: true,
      documentsCompleted: 3,
      totalDocuments: 5
    },
    {
      id: "2",
      employeeName: "Michael Torres",
      department: "Operations",
      exitDate: "2024-02-20",
      status: "health_check_complete",
      reason: "redundancy",
      finalHealthCheckRequired: true,
      documentsCompleted: 5,
      totalDocuments: 5
    },
    {
      id: "3",
      employeeName: "Lisa Wang",
      department: "Administration",
      exitDate: "2024-02-28",
      status: "pending_final_review",
      reason: "retirement",
      finalHealthCheckRequired: false,
      documentsCompleted: 2,
      totalDocuments: 3
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_health_check":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">
          <Clock className="h-3 w-3 mr-1" />
          Health Check Pending
        </Badge>;
      case "health_check_complete":
        return <Badge variant="outline" className="bg-green-50 text-green-800 border-green-300">
          <CheckCircle className="h-3 w-3 mr-1" />
          Health Check Complete
        </Badge>;
      case "pending_final_review":
        return <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-300">
          <Shield className="h-3 w-3 mr-1" />
          Final Review Pending
        </Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getReasonBadge = (reason: string) => {
    const colors = {
      resignation: "bg-blue-100 text-blue-800",
      redundancy: "bg-orange-100 text-orange-800",
      retirement: "bg-purple-100 text-purple-800",
      termination: "bg-red-100 text-red-800"
    };
    return (
      <Badge variant="secondary" className={colors[reason as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
        {reason.charAt(0).toUpperCase() + reason.slice(1)}
      </Badge>
    );
  };

  return (
    <PageLayout title="Exit Processing" subtitle="Employee departure health and compliance management">
      <div className="space-y-6">

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Exit Cases</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">2 requiring health checks</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Health Checks Pending</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1</div>
              <p className="text-xs text-muted-foreground">Due within 7 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documentation Complete</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">75%</div>
              <p className="text-xs text-muted-foreground">10 of 13 documents</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Liability Closure</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1</div>
              <p className="text-xs text-muted-foreground">Ready for closure</p>
            </CardContent>
          </Card>
        </div>

        {/* Exit Cases Table */}
        <Card>
          <CardHeader>
            <CardTitle>Exit Processing Cases</CardTitle>
            <CardDescription>
              Track employee departures, final health assessments, and compliance documentation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {exitCases.map((exitCase) => (
                <div key={exitCase.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="font-semibold">{exitCase.employeeName}</h3>
                      <span className="text-sm text-muted-foreground">{exitCase.department}</span>
                      {getStatusBadge(exitCase.status)}
                      {getReasonBadge(exitCase.reason)}
                    </div>

                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Exit Date: {exitCase.exitDate}
                      </div>

                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        Documents: {exitCase.documentsCompleted}/{exitCase.totalDocuments}
                      </div>

                      {exitCase.finalHealthCheckRequired && (
                        <div className="flex items-center gap-1">
                          <Heart className="h-4 w-4" />
                          Health Check Required
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                    {exitCase.status === "pending_final_review" && (
                      <Button size="sm">
                        Complete Exit
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Items */}
        <Card>
          <CardHeader>
            <CardTitle>Action Items</CardTitle>
            <CardDescription>Tasks requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div className="flex-1">
                  <p className="font-medium">Final health check required for Sarah Chen</p>
                  <p className="text-sm text-muted-foreground">Due: February 15, 2024</p>
                </div>
                <Button size="sm" variant="outline">
                  Schedule
                </Button>
              </div>

              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium">Complete exit documentation for Lisa Wang</p>
                  <p className="text-sm text-muted-foreground">1 document remaining</p>
                </div>
                <Button size="sm" variant="outline">
                  Complete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </PageLayout>
  );
}