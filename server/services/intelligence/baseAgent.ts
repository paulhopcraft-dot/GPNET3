/**
 * Base Healthcare Specialist Agent
 * Foundation class for all 6 specialist subagents in the Preventli Intelligence Platform
 */

import Anthropic from "@anthropic-ai/sdk";
import { createLogger } from "../../lib/logger";
import { storage } from "../../storage";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export interface AgentMemory {
  id: string;
  timestamp: Date;
  caseId?: number;
  context: string;
  content: string;
  tags: string[];
  importance: number; // 0-1 scale
  type: 'learning' | 'pattern' | 'decision' | 'insight';
}

export interface AgentResponse {
  success: boolean;
  data?: any;
  insights?: string[];
  recommendations?: string[];
  confidence: number; // 0-1 scale
  processingTime: number;
  agentId: string;
}

export abstract class BaseHealthcareAgent {
  protected anthropic: Anthropic;
  protected agentId: string;
  protected memoryPath: string;
  protected logger: any;
  
  constructor(agentId: string) {
    this.agentId = agentId;
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.memoryPath = path.join(process.cwd(), 'intelligence', 'memory', this.agentId);
    this.logger = createLogger(`Agent:${agentId}`);
    this.ensureMemoryDirectory();
  }

  private async ensureMemoryDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.memoryPath, { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to create memory directory for ${this.agentId}`, {}, error);
    }
  }

  protected async storeMemory(memory: Omit<AgentMemory, 'id' | 'timestamp'>): Promise<void> {
    try {
      const memoryEntry: AgentMemory = {
        id: randomUUID(),
        timestamp: new Date(),
        ...memory
      };

      const filename = `${new Date().toISOString().split('T')[0]}.json`;
      const filepath = path.join(this.memoryPath, filename);
      
      let existingMemories: AgentMemory[] = [];
      try {
        const content = await fs.readFile(filepath, 'utf-8');
        existingMemories = JSON.parse(content);
      } catch {
        // File doesn't exist or is empty
      }

      existingMemories.push(memoryEntry);
      await fs.writeFile(filepath, JSON.stringify(existingMemories, null, 2));
      
    } catch (error) {
      this.logger.error(`Failed to store memory for ${this.agentId}`, {}, error);
    }
  }

  protected async retrieveMemories(days: number = 7, tags?: string[]): Promise<AgentMemory[]> {
    try {
      const memories: AgentMemory[] = [];
      const today = new Date();
      
      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const filename = `${date.toISOString().split('T')[0]}.json`;
        const filepath = path.join(this.memoryPath, filename);
        
        try {
          const content = await fs.readFile(filepath, 'utf-8');
          const dayMemories: AgentMemory[] = JSON.parse(content);
          
          if (tags && tags.length > 0) {
            memories.push(...dayMemories.filter(m => 
              m.tags.some(tag => tags.includes(tag))
            ));
          } else {
            memories.push(...dayMemories);
          }
        } catch {
          // File doesn't exist for this date
          continue;
        }
      }
      
      return memories.sort((a, b) => b.importance - a.importance);
    } catch (error) {
      this.logger.error(`Failed to retrieve memories for ${this.agentId}`, {}, error);
      return [];
    }
  }

  protected async callAnthropic(prompt: string, context?: any): Promise<string> {
    try {
      const response = await this.anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 4000,
        temperature: 0.1, // Lower temperature for healthcare consistency
        messages: [{
          role: "user",
          content: this.buildSystemPrompt() + "\n\n" + prompt
        }]
      });

      return response.content[0].type === 'text' ? response.content[0].text : '';
    } catch (error) {
      this.logger.error(`Anthropic API call failed for ${this.agentId}`, {}, error);
      throw error;
    }
  }

  protected abstract buildSystemPrompt(): string;
  
  public abstract analyze(data: any): Promise<AgentResponse>;
  
  public abstract getSpecialization(): string;
  
  public getAgentId(): string {
    return this.agentId;
  }

  protected async getCaseData(caseId: number) {
    try {
      return await storage.getGPNet2CaseByIdAdmin(String(caseId));
    } catch (error) {
      this.logger.error(`Failed to retrieve case ${caseId} for ${this.agentId}`, {}, error);
      return null;
    }
  }

  protected startTimer(): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  }

  protected buildResponse(
    success: boolean,
    data?: any,
    insights?: string[],
    recommendations?: string[],
    confidence: number = 0.5,
    processingTime: number = 0
  ): AgentResponse {
    return {
      success,
      data,
      insights,
      recommendations,
      confidence: Math.min(1, Math.max(0, confidence)),
      processingTime,
      agentId: this.agentId
    };
  }
}