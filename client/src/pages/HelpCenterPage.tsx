/**
 * HelpCenterPage
 *
 * Five self-service help articles covering core Preventli workflows.
 * Accessible at /help. Article list on the left, content on the right.
 */

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList,
  FileText,
  UserCheck,
  ShieldCheck,
  Users,
  Search,
  ChevronRight,
  ExternalLink,
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HelpArticle {
  id: string;
  title: string;
  summary: string;
  category: string;
  readTime: number; // minutes
  Icon: React.ElementType;
  content: React.ReactNode;
}

// ─── Article content helpers ──────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
            {i + 1}
          </span>
          <span className="text-sm text-foreground/80 leading-relaxed">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 my-4">
      <Lightbulb size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
      <p className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">{children}</p>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 my-4">
      <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
      <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">{children}</p>
    </div>
  );
}

function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <CheckCircle2 size={16} className="text-primary mt-0.5 shrink-0" />
          <span className="text-sm text-foreground/80 leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function InternalLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      to={href}
      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
    >
      {label}
      <ArrowRight size={12} />
    </Link>
  );
}

// ─── Article definitions ──────────────────────────────────────────────────────

const ARTICLES: HelpArticle[] = [
  {
    id: "add-first-case",
    title: "Adding your first WorkCover case",
    summary: "Create a claim, attach medical certificates, and let AI generate a return-to-work plan.",
    category: "Case Management",
    readTime: 4,
    Icon: ClipboardList,
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          A WorkCover case tracks an injured worker's journey from claim lodgement through to return to work.
          Each case holds the medical certificates, RTW plans, check-ins, and compliance records
          for one worker's claim.
        </p>

        <Section title="Before you start">
          <p className="text-sm text-foreground/80 mb-3 leading-relaxed">
            You'll need the following information to create a case:
          </p>
          <Checklist items={[
            "Worker's full name, date of birth, and contact details",
            "Date of injury and a brief description of how it occurred",
            "Medical certificate (PDF or image) from the treating doctor — optional but recommended",
            "WorkCover claim number if you already have one from the insurer",
          ]} />
        </Section>

        <Section title="Step-by-step">
          <Steps items={[
            "From the dashboard, click Create Case (or navigate to New Case from the sidebar).",
            "Enter the worker's details: name, date of birth, email or phone.",
            "Fill in the injury details: date of injury, body part affected, mechanism of injury.",
            "Upload the worker's medical certificate if you have one. Preventli's AI will scan it to extract the diagnosis, work capacity, and restrictions automatically.",
            "Review the extracted data — correct any misreadings before saving.",
            "Click Save Case. The case is now active and appears in your dashboard.",
            "From the case page, use Generate RTW Plan to create a return-to-work plan based on the certificate's work capacity.",
          ]} />
        </Section>

        <Tip>
          You can attach multiple certificates to one case as the worker's condition evolves.
          Each certificate is stored with a timestamp and creates a new RTW plan suggestion.
        </Tip>

        <Section title="After creating the case">
          <p className="text-sm text-foreground/80 mb-3 leading-relaxed">
            Once the case is created, your dashboard will:
          </p>
          <Checklist items={[
            "Show an upcoming certificate expiry alert when the current cert is within 14 days of expiry",
            "Track days off work, days on modified duties, and estimated return date",
            "Flag overdue RTW actions and compliance obligations",
            "Allow you to log check-in notes and export a progress report",
          ]} />
        </Section>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Next step</p>
          <InternalLink href="/employer/new-case" label="Create your first case now" />
        </div>
      </div>
    ),
  },

  {
    id: "rtw-plan",
    title: "Generating a return-to-work plan with AI",
    summary: "How Preventli's AI reads medical certificates and builds a compliant RTW plan in seconds.",
    category: "Case Management",
    readTime: 5,
    Icon: FileText,
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Preventli reads medical certificates and generates a return-to-work (RTW) plan that reflects
          the treating doctor's recommended work capacity and restrictions. The plan is drafted in seconds
          and is ready for you to review, edit, and send.
        </p>

        <Section title="How the AI reads the certificate">
          <p className="text-sm text-foreground/80 mb-3 leading-relaxed">
            When you upload a medical certificate, the AI extracts:
          </p>
          <Checklist items={[
            "Diagnosis and body part affected",
            "Current work capacity: fit for work, fit for modified duties, or unfit",
            "Specific restrictions (e.g. no lifting over 5 kg, no standing for more than 30 minutes)",
            "Certificate validity dates (from / until)",
            "Treating doctor's name and clinic",
          ]} />
          <Note>
            Always review the extracted data before generating a plan. AI extraction is highly accurate
            but handwritten certificates or unusual formats may occasionally require a correction.
          </Note>
        </Section>

        <Section title="Generating the plan">
          <Steps items={[
            "Open the case and go to the RTW Plan tab.",
            "If a certificate has been uploaded, click Generate RTW Plan.",
            "Preventli drafts a week-by-week return plan that starts at the current work capacity and progressively increases duties toward full pre-injury duties.",
            "Review each week: adjust the hours, duties, and restrictions as needed for your workplace.",
            "Add a supervisor's name and sign-off date if required by your insurer.",
            "Click Save Plan. The plan is stored against the case and appears in the case timeline.",
            "To share the plan with the worker or treating doctor, use the Export PDF button.",
          ]} />
        </Section>

        <Tip>
          WorkSafe Victoria requires an RTW plan within 30 days of receiving the medical certificate.
          Preventli tracks this deadline and flags overdue plans on the compliance dashboard.
        </Tip>

        <Section title="Plan status tracking">
          <p className="text-sm text-foreground/80 mb-3 leading-relaxed">
            Each RTW plan moves through these statuses:
          </p>
          <div className="space-y-2">
            {[
              { status: "Draft", desc: "Generated but not yet signed off" },
              { status: "Active", desc: "In use — current work capacity plan" },
              { status: "Amended", desc: "Updated after a new certificate or capacity change" },
              { status: "Completed", desc: "Worker returned to full pre-injury duties" },
              { status: "Closed", desc: "Case closed without full return (e.g., permanent incapacity)" },
            ].map(({ status, desc }) => (
              <div key={status} className="flex items-start gap-3 text-sm">
                <Badge variant="outline" className="shrink-0 text-xs">{status}</Badge>
                <span className="text-foreground/70 leading-relaxed">{desc}</span>
              </div>
            ))}
          </div>
        </Section>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Quick link</p>
          <InternalLink href="/rtw-planner" label="Open RTW Planner" />
        </div>
      </div>
    ),
  },

  {
    id: "pre-employment",
    title: "Running a pre-employment health check",
    summary: "Screen a new starter before they begin work — generate a clearance report in minutes.",
    category: "Health Checks",
    readTime: 4,
    Icon: UserCheck,
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Pre-employment health checks help you assess whether a new starter is physically suited
          to the demands of their role — before their first day. Preventli guides the worker through
          a questionnaire and generates a clearance report for your records.
        </p>

        <Section title="When to use a pre-employment check">
          <Checklist items={[
            "Before a new employee starts in a physically demanding role (e.g. warehouse, construction, aged care)",
            "When re-employing a worker who had a previous WorkCover claim",
            "As part of a workplace wellness programme for all new starters",
            "When required by an industrial instrument or enterprise agreement",
          ]} />
        </Section>

        <Section title="How to run a check">
          <Steps items={[
            "Go to Checks in the sidebar (or navigate to Pre-Employment Form).",
            "Enter the new starter's name, email address, and job title.",
            "Select the job demands profile: light, medium, heavy, or custom. This controls which questions appear in the questionnaire.",
            "Click Send Assessment. The worker receives a secure link by email.",
            "The worker completes the questionnaire at their own pace — it takes about 10 minutes.",
            "Once submitted, Preventli generates a clearance report: Cleared, Cleared with Restrictions, or Requires Review.",
            "Download the PDF report and store it in the worker's file.",
          ]} />
        </Section>

        <Tip>
          If the assessment returns a Cleared with Restrictions or Requires Review result, Preventli
          will flag the specific questions that triggered the result so you can follow up with the
          worker or refer them to a treating doctor.
        </Tip>

        <Section title="What the report includes">
          <Checklist items={[
            "Clearance level and date of assessment",
            "Job demands profile used",
            "Any declared pre-existing conditions relevant to the role",
            "Recommended restrictions or follow-up actions",
            "Worker's digital signature confirming the answers are accurate",
          ]} />
        </Section>

        <Note>
          Pre-employment health checks are subject to privacy law. Only collect information directly
          relevant to the role's inherent requirements. Retain records securely for 7 years.
        </Note>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Quick link</p>
          <InternalLink href="/pre-employment-form" label="Start a pre-employment check" />
        </div>
      </div>
    ),
  },

  {
    id: "compliance-dashboard",
    title: "Understanding your compliance dashboard",
    summary: "Check outstanding WHS obligations, upcoming certificate expiries, and overdue actions.",
    category: "Compliance",
    readTime: 3,
    Icon: ShieldCheck,
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          The compliance dashboard gives you a real-time view of your organisation's WorkSafe
          obligations. It surfaces what's overdue, what's coming up, and what's been completed —
          so nothing slips through the cracks.
        </p>

        <Section title="Dashboard panels explained">
          <div className="space-y-4">
            {[
              {
                title: "Open Cases",
                desc: "Active WorkCover cases with their current status. Cases highlighted in red have overdue actions (e.g. expired certificate, no RTW plan in 30 days).",
              },
              {
                title: "Certificate Expiries",
                desc: "A timeline of upcoming certificate renewals. Cases within 14 days of expiry are flagged amber; cases with expired certificates are flagged red.",
              },
              {
                title: "RTW Plan Status",
                desc: "Which cases have an active RTW plan and which are missing one. A plan must be in place within 30 days of receiving a medical certificate under Victorian law.",
              },
              {
                title: "Overdue Actions",
                desc: "A checklist of compliance tasks that are past due. Each item links directly to the relevant case or setting.",
              },
              {
                title: "Compliance Score",
                desc: "An overall score (0–100) derived from plan completeness, certificate currency, and timely check-ins. Aim for 80+ to indicate a well-managed programme.",
              },
            ].map(({ title, desc }) => (
              <div key={title} className="border border-border rounded-lg p-3">
                <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
                <p className="text-sm text-foreground/70 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </Section>

        <Tip>
          Set up email notifications in Settings → Notifications to get daily digests of overdue
          actions and certificate expiry reminders 14 days in advance.
        </Tip>

        <Section title="Common compliance obligations (Victoria)">
          <Checklist items={[
            "Notify WorkSafe within 30 days of becoming aware of a workplace injury",
            "Provide suitable employment to an injured worker if medically cleared for modified duties",
            "Prepare an RTW plan within 30 calendar days of receiving a medical certificate",
            "Appoint a Return to Work Coordinator if your remuneration exceeds $7.5M/year",
            "Keep copies of medical certificates and RTW plans for 7 years after case closure",
            "Review and update the RTW plan whenever the worker's medical status changes",
          ]} />
        </Section>

        <Note>
          Obligations vary by state. The dashboard reflects Victorian WorkSafe requirements by default.
          Contact your insurer or a WorkSafe agent for jurisdiction-specific advice.
        </Note>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Quick link</p>
          <InternalLink href="/" label="Go to your dashboard" />
        </div>
      </div>
    ),
  },

  {
    id: "invite-team",
    title: "Inviting your team and managing access",
    summary: "Add HR managers, supervisors, and RTW coordinators so your whole team can collaborate.",
    category: "Settings",
    readTime: 3,
    Icon: Users,
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Preventli supports multiple users per organisation with role-based access. You can invite
          colleagues to collaborate on cases, assign them to specific workers, and control what
          each person can see and do.
        </p>

        <Section title="Available roles">
          <div className="space-y-3">
            {[
              {
                role: "Admin",
                desc: "Full access — manage cases, users, company settings, and billing. Assign to senior HR or the RTW Coordinator.",
              },
              {
                role: "Manager",
                desc: "Can create and manage cases, view reports, and run health checks. Cannot manage other users or change company settings.",
              },
              {
                role: "Viewer",
                desc: "Read-only access to cases and reports. Useful for supervisors who need visibility but shouldn't edit records.",
              },
            ].map(({ role, desc }) => (
              <div key={role} className="flex items-start gap-3">
                <Badge className="shrink-0 mt-0.5 text-xs">{role}</Badge>
                <p className="text-sm text-foreground/80 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="How to invite a team member">
          <Steps items={[
            "Go to Settings in the sidebar.",
            "Click the Team Members tab.",
            "Click Invite Member.",
            "Enter their email address and select their role.",
            "Click Send Invite. They'll receive an email with a registration link valid for 7 days.",
            "Once they register, they'll appear in your Team Members list as Active.",
          ]} />
        </Section>

        <Tip>
          If the invite email expires, return to Settings → Team Members, find the pending invite,
          and click Resend to generate a fresh link.
        </Tip>

        <Section title="Managing existing users">
          <Checklist items={[
            "To change a user's role: Settings → Team Members → click the user → Edit Role.",
            "To remove a user: Settings → Team Members → click the user → Remove. They'll lose access immediately.",
            "Removed users' historical actions and notes are retained on cases for audit purposes.",
            "Admins can only be removed by another Admin — you cannot remove yourself if you are the only Admin.",
          ]} />
        </Section>

        <Note>
          When a team member is removed, any cases they were assigned to remain fully accessible.
          No case data is deleted when a user is deactivated.
        </Note>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Quick link</p>
          <InternalLink href="/settings" label="Go to Team Settings" />
        </div>
      </div>
    ),
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

const CATEGORY_COLOURS: Record<string, string> = {
  "Case Management": "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  "Health Checks": "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800",
  "Compliance": "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800",
  "Settings": "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
};

export default function HelpCenterPage() {
  const [selectedId, setSelectedId] = useState(ARTICLES[0].id);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return ARTICLES;
    return ARTICLES.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
    );
  }, [search]);

  const selected = ARTICLES.find((a) => a.id === selectedId) ?? ARTICLES[0];

  return (
    <PageLayout
      title="Help Centre"
      subtitle="Guides and answers for common Preventli workflows"
    >
      <div className="flex gap-6 h-full min-h-0">
        {/* ── Sidebar ── */}
        <aside className="w-72 flex-shrink-0 flex flex-col gap-3">
          {/* Search */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search articles…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>

          {/* Article list */}
          <nav className="flex flex-col gap-1">
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground px-3 py-4 text-center">
                No articles found.
              </p>
            )}
            {filtered.map((article) => (
              <button
                key={article.id}
                onClick={() => setSelectedId(article.id)}
                className={cn(
                  "w-full text-left px-3 py-3 rounded-lg border transition-colors",
                  selectedId === article.id
                    ? "bg-primary/5 border-primary/30 text-foreground"
                    : "border-transparent hover:bg-muted/50 text-foreground/80"
                )}
              >
                <div className="flex items-start gap-2.5">
                  <article.Icon
                    size={16}
                    className={cn(
                      "mt-0.5 shrink-0",
                      selectedId === article.id
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">{article.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                      {article.summary}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded border font-medium",
                          CATEGORY_COLOURS[article.category] ?? "bg-muted text-muted-foreground"
                        )}
                      >
                        {article.category}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {article.readTime} min read
                      </span>
                    </div>
                  </div>
                  {selectedId === article.id && (
                    <ChevronRight size={14} className="text-primary mt-0.5 shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </nav>

          {/* Footer CTA */}
          <div className="mt-auto pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">
              Can't find what you're looking for?
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs gap-1.5"
              asChild
            >
              <a href="mailto:support@preventli.com.au">
                <ExternalLink size={12} />
                Contact Support
              </a>
            </Button>
          </div>
        </aside>

        {/* ── Article content ── */}
        <article className="flex-1 min-w-0 bg-card border border-border rounded-xl overflow-y-auto p-8">
          {/* Article header */}
          <div className="mb-6 pb-6 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded border font-medium",
                  CATEGORY_COLOURS[selected.category] ?? "bg-muted text-muted-foreground"
                )}
              >
                {selected.category}
              </span>
              <span className="text-xs text-muted-foreground">
                {selected.readTime} min read
              </span>
            </div>
            <h1 className="text-2xl font-bold text-foreground leading-tight mb-2">
              {selected.title}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {selected.summary}
            </p>
          </div>

          {/* Article body */}
          {selected.content}
        </article>
      </div>
    </PageLayout>
  );
}
