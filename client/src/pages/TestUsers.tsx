import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Crown, Shield, User, Settings, ChevronRight, LogIn } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Definir el tipo de usuario
interface TestUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export function TestUsers() {
  const { data: testUsers = [], isLoading } = useQuery<TestUser[]>({
    queryKey: ["/api/test-users"],
  });

  const handleUserLogin = async (user: TestUser) => {
    try {
      // Primero hacer login real
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          password: 'password123' // Password por defecto para usuarios de prueba
        }),
      });

      if (response.ok) {
        const result = await response.json();
        localStorage.setItem('auth_token', result.token);

        toast({
          title: "Usuario cambiado",
          description: `Ahora estás conectado como ${user.firstName} ${user.lastName}`,
        });

        window.location.href = "/";
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      console.error("Error switching user:", error);
      toast({
        title: "Error",
        description: "No se pudo cambiar de usuario",
        variant: "destructive",
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-4 w-4" />;
      case "manager":
      case "supervisor":
        return <Shield className="h-4 w-4" />;
      case "user":
        return <User className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 border-red-200";
      case "manager":
      case "supervisor":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "user":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrador";
      case "manager":
        return "Gerente";
      case "supervisor":
        return "Supervisor";
      case "user":
        return "Usuario";
      default:
        return role;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Usuarios de Prueba</h1>
          <p className="text-muted-foreground text-lg">
            Selecciona un usuario para probar diferentes roles del sistema
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testUsers.map((user) => (
            <Card 
              key={user.id}
              className="hover:shadow-lg transition-shadow duration-200 border-2"
              data-testid={`card-test-user-${user.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getRoleIcon(user.role)}
                    <CardTitle className="text-lg">
                      {user.firstName} {user.lastName}
                    </CardTitle>
                  </div>
                  <Badge className={getRoleColor(user.role)}>
                    {getRoleDisplayName(user.role)}
                  </Badge>
                </div>
                <CardDescription className="text-sm">
                  {user.email}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    <strong>Permisos:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      {user.role === "admin" && (
                        <>
                          <li>Vista global del sistema</li>
                          <li>Gestión de usuarios</li>
                          <li>Reportes completos</li>
                        </>
                      )}
                      {(user.role === "manager" || user.role === "supervisor") && (
                        <>
                          <li>Gestión de centro</li>
                          <li>Asignar incidentes</li>
                          <li>Planes de acción</li>
                        </>
                      )}
                      {user.role === "user" && (
                        <>
                          <li>Reportar incidentes</li>
                          <li>Ver mis incidentes</li>
                          <li>Subir evidencias</li>
                        </>
                      )}
                      {user.role === "operator" && (
                        <>
                          <li>Ejecutar tareas</li>
                          <li>Actualizar estado</li>
                        </>
                      )}
                    </ul>
                  </div>
                  
                  <Button 
                    onClick={() => handleUserLogin(user)}
                    className="w-full flex items-center justify-center gap-2"
                    data-testid={`button-login-${user.id}`}
                  >
                    <LogIn className="h-4 w-4" />
                    Iniciar sesión como {user.firstName}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-900 mb-1">
                Información sobre los usuarios de prueba
              </h3>
              <p className="text-sm text-blue-700">
                Estos usuarios están diseñados para probar las diferentes funcionalidades del sistema.
                Cada rol tiene permisos específicos que permiten acceder a diferentes secciones y realizar
                distintas acciones dentro de la aplicación.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}