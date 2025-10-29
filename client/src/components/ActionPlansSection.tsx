import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  ClipboardList, 
  Calendar, 
  User, 
  Plus, 
  Search,
  MapPin,
  Check,
  X,
  Users,
  AlertTriangle,
  Clock,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { ActionPlanDetail } from "./ActionPlanDetail";
import { ActionPlanCard } from "./ActionPlanCard";
import { ParticipantSelector } from "./ParticipantSelector";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient, useQuery } from "@tanstack/react-query";

interface ActionPlan {
  id: string;
  title: string;
  description: string;
  status: 'pendiente' | 'en_proceso' | 'completado' | 'retrasado';
  assigneeId: string;
  dueDate: Date | string;
  completedAt?: Date | null | string;
  assignee: {
    id: string;
    name: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    center?: { code: string; name: string; };
  };
  participants?: Array<{
    id: string;
    userId: string;
    role: 'participant' | 'reviewer' | 'supervisor';
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
      center?: { code: string; name: string; };
    };
  }>;
}

interface IncidentWithActionPlans {
  id: string;
  incidentNumber?: string;
  title: string;
  participants?: Array<{
    id: string;
    userId: string;
    role?: 'participant' | 'reviewer' | 'supervisor';
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
      center?: { code: string; name: string; };
    };
  }>;
  actionPlans?: Array<{
    id: string;
    title: string;
    description: string;
    status: 'pendiente' | 'en_proceso' | 'completado' | 'retrasado';
    dueDate: string | Date;
    completedAt?: string | Date | null;
    assigneeId: string;
    assignee: {
      id: string | null;
      name?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      email: string | null;  // ← CAMBIAR: permitir null
    };
    participants?: Array<{
      id: string;
      userId: string;
      user: {
        id: string;
        name?: string | null;
        firstName?: string | null;
        lastName?: string | null;
        email: string | null;  // ← CAMBIAR: permitir null
      };
    }>;
  }>;
}

interface ActionPlansSectionProps {
  incident: IncidentWithActionPlans;
  onUpdate: () => void;
}

