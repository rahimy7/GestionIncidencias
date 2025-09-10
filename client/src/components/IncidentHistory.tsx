import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, User, AlertCircle, UserCheck, Flag, FileText } from 'lucide-react';

interface HistoryEntry {
  id: string;
  action: string;
  description: string;
  metadata: any;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface IncidentHistoryProps {
  incidentId: string;
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'created': return <AlertCircle className="h-4 w-4" />;
    case 'assigned': 
    case 'assignment_change': return <UserCheck className="h-4 w-4" />;
    case 'status_change': return <Clock className="h-4 w-4" />;
    case 'priority_change': return <Flag className="h-4 w-4" />;
    case 'root_cause_updated': return <FileText className="h-4 w-4" />;
    default: return <Clock className="h-4 w-4" />;
  }
};

const getActionColor = (action: string) => {
  switch (action) {
    case 'created': return 'text-blue-600';
    case 'assigned':
    case 'assignment_change': return 'text-green-600';
    case 'status_change': return 'text-orange-600';
    case 'priority_change': return 'text-red-600';
    case 'completed': return 'text-green-700';
    default: return 'text-gray-600';
  }
};

export function IncidentHistory({ incidentId }: IncidentHistoryProps) {
  const { data: history, isLoading, error } = useQuery({
    queryKey: [`/api/incidents/${incidentId}/history`],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/incidents/${incidentId}/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Error al cargar historial');
      }
      
      return response.json();
    },
  });

  if (isLoading) {
    return <div className="text-center py-4">Cargando historial...</div>;
  }

  if (error) {
    return <div className="text-red-500 py-4">Error al cargar historial</div>;
  }

  if (!history || history.length === 0) {
    return <div className="text-gray-500 py-4">No hay actividad registrada</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Historial de Actividad</h3>
      
      <div className="space-y-3">
        {history.map((entry: HistoryEntry) => (
          <div key={entry.id} className="flex items-start gap-3 p-3 border rounded-lg">
            <div className={`mt-1 ${getActionColor(entry.action)}`}>
              {getActionIcon(entry.action)}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">
                  {entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : 'Sistema'}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(entry.createdAt).toLocaleString('es-ES')}
                </span>
              </div>
              
              <p className="text-sm text-gray-700 mt-1">
                {entry.description}
              </p>
              
              {entry.metadata && (
                <div className="text-xs text-gray-500 mt-2 font-mono bg-gray-50 p-2 rounded">
                  {typeof entry.metadata === 'string' 
                    ? entry.metadata 
                    : JSON.stringify(entry.metadata, null, 2)
                  }
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}