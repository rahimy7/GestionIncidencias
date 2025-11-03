import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, User, AlertCircle, UserCheck, Flag, FileText, CheckCircle, ArrowRight, Image as ImageIcon, FileIcon, File, ListCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
    case 'action_plan_created': return <ListCheck className="h-4 w-4" />; // ← AGREGAR
    case 'action_plan_status_changed': return <CheckCircle className="h-4 w-4" />; // ← AGREGAR
    case 'assigned': 
    case 'assignment_change': return <UserCheck className="h-4 w-4" />;
    case 'status_change': return <Clock className="h-4 w-4" />;
    case 'priority_change': return <Flag className="h-4 w-4" />;
    case 'root_cause_updated': return <FileText className="h-4 w-4" />;
    case 'completado': return <CheckCircle className="h-4 w-4" />;
    case 'updated': return <ImageIcon className="h-4 w-4" />;
    default: return <Clock className="h-4 w-4" />;
  }
};

const getActionColor = (action: string) => {
  switch (action) {
    case 'created': return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'action_plan_created': return 'bg-purple-100 text-purple-700 border-purple-300'; // ← AGREGAR
    case 'action_plan_status_changed': return 'bg-green-100 text-green-700 border-green-300'; // ← AGREGAR
    case 'assigned':
    case 'assignment_change': return 'bg-green-100 text-green-700 border-green-300';
    case 'status_change': return 'bg-orange-100 text-orange-700 border-orange-300';
    case 'priority_change': return 'bg-red-100 text-red-700 border-red-300';
    case 'completado': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    case 'root_cause_updated': return 'bg-purple-100 text-purple-700 border-purple-300';
    case 'updated': return 'bg-cyan-100 text-cyan-700 border-cyan-300';
    default: return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'completado': return 'bg-green-100 text-green-800 border-green-300';
    case 'en_proceso': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'pendiente': return 'bg-gray-100 text-gray-800 border-gray-300';
    case 'cerrado': return 'bg-purple-100 text-purple-800 border-purple-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const formatStatusLabel = (status: string) => {
  const statusMap: Record<string, string> = {
    'pendiente': 'Pendiente',
    'en_proceso': 'En Proceso',
    'completado': 'Completado',
    'cerrado': 'Cerrado',
  };
  return statusMap[status] || status;
};

// Función para determinar el tipo de archivo
const getFileType = (url: string): 'image' | 'pdf' | 'document' | 'other' => {
  const urlLower = url.toLowerCase();
  if (urlLower.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)) return 'image';
  if (urlLower.includes('.pdf')) return 'pdf';
  if (urlLower.match(/\.(doc|docx|txt|xls|xlsx)$/)) return 'document';
  return 'other';
};

// Función para obtener icono según tipo
const getFileIcon = (type: 'image' | 'pdf' | 'document' | 'other') => {
  switch (type) {
    case 'image': return <ImageIcon className="h-4 w-4 text-blue-600" />;
    case 'pdf': return <FileText className="h-4 w-4 text-red-600" />;
    case 'document': return <FileIcon className="h-4 w-4 text-green-600" />;
    default: return <File className="h-4 w-4 text-gray-600" />;
  }
};

