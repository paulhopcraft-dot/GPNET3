import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HelpCircle,
  BookOpen,
  Lightbulb,
  PlayCircle,
  CheckCircle,
  AlertTriangle,
  Info,
  Video,
  FileText,
  Users,
  Clock,
  Target,
  Zap,
  ChevronRight,
  X
} from "lucide-react";

interface HelpTopic {
  id: string;
  title: string;
  description: string;
  content: string;
  type: "guide" | "tip" | "video" | "documentation" | "workflow";
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedTime?: number;
  tags: string[];
  icon: React.ReactNode;
  actions?: HelpAction[];
  relatedTopics?: string[];
}

interface HelpAction {
  label: string;
  action: () => void;
  icon: React.ReactNode;
  type: "primary" | "secondary";
}

interface ContextualTip {
  id: string;
  trigger: string; // CSS selector or route pattern
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "tip";
  position: "top" | "bottom" | "left" | "right";
  showOnce?: boolean;
  delay?: number;
  condition?: () => boolean;
}

interface ContextualHelpSystemProps {
  mode?: "floating" | "embedded" | "popover";
  showTips?: boolean;
  userRole?: string;
}

// Contextual help content organized by routes and user roles
const helpTopics: Record<string, HelpTopic[]> = {
  "/workspace": [
    {
      id: "workspace-overview",
      title: "Case Management Workspace",
      description: "Your unified dashboard for managing all worker cases",
      content: `
The Case Management Workspace consolidates all your case information into one intelligent dashboard. Here you can:

**Smart Statistics**
- View critical metrics at a glance
- Identify cases needing immediate attention
- Track overall portfolio health

**Priority Actions**
- AI-powered recommendations for next steps
- Urgency-based prioritization
- Estimated time for each action

**Case Overview**
- Visual health scoring for each case
- Quick access to case details
- Filter and search capabilities

**Best Practices:**
- Check your workspace first thing each morning
- Address critical actions before routine tasks
- Use filters to focus on specific case types
      `,
      type: "guide",
      difficulty: "beginner",
      estimatedTime: 3,
      tags: ["workspace", "dashboard", "overview"],
      icon: <Target className="w-5 h-5" />,
      actions: [
        {
          label: "Take Workspace Tour",
          action: () => console.log("Starting workspace tour"),
          icon: <PlayCircle className="w-4 h-4" />,
          type: "primary"
        }
      ]
    },
    {
      id: "smart-actions",
      title: "Understanding Smart Actions",
      description: "How AI recommendations help prioritize your work",
      content: `
Smart Actions use AI to analyze your cases and recommend the most important next steps:

**Urgency Levels:**
- **Immediate**: Requires action within hours (red)
- **Today**: Should be completed today (orange)
- **This Week**: Can wait but shouldn't be delayed (yellow)
- **Routine**: Standard follow-up tasks (green)

**Categories:**
- **Medical**: Clinical reviews, assessments
- **RTW**: Return to work planning and monitoring
- **Compliance**: Legal and regulatory requirements
- **Administrative**: Documentation, communication

**How to Use:**
1. Start with immediate actions each day
2. Work through today's tasks before routine items
3. Click "Take Action" for guided workflows
4. Mark actions complete when finished

The system learns from your patterns to improve recommendations.
      `,
      type: "guide",
      difficulty: "intermediate",
      estimatedTime: 5,
      tags: ["actions", "ai", "prioritization"],
      icon: <Zap className="w-5 h-5" />
    },
    {
      id: "case-health-scoring",
      title: "Case Health Scoring",
      description: "Understanding how cases are assessed and prioritized",
      content: `
Each case receives a health score from 0-100 based on multiple factors:

**Scoring Factors:**
- Days off work (longer = lower score)
- Risk level classification
- Compliance indicators
- RTW plan status
- Medical certificate currency

**Health Levels:**
- **90-100**: Excellent - Case on track
- **70-89**: Good - Minor attention needed
- **50-69**: Attention - Multiple factors need review
- **30-49**: Urgent - Immediate intervention required
- **0-29**: Critical - Comprehensive review needed

**Next Actions:**
The system automatically suggests the most appropriate next action based on the case health assessment and current status.
      `,
      type: "guide",
      difficulty: "intermediate",
      estimatedTime: 4,
      tags: ["scoring", "assessment", "health"],
      icon: <CheckCircle className="w-5 h-5" />
    }
  ],
  "/cases": [
    {
      id: "case-filtering",
      title: "Finding Cases Efficiently",
      description: "Master the search and filter tools",
      content: `
Use filters and search to quickly find specific cases:

**Search Tips:**
- Search by worker name, company, or claim number
- Use partial names (e.g., "John" finds "John Smith")
- Search is case-insensitive

**Filter Options:**
- **Work Status**: At work vs Off work
- **Risk Level**: High, Medium, Low
- **RTW Status**: Plan status and progress

**Quick Filters:**
- Click column headers to sort
- Use view toggle for cards vs list
- Bookmark frequently used filter combinations

**Pro Tips:**
- Combine multiple filters for precise results
- Save time by using the "Recent Cases" shortcut
- Check the "High Priority" filter first each day
      `,
      type: "guide",
      difficulty: "beginner",
      estimatedTime: 3,
      tags: ["search", "filters", "navigation"],
      icon: <Users className="w-5 h-5" />
    }
  ],
  "/rtw": [
    {
      id: "rtw-planning-basics",
      title: "Return to Work Planning 101",
      description: "Essential guide to effective RTW planning",
      content: `
Creating effective RTW plans improves outcomes and reduces costs:

**Key Principles:**
1. **Early Intervention** - Start planning within 2 weeks
2. **Graduated Return** - Gradually increase hours/duties
3. **Stakeholder Coordination** - Include all parties
4. **Regular Reviews** - Monitor and adjust as needed

**Planning Process:**
1. Assess worker's current capacity
2. Identify suitable duties available
3. Create graduated timeline
4. Coordinate with stakeholders
5. Monitor and adjust plan

**Success Factors:**
- Clear communication with all parties
- Realistic and achievable goals
- Regular progress monitoring
- Flexibility to adjust as needed

Use the Smart Workflow Wizard to guide you through each step.
      `,
      type: "guide",
      difficulty: "intermediate",
      estimatedTime: 7,
      tags: ["rtw", "planning", "workflow"],
      icon: <Target className="w-5 h-5" />
    }
  ]
};

