import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MessageSquare,
  Send,
  Brain,
  User,
  Lightbulb,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Heart,
  Briefcase,
  Target,
  TrendingUp,
  Calendar,
  Phone,
  Mail,
  X,
  Minimize2,
  Maximize2,
  Copy,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { WorkerCase } from "@shared/schema";

interface ChatMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: string;
  type?: "text" | "suggestion" | "action" | "analysis";
  metadata?: {
    caseId?: string;
    workerName?: string;
    confidence?: number;
    suggestions?: QuickAction[];
    relatedCases?: string[];
  };
  isTyping?: boolean;
}

interface QuickAction {
  label: string;
  description: string;
  action: () => void;
  icon: React.ReactNode;
}

interface ChatContext {
  currentCase?: WorkerCase;
  currentPage: string;
  userRole: string;
  recentActions: string[];
}

interface ExpertChatInterfaceProps {
  currentCase?: WorkerCase;
  mode?: "floating" | "embedded" | "fullscreen";
  initialMessage?: string;
  onActionSuggested?: (action: QuickAction) => void;
}

// Pre-built expert responses and suggestions
const expertKnowledge = {
  rtw: {
    keywords: ["return to work", "rtw", "graduated", "suitable duties", "capacity"],
    responses: [
      "Based on my experience, graduated RTW plans with 2-4 hour starts have 35% higher success rates than immediate full-time returns.",
      "I recommend coordinating with the treating practitioner first to establish current capacity before creating the RTW plan.",
      "Key stakeholders for RTW success: worker, employer, treating doctor, and rehabilitation provider. Missing any reduces success by 40%."
    ]
  },
  medical: {
    keywords: ["medical", "certificate", "doctor", "treatment", "capacity", "restrictions"],
    responses: [
      "Medical certificates older than 28 days may not reflect current capacity. Consider requesting an updated assessment.",
      "When reviewing certificates, pay attention to functional capacity descriptions rather than just diagnosis codes.",
      "Independent Medical Examinations are most valuable when there's conflicting medical evidence or prolonged absence."
    ]
  },
  compliance: {
    keywords: ["compliance", "worksafe", "legal", "audit", "requirement"],
    responses: [
      "WorkSafe compliance requires documented evidence of reasonable steps taken. I can help track these automatically.",
      "Key compliance indicators: timely reporting, appropriate medical management, RTW planning within 2 weeks.",
      "Red flags for compliance: delayed reporting, conflicting medical opinions, employer non-cooperation."
    ]
  }
};

// Common case management questions and smart responses
const commonQuestions = [
  {
    question: "What should I do first with this case?",
    response: "Let me analyze the current status and provide a prioritized action plan based on best practices.",
    followUp: ["Assess medical evidence", "Check RTW readiness", "Review compliance status"]
  },
  {
    question: "Is this case high risk?",
    response: "I'll evaluate risk factors including injury type, absence duration, medical complexity, and psychosocial indicators.",
    followUp: ["View risk assessment", "See similar cases", "Get intervention plan"]
  },
  {
    question: "When should they return to work?",
    response: "RTW timing depends on medical capacity, suitable duties availability, and stakeholder coordination. Let me assess these factors.",
    followUp: ["Create RTW plan", "Contact employer", "Medical review needed"]
  }
];

