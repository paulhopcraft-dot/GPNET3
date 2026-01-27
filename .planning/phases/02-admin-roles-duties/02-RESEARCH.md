# Phase 2: Admin - Roles & Duties - Research

**Researched:** 2026-01-26
**Domain:** Admin CRUD UI for RTW job roles and duties management
**Confidence:** HIGH

## Summary

This phase builds an admin UI for managing job roles and their associated duties, including physical and cognitive demand matrices. The research confirms this is a standard CRUD interface pattern that the existing codebase already implements well (e.g., CompanyList, CompanyForm, organizations admin routes).

The database schema is already complete from Phase 1, with three tables: `rtw_roles`, `rtw_duties`, and `rtw_duty_demands`. The standard approach is to follow the existing patterns: Express routes with Drizzle ORM for the backend, React pages with TanStack Query and react-hook-form for the frontend, using shadcn/ui components.

**Primary recommendation:** Follow the existing admin organization/company CRUD pattern exactly - no new libraries needed, no architectural changes required.

## Standard Stack

### Core (Already in Project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TanStack Query | 4.x | Server state management | Already used throughout app (useQuery, useMutation) |
| react-hook-form | 7.x | Form state + validation | Used in CompanyForm, proven pattern |
| Zod | 3.x | Schema validation | Used for API input validation |
| Drizzle ORM | 0.x | Database queries | Project standard, schema already defined |
| shadcn/ui | latest | UI components | Project design system |

### Supporting (Already in Project)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @hookform/resolvers | 3.x | Zod-to-RHF integration | Form validation |
| lucide-react | latest | Icons | UI icons (Plus, Pencil, Trash2, Copy) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-hook-form | Formik | react-hook-form already in use, better performance |
| Manual state | Redux/Zustand | Overkill for form state, TanStack Query handles server state |
| Custom table | AG Grid / TanStack Table | Table component already exists and is sufficient |

**Installation:**
No additional packages needed - all required libraries already installed.

## Architecture Patterns

### Recommended Project Structure

```
client/src/
  pages/admin/
    roles/
      RolesList.tsx          # ADMIN-01: List all roles
      RoleForm.tsx           # ADMIN-02, 03, 04: Create/Edit/Delete
    duties/
      DutiesList.tsx         # ADMIN-05: List duties for role
      DutyForm.tsx           # ADMIN-06, 10, 11: Create/Edit/Delete
      DutyDemandsForm.tsx    # ADMIN-07, 08, 09: Physical/cognitive demands
  components/
    DemandFrequencyMatrix.tsx  # Shared frequency selector component
    RiskFlagsInput.tsx         # Multi-select for risk flags

server/
  routes/admin/
    roles.ts                 # All role CRUD endpoints
    duties.ts                # All duty CRUD endpoints (including demands)
```

### Pattern 1: Admin List Page

**What:** List page with search, table display, action buttons
**When to use:** ADMIN-01, ADMIN-05
**Example:**

```typescript
// Source: Existing pattern from CompanyList.tsx
export default function RolesList() {
  const [search, setSearch] = useState("");
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery<{ data: RTWRole[] }>({
    queryKey: ["/api/admin/roles", { search, organizationId: user?.organizationId }],
  });

  const roles = data?.data || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Job Roles</CardTitle>
          <Link to="/admin/roles/new">
            <Button><Plus className="h-4 w-4 mr-2" />Add Role</Button>
          </Link>
        </div>
        {/* Search input */}
      </CardHeader>
      <CardContent>
        <Table>
          {/* Table content */}
        </Table>
      </CardContent>
    </Card>
  );
}
```

### Pattern 2: Admin Form Page (Create/Edit)

**What:** Form page using react-hook-form with Zod validation
**When to use:** ADMIN-02, 03, 06, 10
**Example:**

```typescript
// Source: Existing pattern from CompanyForm.tsx
const roleSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  description: z.string().optional(),
});

export default function RoleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditing = Boolean(id);

  const { data: roleData, isLoading } = useQuery({
    queryKey: ["/api/admin/roles", id],
    enabled: isEditing,
  });

  const form = useForm({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: "", description: "" },
  });

  const mutation = useMutation({
    mutationFn: async (data) => {
      const url = isEditing ? `/api/admin/roles/${id}` : "/api/admin/roles";
      const method = isEditing ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to save");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      navigate("/admin/roles");
      toast({ title: isEditing ? "Role updated" : "Role created" });
    },
  });

  // Form rendering with Input, Textarea, Switch components
}
```

### Pattern 3: Soft Delete with Active Check

**What:** Soft delete (set isActive=false) with check for active plans
**When to use:** ADMIN-04, ADMIN-11
**Example:**