// Contextual tips that appear based on user behavior
const contextualTips: ContextualTip[] = [
  {
    id: "first-visit-workspace",
    trigger: "/workspace",
    title: "Welcome to your smart workspace!",
    message: "This unified dashboard shows all your cases with AI-powered recommendations. Check the Priority Actions tab for your most important tasks.",
    type: "info",
    position: "bottom",
    showOnce: true,
    delay: 1000
  },
  {
    id: "high-priority-cases",
    trigger: "[data-urgency='immediate']",
    title: "Critical action detected",
    message: "This case requires immediate attention. Click 'Take Action' for step-by-step guidance.",
    type: "warning",
    position: "left",
    delay: 500
  },
  {
    id: "case-health-low",
    trigger: "[data-health-level='urgent']",
    title: "Case needs intervention",
    message: "This case health score indicates multiple risk factors. Click to view detailed recommendations.",
    type: "warning",
    position: "top"
  },
  {
    id: "rtw-planning-overdue",
    trigger: "[data-rtw-status='not_planned']",
    title: "RTW planning opportunity",
    message: "This worker has been off work for several days without a RTW plan. Early planning improves outcomes.",
    type: "tip",
    position: "right"
  }
];

export function ContextualHelpSystem({
  mode = "floating",
  showTips = true,
  userRole = "case_manager"
}: ContextualHelpSystemProps) {
  const location = useLocation();
  const [activeTips, setActiveTips] = useState<ContextualTip[]>([]);
  const [dismissedTips, setDismissedTips] = useState<Set<string>>(new Set());
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);

  // Get relevant help topics for current route
  const currentTopics = helpTopics[location.pathname] || [];

  // Check for contextual tips
  useEffect(() => {
    if (!showTips) return;

    const checkTips = () => {
      const newActiveTips: ContextualTip[] = [];

      contextualTips.forEach(tip => {
        if (dismissedTips.has(tip.id)) return;

        // Check route-based triggers
        if (tip.trigger.startsWith('/') && location.pathname === tip.trigger) {
          newActiveTips.push(tip);
          return;
        }

        // Check element-based triggers
        if (!tip.trigger.startsWith('/')) {
          const elements = document.querySelectorAll(tip.trigger);
          if (elements.length > 0) {
            // Check condition if provided
            if (tip.condition && !tip.condition()) return;

            newActiveTips.push(tip);
          }
        }
      });

      setActiveTips(newActiveTips);
    };

    // Initial check
    checkTips();

    // Re-check when DOM changes
    const observer = new MutationObserver(checkTips);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [location.pathname, dismissedTips, showTips]);

  const dismissTip = useCallback((tipId: string) => {
    setDismissedTips(prev => new Set([...prev, tipId]));
    setActiveTips(prev => prev.filter(tip => tip.id !== tipId));
  }, []);

  const getTopicIcon = (type: string) => {
    switch (type) {
      case "guide": return <BookOpen className="w-4 h-4" />;
      case "tip": return <Lightbulb className="w-4 h-4" />;
      case "video": return <Video className="w-4 h-4" />;
      case "documentation": return <FileText className="w-4 h-4" />;
      case "workflow": return <PlayCircle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner": return "bg-green-100 text-green-700";
      case "intermediate": return "bg-yellow-100 text-yellow-700";
      case "advanced": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getTipIcon = (type: string) => {
    switch (type) {
      case "warning": return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case "success": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "tip": return <Lightbulb className="w-4 h-4 text-blue-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  // Floating help button
  if (mode === "floating") {
    return (
      <>
        {/* Floating Help Button */}
        <div className="fixed bottom-6 right-6 z-50">
          <Popover open={showHelpPanel} onOpenChange={setShowHelpPanel}>
            <PopoverTrigger asChild>
              <Button
                size="lg"
                className="rounded-full h-14 w-14 shadow-lg bg-blue-600 hover:bg-blue-700"
              >
                <HelpCircle className="w-6 h-6" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              side="left"
              align="end"
              className="w-80 p-0"
              sideOffset={10}
            >
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    Contextual Help
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {currentTopics.length > 0 ? (
                    currentTopics.map(topic => (
                      <div
                        key={topic.id}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setSelectedTopic(topic)}
                      >
                        <div className="flex items-start gap-3">
                          {getTopicIcon(topic.type)}
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{topic.title}</h4>
                            <p className="text-xs text-gray-600 mt-1">{topic.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge
                                variant="outline"
                                className={`text-xs ${getDifficultyColor(topic.difficulty)}`}
                              >
                                {topic.difficulty}
                              </Badge>
                              {topic.estimatedTime && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Clock className="w-3 h-3" />
                                  {topic.estimatedTime}min
                                </div>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <Info className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500">
                        No specific help topics for this page.
                      </p>
                      <Button variant="outline" size="sm" className="mt-2">
                        Browse All Topics
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </PopoverContent>
          </Popover>
        </div>

        {/* Active Contextual Tips */}
        {activeTips.map(tip => (
          <div
            key={tip.id}
            className={`fixed z-40 max-w-sm ${
              tip.position === 'top' ? 'top-20' :
              tip.position === 'bottom' ? 'bottom-20' :
              tip.position === 'left' ? 'left-6 top-1/2 -translate-y-1/2' :
              'right-6 top-1/2 -translate-y-1/2'
            }`}
            style={{
              animation: `slideIn${tip.position === 'left' ? 'Left' : tip.position === 'right' ? 'Right' : 'Up'} 0.3s ease-out`
            }}
          >
            <Alert className="shadow-lg border-l-4 border-l-blue-500">
              <div className="flex items-start gap-3">
                {getTipIcon(tip.type)}
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{tip.title}</h4>
                  <AlertDescription className="text-sm mt-1">
                    {tip.message}
                  </AlertDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissTip(tip.id)}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </Alert>
          </div>
        ))}

        {/* Topic Detail Modal */}
        {selectedTopic && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {selectedTopic.icon}
                    <div>
                      <CardTitle>{selectedTopic.title}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{selectedTopic.description}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTopic(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-line text-sm leading-relaxed">
                    {selectedTopic.content}
                  </div>
                </div>

                {selectedTopic.actions && (
                  <div className="flex gap-2 pt-4 border-t">
                    {selectedTopic.actions.map((action, index) => (
                      <Button
                        key={index}
                        onClick={action.action}
                        variant={action.type === "primary" ? "default" : "outline"}
                        className="flex items-center gap-2"
                      >
                        {action.icon}
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </>
    );
  }

  // Embedded mode for sidebars
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5" />
          Quick Help
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {currentTopics.slice(0, 3).map(topic => (
          <div
            key={topic.id}
            className="p-2 border rounded cursor-pointer hover:bg-gray-50"
            onClick={() => setSelectedTopic(topic)}
          >
            <h4 className="font-medium text-sm">{topic.title}</h4>
            <p className="text-xs text-gray-600">{topic.description}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}