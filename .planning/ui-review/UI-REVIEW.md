# Preventli UI Review — 2026-05-02

**Audited by:** Claude (standalone visual/UX audit, code-only — no live screenshots)
**Repo state:** post `gpnet→preventli` rebrand + Codex overnight QA fixes
**Pages audited:** Login, Employer Dashboard (×2 — one is dead code), Case Summary, CaseDetailPanel (dead code)

---

## TL;DR

- **Overall score: 13 / 24** (Copywriting 3, Visuals 2, Color 2, Typography 2, Spacing 2, Experience 2)
- The product is functional and visually adequate, but inconsistent enough that a single design pass — focused on **tokens, primitives, and a brand decision** — would lift every screen at once.

**Top 3 fixes (impact × effort):**

1. **Stop hardcoding colors in the Employer Dashboard. Migrate to shadcn tokens (`bg-card`, `text-foreground`, `border-primary`, `bg-destructive`).** Currently `bg-white`, `text-slate-900`, `bg-red-500→red-600` gradients, and a `border-blue-600` spinner are sprinkled throughout `EmployerDashboardPage.tsx`. Result: dark mode is broken on this page, the brand can't shift centrally, and 8 stat cards each redeclare their own colour story. **Impact: HIGH. Effort: M.** Propagates everywhere.
2. **Delete two dead files and pick ONE icon library.** `client/src/pages/EmployerDashboard.tsx` and `client/src/components/CaseDetailPanel.tsx` have **zero imports anywhere** in the codebase — they're confusing future-you. Then commit to either Lucide (used by Login + Dashboard) or Material Symbols (157 occurrences across 30 files, used heavily on Case Summary). Both at once = visual incoherence. **Impact: M. Effort: S.**
3. **Extract three primitives: `<PageHeading>`, `<SectionTitle>`, `<PageSpinner>`.** Right now `LoginPage` uses `text-2xl font-bold`, `EmployerDashboardPage` stat cards use `text-3xl font-bold`, the Page-level h1 in `PageLayout` uses `text-xl font-bold`, and `CaseSummaryPage` mixes `text-sm font-semibold` for card titles. Spinners differ in 4 places (border-blue-600 div, Loader2 from lucide, material-symbols `progress_activity`, plain `<div>Loading...</div>`). One primitive each, swap-in everywhere. **Impact: HIGH. Effort: S.** Propagates everywhere.

---

## Per-page scores

### Login — `client/src/pages/LoginPage.tsx`

| Pillar | Score | Notes |
|---|---|---|
| Copywriting | 3/4 | "Welcome to Preventli" / "Sign in to your account to continue" is fine, no errors. Uses `autoComplete` correctly. |
| Visuals | 2/4 | Logo is a **placeholder `<div>P</div>`** (lines 58–61) — but `PageLayout.tsx` already imports the real `preventli-logo.svg`. Inconsistent first impression. |
| Color | 3/4 | Uses tokens (`bg-primary`, `text-primary-foreground`, `bg-background`). Clean. |
| Typography | 3/4 | Standard shadcn Card defaults. Solid. |
| Spacing | 4/4 | `space-y-1`, `space-y-4`, max-w-md card centered with min-h-screen — textbook. |
| Experience | 3/4 | Loading state present, errors surfaced via Alert, "Forgot password?" link, autocomplete attributes correct. Missing: no link to register / no trust signal (logo, "secured by", workplace context). |

**Login total: 18/24.** Genuinely solid screen — only friction is the placeholder logo.

### Employer Dashboard — `client/src/pages/EmployerDashboardPage.tsx` (THE LIVE ONE) + `EmployerDashboard.tsx` (DEAD CODE)