```typescript
// Source: Existing pattern from admin/organizations.ts
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Check for active RTW plans using this role
  const activePlans = await db
    .select({ id: rtwPlans.id })
    .from(rtwPlans)
    .where(and(
      eq(rtwPlans.roleId, id),
      ne(rtwPlans.status, "draft")
    ))
    .limit(1);

  if (activePlans.length > 0) {
    return res.status(409).json({
      error: "Cannot delete role",
      message: "Role has active RTW plans",
    });
  }

  // Soft delete
  await db.update(rtwRoles)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(rtwRoles.id, id));

  res.json({ success: true });
});
```

### Pattern 4: Demand Frequency Matrix UI

**What:** Grid of frequency selectors for physical/cognitive demands
**When to use:** ADMIN-07, ADMIN-08
**Example:**

```tsx
// Source: Project-specific pattern derived from requirements
const FREQUENCIES = ["never", "occasionally", "frequently", "constantly"] as const;

const PHYSICAL_DEMANDS = [
  { key: "bending", label: "Bending" },
  { key: "squatting", label: "Squatting" },
  { key: "kneeling", label: "Kneeling" },
  // ... etc
];

function DemandFrequencyMatrix({ demands, onChange }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      <div></div>
      {FREQUENCIES.map(f => <div key={f} className="text-sm font-medium">{f}</div>)}

      {PHYSICAL_DEMANDS.map(demand => (
        <React.Fragment key={demand.key}>
          <Label>{demand.label}</Label>
          <RadioGroup
            value={demands[demand.key]}
            onValueChange={(v) => onChange({ ...demands, [demand.key]: v })}
            className="flex"
          >
            {FREQUENCIES.map(f => (
              <RadioGroupItem key={f} value={f} className="mr-2" />
            ))}
          </RadioGroup>
        </React.Fragment>
      ))}
    </div>
  );
}
```

### Pattern 5: Copy/Template Feature

**What:** Duplicate an entity with all child records
**When to use:** ADMIN-12
**Example:**

```typescript
// Source: Standard copy pattern
router.post("/:id/copy", async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { newName } = req.body;
  const organizationId = req.user!.organizationId;

  // Get original role
  const [original] = await db.select().from(rtwRoles).where(eq(rtwRoles.id, id));
  if (!original) return res.status(404).json({ error: "Role not found" });

  // Create copy with new name
  const [newRole] = await db.insert(rtwRoles).values({
    organizationId,
    name: newName || `${original.name} (Copy)`,
    description: original.description,
    isActive: true,
  }).returning();

  // Copy all duties
  const duties = await db.select().from(rtwDuties).where(eq(rtwDuties.roleId, id));

  for (const duty of duties) {
    const [newDuty] = await db.insert(rtwDuties).values({
      roleId: newRole.id,
      organizationId,
      name: duty.name,
      description: duty.description,
      isModifiable: duty.isModifiable,
      riskFlags: duty.riskFlags,
      isActive: true,
    }).returning();

    // Copy demands for this duty
    const [demands] = await db.select().from(rtwDutyDemands).where(eq(rtwDutyDemands.dutyId, duty.id));
    if (demands) {
      await db.insert(rtwDutyDemands).values({
        ...demands,
        id: undefined, // Let DB generate new ID
        dutyId: newDuty.id,
      });
    }
  }

  res.status(201).json({ success: true, data: newRole });
});
```

### Anti-Patterns to Avoid

- **Avoid N+1 queries:** When listing roles with duty counts, use a single query with JOIN or subquery
- **Avoid hard-coding frequencies:** Use the DemandFrequency type from schema.ts
- **Avoid deleting demand rows:** Update them in place (one-to-one relationship with duty)
- **Avoid skipping organization isolation:** Always filter by organizationId

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom validation | Zod + react-hook-form | Already in use, handles edge cases |
| Server state | useState + fetch | TanStack Query | Cache invalidation, loading states, error handling |
| Radio buttons | Custom implementation | shadcn/ui RadioGroup | Already available, accessible |
| Confirmation dialogs | window.confirm | AlertDialog component | Consistent UX |
| Toast notifications | Custom component | useToast hook | Already configured |

**Key insight:** The codebase already has established patterns for every operation this phase requires. Follow existing patterns exactly.

## Common Pitfalls

### Pitfall 1: Not Cascading Duty Demands

**What goes wrong:** Creating duty without creating demand record, or orphaning demand records on delete
**Why it happens:** Forgetting the one-to-one relationship between duties and demands
**How to avoid:** Always create demand record immediately after duty creation; the schema has CASCADE delete so demands auto-delete
**Warning signs:** Duties without demand records, API errors when loading duty details

### Pitfall 2: Organization Isolation

**What goes wrong:** Roles from one organization visible to another
**Why it happens:** Missing organizationId filter in queries
**How to avoid:** ALWAYS include `where(eq(table.organizationId, req.user.organizationId))` in all queries
**Warning signs:** Cross-tenant data leaks in testing