// Componente para mostrar archivos de evidencia
const EvidenceFilesDisplay = ({ files }: { files: string[] }) => {
  if (!files || files.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-medium text-gray-600">Archivos cargados:</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {files.map((fileUrl, index) => {
          const fileType = getFileType(fileUrl);
          const fileName = fileUrl.split('/').pop() || 'archivo';
          
          return (
            <a
              key={index}
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex flex-col items-center p-2 border rounded-lg hover:border-blue-400 hover:shadow-md transition-all bg-white"
            >
              {fileType === 'image' ? (
                <div className="w-full aspect-square rounded overflow-hidden bg-gray-100 mb-1">
                  <img 
                    src={fileUrl} 
                    alt={fileName}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                  />
                </div>
              ) : (
                <div className="w-full aspect-square rounded bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center mb-1">
                  <div className="p-3 rounded-full bg-white shadow-sm">
                    {getFileIcon(fileType)}
                  </div>
                </div>
              )}
              <span className="text-xs text-gray-700 truncate w-full text-center px-1">
                {fileName}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
};

const MetadataDisplay = ({ metadata }: { metadata: any }) => {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  // Detectar evidenceFiles en metadata
  if (metadata.evidenceFiles && Array.isArray(metadata.evidenceFiles)) {
    return <EvidenceFilesDisplay files={metadata.evidenceFiles} />;
  }

  // Parsear texto de Evidence Files si viene como string
  if (metadata['Evidence Files'] && typeof metadata['Evidence Files'] === 'string') {
    const filesStr = metadata['Evidence Files'];
    const filesArray = filesStr
      .split(',')
      .map(f => f.trim())
      .filter(f => f.startsWith('/uploads/'));
    
    if (filesArray.length > 0) {
      return <EvidenceFilesDisplay files={filesArray} />;
    }
  }

  // Parsear metadata según el tipo de cambio
  if (metadata.oldStatus && metadata.newStatus) {
    return (
      <div className="flex items-center gap-2 mt-2 p-2 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
        <Badge className={getStatusBadgeColor(metadata.oldStatus)}>
          {formatStatusLabel(metadata.oldStatus)}
        </Badge>
        <ArrowRight className="h-4 w-4 text-gray-400" />
        <Badge className={getStatusBadgeColor(metadata.newStatus)}>
          {formatStatusLabel(metadata.newStatus)}
        </Badge>
      </div>
    );
  }

  if (metadata.status) {
    return (
      <div className="mt-2">
        <Badge className={getStatusBadgeColor(metadata.status)}>
          {formatStatusLabel(metadata.status)}
        </Badge>
      </div>
    );
  }

  if (metadata.tasksCount !== undefined || metadata.actionPlansCount !== undefined) {
    return (
      <div className="flex items-center gap-3 mt-2 p-2 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
        {metadata.actionPlansCount !== undefined && (
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">
              {metadata.actionPlansCount} plan{metadata.actionPlansCount !== 1 ? 'es' : ''}
            </span>
          </div>
        )}
        {metadata.tasksCount !== undefined && (
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-600" />
            <span className="text-xs font-medium text-green-700">
              {metadata.tasksCount} tarea{metadata.tasksCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        {metadata.completedAt && (
          <div className="flex items-center gap-1 ml-auto">
            <Clock className="h-3 w-3 text-gray-500" />
            <span className="text-xs text-gray-600">
              {new Date(metadata.completedAt).toLocaleDateString('es-ES')}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Formato genérico para otros metadatos
 const entries = Object.entries(metadata).filter(([key, value]) => 
  key !== '__typename' && 
  metadata[key] !== null && 
  metadata[key] !== undefined &&
  !key.toLowerCase().includes('id') // ← Excluir campos con 'id'
);

  if (entries.length === 0) return null;
const formatValue = (key: string, value: any): string => {
 if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }
  return String(value);
};

return (
  <div className="mt-2 space-y-1">
    {entries.map(([key, value]) => (
      <div key={key} className="flex items-center gap-2 text-xs">
        <span className="font-medium text-gray-600 capitalize">
          {key.replace(/([A-Z])/g, ' $1').trim()}:
        </span>
        <span className="text-gray-700">{formatValue(key, value)}</span>
      </div>
    ))}
  </div>
);
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
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-sm text-gray-500">Cargando historial...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-500">Error al cargar historial</p>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-12 w-12 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500">No hay actividad registrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Clock className="h-5 w-5" />
        Historial de Actividad
      </h3>
      
      <div className="relative space-y-0">
        {/* Timeline vertical */}
        <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-blue-200 via-purple-200 to-gray-200"></div>
        
        {history.map((entry: HistoryEntry, index: number) => (
          <div 
            key={entry.id} 
            className="relative pl-12 pb-6 group animate-in fade-in slide-in-from-left-4 duration-300"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Icon bubble */}
            <div className={`absolute left-0 top-0 w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-sm group-hover:shadow-md transition-all ${getActionColor(entry.action)}`}>
              {getActionIcon(entry.action)}
            </div>
            
            {/* Content card */}
            <div className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-all group-hover:translate-x-1">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-3 w-3 text-gray-500" />
                    <span className="font-medium text-sm">
                      {entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : 'Sistema'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">
                    {entry.description}
                  </p>
                </div>
                
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(entry.createdAt).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(entry.createdAt).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
              
              <MetadataDisplay metadata={entry.metadata} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}