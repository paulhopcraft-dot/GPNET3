import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Search, Activity, Users, CheckCircle, AlertCircle } from "lucide-react";

interface PreEmploymentAssessment {
  id: string;
  candidateName: string;
  positionTitle: string;
  assessmentType: string;
  status: "pending" | "scheduled" | "in_progress" | "completed" | "failed" | "cancelled";
  clearanceLevel?: "cleared_unconditional" | "cleared_conditional" | "cleared_with_restrictions" | "not_cleared" | "pending_review";
  scheduledDate?: string;
  completedDate?: string;
  createdAt: string;
}

interface DashboardStats {
  totalAssessments: number;
  pendingAssessments: number;
  completedAssessments: number;
  clearedCandidates: number;
  rejectedCandidates: number;
  assessmentsByType: Record<string, number>;
  clearanceLevelBreakdown: Record<string, number>;
}

export default function PreEmploymentPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch dashboard stats
  const { data: dashboardStats } = useQuery<{ stats: DashboardStats }>({
    queryKey: ["pre-employment-dashboard"],
    queryFn: async () => {
      const response = await fetch("/api/pre-employment/dashboard");
      if (!response.ok) throw new Error("Failed to fetch dashboard stats");
      return response.json();
    }
  });

  // Fetch assessments
  const { data: assessments, refetch } = useQuery<{ assessments: PreEmploymentAssessment[] }>({
    queryKey: ["pre-employment-assessments", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);

      const response = await fetch(`/api/pre-employment/assessments?${params}`);
      if (!response.ok) throw new Error("Failed to fetch assessments");
      return response.json();
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "in_progress": return "bg-blue-100 text-blue-800 border-blue-200";
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "failed": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getClearanceColor = (clearance?: string) => {
    switch (clearance) {
      case "cleared_unconditional": return "bg-green-100 text-green-800 border-green-200";
      case "cleared_conditional": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "cleared_with_restrictions": return "bg-orange-100 text-orange-800 border-orange-200";
      case "not_cleared": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString();
  };

  const filteredAssessments = assessments?.assessments?.filter(assessment =>
    assessment.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assessment.positionTitle.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pre-Employment Health Checks</h1>
          <p className="text-gray-600 mt-2">Manage health assessments for new candidates</p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="w-4 h-4 mr-2" />
              New Assessment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Assessment</DialogTitle>
              <DialogDescription>
                Schedule a health assessment for a new candidate
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="candidateName">Candidate Name</Label>
                <Input id="candidateName" placeholder="John Smith" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position Title</Label>
                <Input id="position" placeholder="Software Engineer" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assessmentType">Assessment Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baseline_health">Baseline Health</SelectItem>
                    <SelectItem value="functional_capacity">Functional Capacity</SelectItem>
                    <SelectItem value="medical_screening">Medical Screening</SelectItem>
                    <SelectItem value="fitness_for_duty">Fitness for Duty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full">Create Assessment</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Dashboard Stats */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{dashboardStats.stats.totalAssessments}</p>
                  <p className="text-sm text-gray-600">Total Assessments</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold">{dashboardStats.stats.pendingAssessments}</p>
                  <p className="text-sm text-gray-600">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{dashboardStats.stats.completedAssessments}</p>
                  <p className="text-sm text-gray-600">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{dashboardStats.stats.clearedCandidates}</p>
                  <p className="text-sm text-gray-600">Cleared</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-2xl font-bold">{dashboardStats.stats.rejectedCandidates}</p>
                  <p className="text-sm text-gray-600">Not Cleared</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by candidate name or position..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assessments List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Assessments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredAssessments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No assessments found</p>
              </div>
            ) : (
              filteredAssessments.map((assessment) => (
                <div
                  key={assessment.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-gray-900">
                        {assessment.candidateName}
                      </h3>
                      <p className="text-sm text-gray-600">{assessment.positionTitle}</p>
                      <p className="text-sm text-gray-500">
                        {assessment.assessmentType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>Created: {formatDate(assessment.createdAt)}</span>
                        {assessment.scheduledDate && (
                          <span>• Scheduled: {formatDate(assessment.scheduledDate)}</span>
                        )}
                        {assessment.completedDate && (
                          <span>• Completed: {formatDate(assessment.completedDate)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-2">
                      <Badge className={getStatusColor(assessment.status)}>
                        {assessment.status.replace(/_/g, " ")}
                      </Badge>

                      {assessment.clearanceLevel && (
                        <Badge className={getClearanceColor(assessment.clearanceLevel)}>
                          {assessment.clearanceLevel.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}