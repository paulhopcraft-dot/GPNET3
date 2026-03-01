# GPNet System Design Guidelines

## Design Approach

**Selected Approach:** Design System with B2B SaaS Focus

Drawing inspiration from Linear's clean efficiency, Notion's information architecture, and Material Design's data-handling patterns, this design prioritizes clarity, efficiency, and professional trust for enterprise HR/compliance workflows.

**Core Principles:**
1. **Data Clarity First** - Information hierarchy guides every layout decision
2. **Efficient Workflows** - Minimize clicks, maximize context
3. **Professional Trust** - Visual consistency signals reliability and security
4. **Scalable Patterns** - Reusable components across tenant organizations

---

## Typography System

**Font Stack:**
- Primary: Inter (via Google Fonts CDN)
- Monospace: JetBrains Mono (for case IDs, reference numbers)

**Hierarchy:**
- Page Titles: 2xl, semibold (dashboard headers, main navigation)
- Section Headers: xl, semibold (case details, data sections)
- Subsection Headers: lg, medium (card titles, form sections)
- Body Text: base, regular (data fields, descriptions)
- Supporting Text: sm, regular (metadata, timestamps, helper text)
- Label Text: sm, medium (form labels, table headers)
- Micro Text: xs, regular (status badges, tooltips)

**Line Height:**
- Headings: tight (1.2)
- Body: relaxed (1.625)
- Dense data displays: normal (1.5)

---

## Layout System

**Spacing Primitives:** Use Tailwind units: 2, 4, 6, 8, 12, 16, 24

**Application Layout:**
- Sidebar Navigation: Fixed width 64 (collapsed) or 256 (expanded)
- Main Content Area: Full width with max-w-7xl container, px-6 to px-8
- Page Padding: py-6 to py-8
- Card Spacing: p-6 for standard cards, p-4 for compact variants
- Stack Spacing: space-y-6 for major sections, space-y-4 for related groups

**Grid Systems:**
- Dashboard Metrics: 4-column grid (grid-cols-4) on desktop, 2 on tablet, 1 on mobile
- Case List Tables: Full-width with responsive column hiding
- Detail Views: 2-column layout (2/3 main content, 1/3 sidebar info)
- Form Layouts: Single column max-w-2xl for focus

**Responsive Breakpoints:**
- Mobile: Base styles, single column stacks
- Tablet (md:): 2-column layouts, compact navigation
- Desktop (lg:): Full multi-column, expanded navigation
- Wide (xl:): Maximum density, all columns visible

---

## Component Library

### Navigation
**Primary Sidebar:**
- Collapsible with icon-only compact mode
- Active state with subtle indicator bar
- Grouped by function: Dashboard, Cases, Organizations, Reports, Settings
- User profile and organization switcher at bottom

**Top Bar:**
- Organization context display with switcher dropdown
- Global search with keyboard shortcut indicator (⌘K)
- Notification bell with badge counter
- User avatar with status dropdown

### Data Display

**Case Dashboard:**
- Statistics Cards: 4-column grid showing total cases, pending reviews, completed, high-risk
- Each card: Large number (3xl, semibold), descriptive label (sm), trend indicator
- Spacing: gap-6 between cards

**Case List Table:**
- Sticky header row with sortable columns
- Row hover states with subtle elevation
- Multi-select checkboxes for batch actions
- Columns: Case ID (monospace), Candidate Name, Organization, Status Badge, Risk Score, Assigned To, Date Submitted
- Pagination at bottom with items-per-page selector

**Case Detail View:**
- Left Content (2/3 width):
  - Timeline of check progress with vertical connector lines
  - Document upload area with drag-and-drop zone
  - Notes section with rich text editor
  - Activity log with avatar + timestamp + action
  
- Right Sidebar (1/3 width):
  - Case metadata card (ID, dates, assigned users)
  - Status progression stepper
  - Risk assessment panel with ML score visualization
  - Quick actions panel

**Status Badges:**
- Pill shape with minimal padding (px-2.5, py-0.5)
- Text size: xs, medium weight
- States: Pending, In Progress, Verification Required, Completed, Rejected

**Risk Indicators:**
- Visual scale from Low to High
- Numerical score with contextual indicator
- Historical trend line (sparkline style)

### Forms

