import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const navItems = [
  { path: "/", label: "Dashboard", icon: "dashboard" },
  { path: "/cases", label: "Cases", icon: "folder_open" },
  { path: "/claims/new", label: "New Claim", icon: "add_circle" },
  { path: "/rtw-planner", label: "RTW Planner", icon: "event_available" },
  { path: "/checkins", label: "Check-ins", icon: "task_alt" },
  { path: "/financials", label: "Financials", icon: "payments" },
  { path: "/predictions", label: "Predictions", icon: "analytics" },
  { path: "/risk", label: "Risk", icon: "warning" },
  { path: "/audit", label: "Audit Log", icon: "history" },
];

export function PageLayout({ children, title, subtitle }: PageLayoutProps) {
  const location = useLocation();

  return (
    <div className="flex h-screen">
      <aside className="hidden lg:block w-64 flex-shrink-0 bg-sidebar p-4 border-r border-sidebar-border">
        <div className="mb-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="bg-primary/20 rounded-full size-10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">corporate_fare</span>
            </div>
            <h1 className="text-sidebar-foreground text-xl font-bold">Preventli</h1>
          </Link>
          <div className="mt-1 ml-13 text-xs text-sidebar-foreground/60">
            Workers' Compensation
          </div>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                location.pathname === item.path
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <span className="material-symbols-outlined text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div>
            <h1 className="text-xl font-bold text-card-foreground">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
