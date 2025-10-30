import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Building2, Users, FileText, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface OrganizationCardProps {
  name: string;
  caseCount: number;
  activeUsers: number;
  logo?: string;
}

export function OrganizationCard({ name, caseCount, activeUsers, logo }: OrganizationCardProps) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <Card className="hover-elevate" data-testid={`card-org-${name.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <div className="flex items-center gap-3 flex-1">
          <Avatar className="h-10 w-10">
            {logo ? (
              <img src={logo} alt={name} className="object-cover" />
            ) : (
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            )}
          </Avatar>
          <CardTitle className="text-base font-semibold" data-testid={`text-org-name-${name.toLowerCase().replace(/\s+/g, '-')}`}>
            {name}
          </CardTitle>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-org-menu-${name.toLowerCase().replace(/\s+/g, '-')}`}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => console.log(`View ${name}`)}>View Details</DropdownMenuItem>
            <DropdownMenuItem onClick={() => console.log(`Edit ${name}`)}>Edit Organization</DropdownMenuItem>
            <DropdownMenuItem onClick={() => console.log(`Manage users for ${name}`)}>Manage Users</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>Cases</span>
          </div>
          <span className="font-semibold" data-testid={`text-case-count-${name.toLowerCase().replace(/\s+/g, '-')}`}>
            {caseCount}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Active Users</span>
          </div>
          <span className="font-semibold" data-testid={`text-active-users-${name.toLowerCase().replace(/\s+/g, '-')}`}>
            {activeUsers}
          </span>
        </div>
        <Button className="w-full mt-2" variant="outline" onClick={() => console.log(`View cases for ${name}`)} data-testid={`button-view-cases-${name.toLowerCase().replace(/\s+/g, '-')}`}>
          View Cases
        </Button>
      </CardContent>
    </Card>
  );
}

export function OrganizationGrid() {
  // TODO: remove mock functionality
  const organizations = [
    { name: "TechCorp Inc", caseCount: 342, activeUsers: 12 },
    { name: "Global Solutions", caseCount: 218, activeUsers: 8 },
    { name: "StartUp Labs", caseCount: 156, activeUsers: 5 },
    { name: "Enterprise Co", caseCount: 289, activeUsers: 15 },
    { name: "Innovation Hub", caseCount: 124, activeUsers: 6 },
    { name: "Digital Ventures", caseCount: 155, activeUsers: 7 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {organizations.map((org) => (
        <OrganizationCard key={org.name} {...org} />
      ))}
    </div>
  );
}
