/**
 * Typography primitives — single source of truth for type hierarchy.
 *
 * Use these instead of redeclaring `text-2xl font-bold` etc. on every page.
 * Adding `className` extends the defaults; passing structural props (id, role)
 * passes through.
 */
import { cn } from "@/lib/utils";
import type { HTMLAttributes, PropsWithChildren } from "react";

type HeadingProps = PropsWithChildren<HTMLAttributes<HTMLHeadingElement>>;
type ParaProps = PropsWithChildren<HTMLAttributes<HTMLParagraphElement>>;

/** Page-level h1. Use once per page. */
export function PageHeading({ className, children, ...rest }: HeadingProps) {
  return (
    <h1 className={cn("text-2xl font-bold tracking-tight text-foreground", className)} {...rest}>
      {children}
    </h1>
  );
}

/** Section h2 inside a page (e.g. Card titles, panel headers). */
export function SectionTitle({ className, children, ...rest }: HeadingProps) {
  return (
    <h2 className={cn("text-lg font-semibold text-foreground", className)} {...rest}>
      {children}
    </h2>
  );
}

/** Small uppercase label for grouping fields or stat captions. */
export function SectionLabel({ className, children, ...rest }: ParaProps) {
  return (
    <p
      className={cn(
        "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
        className,
      )}
      {...rest}
    >
      {children}
    </p>
  );
}

/**
 * Token-aware loading spinner. Replaces ad-hoc `border-blue-600` divs and the
 * material-symbols-outlined `progress_activity` pattern.
 */
export function PageSpinner({ className, label }: { className?: string; label?: string }) {
  return (
    <div className={cn("flex items-center justify-center min-h-96", className)}>
      <div className="text-center space-y-4">
        <div
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"
          role="status"
          aria-label={label ?? "Loading"}
        />
        {label ? <p className="text-muted-foreground font-medium">{label}</p> : null}
      </div>
    </div>
  );
}