### Pitfall 3: Weight Limits Without Frequency

**What goes wrong:** Setting liftingMaxKg when lifting frequency is "never"
**Why it happens:** UI allows entering weight without selecting frequency
**How to avoid:** Conditionally show weight input only when frequency is not "never"
**Warning signs:** Confusing demand data that shows 10kg lifting limit but "never" frequency

### Pitfall 4: Active Plan Check on Delete

**What goes wrong:** Deleting a role that has active RTW plans referencing it
**Why it happens:** Not checking rtwPlans before soft-delete
**How to avoid:** Query rtwPlans for this roleId before allowing delete; reject with helpful error
**Warning signs:** Orphaned plans, broken plan display pages

### Pitfall 5: Form State Reset on Edit Mode

**What goes wrong:** Form shows stale data or previous form values when switching between create/edit
**Why it happens:** react-hook-form caches values, need explicit reset
**How to avoid:** Use form.reset() in useEffect when editing data loads (see CompanyForm.tsx pattern)
**Warning signs:** Edit form showing wrong role's data

## Code Examples

### API Route Structure

```typescript
// Source: Pattern from admin/organizations.ts

// GET /api/admin/roles - List all roles for organization
router.get("/", authorize(["admin"]), async (req: AuthRequest, res) => {
  const organizationId = req.user!.organizationId;
  const search = req.query.search as string | undefined;

  let query = db.select({
    id: rtwRoles.id,
    name: rtwRoles.name,
    description: rtwRoles.description,
    isActive: rtwRoles.isActive,
    createdAt: rtwRoles.createdAt,
    // Subquery for duty count
    dutyCount: sql<number>`(
      SELECT COUNT(*) FROM rtw_duties
      WHERE role_id = ${rtwRoles.id} AND is_active = true
    )`.as('duty_count'),
  })
  .from(rtwRoles)
  .where(and(
    eq(rtwRoles.organizationId, organizationId),
    eq(rtwRoles.isActive, true)
  ))
  .orderBy(asc(rtwRoles.name));

  if (search) {
    query = query.where(ilike(rtwRoles.name, `%${search}%`)) as typeof query;
  }

  const roles = await query;
  res.json({ success: true, data: roles });
});

// GET /api/admin/roles/:id - Get single role with duties
router.get("/:id", authorize(["admin"]), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const organizationId = req.user!.organizationId;

  const [role] = await db.select()
    .from(rtwRoles)
    .where(and(
      eq(rtwRoles.id, id),
      eq(rtwRoles.organizationId, organizationId)
    ));

  if (!role) {
    return res.status(404).json({ error: "Role not found" });
  }

  // Get duties with their demands
  const duties = await db.select({
    duty: rtwDuties,
    demands: rtwDutyDemands,
  })
  .from(rtwDuties)
  .leftJoin(rtwDutyDemands, eq(rtwDuties.id, rtwDutyDemands.dutyId))
  .where(and(
    eq(rtwDuties.roleId, id),
    eq(rtwDuties.isActive, true)
  ));

  res.json({
    success: true,
    data: { ...role, duties: duties.map(d => ({ ...d.duty, demands: d.demands })) }
  });
});
```

### Frontend Query Pattern

```typescript
// Source: Pattern from CompanyList.tsx, CompanyForm.tsx

// List hook
function useRoles() {
  const { user } = useAuth();
  return useQuery<{ data: RTWRole[] }>({
    queryKey: ["/api/admin/roles", { organizationId: user?.organizationId }],
  });
}

// Single role hook
function useRole(id: string | undefined) {
  return useQuery<{ data: RTWRoleWithDuties }>({
    queryKey: ["/api/admin/roles", id],
    enabled: Boolean(id),
  });
}

// Mutation hook
function useCreateRole() {
  return useMutation({
    mutationFn: async (data: CreateRoleInput) => {
      const response = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create role");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
    },
  });
}
```

### Demand Matrix Component