| Pillar | Score | Notes |
|---|---|---|
| Copywriting | 3/4 | Microcopy is good — "Return to Work plan requires your approval — {name}", "Your sign-off is required before the plan can proceed." Banner copy is action-oriented. Generic spots: `<h3>Need help managing cases?</h3>` and `Email Support` are vague. |
| Visuals | 2/4 | Strong gradient headers on the 3 action cards (`bg-gradient-to-r from-red-500 to-red-600`) feel dated/heavy. No worker avatars (just initial bubble), no data viz. The 4-stat row is conventional but lacks visual interest — pure number+icon. |
| Color | 1/4 | **The big one.** Eight `bg-white shadow-lg` cards (lines 146, 160, 177, 192, 229, 270, 317, 361, 431) directly hardcode white. `text-slate-600`, `text-slate-900`, `text-slate-100` everywhere. `border-blue-600` spinner. `from-red-500 to-red-600`, `from-amber-500 to-amber-600`, `from-blue-500 to-blue-600` gradient headers — none of this works in dark mode and none uses `--card`, `--foreground`, `--destructive`, `--primary`. Yellow approval banner uses raw `bg-yellow-50 border-yellow-400` — fine in light mode, broken in dark. |
| Typography | 2/4 | Stat numbers `text-3xl font-bold` (line 151), card titles via shadcn `<CardTitle>`, footer "Need help" `text-lg font-semibold`. Three sizes for "primary" headings on one screen. No type scale primitive. |
| Spacing | 3/4 | `space-y-6`, `gap-6`, `gap-8` on grids. Card padding consistent at `p-6`. Spacing rhythm is OK. |
| Experience | 2/4 | **Three navigation calls use `window.location.href = ...`** (lines 243, 284, 331) — full page reload, kills SPA performance and animations. Use `navigate()`. Loading + error states present. Empty state for "no critical actions" is implicit (card just hides). The "All Workers" roster has 3 badges per row + arrow — visually busy but functional. |

**EmployerDashboardPage total: 13/24.**

> **Dead code:** `pages/EmployerDashboard.tsx` is **not imported anywhere** (verified by grep — only `EmployerDashboardPage` is imported by `App.tsx:55` and `RoleBasedDashboard.tsx:3`). It's an older version of the same screen, simpler and using design tokens correctly (`bg-card`, `text-primary`, `bg-muted`). Delete it.

### Case Summary — `client/src/pages/CaseSummaryPage.tsx` + `components/CaseDetailPanel.tsx`

| Pillar | Score | Notes |
|---|---|---|
| Copywriting | 3/4 | Domain copy is precise: "Compliance Milestone Clock", "Risk Flags", "Termination audit flag". Mental health privacy notice (line 354) is well-written. The mitigation strategy bullets ("Escalate to senior case manager for review within 48 hours") are specific. Lifecycle stage labels imported from shared schema — good practice. |
| Visuals | 2/4 | **Mixes icon libraries on the same page**: `lucide-react` (RefreshCw line 10) AND `material-symbols-outlined` (`<span>` lookups for `psychology`, `info`, `verified_user`, `trending_up`, `medical_information`, `description`, `shield`, `accessibility`, `verified`, `health_and_safety`, `priority_high`, `calendar_month`, `groups`, `gavel`, `flag`, `arrow_back`, `do_not_disturb_on`, `progress_activity`). At least 30+ Material icons referenced by string ID — fragile, no tree-shake, depends on the global font being loaded. |
| Color | 2/4 | Uses some tokens (`text-primary`, `text-muted-foreground`, `bg-muted/50`) but ALSO hardcodes `bg-red-100 text-red-800`, `bg-amber-100 text-amber-800`, `bg-emerald-100 text-emerald-800` for risk badges (line 80–86) and 53+ other places. There's a `riskBadgeColor()` helper — good — but it returns hex-adjacent Tailwind utilities, not semantic tokens. The mental-health notice uses `border-purple-200 bg-purple-50 text-purple-800` — not in the design system at all. |
| Typography | 2/4 | **80 distinct `text-{size}` class instances** in this single file. CardTitle defaults compete with bespoke `text-sm font-semibold` (line 214), `text-xs font-semibold ... uppercase tracking-wide` (line 415, used for section labels in 4+ places — this should be a primitive `<Label>`). Numbers have inconsistent treatment. |
| Spacing | 2/4 | `space-y-6` between major sections, `space-y-4` within tabs, `space-y-2`/`space-y-3` for lists, `gap-4` for grids — generally OK rhythm, but the **8-tab `<TabsList grid-cols-8 h-12>`** (line 194) is too dense; on tablet widths every tab label collides. Cards inside tabs vary between `<Card>` (default padding) and explicit `<Card className="p-4">`. |
| Experience | 2/4 | 8 tabs is one too many — "Summary" and "Injury" overlap conceptually; "Risk" and "Recovery" do too. Loading state uses spinning material-symbols icon (different from dashboard spinner). Not-found state is good. No keyboard shortcuts for tab switching beyond Radix defaults. The persistent right-sidebar at `flex gap-6 items-start` (line 190) is a useful pattern but only commented, not always rendered (the file truncates before the sidebar content). The recovery timeline is lazy-loaded — good. |

