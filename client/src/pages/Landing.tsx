import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary mb-2">IncidentTracker</h1>
          <p className="text-muted-foreground">
            Sistema de Gestión de Incidencias y No Conformidades
          </p>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-semibold">Bienvenido</h2>
                <p className="text-sm text-muted-foreground">
                  Inicia sesión para acceder al sistema de gestión de incidencias
                </p>
              </div>
              
              <div className="space-y-3">
                <Button 
                  onClick={() => window.location.href = '/api/login'}
                  className="w-full"
                  data-testid="button-login"
                >
                  Iniciar Sesión
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Para desarrollo
                    </span>
                  </div>
                </div>

                <Button 
                  onClick={() => window.location.href = '/test-users'}
                  variant="outline"
                  className="w-full"
                  data-testid="button-test-users"
                >
                  Usuarios de Prueba
                </Button>
                
                <p className="text-xs text-center text-muted-foreground">
                  Utiliza tu cuenta de Replit para acceder o prueba con usuarios demo
                </p>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="font-medium mb-2">Características:</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Reporte de incidencias con evidencia fotográfica</li>
                  <li>• Gestión de planes de acción</li>
                  <li>• Seguimiento en tiempo real</li>
                  <li>• Dashboard con métricas</li>
                  <li>• Control de participantes y roles</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