```tsx
// Source: Custom component for ADMIN-07, ADMIN-08

const DEMAND_FREQUENCIES = [
  { value: "never", label: "Never", color: "bg-gray-100" },
  { value: "occasionally", label: "Occasionally", color: "bg-blue-100" },
  { value: "frequently", label: "Frequently", color: "bg-yellow-100" },
  { value: "constantly", label: "Constantly", color: "bg-red-100" },
] as const;

const PHYSICAL_DEMANDS = [
  { key: "bending", label: "Bending" },
  { key: "squatting", label: "Squatting" },
  { key: "kneeling", label: "Kneeling" },
  { key: "twisting", label: "Twisting" },
  { key: "reachingOverhead", label: "Reaching Overhead" },
  { key: "reachingForward", label: "Reaching Forward" },
  { key: "lifting", label: "Lifting", hasWeight: true },
  { key: "carrying", label: "Carrying", hasWeight: true },
  { key: "standing", label: "Standing" },
  { key: "sitting", label: "Sitting" },
  { key: "walking", label: "Walking" },
  { key: "repetitiveMovements", label: "Repetitive Movements" },
];

const COGNITIVE_DEMANDS = [
  { key: "concentration", label: "Concentration" },
  { key: "stressTolerance", label: "Stress Tolerance" },
  { key: "workPace", label: "Work Pace" },
];

interface DemandMatrixProps {
  value: RTWDutyDemands;
  onChange: (demands: RTWDutyDemands) => void;
}

export function DemandMatrix({ value, onChange }: DemandMatrixProps) {
  const handleFrequencyChange = (key: string, frequency: string) => {
    const updates: Partial<RTWDutyDemands> = { [key]: frequency };

    // Clear weight if frequency is "never"
    if (frequency === "never") {
      if (key === "lifting") updates.liftingMaxKg = null;
      if (key === "carrying") updates.carryingMaxKg = null;
    }

    onChange({ ...value, ...updates });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium mb-4">Physical Demands</h3>
        <div className="space-y-3">
          {PHYSICAL_DEMANDS.map(demand => (
            <div key={demand.key} className="flex items-center gap-4">
              <Label className="w-40">{demand.label}</Label>
              <RadioGroup
                value={value[demand.key as keyof RTWDutyDemands] as string}
                onValueChange={(v) => handleFrequencyChange(demand.key, v)}
                className="flex gap-2"
              >
                {DEMAND_FREQUENCIES.map(freq => (
                  <div key={freq.value} className="flex items-center">
                    <RadioGroupItem value={freq.value} id={`${demand.key}-${freq.value}`} />
                    <Label htmlFor={`${demand.key}-${freq.value}`} className="ml-1 text-xs">
                      {freq.label.charAt(0)}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              {demand.hasWeight && value[demand.key as keyof RTWDutyDemands] !== "never" && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="kg"
                    className="w-20"
                    value={value[`${demand.key}MaxKg` as keyof RTWDutyDemands] || ""}
                    onChange={(e) => onChange({
                      ...value,
                      [`${demand.key}MaxKg`]: e.target.value ? parseInt(e.target.value) : null
                    })}
                  />
                  <span className="text-sm text-muted-foreground">kg max</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-4">Cognitive Demands</h3>
        <div className="space-y-3">
          {COGNITIVE_DEMANDS.map(demand => (
            <div key={demand.key} className="flex items-center gap-4">
              <Label className="w-40">{demand.label}</Label>
              <RadioGroup
                value={value[demand.key as keyof RTWDutyDemands] as string}
                onValueChange={(v) => handleFrequencyChange(demand.key, v)}
                className="flex gap-2"
              >
                {DEMAND_FREQUENCIES.map(freq => (
                  <div key={freq.value} className="flex items-center">
                    <RadioGroupItem value={freq.value} id={`${demand.key}-${freq.value}`} />
                    <Label htmlFor={`${demand.key}-${freq.value}`} className="ml-1 text-xs">
                      {freq.label.charAt(0)}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual fetch + useState | TanStack Query | Already adopted | Automatic caching, loading states |
| Formik | react-hook-form | Already adopted | Better performance, simpler API |
| Custom form validation | Zod schemas | Already adopted | Type safety, reusable validators |

**Deprecated/outdated:**
- Nothing deprecated in current patterns
- All existing admin patterns are current best practice

## Open Questions

1. **Navigation structure**
   - What we know: Admin routes exist under /admin/*
   - What's unclear: Should roles be at /admin/roles or /admin/rtw/roles?
   - Recommendation: Use /admin/roles to match /admin/companies pattern

2. **Risk flags implementation**
   - What we know: Schema has riskFlags as text array
   - What's unclear: What are the allowed risk flag values?
   - Recommendation: Use free-form text input with suggestions (lifting hazard, fall risk, etc.)

## Sources

### Primary (HIGH confidence)
- `C:\dev\gpnet3\server\routes\admin\organizations.ts` - Full CRUD pattern reference
- `C:\dev\gpnet3\client\src\pages\admin\CompanyList.tsx` - List page pattern
- `C:\dev\gpnet3\client\src\pages\admin\CompanyForm.tsx` - Form page pattern
- `C:\dev\gpnet3\shared\schema.ts` - Database schema (lines 1655-1716)
- `C:\dev\gpnet3\.planning\REQUIREMENTS.md` - ADMIN-01 to ADMIN-12 requirements

### Secondary (MEDIUM confidence)
- Existing shadcn/ui component inventory verified via Glob

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use
- Architecture: HIGH - Following exact existing patterns
- Pitfalls: HIGH - Based on schema analysis and project patterns

**Research date:** 2026-01-26
**Valid until:** 2026-02-26 (30 days - stable domain)
