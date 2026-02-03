import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Home,
  Users,
  Briefcase,
  FileText,
  Calendar,
  TrendingUp,
  Settings,
  HelpCircle,
  ChevronDown,
  Activity,
  Target,
  Heart,
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap,
  BarChart3,
  UserCheck,
  Building
} from "lucide-react";

interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  description: string;
  roles: string[];
  badge?: {
    text: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  };
  quickActions?: QuickAction[];
}

interface QuickAction {
  label: string;
  path: string;
  icon: React.ReactNode;
  description: string;
}

const navigationItems: NavigationItem[] = [
  {
    id: "workspace",
    label: "Case Workspace",
    path: "/workspace",
    icon: <Target className="w-4 h-4" />,
    description: "Unified case management with smart recommendations",
    roles: ["hr", "case_manager", "clinician"],
    badge: { text: "Smart", variant: "default" },
    quickActions: [
      {
        label: "High Priority Cases",
        path: "/workspace?filter=high-priority",
        icon: <AlertCircle className="w-3 h-3" />,
        description: "Cases requiring immediate attention"
      },
      {
        label: "RTW Planning",
        path: "/workspace?view=rtw",
        icon: <Briefcase className="w-3 h-3" />,
        description: "Return to work planning and monitoring"
      },
      {
        label: "Certificate Reviews",
        path: "/workspace?view=certificates",
        icon: <FileText className="w-3 h-3" />,
        description: "Medical certificate workflow management"
      }
    ]
  },
  {
    id: "cases",
    label: "All Cases",
    path: "/cases",
    icon: <Users className="w-4 h-4" />,
    description: "Complete case list and search",
    roles: ["hr", "case_manager", "clinician"],
    quickActions: [
      {
        label: "New Claim",
        path: "/claims/new",
        icon: <ClipboardList className="w-3 h-3" />,
        description: "Submit a new workers compensation claim"
      },
      {
        label: "Recent Cases",
        path: "/cases?sort=recent",
        icon: <Clock className="w-3 h-3" />,
        description: "Recently updated cases"
      }
    ]
  },
  {
    id: "employer",
    label: "Employer Portal",
    path: "/employer",
    icon: <Building className="w-4 h-4" />,
    description: "Employer-focused case management",
    roles: ["employer"],
    quickActions: [
      {
        label: "Report Injury",
        path: "/employer/new-case",
        icon: <AlertCircle className="w-3 h-3" />,
        description: "Report a new workplace injury"
      },
      {
        label: "My Workers",
        path: "/employer",
        icon: <UserCheck className="w-3 h-3" />,
        description: "Manage your workers' cases"
      }
    ]
  },
  {
    id: "analytics",
    label: "Analytics",
    path: "/analytics",
    icon: <BarChart3 className="w-4 h-4" />,
    description: "Case analytics and insights",
    roles: ["hr", "case_manager", "clinician"],
    quickActions: [
      {
        label: "Risk Dashboard",
        path: "/risk",
        icon: <TrendingUp className="w-3 h-3" />,
        description: "Risk analysis and predictions"
      },
      {
        label: "Reports",
        path: "/reports",
        icon: <FileText className="w-3 h-3" />,
        description: "Generate compliance reports"
      }
    ]
  },
  {
    id: "compliance",
    label: "Compliance",
    path: "/compliance",
    icon: <CheckCircle2 className="w-4 h-4" />,
    description: "Compliance monitoring and alerts",
    roles: ["hr", "case_manager"],
    badge: { text: "Auto", variant: "secondary" },
    quickActions: [
      {
        label: "Certificate Review",
        path: "/certificates/review",
        icon: <FileText className="w-3 h-3" />,
        description: "Review OCR-extracted certificates"
      },
      {
        label: "Audit Log",
        path: "/audit",
        icon: <Activity className="w-3 h-3" />,
        description: "View system audit trail"
      }
    ]
  }
];

export function SmartNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const userRole = user?.role || "hr"; // Default to hr if role not specified

  // Filter navigation items based on user role
  const availableItems = navigationItems.filter(item =>
    item.roles.includes(userRole)
  );

  // Determine current active item
  const currentItem = availableItems.find(item =>
    location.pathname.startsWith(item.path) ||
    (item.path === "/workspace" && location.pathname === "/")
  );

  const getContextualHelp = () => {
    if (location.pathname === "/workspace") {
      return "Your unified workspace provides smart recommendations and guided workflows for efficient case management.";
    }
    if (location.pathname.startsWith("/cases")) {
      return "Browse all cases, use filters to find specific workers, and access detailed case information.";
    }
    if (location.pathname.startsWith("/employer")) {
      return "Manage your organization's workers compensation cases and submit new injury reports.";
    }
    return currentItem?.description || "Navigate through the system using the menu above.";
  };

  return (
    <div className="border-b bg-white">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Main Navigation */}
        <div className="flex items-center gap-1">
          {availableItems.map((item) => {
            const isActive = currentItem?.id === item.id;

            return (
              <DropdownMenu key={item.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant={isActive ? "default" : "ghost"}
                        size="sm"
                        className="gap-2"
                      >
                        {item.icon}
                        {item.label}
                        {item.badge && (
                          <Badge variant={item.badge.variant} className="ml-1 text-xs">
                            {item.badge.text}
                          </Badge>
                        )}
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{item.description}</p>
                  </TooltipContent>
                </Tooltip>

                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuLabel>{item.label}</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => navigate(item.path)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-start gap-2">
                      {item.icon}
                      <div>
                        <div className="font-medium">Go to {item.label}</div>
                        <div className="text-xs text-gray-500">{item.description}</div>
                      </div>
                    </div>
                  </DropdownMenuItem>

                  {item.quickActions && item.quickActions.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs text-gray-500 uppercase">
                        Quick Actions
                      </DropdownMenuLabel>
                      {item.quickActions.map((action, index) => (
                        <DropdownMenuItem
                          key={index}
                          onClick={() => navigate(action.path)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-start gap-2">
                            {action.icon}
                            <div>
                              <div className="font-medium text-sm">{action.label}</div>
                              <div className="text-xs text-gray-500">{action.description}</div>
                            </div>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </div>

        {/* Context Help and Actions */}
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm">
                <HelpCircle className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-sm">
              <p>{getContextualHelp()}</p>
            </TooltipContent>
          </Tooltip>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/settings")}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Contextual Action Bar */}
      {currentItem?.id === "workspace" && (
        <div className="bg-blue-50 border-t px-6 py-2">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-blue-700">
              <Zap className="w-4 h-4" />
              <span className="font-medium">Smart Workspace Active</span>
            </div>
            <div className="text-blue-600">
              AI-powered recommendations and guided workflows are helping optimize your case management
            </div>
            <Button variant="outline" size="sm" className="ml-auto">
              <Target className="w-3 h-3 mr-1" />
              View Smart Actions
            </Button>
          </div>
        </div>
      )}

      {/* Role-specific guidance */}
      {userRole === "employer" && location.pathname.startsWith("/employer") && (
        <div className="bg-green-50 border-t px-6 py-2">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-green-700">
              <Building className="w-4 h-4" />
              <span className="font-medium">Employer Portal</span>
            </div>
            <div className="text-green-600">
              Manage your workers' cases, report new injuries, and track return-to-work progress
            </div>
          </div>
        </div>
      )}
    </div>
  );
}