**Input Fields:**
- Label above input with required asterisk if needed
- Input height: h-10 for standard, h-9 for compact
- Full width within max-w-2xl container
- Helper text below in sm size
- Error states with inline validation messages

**Form Groups:**
- Vertical spacing: space-y-4 within groups, space-y-6 between groups
- Section dividers with subtle visual break
- Multi-step forms with progress indicator at top

**Action Buttons:**
- Primary actions: Medium size (px-4, py-2), prominent position
- Secondary actions: Ghost or outline variant
- Destructive actions: Separate with spacing, confirmation modal
- Button groups: gap-2 or gap-3 for breathing room

### Modals & Overlays

**Dialog Modals:**
- Center-screen with backdrop overlay
- Max width: max-w-lg for forms, max-w-3xl for complex content
- Header with title (lg, semibold) and close button
- Content padding: p-6
- Footer with action buttons aligned right

**Sheets (Slide-over):**
- Right-side slide-in for detail views and filters
- Width: 25% to 33% of viewport (w-96 to w-[500px])
- Full height with scrollable content area
- Close trigger: X button, overlay click, or ESC key

**Tooltips:**
- Concise, single-line text
- Appear on hover with slight delay (150ms)
- Positioned contextually (top, bottom, left, right)

**Toasts/Notifications:**
- Bottom-right corner positioning
- Auto-dismiss after 4-6 seconds
- Action buttons inline for quick access
- Stack multiple notifications with gap-2

### AI Assistant

**Chat Interface:**
- Persistent floating button in bottom-right (fixed position)
- Expandable panel: w-96, max-h-[600px]
- Message bubbles: User messages aligned right, AI responses left
- Input at bottom with send button and attachment option
- Typing indicator during AI response generation
- Suggested quick actions as clickable chips

---

## Dashboard Layouts

### Main Dashboard
- Top row: 4 metric cards (grid-cols-4, gap-6)
- Middle section: Cases requiring attention (list view, max 5 items with "View All" link)
- Bottom section: Split 2-column layout
  - Left: Recent activity feed (2/3 width)
  - Right: Team workload chart (1/3 width)

### Case Management View
- Filters panel: Collapsible left sidebar (w-64) with filter categories in accordion
- Main area: Table with bulk actions toolbar above
- Quick view: Click row opens slide-over sheet without navigation

### Organization Management
- Card grid layout (grid-cols-3, gap-6)
- Each org card: Logo, name, case count, active users count, quick actions menu
- Add new organization: Prominent CTA card in grid

### Reports & Analytics
- Date range selector at top
- Visualization priority: Charts take 60% width, summary metrics 40%
- Export options clearly accessible
- Filterable by organization in multi-tenant view

---

## Images

**Dashboard Illustrations:**
- Empty states: Friendly illustrations when no cases exist (centered, max-w-md)
- Error states: Supportive visuals for 404s or failed operations

**Organization Logos:**
- Square aspect ratio for consistency
- Display at 40x40 (dashboard), 64x64 (org detail page)
- Fallback to organization initials in generated avatar

**Document Previews:**
- Thumbnail grid for uploaded verification documents
- Click to expand in lightbox modal
- File type icons for non-image formats

**No Hero Image:** This is a business application, not a marketing site. Focus on functional UI immediately visible.

---

## Interaction Patterns

**Loading States:**
- Skeleton screens for table rows and cards (pulse animation)
- Spinner for button actions (inline, small)
- Progress bars for multi-step processes

**Empty States:**
- Centered content with illustration, heading (lg), description (sm), and CTA button
- Provide context and next action clearly

**Error Handling:**
- Inline field errors (red text, sm size, below input)
- Toast notifications for system errors (dismissible)
- Full-page error states for critical failures with retry action

**Drag and Drop:**
- Document upload zones with dashed border
- Visual feedback on hover (border emphasis)
- File list appears below zone after drop

**Keyboard Navigation:**
- Support arrow keys for table row navigation
- Tab order follows logical flow
- Keyboard shortcuts for common actions (documented in help modal)

---

## Accessibility Consistency

- All interactive elements meet minimum touch target size (44x44px)
- Focus states visible with outline offset
- Sufficient contrast ratios for all text (WCAG AA minimum)
- ARIA labels on icon-only buttons
- Form inputs properly associated with labels
- Screen reader announcements for dynamic content updates
- Keyboard-accessible modals with focus trap