**CaseSummaryPage total: 13/24.**

> **Dead code:** `components/CaseDetailPanel.tsx` is **not imported anywhere** (only its own `interface` and `export` references show up in grep). It's a 200+ line legacy panel. Delete it OR document its intended use.

---

## Findings by pillar

### 1. Copywriting (3/4)

- **Solid** — `EmployerDashboardPage.tsx:128` "Return to Work plan requires your approval — {workerName}" is action-oriented and personalised.
- **Solid** — `CaseSummaryPage.tsx:354` mental-health privacy notice is precise and informative.
- **Generic** — `EmployerDashboardPage.tsx:434` "Need help managing cases?" / "Email Support" is filler. **Fix:** name the actual contact ("Talk to your dedicated case manager: Lara — Reply within 4 business hrs") or remove.
- **Generic** — `EmployerDashboard.tsx:62` (DEAD) "Loading your workers..." — fine, but inconsistent vs other loaders.
- **No empty states for the action queues** — when there are zero critical actions the card just hides; users don't get a positive "All clear ✓" signal. **Fix:** add an explicit empty state with success-toned copy.

### 2. Visuals (2/4)

- **Logo placeholder on Login** — `LoginPage.tsx:58–61` uses a `<div className="bg-primary">P</div>` — but `PageLayout.tsx:2` imports the real SVG. **Fix:** import `preventliLogo` and render it.
- **Two icon libraries running simultaneously.** Lucide for everything in Login + Dashboard, Material Symbols for everything in Case Summary, both in some components. 157 `material-symbols-outlined` instances across 30 files; lucide imports just as wide. **Fix:** pick one. Lucide is the lighter, tree-shake-friendly choice for a Vite + Tailwind + shadcn stack.
- **Gradient headers on action cards** (`EmployerDashboardPage.tsx:230, 271, 318`) feel like 2018 SaaS. **Fix:** flat tokenized header (`bg-destructive/10 text-destructive` for critical, etc.) — calmer, dark-mode-safe.
- **No data viz on dashboard** — the most-used screen is pure cards-and-counters. **Fix (later):** small sparkline per stat showing 30-day trend.

### 3. Color (2/4)

This is the single largest propagating problem.

- **`bg-white` hardcoded 8 times in `EmployerDashboardPage.tsx`** (lines 146, 160, 177, 192, 229, 270, 317, 361, 431). Every one breaks in dark mode. **Fix:** `bg-card`.
- **`text-slate-{600|900|100|500|400}` hardcoded throughout `EmployerDashboardPage.tsx`** — should be `text-foreground`, `text-muted-foreground`, `text-card-foreground`.
- **`border-blue-600` spinner** (`EmployerDashboardPage.tsx:70`) — should be `border-primary`.
- **Status colors duplicated as raw Tailwind utilities** — `bg-red-{100|500|600|700}`, `bg-amber-{100|500|600|700}`, `bg-emerald-{100|600|700}`, `bg-yellow-{50|100|400}` appear inline 60+ times across the three pages. **Fix:** central `<StatusBadge variant="critical|urgent|routine|active">` component. Ditto `<RiskBadge level="High|Medium|Low">` (CaseSummaryPage already has `riskBadgeColor()` — promote it to a component).
- **`brand-tokens.css` defines `--brand-green`, `--brand-navy`, `--brand-amber` as "additive"** — but they appear nowhere in the audited files. The shadcn `--primary` is blue (`217 91% 48%`). **Fix:** decide. Either the marketing-site mint green is the brand and `--primary` should map to it, or it's a marketing-only accent and the docs comment should say so explicitly. Right now the brand is silently ignored in-app.
- **Mental health notice uses `border-purple-200 bg-purple-50`** (`CaseSummaryPage.tsx:354`) — purple is not in the palette. **Fix:** define a semantic token (`--info` / `--mental-health`) or use the existing accent.

### 4. Typography (2/4)

- **No heading primitives.** h1 / page title uses different classes on every page:
  - `LoginPage.tsx:63` — `text-2xl font-bold` (CardTitle default)
  - `PageLayout.tsx:124` — `text-xl font-bold` (this is the page-level h1!)
  - `EmployerDashboard.tsx:74` (DEAD) — `text-2xl font-bold text-primary`
  - `EmployerDashboardPage.tsx:151` (stat numbers) — `text-3xl font-bold`
