# React Rules

## Component Structure

- One component per file
- Use function components with hooks
- Export default for page components
- Named exports for utility components

## State Management

- TanStack Query for server state
- React Context for global client state (Auth)
- Local useState for component-specific state
- Avoid prop drilling with context

## Patterns

```tsx
// Page component
export default function GPNet2Dashboard() {
  const { data: cases, isLoading } = useQuery({
    queryKey: ['cases'],
    queryFn: () => fetch('/api/gpnet2/cases').then(r => r.json()),
  });

  if (isLoading) return <Loading />;
  return <CasesTable cases={cases} />;
}

// Reusable component
interface Props {
  workerCase: WorkerCase;
  onSelect: (id: string) => void;
}

export function CaseRow({ workerCase, onSelect }: Props) {
  return (
    <tr onClick={() => onSelect(workerCase.id)}>
      {/* ... */}
    </tr>
  );
}
```

## Styling

- Use Tailwind CSS utility classes
- Component variants with class-variance-authority (cva)
- Use `cn()` helper for conditional classes
- shadcn/ui components in `client/src/components/ui/`

## Forms

- Use react-hook-form with Zod validation
- Show loading states during submission
- Display validation errors inline
- Disable submit button while loading

## Performance

- Use `useMemo` for expensive calculations
- Use `useCallback` for stable function references
- Avoid unnecessary re-renders
- Lazy load heavy components
