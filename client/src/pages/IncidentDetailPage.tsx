// client/src/pages/IncidentDetailPage.tsx
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Layout } from "@/components/Layout";
import { IncidentDetail } from "@/components/IncidentDetail";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: incident, isLoading, error } = useQuery({
    queryKey: [`/api/incidents/${id}`],
    queryFn: async () => {
      const response = await apiRequest(`/api/incidents/${id}`, {
        method: 'GET',
      });
      if (!response.ok) {
        throw new Error('Incidencia no encontrada');
      }
      return response.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (error || !incident) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Error
            </h2>
            <p className="text-muted-foreground mb-4">
              No se pudo cargar la incidencia solicitada.
            </p>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver al Dashboard
            </Button>
          </Link>
        </div>
        
        <IncidentDetail 
          incident={incident} 
          onClose={() => window.history.back()}
        />
      </div>
    </Layout>
  );
}