- **80 distinct `text-{xs|sm|base|lg|xl|2xl|3xl}` classes** in `CaseSummaryPage.tsx` alone. No tokenized scale.
- **The "section label" pattern** (`text-xs font-semibold text-muted-foreground uppercase tracking-wide`) appears verbatim ~6 times in `CaseSummaryPage.tsx:415, 472, 567, ...`. **Fix:** `<SectionLabel>` primitive.
- **Inter is the chosen font** (`index.css:86`) — fine for a data-dense product. No actual issue with the font itself.

**Fix bundle:**
```tsx
// client/src/components/typography.tsx
export const PageHeading = ({ children, ...p }) => <h1 className="text-2xl font-bold tracking-tight" {...p}>{children}</h1>;
export const SectionTitle = ({ children, ...p }) => <h2 className="text-lg font-semibold" {...p}>{children}</h2>;
export const SectionLabel = ({ children, ...p }) => <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" {...p}>{children}</p>;
```

### 5. Spacing (2/4)

- **8-tab TabsList on Case Summary** (`CaseSummaryPage.tsx:194` — `grid-cols-8 h-12`) — labels collide on viewports < 1100px. **Fix:** consolidate to 5–6 tabs (merge Risk into Summary, merge Recovery into Timeline) or switch to scrolling tab strip.
- **Card padding inconsistencies** — Some cards use `<CardContent className="p-6">`, others use default, some use `<Card className="p-4">` directly bypassing CardContent. **Fix:** use shadcn defaults; only override when there's a semantic reason.
- **Stat cards on Dashboard use `gap-6`** (line 145) but Stats on dead `EmployerDashboard.tsx:105` use `gap-4`. The live one is more breathable — codify.
- **"All Workers" row** (`EmployerDashboardPage.tsx:387`) is `px-4 py-3` while action queue rows (line 242) are `p-4`. Almost-the-same-but-different.

### 6. Experience Design (2/4)

- **`window.location.href` used 3x** instead of `navigate()` — `EmployerDashboardPage.tsx:243, 284, 331`. Full page reloads on a SPA. **Fix:** use the `navigate()` already imported on line 9.
- **Login lacks a registration / "no account?" link** — only "Forgot password?" — yet the schema has `user_invites`. If invite-only, say so ("Don't have an account? Your employer will send you an invite.").
- **Loading-state primitives are inconsistent** — 4 different patterns:
  - `LoginPage.tsx:133` — `<Loader2 className="animate-spin" />`
  - `EmployerDashboardPage.tsx:69–71` — `<div className="border-4 border-blue-600 border-t-transparent rounded-full animate-spin">`
  - `CaseSummaryPage.tsx:49–52` — `<span className="material-symbols-outlined animate-spin">progress_activity</span>`
  - `EmployerDashboard.tsx:63` (DEAD) — `<div className="text-lg">Loading your workers...</div>`
- **8 tabs** (Case Summary) violates Miller's law and crowds tablet view. The `Recovery` tab is also lazy-loaded (line 27) so it costs nothing to merge.
- **No skeleton states** anywhere — only spinners. shadcn ships `Skeleton` (`components/ui/skeleton.tsx` is in the repo) but isn't used by any audited page.
- **Mobile** — `PageLayout.tsx:79` hides sidebar `lg:block` (≥1024px) but no hamburger replacement is rendered for mobile (the mobile logout button on line 136 is the only nav fallback). Roster rows on dashboard wrap awkwardly under 640px (3 badges + arrow + 8×8 avatar).
- **Accessibility quick wins** — Login is fine. Dashboard action cards: clickable `<div onClick>` with no `role="button"`, no keyboard handler (`onKeyDown` for Enter/Space). Lines 242, 282, 330, 388. Same on the worker roster.

---

## Prioritized fix list

