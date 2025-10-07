// client/src/components/Layout.tsx
import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Home, LogOut, User, Settings } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    const userRole = (user as any)?.role;
    switch (userRole) {
      case 'admin':
        setLocation('/admin');
        break;
      case 'manager':
        setLocation('/dashboard/manager');
        break;
      case 'supervisor':
      case 'user':
      default:
        setLocation('/dashboard/user');
        break;
    }
  };

  const getInitials = () => {
    const firstName = (user as any)?.firstName || "";
    const lastName = (user as any)?.lastName || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatRole = (role: string) => {
    const roleMap: Record<string, string> = {
      'admin': 'Administrador',
      'manager': 'Gerente',
      'supervisor': 'Supervisor',
      'user': 'Usuario',
      'department': 'Departamento'
    };
    return roleMap[role] || role;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Lado izquierdo - Logo y botón Home */}
            <div className="flex items-center gap-3">
              {/* Botón Home */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoHome}
                className="flex items-center gap-2 hover:bg-primary/10 transition-colors"
                title="Ir al Dashboard Principal"
              >
                <Home className="h-4 w-4 text-primary" />
                <span className="hidden sm:inline text-primary font-semibold text-base">Dashboard</span>
              </Button>
              
              {/* Título centrado */}
              <div className="absolute left-1/2 transform -translate-x-1/2 top-1/2 -translate-y-1/2">
                <span className="text-xl font-bold text-primary whitespace-nowrap">
                  Gestión de Incidencias
                </span>
              </div>
            </div>
            
            {/* Lado derecho - Menú de usuario */}
            <div className="flex items-center space-x-4 ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 h-auto px-3 py-2 hover:bg-primary/10 transition-colors"
                  >
                    {/* Avatar con iniciales */}
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-sm font-semibold shadow-sm">
                      {getInitials()}
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-medium text-foreground">
                        {(user as any)?.firstName} {(user as any)?.lastName}
                      </p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {/* Información del usuario en el menú */}
                  <div className="px-2 py-3 border-b">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-sm font-semibold">
                        {getInitials()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {(user as any)?.firstName} {(user as any)?.lastName}
                        </p>
                        {(user as any)?.email && (
                          <p className="text-xs text-muted-foreground truncate">
                            {(user as any)?.email}
                          </p>
                        )}
                        <p className="text-xs text-primary font-medium">
                          {formatRole((user as any)?.role)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Opciones del menú */}
                  <div className="py-1">
                    <DropdownMenuItem onClick={handleGoHome} className="cursor-pointer">
                      <Home className="mr-2 h-4 w-4 text-primary" />
                      <span>Dashboard Principal</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Mi Perfil</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Configuración</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem 
                      onClick={logout} 
                      className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Cerrar Sesión</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full">
        {children}
      </main>
    </div>
  );
}