/**
 * Performance Test for Injury Date Extraction System
 *
 * Tests extraction service performance under various loads and conditions.
 * Validates that the system meets performance requirements:
 * - <2 seconds for regex extraction
 * - <10 seconds for AI extraction
 * - Handles concurrent requests efficiently
 */

import { InjuryDateExtractionService } from "../server/services/injuryDateExtraction";
import { logger } from "../server/lib/logger";

interface PerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  regexExtractions: number;
  aiExtractions: number;
  fallbackExtractions: number;
}

class ExtractionPerformanceTester {
  private extractionService: InjuryDateExtractionService;

  constructor() {
    this.extractionService = new InjuryDateExtractionService();
  }

  /**
   * Test extraction performance with various text patterns
   */
  async runPerformanceTests(): Promise<void> {
    console.log("🚀 Starting Injury Date Extraction Performance Tests");
    console.log("==================================================");

    // Test 1: Basic extraction performance
    console.log("\n📊 Test 1: Basic Extraction Performance");
    const basicMetrics = await this.testBasicExtraction();
    this.printMetrics("Basic Extraction", basicMetrics);

    // Test 2: Complex text extraction
    console.log("\n📊 Test 2: Complex Text Extraction");
    const complexMetrics = await this.testComplexTextExtraction();
    this.printMetrics("Complex Text", complexMetrics);

    // Test 3: Concurrent request handling
    console.log("\n📊 Test 3: Concurrent Request Handling");
    const concurrentMetrics = await this.testConcurrentRequests();
    this.printMetrics("Concurrent Requests", concurrentMetrics);

    // Test 4: Large conversation context
    console.log("\n📊 Test 4: Large Conversation Context");
    const largeContextMetrics = await this.testLargeConversationContext();
    this.printMetrics("Large Context", largeContextMetrics);

    // Test 5: Edge case handling
    console.log("\n📊 Test 5: Edge Case Performance");
    const edgeCaseMetrics = await this.testEdgeCases();
    this.printMetrics("Edge Cases", edgeCaseMetrics);

    console.log("\n✅ All performance tests completed!");
    this.validatePerformanceRequirements([
      basicMetrics,
      complexMetrics,
      concurrentMetrics,
      largeContextMetrics,
      edgeCaseMetrics
    ]);
  }

  /**
   * Test basic extraction patterns
   */
  private async testBasicExtraction(): Promise<PerformanceMetrics> {
    const testCases = this.generateBasicTestCases(50);
    return await this.measureExtractionPerformance(testCases, "Basic");
  }

  /**
   * Test complex text patterns that might trigger AI
   */
  private async testComplexTextExtraction(): Promise<PerformanceMetrics> {
    const testCases = this.generateComplexTestCases(25);
    return await this.measureExtractionPerformance(testCases, "Complex");
  }

  /**
   * Test concurrent request handling
   */
  private async testConcurrentRequests(): Promise<PerformanceMetrics> {
    const testCases = this.generateBasicTestCases(20);

    console.log("   Running 20 concurrent extractions...");
    const startTime = Date.now();

    const promises = testCases.map(testCase =>
      this.timedExtraction(testCase.context, testCase.conversations, testCase.attachments)
    );

    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    console.log(`   Completed in ${totalTime}ms (avg: ${totalTime / results.length}ms per request)`);

    return this.calculateMetrics(results, totalTime);
  }

  /**
   * Test performance with large conversation contexts
   */
  private async testLargeConversationContext(): Promise<PerformanceMetrics> {
    const testCases = this.generateLargeContextTestCases(10);
    return await this.measureExtractionPerformance(testCases, "Large Context");
  }

  /**
   * Test edge cases and error handling performance
   */
  private async testEdgeCases(): Promise<PerformanceMetrics> {
    const testCases = this.generateEdgeCaseTestCases(30);
    return await this.measureExtractionPerformance(testCases, "Edge Cases");
  }

  /**
   * Generate basic test cases with simple patterns
   */
  private generateBasicTestCases(count: number) {
    const patterns = [
      'Worker injured on 15/01/2025',
      'Accident occurred 2 weeks ago',
      'Incident happened on January 15, 2025',
      'Injury date: 2025-01-15',
      'Worker reported incident from last Friday'
    ];

    return Array.from({ length: count }, (_, i) => ({
      context: {
        id: i + 1,
        subject: `Test Case ${i + 1}`,
        description_text: patterns[i % patterns.length],
        custom_fields: {},
        created_at: '2025-01-20T10:00:00Z',
        workerName: `Worker ${i + 1}`,
        company: `Company ${i % 5}`
      },
      conversations: [],
      attachments: []
    }));
  }