// Componente para seleccionar responsable del plan
const AssigneeSelector = ({ 
  participants, 
  selectedUserId, 
  onSelectUser, 
  label = "Responsable del plan" 
}: {
  participants: any[];
  selectedUserId?: string;
  onSelectUser: (userId: string, user: any) => void;
  label?: string;
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const selectedUser = participants?.find(p => p.user.id === selectedUserId)?.user;
  
  const filteredParticipants = participants?.filter(p => {
    const user = p.user;
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    const email = user.email.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) || 
           email.includes(searchTerm.toLowerCase());
  }) || [];

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'user': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      
      {selectedUser && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {selectedUser.firstName.charAt(0)}{selectedUser.lastName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="font-medium text-sm">
              {selectedUser.firstName} {selectedUser.lastName}
            </div>
            <div className="text-xs text-gray-600">{selectedUser.email}</div>
          </div>
          <div className="flex gap-1">
            <Badge className={getRoleColor(selectedUser.role)} variant="secondary">
              {selectedUser.role}
            </Badge>
            {selectedUser.center && (
              <Badge variant="outline" className="text-xs">
                <MapPin className="h-3 w-3 mr-1" />
                {selectedUser.center.code}
              </Badge>
            )}
          </div>
          <Check className="h-4 w-4 text-green-600" />
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar responsable..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="max-h-40 overflow-y-auto space-y-2">
        {filteredParticipants.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            {searchTerm ? 'No se encontraron participantes' : 'No hay participantes disponibles'}
          </div>
        ) : (
          filteredParticipants.map((participant) => {
            const user = participant.user;
            const isSelected = selectedUserId === user.id;
            
            return (
              <div
                key={user.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => onSelectUser(user.id, user)}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-xs text-gray-600">{user.email}</div>
                </div>
                <div className="flex gap-1">
                  <Badge className={getRoleColor(user.role)} variant="secondary">
                    {user.role}
                  </Badge>
                  {user.center && (
                    <Badge variant="outline" className="text-xs">
                      <MapPin className="h-3 w-3 mr-1" />
                      {user.center.code}
                    </Badge>
                  )}
                </div>
                {isSelected && <Check className="h-4 w-4 text-blue-600" />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// Componente para gestionar participantes adicionales
const PlanParticipantsManager = ({ 
  selectedParticipants, 
  onParticipantsChange,
  availableParticipants 
}: {
  selectedParticipants: string[];
  onParticipantsChange: (participants: string[]) => void;
  availableParticipants: any[];
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredParticipants = availableParticipants?.filter(p => {
    const user = p.user;
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) && 
           !selectedParticipants.includes(user.id);
  }) || [];

  const selectedUsers = availableParticipants?.filter(p => 
    selectedParticipants.includes(p.user.id)
  ) || [];

  const toggleParticipant = (userId: string) => {
    if (selectedParticipants.includes(userId)) {
      onParticipantsChange(selectedParticipants.filter(id => id !== userId));
    } else {
      onParticipantsChange([...selectedParticipants, userId]);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'user': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Participantes adicionales</Label>
        <p className="text-xs text-gray-600 mt-1">
          Selecciona usuarios que participarán en la ejecución del plan
        </p>
      </div>

      {selectedUsers.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Participantes seleccionados ({selectedUsers.length})</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {selectedUsers.map((participant) => {
              const user = participant.user;
              return (
                <div key={user.id} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs truncate">
                      {user.firstName} {user.lastName}
                    </div>
                  </div>
                  <Badge className={getRoleColor(user.role)} variant="secondary">
                    {user.role}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleParticipant(user.id)}
                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar participantes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="max-h-40 overflow-y-auto space-y-2">
          {filteredParticipants.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm">
              {searchTerm ? 'No se encontraron usuarios' : 'Todos los usuarios ya están seleccionados'}
            </div>
          ) : (
            filteredParticipants.map((participant) => {
              const user = participant.user;
              return (
                <div
                  key={user.id}
                  className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleParticipant(user.id)}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs truncate">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-xs text-gray-600 truncate">{user.email}</div>
                  </div>
                  <Badge className={getRoleColor(user.role)} variant="secondary">
                    {user.role}
                  </Badge>
                  <Plus className="h-4 w-4 text-gray-400" />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pendiente': return 'bg-gray-100 text-gray-800';
    case 'en_proceso': return 'bg-blue-100 text-blue-800';
    case 'completado': return 'bg-green-100 text-green-800';
    case 'retrasado': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'pendiente': return 'Pendiente';
    case 'en_proceso': return 'En Progreso';
    case 'completado': return 'Completado';
    case 'retrasado': return 'Vencido';
    default: return status;
  }
};

// ============================================================================
// COMPONENTE PRINCIPAL - ActionPlansSection
// ============================================================================
export function ActionPlansSection({ incident, onUpdate }: ActionPlansSectionProps) {
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const [selectedActionPlanId, setSelectedActionPlanId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const queryClient = useQueryClient();
  const [newPlan, setNewPlan] = useState({
    title: '',
    description: '',
    assigneeId: '',
    dueDate: '',
    startDate: '',
    priority: 'media',
    participants: [] as string[]
  });
  
  const { toast } = useToast();

  // ✅ AQUÍ VA LA QUERY - AL INICIO DEL COMPONENTE PRINCIPAL
  const { data: actionPlansFromAPI, isLoading: loadingActionPlans, refetch: refetchActionPlans } = useQuery({
    queryKey: [`/api/incidents/${incident.id}/action-plans`],
    queryFn: async () => {
      console.log('🔍 Fetching action plans for incident:', incident.id);
      const response = await apiRequest(`/api/incidents/${incident.id}/action-plans`, {
        method: 'GET',
      });
      
      if (!response.ok) throw new Error('Error fetching action plans');
      const data = await response.json();
      console.log('✅ Action plans loaded:', data);
      return data;
    },
    enabled: !!incident.id,
  });

  // ✅ USAR LOS DATOS DE LA API
  const actionPlans = actionPlansFromAPI || incident.actionPlans || [];

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const user = await response.json();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const createActionPlan = async () => {
    if (!newPlan.title.trim() || !newPlan.assigneeId || !newPlan.dueDate) {
      toast({
        title: "Error",
        description: "Título, responsable y fecha límite son obligatorios",
        variant: "destructive"
      });
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`/api/incidents/${incident.id}/action-plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newPlan,
          incidentId: incident.id,
          status: 'pendiente'
        })
      });

      if (!response.ok) throw new Error('Error al crear plan');
      
      toast({
        title: "Plan creado",
        description: "El plan de acción se creó exitosamente"
      });
      
      setShowNewPlanForm(false);
      setNewPlan({
        title: '',
        description: '',
        assigneeId: '',
        dueDate: '',
        startDate: '',
        priority: 'media',
        participants: []
      });
      
      // ✅ REFRESCAR ACTION PLANS
      await refetchActionPlans();
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el plan",
        variant: "destructive"
      });
    }
  };

  const { data: freshParticipants, refetch: refetchParticipants } = useQuery({
    queryKey: [`/api/incidents/${incident.id}/participants`],
    queryFn: async () => {
      const response = await apiRequest(`/api/incidents/${incident.id}/participants`, {});
      return response.json();
    },
    enabled: showNewPlanForm,
  });

  useEffect(() => {
    if (showNewPlanForm) {
      refetchParticipants();
      queryClient.invalidateQueries({ 
        queryKey: [`/api/incidents/${incident.id}/participants`] 
      });
    }
  }, [showNewPlanForm, refetchParticipants, queryClient, incident.id]);

  const availableParticipants = freshParticipants || incident.participants || [];
  const completedPlans = actionPlans.filter((p: ActionPlan) => p.status === 'completado').length;
  const totalPlans = actionPlans.length;
  const progressPercentage = totalPlans > 0 ? Math.round((completedPlans / totalPlans) * 100) : 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Planes de Acción
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {completedPlans}/{totalPlans} completados ({progressPercentage}%)
              </span>
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* ✅ AGREGAR LOADING STATE */}
          {loadingActionPlans ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Cargando planes de acción...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {actionPlans.length > 0 ? (
                actionPlans.map((plan: ActionPlan) => {
                  const isOverdue = plan.status !== 'completado' && new Date(plan.dueDate) < new Date();
                  
                  return (
                    <ActionPlanCard
                      key={plan.id}
                      actionPlan={{
                        ...plan,
                        status: isOverdue ? 'retrasado' : plan.status,
                        dueDate: typeof plan.dueDate === 'string' ? plan.dueDate : plan.dueDate.toISOString(),
                        completedAt: plan.completedAt ? (typeof plan.completedAt === 'string' ? plan.completedAt : plan.completedAt.toISOString()) : null,
                        incident: {
                          incidentNumber: `INC-${incident.id}`,
                          title: `Plan de acción para incidencia`,
                          center: {
                            name: 'Centro de la incidencia',
                            code: 'CTR'
                          },
                          type: {
                            name: 'Acción correctiva'
                          }
                        },
                        userRole: currentUser?.id === plan.assigneeId ? 'responsible' : 'participant',
                        _count: {
                          tasks: 0,
                          completedTasks: 0,
                          comments: 0
                        }
                      }}
                    />
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay planes de acción definidos</p>
                  <p className="text-sm">Los planes aparecerán aquí cuando se agreguen</p>
                </div>
              )}
              
              <Dialog open={showNewPlanForm} onOpenChange={setShowNewPlanForm}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Plan de Acción
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Nuevo Plan de Acción</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title">Título</Label>
                        <Input
                          id="title"
                          value={newPlan.title}
                          onChange={(e) => setNewPlan({...newPlan, title: e.target.value})}
                          placeholder="Título del plan"
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="description">Descripción</Label>
                        <Textarea
                          id="description"
                          value={newPlan.description}
                          onChange={(e) => setNewPlan({...newPlan, description: e.target.value})}
                          placeholder="Descripción detallada"
                          rows={3}
                          className="mt-1"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="startDate">Fecha de inicio</Label>
                          <Input
                            id="startDate"
                            type="date"
                            value={newPlan.startDate}
                            onChange={(e) => setNewPlan({...newPlan, startDate: e.target.value})}
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="dueDate">Fecha límite</Label>
                          <Input
                            id="dueDate"
                            type="date"
                            value={newPlan.dueDate}
                            onChange={(e) => setNewPlan({...newPlan, dueDate: e.target.value})}
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="priority">Prioridad</Label>
                        <Select value={newPlan.priority} onValueChange={(value) => setNewPlan({...newPlan, priority: value})}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="baja">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                Baja
                              </div>
                            </SelectItem>
                            <SelectItem value="media">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                Media
                              </div>
                            </SelectItem>
                            <SelectItem value="alta">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                Alta
                              </div>
                            </SelectItem>
                            <SelectItem value="critica">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                Crítica
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <ParticipantSelector
                        participants={availableParticipants}
                        selectedUserId={newPlan.assigneeId}
                        onSelectUser={(userId) => setNewPlan({...newPlan, assigneeId: userId})}
                        label="Responsable del plan"
                        placeholder="Seleccionar responsable"
                      />

                      <PlanParticipantsManager
                        selectedParticipants={newPlan.participants}
                        onParticipantsChange={(participants: string[]) => setNewPlan({...newPlan, participants})}
                        availableParticipants={availableParticipants}
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-6 border-t">
                    <Button 
                      onClick={createActionPlan} 
                      className="flex-1"
                      disabled={!newPlan.title.trim() || !newPlan.assigneeId || !newPlan.dueDate}
                    >
                      Crear Plan
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowNewPlanForm(false)}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedActionPlanId && (
  <ActionPlanDetail
    actionPlanId={selectedActionPlanId}
    isOpen={!!selectedActionPlanId}
    onClose={() => setSelectedActionPlanId(null)}
    // ✅ Ya no se pasa userRole - el componente lo obtiene del backend
  />
)}
    </>
  );
}