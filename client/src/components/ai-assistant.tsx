import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, Send, X, MessageSquare, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm your GPNet AI compliance assistant powered by Claude. I can evaluate case compliance against Worksafe Victoria policies and provide risk assessments. How can I assist you today?",
      timestamp: new Date().toISOString(),
    },
  ]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Call the Claude compliance API
      const res = await apiRequest("POST", "/api/compliance", { text: input });
      const response: {
        compliance_status: string;
        summary: string;
        references: string[];
      } = await res.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `**Compliance Status:** ${response.compliance_status}\n\n${response.summary}${
          response.references.length > 0
            ? `\n\n**References:**\n${response.references.map(ref => `• ${ref}`).join("\n")}`
            : ""
        }`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I encountered an error processing your request: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
        size="icon"
        data-testid="button-open-ai-assistant"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-2xl flex flex-col" data-testid="card-ai-assistant">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">AI Assistant</CardTitle>
          <Badge variant="secondary" className="text-xs">Beta</Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} data-testid="button-close-ai-assistant">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                data-testid={`message-${message.id}`}
              >
                {message.role === "assistant" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`rounded-lg px-3 py-2 max-w-[80%] ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === "user" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              data-testid="input-ai-message"
            />
            <Button onClick={handleSend} size="icon" disabled={isLoading} data-testid="button-send-message">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge 
              variant="outline" 
              className="cursor-pointer hover-elevate" 
              onClick={() => setInput("Is a worker with 6 weeks off work and no medical certificates compliant?")}
              data-testid="button-quick-action-compliance"
            >
              Check compliance
            </Badge>
            <Badge 
              variant="outline" 
              className="cursor-pointer hover-elevate" 
              onClick={() => setInput("What are the key risk factors for RTW cases?")}
              data-testid="button-quick-action-risk-factors"
            >
              Risk factors
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
