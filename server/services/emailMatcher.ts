/**
 * Email Matching Service
 * Matches incoming emails to existing worker cases
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

export interface MatchResult {
  status: 'confident' | 'uncertain' | 'no_match';
  matches: {
    caseId: string;
    workerName: string;
    employer: string;
    confidence: number;
    matchReasons: string[];
  }[];
  suggestedAction: 'auto_attach' | 'review_required' | 'create_new' | 'alert_admin';
  alertMessage?: string;
}

export interface EmailContext {
  from: string;
  subject: string;
  body: string;
  extractedNames?: string[];
  extractedEmployer?: string;
  referenceNumbers?: string[];
}

/**
 * Attempt to match an incoming email to existing cases
 */
export async function matchEmailToCase(email: EmailContext): Promise<MatchResult> {
  const matches: MatchResult['matches'] = [];
  
  // Extract potential identifiers from email
  const workerNames = extractWorkerNames(email);
  const employerName = extractEmployerName(email);
  const ticketRefs = extractTicketReferences(email);

  // Strategy 1: Direct ticket reference match (highest confidence)
  if (ticketRefs.length > 0) {
    for (const ref of ticketRefs) {
      const result = await db.execute(sql`
        SELECT id, worker_name, company FROM worker_cases 
        WHERE id LIKE ${'%' + ref + '%'}
      `);
      
      for (const c of result.rows as any[]) {
        matches.push({
          caseId: c.id,
          workerName: c.worker_name || '',
          employer: c.company || '',
          confidence: 0.95,
          matchReasons: [`Ticket reference "FD-${ref}" found in email`],
        });
      }
    }
  }

  // Strategy 2: Worker name match
  for (const name of workerNames) {
    const nameParts = name.toLowerCase().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];

    const result = await db.execute(sql`
      SELECT id, worker_name, company FROM worker_cases 
      WHERE LOWER(worker_name) LIKE ${'%' + firstName + '%'}
      AND LOWER(worker_name) LIKE ${'%' + lastName + '%'}
    `);

    for (const c of result.rows as any[]) {
      // Check if already added
      if (matches.some(m => m.caseId === c.id)) continue;
      
      const reasons = [`Worker name match: "${name}"`];
      let confidence = 0.7;

      if (employerName && c.company?.toLowerCase().includes(employerName.toLowerCase())) {
        reasons.push(`Employer match: "${employerName}"`);
        confidence += 0.15;
      }

      // Check email domain
      const emailDomain = email.from.split('@')[1];
      if (emailDomain && c.company?.toLowerCase().includes(emailDomain.split('.')[0])) {
        reasons.push(`Email domain matches employer`);
        confidence += 0.1;
      }

      matches.push({
        caseId: c.id,
        workerName: c.worker_name || '',
        employer: c.company || '',
        confidence: Math.min(confidence, 0.95),
        matchReasons: reasons,
      });
    }
  }

  // Sort by confidence
  matches.sort((a, b) => b.confidence - a.confidence);

  // Determine result status and suggested action
  if (matches.length === 0) {
    return {
      status: 'no_match',
      matches: [],
      suggestedAction: 'alert_admin',
      alertMessage: `No matching case found for email from ${email.from}. Subject: "${email.subject}"`,
    };
  }

  if (matches.length === 1 && matches[0].confidence >= 0.85) {
    return {
      status: 'confident',
      matches,
      suggestedAction: 'auto_attach',
    };
  }

  if (matches.length === 1 && matches[0].confidence >= 0.6) {
    return {
      status: 'uncertain',
      matches,
      suggestedAction: 'review_required',
      alertMessage: `Possible match found (${(matches[0].confidence * 100).toFixed(0)}% confidence) for ${matches[0].workerName}. Please verify.`,
    };
  }

  if (matches.length > 1) {
    return {
      status: 'uncertain',
      matches: matches.slice(0, 5), // Top 5 matches
      suggestedAction: 'review_required',
      alertMessage: `Multiple possible matches (${matches.length}) found. Top match: ${matches[0].workerName} at ${matches[0].employer}`,
    };
  }

  return {
    status: 'no_match',
    matches,
    suggestedAction: 'create_new',
    alertMessage: `Low confidence matches only. Consider creating new case.`,
  };
}

