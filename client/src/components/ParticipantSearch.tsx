// client/src/components/ParticipantSearch.tsx - VERSIÓN MEJORADA
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  User, 
  MapPin, 
  Briefcase, 
  Plus,
  X,
  Filter,
  Users,
  Trash2,
  AlertCircle
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

interface Participant {
  id: string;
  userId: string;
  role: string;
  createdAt: string;
  user: User;
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
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

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

  // Obtener información completa de participantes
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
        eligible = eligible.filter(user => !user.departmentId);
      } else if (selectedDepartment === "same-center") {
        eligible = eligible.filter(user => user.centerId === incidentCenterId);
      } else {
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
    switch (role.toLowerCase()) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-purple-100 text-purple-800';
      case 'supervisor': return 'bg-blue-100 text-blue-800';
      case 'user': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRemoveParticipant = async (userId: string) => {
    setIsRemoving(userId);
    try {
      await onRemoveParticipant(userId);
    } finally {
      setIsRemoving(null);
    }
  };

  const isLoading = usersLoading || departmentsLoading;

  return (
    <div className="space-y-6">
      {/* Sección de Participantes Actuales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Participantes Asignados ({selectedUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedUsers.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No hay participantes asignados a esta incidencia. Agrega participantes usando la sección de búsqueda a continuación.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-3">
              {selectedUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    {/* Avatar del usuario */}
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    
                    {/* Información del usuario */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </span>
                        <Badge variant="outline" className={getRoleColor(user.role)}>
                          {user.role}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-1">
                          <span>📧 {user.email}</span>
                        </div>
                        
                        {user.center && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{user.center.name} ({user.center.code})</span>
                          </div>
                        )}
                        
                        {user.departmentInfo && (
                          <div className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            <span>{user.departmentInfo.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botón para desvincular */}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveParticipant(user.id)}
                    disabled={isRemoving === user.id}
                    className="ml-3"
                  >
                    {isRemoving === user.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Desvincular
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sección de Búsqueda de Nuevos Participantes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Agregar Nuevos Participantes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="space-y-3">
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
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-gray-500">Cargando usuarios...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm || selectedDepartment !== "all" 
                ? "No se encontraron usuarios que coincidan con los filtros aplicados."
                : "No hay usuarios elegibles para agregar como participantes."
              }
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredUsers.map((user) => (
                <Card key={user.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Avatar del usuario */}
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        
                        {/* Información del usuario */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </span>
                            <Badge variant="outline" className={getRoleColor(user.role)}>
                              {user.role}
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex items-center gap-1">
                              <span>📧 {user.email}</span>
                            </div>
                            
                            {user.center && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{user.center.name} ({user.center.code})</span>
                              </div>
                            )}
                            
                            {user.departmentInfo && (
                              <div className="flex items-center gap-1">
                                <Briefcase className="h-3 w-3" />
                                <span>{user.departmentInfo.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Botón para agregar */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAddParticipant(user.id, user)}
                        className="ml-3"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Información de criterios de elegibilidad */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>Criterios de elegibilidad:</strong></p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Usuarios del mismo centro/tienda</li>
                  <li>Usuarios de departamentos corporativos (sin centro asignado)</li>
                  <li>Se excluyen usuarios ya asignados y de otros centros</li>
                </ul>
                
                {(searchTerm || selectedDepartment !== "all") && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p><strong>Filtros activos:</strong></p>
                    {searchTerm && (
                      <p className="text-sm">• Búsqueda: "{searchTerm}"</p>
                    )}
                    {selectedDepartment !== "all" && (
                      <p className="text-sm">• Departamento: {
                        selectedDepartment === "same-center" ? "Solo mismo centro" :
                        selectedDepartment === "no-department" ? "Sin departamento" :
                        departments.find(d => d.id === selectedDepartment)?.name || "Seleccionado"
                      }</p>
                    )}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}