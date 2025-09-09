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
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface ActionPlan {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  assigneeId: string;
  dueDate: Date | string;
  completedAt?: Date | string;
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
  status: string;
  actionPlans?: ActionPlan[];
  participants?: Array<{
    userId: string;
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
      
      {/* Usuario seleccionado */}
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

      {/* Campo de búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar responsable..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista de participantes disponibles */}
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

// Componente para gestionar participantes adicionales del plan
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

      {/* Participantes seleccionados */}
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

      {/* Buscar y agregar participantes */}
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
    case 'pending': return 'bg-gray-100 text-gray-800';
    case 'in_progress': return 'bg-blue-100 text-blue-800';
    case 'completed': return 'bg-green-100 text-green-800';
    case 'overdue': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending': return 'Pendiente';
    case 'in_progress': return 'En Progreso';
    case 'completed': return 'Completado';
    case 'overdue': return 'Vencido';
    default: return status;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'low': return 'bg-green-100 text-green-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'high': return 'bg-orange-100 text-orange-800';
    case 'critical': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getPriorityText = (priority: string) => {
  switch (priority) {
    case 'low': return 'Baja';
    case 'medium': return 'Media';
    case 'high': return 'Alta';
    case 'critical': return 'Crítica';
    default: return priority;
  }
};

export function ActionPlansSection({ incident, onUpdate }: ActionPlansSectionProps) {
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const [newPlan, setNewPlan] = useState({
    title: '',
    description: '',
    assigneeId: '',
    dueDate: '',
    startDate: '',
    priority: 'medium',
    participants: [] as string[]
  });
  
  const { toast } = useToast();

  const updatePlanStatus = async (planId: string, status: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/action-plans/${planId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) throw new Error('Error al actualizar plan');
      
      toast({
        title: "Plan actualizado",
        description: `Estado cambiado a ${getStatusText(status)}`
      });
      
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el plan",
        variant: "destructive"
      });
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
      const response = await fetch('/api/action-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newPlan,
          incidentId: incident.id,
          status: 'pending'
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
        priority: 'medium',
        participants: []
      });
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el plan",
        variant: "destructive"
      });
    }
  };

  const completedPlans = incident.actionPlans?.filter(p => p.status === 'completed').length || 0;
  const totalPlans = incident.actionPlans?.length || 0;
  const progressPercentage = totalPlans > 0 ? Math.round((completedPlans / totalPlans) * 100) : 0;

  return (
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
        <div className="space-y-4">
          {incident.actionPlans?.map((plan) => {
            const isOverdue = plan.status !== 'completed' && new Date(plan.dueDate) < new Date();
            const actualStatus = isOverdue ? 'overdue' : plan.status;
            
            return (
              <div key={plan.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-lg">{plan.title}</h4>
                      {isOverdue && <AlertTriangle className="h-4 w-4 text-red-500" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {plan.description}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Badge className={getStatusColor(actualStatus)}>
                      {getStatusText(actualStatus)}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{plan.assignee?.firstName ? `${plan.assignee.firstName} ${plan.assignee.lastName}` : plan.assignee?.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Vence: {format(new Date(plan.dueDate), 'dd/MM/yyyy', { locale: es })}
                    </span>
                  </div>
                  {plan.participants && plan.participants.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{plan.participants.length} participantes</span>
                    </div>
                  )}
                  {plan.completedAt && (
                    <div className="flex items-center gap-1 text-green-600">
                      <span>
                        Completado: {format(new Date(plan.completedAt), 'dd/MM/yyyy', { locale: es })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Mostrar participantes del plan */}
                {plan.participants && plan.participants.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-sm font-medium mb-2">Participantes:</h5>
                    <div className="flex flex-wrap gap-2">
                      {plan.participants.map((participant) => (
                        <div key={participant.id} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md text-xs">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-xs">
                              {participant.user.firstName.charAt(0)}{participant.user.lastName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{participant.user.firstName} {participant.user.lastName}</span>
                          <Badge variant="outline" className="text-xs">
                            {participant.role}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2">
                  {plan.status === 'pending' && (
                    <Button 
                      size="sm" 
                      onClick={() => updatePlanStatus(plan.id, 'in_progress')}
                    >
                      Iniciar
                    </Button>
                  )}
                  {(plan.status === 'in_progress' || actualStatus === 'overdue') && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updatePlanStatus(plan.id, 'completed')}
                    >
                      Completar
                    </Button>
                  )}
                  {plan.status === 'completed' && (
                    <Badge variant="secondary" className="text-green-600">
                      ✓ Completado
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
          
          {(!incident.actionPlans || incident.actionPlans.length === 0) && (
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
                {/* Información básica */}
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
                        <SelectItem value="low">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            Baja
                          </div>
                        </SelectItem>
                        <SelectItem value="medium">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                            Media
                          </div>
                        </SelectItem>
                        <SelectItem value="high">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                            Alta
                          </div>
                        </SelectItem>
                        <SelectItem value="critical">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            Crítica
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Asignación de personas */}
                <div className="space-y-4">
                  <AssigneeSelector
                    participants={incident.participants || []}
                    selectedUserId={newPlan.assigneeId}
                    onSelectUser={(userId) => setNewPlan({...newPlan, assigneeId: userId})}
                    label="Responsable del plan"
                  />

                  <PlanParticipantsManager
                    selectedParticipants={newPlan.participants}
                    onParticipantsChange={(participants) => setNewPlan({...newPlan, participants})}
                    availableParticipants={incident.participants || []}
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
      </CardContent>
    </Card>
  );
}