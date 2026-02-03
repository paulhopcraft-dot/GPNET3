import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  Shield,
  Heart,
  Stethoscope,
  Brain,
  FileText,
  Search,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types for employee lifecycle data
interface EmployeeLifecycle {
  id: string;
  employeeName: string;
  positionTitle: string;
  department: string;
  hireDate: string;
  currentStage: 'pre_employment' | 'employment' | 'exit_processing' | 'exited';
  stages: {
    preEmployment: LifecycleStage;
    prevention: LifecycleStage;
    wellbeing: LifecycleStage;
    injury: LifecycleStage;
    mentalHealth: LifecycleStage;
    exit: LifecycleStage;
  };
  riskScore: number;
  lastUpdated: string;
}

interface LifecycleStage {
  status: 'completed' | 'active' | 'scheduled' | 'overdue' | 'not_applicable';
  completedDate?: string;
  dueDate?: string;
  riskLevel: 'low' | 'medium' | 'high';
  notes?: string;
  actionRequired?: boolean;
}

// Fetch employee lifecycle data from pre-employment assessments and existing cases
const fetchEmployeeLifecycleData = async (): Promise<EmployeeLifecycle[]> => {
  try {
    // Fetch pre-employment assessments
    const assessmentsResponse = await fetch('/api/pre-employment/assessments', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const assessmentsData = await assessmentsResponse.json();

    // Fetch existing worker cases for employment stage data
    const casesResponse = await fetch('/api/gpnet2/cases', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const casesData = await casesResponse.json();

    // Convert pre-employment assessments to lifecycle format
    const assessmentLifecycles = assessmentsData.assessments?.map((assessment: any) => ({
      id: assessment.id,
      employeeName: assessment.candidateName,
      positionTitle: assessment.positionTitle,
      department: assessment.department,
      hireDate: assessment.completedAt,
      currentStage: 'pre_employment',
      stages: {
        preEmployment: {
          status: assessment.status === 'completed' ? 'completed' : 'active',
          completedDate: assessment.completedAt,
          riskLevel: assessment.riskScore <= 3 ? 'low' : assessment.riskScore <= 7 ? 'medium' : 'high',
          notes: assessment.clearanceLevel === 'cleared' ? 'Health assessment cleared' : 'Requires review'
        },
        prevention: {
          status: 'scheduled',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
          riskLevel: assessment.riskScore <= 3 ? 'low' : assessment.riskScore <= 7 ? 'medium' : 'high'
        },
        wellbeing: {
          status: 'scheduled',
          dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days
          riskLevel: 'low'
        },
        injury: {
          status: 'not_applicable',
          riskLevel: 'low'
        },
        mentalHealth: {
          status: 'scheduled',
          dueDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months
          riskLevel: 'low'
        },
        exit: {
          status: 'not_applicable',
          riskLevel: 'low'
        }
      },
      riskScore: assessment.riskScore * 10, // Convert to percentage
      lastUpdated: assessment.updatedAt || assessment.createdAt
    })) || [];

    // Convert existing worker cases to lifecycle format (employment stage)
    const casesLifecycles = casesData.cases?.map((workerCase: any) => ({
      id: `case-${workerCase.id}`,
      employeeName: workerCase.workerName,
      positionTitle: workerCase.jobTitle || 'Not specified',
      department: workerCase.organization?.name || 'Unknown',
      hireDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Assume hired a year ago
      currentStage: 'employment',
      stages: {
        preEmployment: {
          status: 'completed',
          completedDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          riskLevel: 'low'
        },
        prevention: {
          status: 'completed',
          completedDate: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          riskLevel: 'medium'
        },
        wellbeing: {
          status: 'active',
          riskLevel: 'medium'
        },
        injury: {
          status: workerCase.status === 'Open' ? 'active' : 'completed',
          completedDate: workerCase.status === 'Closed' ? workerCase.updatedAt : undefined,
          riskLevel: workerCase.priority === 'High' ? 'high' : workerCase.priority === 'Medium' ? 'medium' : 'low',
          notes: `WorkCover case: ${workerCase.injuryType}`,
          actionRequired: workerCase.status === 'Open'
        },
        mentalHealth: {
          status: 'scheduled',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          riskLevel: 'low'
        },
        exit: {
          status: 'not_applicable',
          riskLevel: 'low'
        }
      },
      riskScore: workerCase.priority === 'High' ? 85 : workerCase.priority === 'Medium' ? 60 : 35,
      lastUpdated: workerCase.updatedAt
    })) || [];

    return [...assessmentLifecycles, ...casesLifecycles];
  } catch (error) {
    console.error('Error fetching employee lifecycle data:', error);
    return mockEmployeeData; // Fallback to mock data
  }
};

// Mock data for development (fallback)
const mockEmployeeData: EmployeeLifecycle[] = [
  {
    id: "emp-001",
    employeeName: "Sarah Chen",
    positionTitle: "Warehouse Supervisor",
    department: "Operations",
    hireDate: "2026-01-15",
    currentStage: "employment",
    stages: {
      preEmployment: {
        status: "completed",
        completedDate: "2026-01-20",
        riskLevel: "low"
      },
      prevention: {
        status: "completed",
        completedDate: "2026-01-25",
        riskLevel: "low"
      },
      wellbeing: {
        status: "scheduled",
        dueDate: "2026-06-15",
        riskLevel: "medium"
      },
      injury: {
        status: "active",
        riskLevel: "high",
        notes: "Back strain - RTW planning",
        actionRequired: true
      },
      mentalHealth: {
        status: "scheduled",
        dueDate: "2026-12-01",
        riskLevel: "low"
      },
      exit: {
        status: "not_applicable",
        riskLevel: "low"
      }
    },
    riskScore: 67,
    lastUpdated: "2026-02-03"
  },
  {
    id: "emp-002",
    employeeName: "Alex Rodriguez",
    positionTitle: "Forklift Operator",
    department: "Logistics",
    hireDate: "2026-02-01",
    currentStage: "employment",
    stages: {
      preEmployment: {
        status: "completed",
        completedDate: "2026-02-05",
        riskLevel: "low"
      },
      prevention: {
        status: "completed",
        completedDate: "2026-02-10",
        riskLevel: "low"
      },
      wellbeing: {
        status: "scheduled",
        dueDate: "2026-08-01",
        riskLevel: "low"
      },
      injury: {
        status: "not_applicable",
        riskLevel: "low"
      },
      mentalHealth: {
        status: "scheduled",
        dueDate: "2026-12-15",
        riskLevel: "low"
      },
      exit: {
        status: "not_applicable",
        riskLevel: "low"
      }
    },
    riskScore: 23,
    lastUpdated: "2026-02-03"
  }
];

const getStageIcon = (stage: keyof EmployeeLifecycle['stages']) => {
  const icons = {
    preEmployment: Users,
    prevention: Shield,
    wellbeing: Heart,
    injury: Stethoscope,
    mentalHealth: Brain,
    exit: FileText
  };
  return icons[stage];
};

const getStageTitle = (stage: keyof EmployeeLifecycle['stages']) => {
  const titles = {
    preEmployment: "New Starter",
    prevention: "Prevention Check",
    wellbeing: "Wellbeing Check",
    injury: "Injury Management",
    mentalHealth: "Mental Health",
    exit: "Exit Documentation"
  };
  return titles[stage];
};

const getStatusColor = (status: LifecycleStage['status']) => {
  const colors = {
    completed: "bg-green-500 text-white",
    active: "bg-red-500 text-white",
    scheduled: "bg-blue-500 text-white",
    overdue: "bg-orange-500 text-white",
    not_applicable: "bg-gray-300 text-gray-700"
  };
  return colors[status];
};

const getRiskColor = (riskLevel: LifecycleStage['riskLevel']) => {
  const colors = {
    low: "text-green-600",
    medium: "text-yellow-600",
    high: "text-red-600"
  };
  return colors[riskLevel];
};

export default function LifecycleDashboard() {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeLifecycle | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [newCandidateName, setNewCandidateName] = useState<string>("");

  // Check for assessment completion message from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const assessmentCompleted = urlParams.get('assessment');
    const candidateName = urlParams.get('candidate');

    if (assessmentCompleted === 'completed' && candidateName) {
      setShowSuccessMessage(true);
      setNewCandidateName(candidateName);

      // Clear success message after 10 seconds
      setTimeout(() => setShowSuccessMessage(false), 10000);

      // Clean URL parameters
      window.history.replaceState({}, '', '/lifecycle');
    }
  }, [location]);

  // TODO: Replace with actual API call
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employee-lifecycles'],
    queryFn: fetchEmployeeLifecycleData,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000 // 1 minute
  });

  const filteredEmployees = employees.filter(employee =>
    employee.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.positionTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const portfolioStats = {
    totalEmployees: employees.length,
    highRisk: employees.filter(e => e.riskScore > 60).length,
    activeIssues: employees.filter(e =>
      Object.values(e.stages).some(stage => stage.status === 'active' && stage.actionRequired)
    ).length,
    averageRisk: Math.round(employees.reduce((sum, e) => sum + e.riskScore, 0) / employees.length)
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Success Message */}
      {showSuccessMessage && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Assessment Complete!</strong> Pre-employment health screening for{" "}
            <strong>{newCandidateName}</strong> has been successfully submitted and processed.
            They will appear in the New Starter stage below.
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Employee Health Lifecycle</h1>
          <p className="text-muted-foreground">Complete health journey from hire to retire</p>
        </div>
        <Button>
          <Users className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </div>

      {/* Portfolio Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{portfolioStats.totalEmployees}</p>
                <p className="text-xs text-muted-foreground">Total Employees</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{portfolioStats.highRisk}</p>
                <p className="text-xs text-muted-foreground">High Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Stethoscope className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{portfolioStats.activeIssues}</p>
                <p className="text-xs text-muted-foreground">Active Issues</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{portfolioStats.averageRisk}%</p>
                <p className="text-xs text-muted-foreground">Avg Risk Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search employees..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Employee List with Timeline */}
      <div className="space-y-4">
        {filteredEmployees.map((employee) => (
          <Card key={employee.id} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedEmployee(employee)}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{employee.employeeName}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {employee.positionTitle} • {employee.department}
                  </p>
                </div>
                <div className="text-right">
                  <div className={cn("text-lg font-semibold",
                    employee.riskScore > 60 ? "text-red-600" :
                    employee.riskScore > 30 ? "text-yellow-600" : "text-green-600")}>
                    {employee.riskScore}% Risk
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Hired: {new Date(employee.hireDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Timeline visualization */}
              <div className="relative">
                <div className="flex items-center justify-between space-x-2 mb-4">
                  {Object.entries(employee.stages).map(([stageKey, stage], index) => {
                    const Icon = getStageIcon(stageKey as keyof EmployeeLifecycle['stages']);
                    const isCompleted = stage.status === 'completed';
                    const isActive = stage.status === 'active';
                    const isScheduled = stage.status === 'scheduled';
                    const isOverdue = stage.status === 'overdue';

                    return (
                      <div key={stageKey} className="flex flex-col items-center flex-1">
                        {/* Timeline connector line */}
                        {index > 0 && (
                          <div className={cn(
                            "absolute top-6 h-0.5 w-full -translate-y-1/2",
                            isCompleted || employee.stages[Object.keys(employee.stages)[index-1] as keyof EmployeeLifecycle['stages']].status === 'completed'
                              ? "bg-green-300" : "bg-gray-200"
                          )}
                          style={{
                            left: `${(index-1) * (100/(Object.keys(employee.stages).length-1))}%`,
                            width: `${100/(Object.keys(employee.stages).length-1)}%`
                          }} />
                        )}

                        {/* Stage circle */}
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center border-2 relative z-10",
                          isCompleted && "bg-green-500 border-green-500 text-white",
                          isActive && "bg-red-500 border-red-500 text-white",
                          isScheduled && "bg-blue-500 border-blue-500 text-white",
                          isOverdue && "bg-orange-500 border-orange-500 text-white",
                          stage.status === 'not_applicable' && "bg-gray-200 border-gray-300 text-gray-600"
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>

                        {/* Stage info */}
                        <div className="text-center mt-2">
                          <p className="text-xs font-medium">
                            {getStageTitle(stageKey as keyof EmployeeLifecycle['stages'])}
                          </p>
                          <Badge
                            variant="secondary"
                            className={cn("mt-1 text-xs", getStatusColor(stage.status))}
                          >
                            {stage.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                          {stage.actionRequired && (
                            <div className="text-xs text-red-600 font-medium mt-1">
                              ACTION REQUIRED
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Risk trend */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Health Journey Progress</span>
                  <span>Last updated: {new Date(employee.lastUpdated).toLocaleDateString()}</span>
                </div>
                <Progress
                  value={75} // TODO: Calculate based on completed stages
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Employee Detail Modal/Panel - placeholder for future implementation */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{selectedEmployee.employeeName} - Detailed View</CardTitle>
                <Button variant="outline" onClick={() => setSelectedEmployee(null)}>
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Detailed employee lifecycle view will be implemented here with:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Individual stage details and history</li>
                <li>Risk assessment breakdown</li>
                <li>Action items and next steps</li>
                <li>Document upload/viewing</li>
                <li>Communication timeline</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}