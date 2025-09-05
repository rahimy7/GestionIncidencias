// client/src/App.tsx - CORREGIDO
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import Incidents from "@/pages/Incidents";
import Reports from "@/pages/Reports";
import NotFound from "@/pages/not-found";
import { UserDashboard } from "@/pages/UserDashboard";
import { ManagerDashboard } from "@/pages/ManagerDashboard";
import { AdminDashboard } from "@/pages/AdminDashboard";
import { TestUsers } from "@/pages/TestUsers";
import { CreateIncident } from "@/pages/CreateIncident";
import { CreateCenter } from "@/pages/CreateCenter"; 
import { CreateUser } from "./pages/CreateUser";
import { ManageUsers } from "./pages/ManageUsers";
import { ManageCenters } from "./pages/ManageCenters";

import { AdminUsersManagement } from "./pages/admin/AdminUsersManagement";
import { AdminCentersManagement } from "./pages/admin/AdminCentersManagement";
import { AdminDepartmentsManagement } from "./pages/admin/AdminDepartmentsManagement";

function Router() {
  const { isAuthenticated, isLoading, user, error } = useAuth();

  // Manejar errores de autenticación
  useEffect(() => {
    if (error && !isLoading) {
      console.log('Auth error detected, clearing token');
      localStorage.removeItem('auth_token');
      // Forzar recarga para limpiar el estado
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
  }, [error, isLoading]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getDashboardComponent = () => {
  const userRole = (user as any)?.role;
  switch (userRole) {
    case 'admin':
      return () => <AdminDashboard />;
    case 'manager':
    case 'supervisor':
      return () => <ManagerDashboard />;
    case 'user':
    default:
      return () => <UserDashboard />;
  }
};

const DashboardComponent = getDashboardComponent();

  return (
  <Switch>
    <Route path="/test-users" component={TestUsers} />
    
    {!isAuthenticated ? (
      <Route path="/" component={Landing} />
    ) : (
      <>
        <Route path="/" component={DashboardComponent} />
        <Route path="/dashboard/user" component={() => <UserDashboard />} />
        <Route path="/dashboard/manager" component={() => <ManagerDashboard />} />
        <Route path="/dashboard/admin" component={() => <AdminDashboard />} />
          <Route path="/users" component={ManageUsers} />
          <Route path="/users/new" component={CreateUser} />
          <Route path="/incidents" component={Incidents} />
          <Route path="/incidents/new" component={CreateIncident} />
          <Route path="/centers" component={ManageCenters} />
          <Route path="/centers/new" component={CreateCenter} />
          <Route path="/reports" component={Reports} />

           {/* Rutas de gestión legacy (mantener por compatibilidad) */}
          <Route path="/users" component={ManageUsers} />
          <Route path="/users/new" component={CreateUser} />
          <Route path="/centers" component={ManageCenters} />
          <Route path="/centers/new" component={CreateCenter} />

          {/* NUEVAS RUTAS ADMIN - VISTAS SEPARADAS */}
          <Route path="/admin" component={AdminDashboard} />
          
          {/* Gestión de Usuarios */}
          <Route path="/admin/users" component={AdminUsersManagement} />
          <Route path="/admin/users/new" component={CreateUser} />
          <Route path="/admin/users/:id" component={() => <div>Vista de Usuario</div>} />
          <Route path="/admin/users/:id/edit" component={() => <div>Editar Usuario</div>} />
          
          {/* Gestión de Centros y Tiendas */}
          <Route path="/admin/centers" component={AdminCentersManagement} />
          <Route path="/admin/centers/new" component={CreateCenter} />
          <Route path="/admin/centers/:id" component={() => <div>Vista de Centro</div>} />
          <Route path="/admin/centers/:id/edit" component={() => <div>Editar Centro</div>} />
          
          {/* Gestión de Departamentos */}
          <Route path="/admin/departments" component={AdminDepartmentsManagement} />
          <Route path="/admin/departments/new" component={() => <div>Crear Departamento</div>} />
          <Route path="/admin/departments/:id" component={() => <div>Vista de Departamento</div>} />
          <Route path="/admin/departments/:id/edit" component={() => <div>Editar Departamento</div>} />
          
          {/* Gestión de Incidencias Admin */}
          <Route path="/admin/incidents" component={Incidents} />
          
          {/* Configuración Admin */}
          <Route path="/admin/settings" component={() => <div>Configuración Admin</div>} />

          {/* Ruta 404 */}
          <Route component={NotFound} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;