  /**
   * Generate complex test cases that might trigger AI
   */
  private generateComplexTestCases(count: number) {
    const complexPatterns = [
      'Worker mentioned the incident happened around Easter time',
      'The accident occurred shortly after the worker returned from leave',
      'Injury happened during the busy period in December',
      'Worker called about an incident from when they were working overtime',
      'The problem started after the new safety procedures were implemented'
    ];

    const conversationPatterns = [
      'The worker called today to clarify that the injury actually happened on January 15th',
      'Follow-up email confirms the incident date as mentioned in previous correspondence',
      'Worker provided additional details about the timing of the accident'
    ];

    return Array.from({ length: count }, (_, i) => ({
      context: {
        id: i + 1,
        subject: `Complex Case ${i + 1}`,
        description_text: complexPatterns[i % complexPatterns.length],
        custom_fields: {},
        created_at: '2025-01-20T10:00:00Z',
        workerName: `Worker ${i + 1}`,
        company: `Company ${i % 3}`
      },
      conversations: [conversationPatterns[i % conversationPatterns.length]],
      attachments: []
    }));
  }

  /**
   * Generate test cases with large conversation contexts
   */
  private generateLargeContextTestCases(count: number) {
    const baseText = "The worker mentioned various details about the incident. ";
    const largeConversation = baseText.repeat(100) + "The injury occurred on January 15th, 2025.";

    return Array.from({ length: count }, (_, i) => ({
      context: {
        id: i + 1,
        subject: `Large Context Case ${i + 1}`,
        description_text: 'Worker reported an incident',
        custom_fields: {},
        created_at: '2025-01-20T10:00:00Z',
        workerName: `Worker ${i + 1}`,
        company: `Company ${i % 2}`
      },
      conversations: [largeConversation],
      attachments: []
    }));
  }

  /**
   * Generate edge case test cases
   */
  private generateEdgeCaseTestCases(count: number) {
    const edgeCases = [
      { description: '', conversations: [] }, // Empty content
      { description: 'Invalid date 32/13/2025', conversations: [] }, // Invalid dates
      { description: null, conversations: [] }, // Null description
      { description: 'Very short', conversations: ['Short'] }, // Minimal content
      { description: 'Multiple dates: 15/01/2025 and 20/01/2025', conversations: [] } // Multiple dates
    ];

    return Array.from({ length: count }, (_, i) => {
      const edgeCase = edgeCases[i % edgeCases.length];
      return {
        context: {
          id: i + 1,
          subject: `Edge Case ${i + 1}`,
          description_text: edgeCase.description,
          custom_fields: {},
          created_at: '2025-01-20T10:00:00Z',
          workerName: `Worker ${i + 1}`,
          company: `Company ${i % 3}`
        },
        conversations: edgeCase.conversations,
        attachments: []
      };
    });
  }

