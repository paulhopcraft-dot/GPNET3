import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  ClipboardPlus,
  Calendar,
  DollarSign,
  Activity,
  Shield,
  MessageSquare,
  Brain,
  Users,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";

interface MainLayoutProps {
  children: ReactNode;
}

const navigationItems = [
  {
    title: "Overview",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Cases", href: "/cases", icon: FileText },
    ],
  },
  {
    title: "Case Management",
    items: [
      { name: "New Claim", href: "/claims/new", icon: ClipboardPlus },
      { name: "RTW Planner", href: "/rtw-planner", icon: Calendar },
      { name: "Check-ins", href: "/checkins", icon: MessageSquare },
    ],
  },
  {
    title: "Analytics",
    items: [
      { name: "Financials", href: "/financials", icon: DollarSign },
      { name: "Predictions", href: "/predictions", icon: Brain },
      { name: "Risk Dashboard", href: "/risk", icon: Activity },
    ],
  },
  {
    title: "Compliance",
    items: [
      { name: "Audit Log", href: "/audit", icon: Shield },
    ],
  },
  {
    title: "Admin",
    items: [
      { name: "Users", href: "/users", icon: Users },
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

function NavItem({ item, collapsed = false }: { item: { name: string; href: string; icon: any }; collapsed?: boolean }) {
  const location = useLocation();
  const isActive = location.pathname === item.href ||
    (item.href !== "/" && location.pathname.startsWith(item.href));

  return (
    <NavLink
      to={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
        isActive ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground"
      )}
    >
      <item.icon className="h-4 w-4 flex-shrink-0" />
      {!collapsed && <span>{item.name}</span>}
    </NavLink>
  );
}

function SidebarContent({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <ScrollArea className="flex-1 px-3">
      <div className="space-y-6 py-4">
        {navigationItems.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <h4 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </h4>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavItem key={item.href} item={item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();

  const getInitials = (email: string) => {
    const parts = email.split("@")[0].split(".");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  const initials = user ? getInitials(user.email) : "??";
  const displayName = user?.email.split("@")[0] || "User";
  const displayRole = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "User";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-2 px-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium">{displayName}</p>
            <p className="text-xs text-muted-foreground">{displayRole}</p>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuItem>Preferences</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            GP
          </div>
          <span className="text-lg font-semibold">GPNet</span>
        </div>
        <SidebarContent />
        <div className="border-t p-3">
          <UserMenu />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex h-16 items-center gap-2 border-b px-6">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                    GP
                  </div>
                  <span className="text-lg font-semibold">GPNet</span>
                </div>
                <SidebarContent />
                <div className="border-t p-3">
                  <UserMenu />
                </div>
              </SheetContent>
            </Sheet>
            <span className="text-lg font-semibold">GPNet</span>
          </div>
          <ThemeToggle />
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:flex h-16 items-center justify-between border-b px-6">
          <div />
          <ThemeToggle />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