| # | Fix | Pillar | Impact | Effort | Files |
|---|---|---|---|---|---|
| 1 | Replace hardcoded `bg-white`, `text-slate-*`, `border-blue-600` etc. on Employer Dashboard with tokens (`bg-card`, `text-foreground`, `border-primary`) | Color | HIGH | M | `pages/EmployerDashboardPage.tsx` |
| 2 | Delete dead code: `pages/EmployerDashboard.tsx` and `components/CaseDetailPanel.tsx` | EX | M | XS | 2 files |
| 3 | Choose ONE icon library (recommend Lucide); migrate Case Summary off `material-symbols-outlined` | Visuals | HIGH | M | `pages/CaseSummaryPage.tsx` + 29 others |
| 4 | Extract `<PageHeading>` / `<SectionTitle>` / `<SectionLabel>` / `<PageSpinner>` primitives, swap in everywhere | Typography | HIGH | S | new `components/typography.tsx`; mass replace |
| 5 | Replace `window.location.href` with `navigate()` in dashboard click handlers (lines 243, 284, 331) | EX | M | XS | `pages/EmployerDashboardPage.tsx` |
| 6 | Promote `riskBadgeColor()` to `<RiskBadge>` + `<StatusBadge>` components; drop inline `bg-red-100 text-red-800` etc. | Color | HIGH | S | `pages/CaseSummaryPage.tsx`, `pages/EmployerDashboardPage.tsx` |
| 7 | Fix Login logo: import `preventliLogo` SVG instead of `<div>P</div>` placeholder | Visuals | M | XS | `pages/LoginPage.tsx:58–62` |
| 8 | Reduce Case Summary tabs from 8 → 5 (merge Risk into Summary, Recovery into Timeline, or hide on mobile) | EX | M | M | `pages/CaseSummaryPage.tsx:194` |
| 9 | Remove gradient headers (`from-red-500 to-red-600` etc.) on dashboard action cards; replace with flat tokenized variant | Visuals | M | S | `pages/EmployerDashboardPage.tsx:230, 271, 318` |
| 10 | Add `role="button"` + `onKeyDown` for Enter/Space to all clickable `<div>` rows on Dashboard | EX (a11y) | M | S | `pages/EmployerDashboardPage.tsx` |
| 11 | Define `--info` / `--brand-mental-health` token; replace inline `border-purple-200 bg-purple-50 text-purple-800` | Color | LOW | XS | `index.css`, `pages/CaseSummaryPage.tsx:354` |
| 12 | Decide on `--brand-green` / `--brand-navy` integration — either mint-green becomes `--primary` or document the tokens are marketing-only | Color | M | M | `styles/brand-tokens.css`, `index.css` |
| 13 | Replace spinners with shadcn `Skeleton` blocks where the data shape is predictable | EX | M | M | dashboard, case summary |
| 14 | Add a "Don't have an account?" / "Get an invite" line to Login | Copywriting | LOW | XS | `pages/LoginPage.tsx` |

---

## Recommended scope for first design pass

Spend the first day on **fixes 1, 2, 4, 5, 7** — these are pure cleanup with immediate, visible payoff and zero design debate. They get the codebase into a state where every other change becomes mechanical:

- Hardcoded colors → tokens (#1) means dark mode works on the most-used screen.
- Dead code deletion (#2) eliminates the "which file is real?" tax for every future change.
- Typography primitives (#4) means the next page someone builds doesn't reinvent the type scale for the fourth time.
- `navigate()` swap (#5) and Login logo (#7) are 5-minute wins.

Day-1 deliverable: a PR titled "chore(ui): tokenize dashboard colors, delete dead screens, extract typography primitives." Reviewable in 30 minutes, propagates to every screen.

The second design pass should tackle **#3 (icon library) + #6 (RiskBadge/StatusBadge components) + #9 (flat action card headers)** — these are larger-touch but give the product its first "looks designed" moment. RiskBadge propagates to ~12 places; deleting Material Symbols removes a global font load and a category of bugs ("why doesn't this icon render?" / "why is the icon font flashing?").

The third pass — only after the above is shipped and stable — is the **brand decision (#12)**. Right now `brand-tokens.css` is a Schrödinger's cat: defined but unused, marketing-aligned but not in-app. Pick one of three paths:
1. **Mint-green as `--primary`** — strongest brand consistency with marketing site, but turns every primary button mint.
2. **Mint-green as a single brand-moment accent** (logo dot, hero CTA, sidebar accent stripe) — keeps the data-dense product blue-primary, marketing-aligned only at the edges.
3. **Drop `brand-tokens.css`** and stay all-blue in-app — least disruption.

Path 2 is what `brand-tokens.css` *says* it wants ("These are ADDITIVE — use them for brand moments only"); make it real by using the tokens somewhere. The Login page logo, the sidebar logo, and the primary CTA on the marketing site's signed-in landing are the natural homes.

The fourth pass is the harder questions: **8 tabs → 5 on Case Summary**, **skeleton loading states**, **mobile sidebar**, **dashboard data viz**. These are real product decisions, not cleanup, so they deserve their own scoped review with the actual users (employers, insurers, clinicians) before being implemented.
