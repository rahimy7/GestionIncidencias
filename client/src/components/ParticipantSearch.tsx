// client/src/components/ParticipantSearch.tsx
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Search, 
  User, 
  MapPin, 
  Briefcase, 
  Plus,
  X 
} from "lucide-react";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  centerId?: string;
  departmentId?: string;
  center?: {
    id: string;
    name: string;
    code: string;
  };
  departmentInfo?: {
    id: string;
    name: string;
    code: string;
  };
}

interface ParticipantSearchProps {
  incidentCenterId: string;
  currentParticipants: string[];
  onAddParticipant: (userId: string, user: User) => void;
  onRemoveParticipant: (userId: string) => void;
}

export function ParticipantSearch({ 
  incidentCenterId, 
  currentParticipants, 
  onAddParticipant,
  onRemoveParticipant 
}: ParticipantSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  // Cargar todos los usuarios
  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ['/api/users-with-details'],
    queryFn: async (): Promise<User[]> => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/users-with-details', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to load users');
      return response.json();
    }
  });

  // Filtrar usuarios elegibles
  useEffect(() => {
    let eligible = allUsers.filter(user => {
      // Excluir usuarios ya participando
      if (currentParticipants.includes(user.id)) return false;
      
      // Incluir usuarios del mismo centro
      if (user.centerId === incidentCenterId) return true;
      
      // Incluir usuarios de departamentos (sin centro asignado)
      if (user.departmentId && !user.centerId) return true;
      
      // Excluir usuarios de otros centros
      return false;
    });

    // Aplicar filtro de búsqueda
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      eligible = eligible.filter(user => 
        user.firstName.toLowerCase().includes(search) ||
        user.lastName.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.role.toLowerCase().includes(search) ||
        user.center?.name.toLowerCase().includes(search) ||
        user.departmentInfo?.name.toLowerCase().includes(search)
      );
    }

    setFilteredUsers(eligible);
  }, [allUsers, searchTerm, currentParticipants, incidentCenterId]);

  const currentParticipantUsers = allUsers.filter(user => 
    currentParticipants.includes(user.id)
  );

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'supervisor': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Participantes actuales */}
      {currentParticipantUsers.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Participantes actuales</h4>
          <div className="space-y-2">
            {currentParticipantUsers.map(user => (
              <div key={user.id} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="font-medium">{user.firstName} {user.lastName}</p>
                    <p className="text-xs text-gray-600">{user.email}</p>
                  </div>
                  <Badge className={getRoleColor(user.role)}>{user.role}</Badge>
                  {user.center && (
                    <Badge variant="outline" className="text-xs">
                      <MapPin className="h-3 w-3 mr-1" />
                      {user.center.code}
                    </Badge>
                  )}
                  {user.departmentInfo && (
                    <Badge variant="outline" className="text-xs">
                      <Briefcase className="h-3 w-3 mr-1" />
                      {user.departmentInfo.code}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveParticipant(user.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Búsqueda de nuevos participantes */}
      <div>
        <h4 className="font-medium mb-2">Agregar participantes</h4>
        
        {/* Campo de búsqueda */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, email, rol o ubicación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Resultados de búsqueda */}
        {isLoading ? (
          <div className="text-center py-4 text-gray-500">Cargando usuarios...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            {searchTerm ? 'No se encontraron usuarios' : 'Escribe para buscar usuarios'}
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredUsers.map(user => (
              <Card key={user.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-gray-400" />
                      <div className="flex-1">
                        <p className="font-medium">{user.firstName} {user.lastName}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getRoleColor(user.role)}>{user.role}</Badge>
                          {user.center && (
                            <Badge variant="outline" className="text-xs">
                              <MapPin className="h-3 w-3 mr-1" />
                              {user.center.name} ({user.center.code})
                            </Badge>
                          )}
                          {user.departmentInfo && (
                            <Badge variant="outline" className="text-xs">
                              <Briefcase className="h-3 w-3 mr-1" />
                              {user.departmentInfo.name}
                            </Badge>
                          )}
                          {!user.center && !user.departmentInfo && (
                            <Badge variant="secondary" className="text-xs">Sin asignar</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onAddParticipant(user.id, user)}
                      className="flex items-center gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Información de filtros */}
      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
        <p><strong>Usuarios elegibles:</strong></p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Usuarios del mismo centro/tienda</li>
          <li>Usuarios de departamentos corporativos</li>
          <li>Se excluyen usuarios de otros centros</li>
        </ul>
      </div>
    </div>
  );
}