  /**
   * Measure extraction performance for a set of test cases
   */
  private async measureExtractionPerformance(testCases: any[], testName: string): Promise<PerformanceMetrics> {
    console.log(`   Running ${testCases.length} ${testName.toLowerCase()} extractions...`);

    const results = [];
    for (const testCase of testCases) {
      const result = await this.timedExtraction(
        testCase.context,
        testCase.conversations,
        testCase.attachments
      );
      results.push(result);

      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    return this.calculateMetrics(results, results.reduce((sum, r) => sum + r.responseTime, 0));
  }

  /**
   * Perform extraction with timing
   */
  private async timedExtraction(context: any, conversations: string[], attachments: string[]) {
    const startTime = Date.now();
    let success = false;
    let extractionResult = null;

    try {
      extractionResult = await this.extractionService.extractInjuryDate(
        context,
        conversations,
        attachments
      );
      success = true;
    } catch (error) {
      logger.sync.error('Extraction failed in performance test', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    const responseTime = Date.now() - startTime;

    return {
      success,
      responseTime,
      extractionMethod: extractionResult?.extractionMethod || 'error',
      confidence: extractionResult?.confidence || 'unknown'
    };
  }

  /**
   * Calculate performance metrics from results
   */
  private calculateMetrics(results: any[], totalTime: number): PerformanceMetrics {
    const responseTimes = results.map(r => r.responseTime).sort((a, b) => a - b);
    const successfulRequests = results.filter(r => r.success).length;

    return {
      totalRequests: results.length,
      successfulRequests,
      failedRequests: results.length - successfulRequests,
      averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)] || 0,
      p99ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.99)] || 0,
      regexExtractions: results.filter(r => r.extractionMethod === 'regex').length,
      aiExtractions: results.filter(r => r.extractionMethod === 'ai_nlp').length,
      fallbackExtractions: results.filter(r => r.extractionMethod === 'fallback').length
    };
  }

  /**
   * Print performance metrics
   */
  private printMetrics(testName: string, metrics: PerformanceMetrics): void {
    console.log(`   ${testName} Results:`);
    console.log(`     Total Requests: ${metrics.totalRequests}`);
    console.log(`     Success Rate: ${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1)}%`);
    console.log(`     Avg Response Time: ${metrics.averageResponseTime.toFixed(0)}ms`);
    console.log(`     95th Percentile: ${metrics.p95ResponseTime.toFixed(0)}ms`);
    console.log(`     99th Percentile: ${metrics.p99ResponseTime.toFixed(0)}ms`);
    console.log(`     Regex Extractions: ${metrics.regexExtractions}`);
    console.log(`     AI Extractions: ${metrics.aiExtractions}`);
    console.log(`     Fallback Extractions: ${metrics.fallbackExtractions}`);
  }

  /**
   * Validate that performance meets requirements
   */
  private validatePerformanceRequirements(allMetrics: PerformanceMetrics[]): void {
    console.log("\n🎯 Performance Requirement Validation");
    console.log("=====================================");

    let allPassed = true;

    // Requirement 1: <2 seconds for regex extraction
    const regexMetrics = allMetrics.find(m => m.regexExtractions > 0);
    if (regexMetrics) {
      const regexPassed = regexMetrics.p95ResponseTime < 2000;
      console.log(`✓ Regex extraction <2s: ${regexPassed ? '✅ PASS' : '❌ FAIL'} (${regexMetrics.p95ResponseTime}ms)`);
      allPassed = allPassed && regexPassed;
    }

    // Requirement 2: <10 seconds for AI extraction
    const aiMetrics = allMetrics.find(m => m.aiExtractions > 0);
    if (aiMetrics) {
      const aiPassed = aiMetrics.p95ResponseTime < 10000;
      console.log(`✓ AI extraction <10s: ${aiPassed ? '✅ PASS' : '❌ FAIL'} (${aiMetrics.p95ResponseTime}ms)`);
      allPassed = allPassed && aiPassed;
    }

    // Requirement 3: >95% success rate
    const overallSuccessRate = allMetrics.reduce((sum, m) => sum + m.successfulRequests, 0) /
                               allMetrics.reduce((sum, m) => sum + m.totalRequests, 0);
    const successPassed = overallSuccessRate > 0.95;
    console.log(`✓ Success rate >95%: ${successPassed ? '✅ PASS' : '❌ FAIL'} (${(overallSuccessRate * 100).toFixed(1)}%)`);
    allPassed = allPassed && successPassed;

    // Requirement 4: Concurrent handling
    const concurrentMetrics = allMetrics.find(m => m.totalRequests === 20); // Concurrent test
    if (concurrentMetrics) {
      const concurrentPassed = concurrentMetrics.averageResponseTime < 5000;
      console.log(`✓ Concurrent handling <5s avg: ${concurrentPassed ? '✅ PASS' : '❌ FAIL'} (${concurrentMetrics.averageResponseTime.toFixed(0)}ms)`);
      allPassed = allPassed && concurrentPassed;
    }

    console.log(`\n${allPassed ? '🎉 All performance requirements MET!' : '⚠️ Some performance requirements FAILED'}`);

    if (!allPassed) {
      process.exit(1);
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  const tester = new ExtractionPerformanceTester();
  await tester.runPerformanceTests();
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error("Performance test failed:", error);
    process.exit(1);
  });
}

export { ExtractionPerformanceTester };