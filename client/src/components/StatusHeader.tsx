import { useState, useRef } from "react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { AlertCircle, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import type { WorkerCase } from "@shared/schema";

interface StatusHeaderProps {
  workerCase: WorkerCase;
  pendingActions?: Array<{
    id: string;
    type: string;
    notes?: string;
    dueDate?: string;
    status: string;
  }>;
  certificateStatus?: {
    status: "active" | "expiring_soon" | "expired" | "missing" | "invalid";
    message: string;
  };
}

export function StatusHeader({ workerCase, pendingActions = [], certificateStatus }: StatusHeaderProps) {
  const [showAllActions, setShowAllActions] = useState(false);
  const actionsListRef = useRef<HTMLUListElement>(null);

  // Determine overall case status based on certificate and actions
  const getOverallStatus = () => {
    if (certificateStatus?.status === "expired" || certificateStatus?.status === "missing") {
      return {
        level: "urgent" as const,
        icon: <AlertCircle className="w-5 h-5" />,
        label: "NEEDS ATTENTION",
        message: certificateStatus.message,
      };
    }

    if (certificateStatus?.status === "expiring_soon") {
      return {
        level: "warning" as const,
        icon: <Clock className="w-5 h-5" />,
        label: "ACTION REQUIRED",
        message: certificateStatus.message,
      };
    }

    if (pendingActions.length > 0) {
      return {
        level: "warning" as const,
        icon: <AlertTriangle className="w-5 h-5" />,
        label: "PENDING ACTIONS",
        message: `${pendingActions.length} action${pendingActions.length > 1 ? 's' : ''} pending`,
      };
    }

    return {
      level: "compliant" as const,
      icon: <CheckCircle className="w-5 h-5" />,
      label: "COMPLIANT",
      message: "All up to date",
    };
  };

  const status = getOverallStatus();

  const statusColors = {
    urgent: "bg-red-50 border-red-200",
    warning: "bg-amber-50 border-amber-200",
    compliant: "bg-emerald-50 border-emerald-200",
  };

  const statusBadgeColors = {
    urgent: "bg-red-600 text-white",
    warning: "bg-amber-600 text-white",
    compliant: "bg-emerald-600 text-white",
  };

  const statusTextColors = {
    urgent: "text-red-700",
    warning: "text-amber-700",
    compliant: "text-emerald-700",
  };

  return (
    <Card className={`border-2 ${statusColors[status.level]}`}>
      <CardContent className="p-6 space-y-4">
        {/* Status Badge */}
        <div className="flex items-center gap-3">
          <div className={statusTextColors[status.level]}>
            {status.icon}
          </div>
          <div className="flex-1">
            <Badge className={`${statusBadgeColors[status.level]} mb-1`}>
              {status.label}
            </Badge>
            <p className={`text-sm ${statusTextColors[status.level]}`}>
              {status.message}
            </p>
          </div>
        </div>

        {/* Pending Actions */}
        {pendingActions.length > 0 && (
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-gray-600 text-lg">checklist</span>
              <h3 className="font-semibold text-sm text-gray-900">
                NEXT ACTIONS ({pendingActions.length} pending)
              </h3>
            </div>
            <ul ref={actionsListRef} className="space-y-2">
              {(showAllActions ? pendingActions : pendingActions.slice(0, 3)).map((action, idx) => {
                const isOverdue = action.dueDate && new Date(action.dueDate) < new Date();
                const daysUntilDue = action.dueDate
                  ? Math.ceil((new Date(action.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  : null;

                return (
                  <li key={action.id} className="flex items-start gap-2 text-sm">
                    <span className="text-gray-600 font-medium">{idx + 1}.</span>
                    <div className="flex-1">
                      <span className="text-gray-900">{action.notes || action.type}</span>
                      {action.dueDate && (
                        <span className={`ml-2 text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                          {isOverdue
                            ? `(OVERDUE by ${Math.abs(daysUntilDue!)} day${Math.abs(daysUntilDue!) > 1 ? 's' : ''})`
                            : daysUntilDue === 0
                            ? '(DUE TODAY)'
                            : `(Due in ${daysUntilDue} day${daysUntilDue! > 1 ? 's' : ''})`
                          }
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
              {pendingActions.length > 3 && (
                <li>
                  <button
                    onClick={() => {
                      const newState = !showAllActions;
                      setShowAllActions(newState);
                      // Scroll actions into view when expanding
                      if (newState) {
                        setTimeout(() => {
                          actionsListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }, 50);
                      }
                    }}
                    className="text-sm text-primary hover:text-primary/80 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {showAllActions ? 'expand_less' : 'expand_more'}
                    </span>
                    {showAllActions
                      ? 'Show less'
                      : `+ ${pendingActions.length - 3} more action${pendingActions.length - 3 > 1 ? 's' : ''}`
                    }
                  </button>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Certificate Warning */}
        {certificateStatus && certificateStatus.status !== "active" && (
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-amber-600 text-lg">medical_information</span>
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-gray-900 mb-1">
                  CERTIFICATE STATUS
                </h3>
                <p className="text-sm text-gray-700">
                  {certificateStatus.message}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
