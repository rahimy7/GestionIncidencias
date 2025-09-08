// client/src/components/ParticipantSearch.tsx
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  User, 
  MapPin, 
  Briefcase, 
  Plus,
  X,
  Filter
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

interface Department {
  id: string;
  name: string;
  code: string;
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
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  // Cargar todos los usuarios
  const { data: allUsers = [], isLoading: usersLoading } = useQuery({
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

  // Cargar departamentos para el filtro
  const { data: departments = [], isLoading: departmentsLoading } = useQuery({
    queryKey: ['/api/departments'],
    queryFn: async (): Promise<Department[]> => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/departments', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to load departments');
      return response.json();
    }
  });

  // Obtener usuarios ya seleccionados para mostrar
  const selectedUsers = allUsers.filter(user => 
    currentParticipants.includes(user.id)
  );

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

    // Aplicar filtro por departamento
    if (selectedDepartment !== "all") {
      if (selectedDepartment === "no-department") {
        // Usuarios sin departamento asignado
        eligible = eligible.filter(user => !user.departmentId);
      } else if (selectedDepartment === "same-center") {
        // Solo usuarios del mismo centro
        eligible = eligible.filter(user => user.centerId === incidentCenterId);
      } else {
        // Usuarios del departamento específico
        eligible = eligible.filter(user => user.departmentId === selectedDepartment);
      }
    }

    // Aplicar filtro de búsqueda por texto
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      eligible = eligible.filter(user => {
        const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
        const email = user.email.toLowerCase();
        const role = user.role.toLowerCase();
        const centerName = user.center?.name?.toLowerCase() || '';
        const centerCode = user.center?.code?.toLowerCase() || '';
        const departmentName = user.departmentInfo?.name?.toLowerCase() || '';
        const departmentCode = user.departmentInfo?.code?.toLowerCase() || '';
        
        return fullName.includes(search) ||
               email.includes(search) ||
               role.includes(search) ||
               centerName.includes(search) ||
               centerCode.includes(search) ||
               departmentName.includes(search) ||
               departmentCode.includes(search);
      });
    }

    setFilteredUsers(eligible);
  }, [allUsers, searchTerm, selectedDepartment, currentParticipants, incidentCenterId]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'supervisor': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isLoading = usersLoading || departmentsLoading;

  return (
    <div className="space-y-4">
      {/* Participantes actuales */}
      {selectedUsers.length > 0 && (
        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <User className="h-4 w-4" />
            Participantes seleccionados ({selectedUsers.length})
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {selectedUsers.map(user => (
              <div key={user.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="font-medium text-sm">{user.firstName} {user.lastName}</p>
                    <div className="flex items-center gap-2 mt-1">
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
                  </div>
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
        <h4 className="font-medium mb-3">Agregar participantes</h4>
        
        {/* Filtros */}
        <div className="space-y-3 mb-4">
          {/* Campo de búsqueda por texto */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, email, rol, centro o departamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtro por departamento */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filtrar por departamento..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los usuarios elegibles</SelectItem>
                <SelectItem value="same-center">Solo del mismo centro</SelectItem>
                <SelectItem value="no-department">Sin departamento</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-3 w-3" />
                      {dept.name} ({dept.code})
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Resultados de búsqueda */}
        {isLoading ? (
          <div className="text-center py-4 text-gray-500">Cargando usuarios...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            {searchTerm || selectedDepartment !== "all" 
              ? 'No se encontraron usuarios con los filtros aplicados' 
              : 'Escribe para buscar usuarios'
            }
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
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
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
                              {user.departmentInfo.name} ({user.departmentInfo.code})
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

      {/* Información de filtros aplicados */}
      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
        <div className="space-y-2">
          <p><strong>Criterios de elegibilidad:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Usuarios del mismo centro/tienda</li>
            <li>Usuarios de departamentos corporativos (sin centro asignado)</li>
            <li>Se excluyen usuarios de otros centros</li>
          </ul>
          
          {(searchTerm || selectedDepartment !== "all") && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p><strong>Filtros activos:</strong></p>
              {searchTerm && (
                <p>• Búsqueda: "{searchTerm}"</p>
              )}
              {selectedDepartment !== "all" && (
                <p>• Departamento: {
                  selectedDepartment === "same-center" ? "Solo mismo centro" :
                  selectedDepartment === "no-department" ? "Sin departamento" :
                  departments.find(d => d.id === selectedDepartment)?.name || "Seleccionado"
                }</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}