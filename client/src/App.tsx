// client/src/App.tsx - Agregar la ruta /centers/new
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
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

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Determine which dashboard to show based on user role
  const getDashboardComponent = () => {
    const userRole = (user as any)?.role;
    switch (userRole) {
      case 'admin':
        return AdminDashboard;
      case 'manager':
      case 'supervisor':
        return ManagerDashboard;
      case 'user':
      default:
        return UserDashboard;
    }
  };

  return (
    <Switch>
      {/* Ruta accesible sin autenticación */}
      <Route path="/test-users" component={TestUsers} />
      
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={getDashboardComponent()} />
          <Route path="/dashboard/user" component={UserDashboard} />
          <Route path="/dashboard/manager" component={ManagerDashboard} />
          <Route path="/dashboard/admin" component={AdminDashboard} />
          <Route path="/users" component={ManageUsers} />
          <Route path="/users/new" component={CreateUser} />
          <Route path="/incidents" component={Incidents} />
          <Route path="/incidents/new" component={CreateIncident} />
          <Route path="/centers" component={ManageCenters} />
          <Route path="/centers/new" component={CreateCenter} />
          <Route path="/reports" component={Reports} />
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