import { Layout } from "@/components/Layout";
import { IncidentForm } from "@/components/IncidentForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export function NewIncident() {
  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver al Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Nueva Incidencia
            </h1>
            <p className="text-muted-foreground mt-2">
              Reporta una nueva incidencia en el sistema
            </p>
          </div>
        </div>

        {/* Form */}
        <IncidentForm />
      </div>
    </Layout>
  );
}