// Helper: Extract worker names from email
function extractWorkerNames(email: EmailContext): string[] {
  if (email.extractedNames?.length) return email.extractedNames;
  
  const names: string[] = [];
  const text = `${email.subject} ${email.body}`;
  
  // Pattern: "Worker: Name" or "Employee: Name" or "Re: Name -"
  const patterns = [
    /(?:worker|employee|patient|client)[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/gi,
    /(?:regarding|re:|about)[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/gi,
    /([A-Z][a-z]+ [A-Z][a-z]+)(?:'s|'s)?\s+(?:injury|claim|case|workcover)/gi,
    /FD-\d+\s*-\s*([A-Z][a-z]+ [A-Z][a-z]+)/gi,
  ];

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && !names.includes(match[1])) {
        names.push(match[1]);
      }
    }
  }

  return names;
}

// Helper: Extract employer name from email
function extractEmployerName(email: EmailContext): string | null {
  if (email.extractedEmployer) return email.extractedEmployer;
  
  const text = `${email.subject} ${email.body}`;
  
  // Pattern: "Company: Name" or "Employer: Name"
  const patterns = [
    /(?:company|employer|organisation|organization)[:\s]+([A-Z][a-zA-Z\s&]+?)(?:\.|,|\n|$)/gi,
    /(?:from|at)\s+([A-Z][a-zA-Z\s&]+?)(?:\s+HR|\s+Ltd|\s+Pty|\.|\n)/gi,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

// Helper: Extract ticket reference numbers
function extractTicketReferences(email: EmailContext): string[] {
  const refs: string[] = [];
  const text = `${email.subject} ${email.body}`;
  
  // Freshdesk ID pattern
  const fdPattern = /FD-(\d+)/gi;
  const matches = text.matchAll(fdPattern);
  for (const match of matches) {
    if (!refs.includes(match[1])) {
      refs.push(match[1]);
    }
  }

  // Case reference pattern
  const casePattern = /(?:case|ref|ticket)[#:\s]+(\d+)/gi;
  const caseMatches = text.matchAll(casePattern);
  for (const match of caseMatches) {
    if (!refs.includes(match[1])) {
      refs.push(match[1]);
    }
  }

  return refs;
}

/**
 * Test the matcher with sample scenarios
 */
export async function testEmailMatcher(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  EMAIL MATCHING TEST SCENARIOS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const testEmails: EmailContext[] = [
    // Scenario 1: Clear ticket reference
    {
      from: 'hr@buildright.com.au',
      subject: 'Re: FD-47135 - Daniel Young RTW Update',
      body: 'Please find attached the updated capacity certificate for Daniel.',
    },
    // Scenario 2: Worker name + employer (confident)
    {
      from: 'hr@metrotransport.com.au',
      subject: 'Chloe Harris - Return to Work Plan',
      body: 'Hi, attaching the RTW plan for Chloe Harris at Metro Transport Services.',
    },
    // Scenario 3: Partial match (uncertain)
    {
      from: 'someone@email.com',
      subject: 'Update on Emma',
      body: 'Just checking in about Emma Lewis injury case. Any updates?',
    },
    // Scenario 4: No match (new case)
    {
      from: 'newcompany@example.com',
      subject: 'New Injury Report - John Doe',
      body: 'We have a new injury to report for John Doe at New Company Pty Ltd.',
    },
    // Scenario 5: Multiple possible matches (common name)
    {
      from: 'info@company.com',
      subject: 'Sarah Update',
      body: 'Update regarding Sarah\'s workcover claim.',
    },
  ];

  for (let i = 0; i < testEmails.length; i++) {
    const email = testEmails[i];
    console.log(`📧 Scenario ${i + 1}: ${email.subject}`);
    console.log(`   From: ${email.from}`);
    
    const result = await matchEmailToCase(email);
    
    console.log(`\n   Status: ${result.status.toUpperCase()}`);
    console.log(`   Action: ${result.suggestedAction}`);
    
    if (result.matches.length > 0) {
      console.log(`   Matches (${result.matches.length}):`);
      for (const m of result.matches.slice(0, 3)) {
        console.log(`     - ${m.workerName} @ ${m.employer} (${(m.confidence * 100).toFixed(0)}%)`);
        console.log(`       Reasons: ${m.matchReasons.join(', ')}`);
      }
    }
    
    if (result.alertMessage) {
      console.log(`   ⚠️  Alert: ${result.alertMessage}`);
    }
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════════\n');
}