export function ExpertChatInterface({
  currentCase,
  mode = "floating",
  initialMessage,
  onActionSuggested
}: ExpertChatInterfaceProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [context, setContext] = useState<ChatContext>({
    currentCase,
    currentPage: window.location.pathname,
    userRole: "case_manager", // Would come from auth context
    recentActions: []
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, context }: { message: string; context: ChatContext }) => {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          context,
          history: messages.slice(-5) // Send last 5 messages for context
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onMutate: ({ message }) => {
      // Add user message immediately
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        content: message,
        role: "user",
        timestamp: new Date().toISOString(),
        type: "text"
      };

      setMessages(prev => [...prev, userMessage]);
      setInput("");
      setIsTyping(true);

      // Add typing indicator
      const typingMessage: ChatMessage = {
        id: "typing",
        content: "AI Expert is thinking...",
        role: "assistant",
        timestamp: new Date().toISOString(),
        type: "text",
        isTyping: true
      };

      setTimeout(() => {
        setMessages(prev => [...prev, typingMessage]);
      }, 200);
    },
    onSuccess: (responseData) => {
      setIsTyping(false);

      // Remove typing indicator and add real response
      setMessages(prev => {
        const withoutTyping = prev.filter(m => m.id !== "typing");

        const aiResponse: ChatMessage = {
          id: Date.now().toString(),
          content: responseData.message,
          role: "assistant",
          timestamp: new Date().toISOString(),
          type: responseData.type || "text",
          metadata: {
            confidence: responseData.confidence,
            suggestions: responseData.suggestions,
            caseId: currentCase?.id,
            workerName: currentCase?.workerName
          }
        };

        return [...withoutTyping, aiResponse];
      });
    },
    onError: () => {
      setIsTyping(false);
      setMessages(prev => prev.filter(m => m.id !== "typing"));

      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        content: "I'm having trouble processing that request right now. Please try again or rephrase your question.",
        role: "assistant",
        timestamp: new Date().toISOString(),
        type: "text"
      };

      setMessages(prev => [...prev, errorMessage]);
    }
  });

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: "welcome",
        content: currentCase
          ? `Hi! I'm your AI case management expert. I can see you're working on ${currentCase.workerName}'s case. What would you like to know about this case or case management in general?`
          : "Hi! I'm your AI case management expert. I'm here to help with any questions about your cases, compliance, RTW planning, or general case management best practices. What can I help you with?",
        role: "assistant",
        timestamp: new Date().toISOString(),
        type: "text",
        metadata: {
          suggestions: [
            {
              label: "Analyze this case",
              description: "Get expert insights and recommendations",
              action: () => handleQuickAction("analyze_case"),
              icon: <Brain className="w-4 h-4" />
            },
            {
              label: "What's next?",
              description: "Get prioritized action recommendations",
              action: () => handleQuickAction("next_steps"),
              icon: <Target className="w-4 h-4" />
            },
            {
              label: "Risk assessment",
              description: "Evaluate case risk factors",
              action: () => handleQuickAction("risk_assessment"),
              icon: <AlertTriangle className="w-4 h-4" />
            }
          ]
        }
      };

      setMessages([welcomeMessage]);
    }
  }, [isOpen, currentCase]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle initial message
  useEffect(() => {
    if (initialMessage && isOpen) {
      handleSendMessage(initialMessage);
    }
  }, [initialMessage, isOpen]);

  const handleSendMessage = (message?: string) => {
    const messageToSend = message || input.trim();
    if (!messageToSend) return;

    sendMessageMutation.mutate({
      message: messageToSend,
      context: {
        ...context,
        currentCase
      }
    });
  };

  const handleQuickAction = (action: string) => {
    const actionMessages = {
      analyze_case: currentCase
        ? `Please analyze ${currentCase.workerName}'s case and provide expert insights.`
        : "Please analyze the current workspace and provide insights.",
      next_steps: "What should be my next priority actions based on the current case load?",
      risk_assessment: currentCase
        ? `What are the risk factors for ${currentCase.workerName}'s case?`
        : "How can I identify high-risk cases in my portfolio?"
    };

    handleSendMessage(actionMessages[action] || action);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getMessageIcon = (message: ChatMessage) => {
    if (message.role === "user") {
      return <User className="w-4 h-4" />;
    }

    switch (message.type) {
      case "suggestion":
        return <Lightbulb className="w-4 h-4" />;
      case "action":
        return <Target className="w-4 h-4" />;
      case "analysis":
        return <Brain className="w-4 h-4" />;
      default:
        return <Brain className="w-4 h-4" />;
    }
  };

  // Floating chat button
  if (mode === "floating" && !isOpen) {
    return (
      <div className="fixed bottom-6 right-20 z-50">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className="rounded-full h-14 w-14 shadow-lg bg-blue-600 hover:bg-blue-700"
            >
              <MessageSquare className="w-6 h-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Ask the AI Expert anything about case management</p>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  // Chat interface
  const chatContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-blue-50">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 border-2 border-blue-200">
            <AvatarImage src="/ai-expert-avatar.png" alt="AI Expert" />
            <AvatarFallback className="bg-blue-100 text-blue-700">
              <Brain className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-blue-900">AI Case Expert</h3>
            {currentCase && (
              <p className="text-xs text-blue-600">
                Discussing: {currentCase.workerName}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {mode === "floating" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-96">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <Avatar className={`h-8 w-8 ${message.role === "user" ? "border-green-200" : "border-blue-200"}`}>
                  <AvatarFallback className={message.role === "user" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>
                    {getMessageIcon(message)}
                  </AvatarFallback>
                </Avatar>

                <div className={`flex-1 max-w-[80%] ${message.role === "user" ? "text-right" : ""}`}>
                  <div
                    className={`rounded-lg p-3 ${
                      message.role === "user"
                        ? "bg-green-100 text-green-900"
                        : message.isTyping
                        ? "bg-gray-100 text-gray-600 animate-pulse"
                        : "bg-blue-100 text-blue-900"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                    {message.metadata?.confidence && (
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="text-xs">
                          {message.metadata.confidence}% confident
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  {message.metadata?.suggestions && (
                    <div className="mt-2 space-y-2">
                      {message.metadata.suggestions.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={suggestion.action}
                          className="mr-2 text-xs"
                        >
                          {suggestion.icon}
                          <span className="ml-1">{suggestion.label}</span>
                        </Button>
                      ))}
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t bg-gray-50">
            {/* Quick question suggestions */}
            {messages.length === 1 && (
              <div className="mb-3 space-y-1">
                <p className="text-xs text-gray-600 mb-2">Quick questions:</p>
                <div className="flex flex-wrap gap-1">
                  {["What's next?", "Analyze case", "Risk factors?", "RTW ready?"].map(q => (
                    <Button
                      key={q}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendMessage(q)}
                      className="text-xs"
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={currentCase ? `Ask about ${currentCase.workerName}'s case...` : "Ask me anything about case management..."}
                disabled={sendMessageMutation.isLoading}
                className="flex-1"
              />
              <Button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || sendMessageMutation.isLoading}
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            <div className="text-xs text-gray-500 mt-2 text-center">
              AI Expert • Always available to help with case management
            </div>
          </div>
        </>
      )}
    </div>
  );

  // Render based on mode
  if (mode === "floating") {
    return (
      <div className="fixed bottom-6 right-20 z-50">
        {isOpen && (
          <Card className="w-96 h-[32rem] shadow-xl border-blue-200">
            {chatContent}
          </Card>
        )}
      </div>
    );
  }

  if (mode === "embedded") {
    return (
      <Card className="w-full h-[400px]">
        {chatContent}
      </Card>
    );
  }

  // Fullscreen mode
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader className="sr-only">
          <DialogTitle>AI Case Expert Chat</DialogTitle>
        </DialogHeader>
        <div className="h-full">
          {chatContent}
        </div>
      </DialogContent>
    </Dialog>
  );
}