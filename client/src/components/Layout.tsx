import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Bell, Plus, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  const navigation = [
    { name: "Dashboard", href: "/", current: location === "/" },
    { name: "Incidencias", href: "/incidents", current: location === "/incidents" },
    { name: "Reportes", href: "/reports", current: location === "/reports" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Navigation */}
      <nav className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-primary" data-testid="text-app-title">
                  IncidentTracker
                </h1>
              </div>
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  {navigation.map((item) => (
                    <Link key={item.name} href={item.href}>
                      <a
                        className={
                          item.current
                            ? "bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium"
                            : "text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium"
                        }
                        data-testid={`link-nav-${item.name.toLowerCase()}`}
                      >
                        {item.name}
                      </a>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                className="bg-accent text-accent-foreground px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-accent/90"
                data-testid="button-new-incident"
              >
                <Plus className="h-4 w-4" />
                Nueva Incidencia
              </Button>

              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                  data-testid="button-notifications"
                >
                  <Bell className="h-5 w-5" />
                </Button>
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                  3
                </span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2 text-sm font-medium text-foreground hover:text-muted-foreground"
                    data-testid="button-user-menu"
                  >
                    <span className="hidden md:block" data-testid="text-user-name">
                      {(user as any)?.firstName || (user as any)?.email || "Usuario"}
                    </span>
                    <div className="h-8 w-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
                      {(user as any)?.firstName ? (user as any).firstName.charAt(0).toUpperCase() : 
                       (user as any)?.email ? (user as any).email.charAt(0).toUpperCase() : "U"}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Perfil</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = "/api/logout"}>
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
