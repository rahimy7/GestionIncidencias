// client/src/components/Layout.tsx - VERSIÓN MEJORADA
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, Home, Settings, ChevronDown } from "lucide-react";
import { useLocation } from "wouter";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  // Función para navegar al dashboard principal
  const handleGoHome = () => {
    setLocation('/');
  };

  // Obtener iniciales del usuario
  const getInitials = () => {
    const firstName = (user as any)?.firstName || '';
    const lastName = (user as any)?.lastName || '';
    const email = (user as any)?.email || '';
    
    if (firstName && lastName) {
      return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    } else if (firstName) {
      return firstName.charAt(0).toUpperCase();
    } else if (email) {
      return email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Formatear rol para mostrar
  const formatRole = (role: string) => {
    const roleMap: { [key: string]: string } = {
      'admin': 'Administrador',
      'manager': 'Gerente',
      'user': 'Usuario',
      'employee': 'Empleado'
    };
    return roleMap[role?.toLowerCase()] || role || 'Usuario';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              
              {/* Logo/Título */}
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
                    
                    {/* Info usuario - visible en pantallas medianas+ */}
                    <div className="hidden md:flex flex-col items-start text-left">
                      <span className="text-sm font-medium text-foreground leading-tight">
                        {(user as any)?.firstName || 'Usuario'}
                      </span>
                      <span className="text-xs text-muted-foreground leading-tight">
                        {formatRole((user as any)?.role)}
                      </span>
                    </div>
                    
                    {/* Ícono flecha */}
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </Button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent align="end" className="w-64">
                  {/* Header del menú */}
                  <div className="flex items-center gap-3 p-3 border-b">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold">
                      {getInitials()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {(user as any)?.firstName} {(user as any)?.lastName || ''}
                      </p>
                      {(user as any)?.email && (
                        <p className="text-sm text-muted-foreground truncate">
                          {(user as any).email}
                        </p>
                      )}
                      <p className="text-xs text-primary font-medium">
                        {formatRole((user as any)?.role)}
                      </p>
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
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}