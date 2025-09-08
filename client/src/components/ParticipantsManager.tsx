// client/src/components/ParticipantsManager.tsx

import React, { useState, useEffect } from 'react';
import { Users, Plus, X, UserCheck, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

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
  headUserId?: string;
  head?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface Participant {
  id: string;
  userId: string;
  role: string;
  user: User;
}

interface ParticipantsManagerProps {
  incidentId: string;
  participants: Participant[];
  onAddParticipant: (userId: string, role: string) => Promise<void>;
  onRemoveParticipant: (userId: string) => Promise<void>;
  currentUserCenterId?: string;
  isManager?: boolean;
}

const ParticipantsManager: React.FC<ParticipantsManagerProps> = ({
  incidentId,
  participants,
  onAddParticipant,
  onRemoveParticipant,
  currentUserCenterId,
  isManager = false
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedTab, setSelectedTab] = useState<'users' | 'departments'>('users');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [participantRole, setParticipantRole] = useState('participant');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (showAddModal) {
      fetchAvailableUsers();
      fetchDepartments();
    }
  }, [showAddModal]);

  const fetchAvailableUsers = async () => {
    try {
      const response = await apiRequest('/api/users');
      const users = await response.json();
      
      const filtered = users.filter((user: User) => {
        const isAlreadyParticipant = participants.some(p => p.userId === user.id);
        const isSameCenter = !currentUserCenterId || user.centerId === currentUserCenterId;
        return !isAlreadyParticipant && isSameCenter;
      });
      setAvailableUsers(filtered);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await apiRequest('/api/departments');
      const depts = await response.json();
      setDepartments(depts);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const handleAddParticipants = async () => {
    setLoading(true);
    try {
      // Add individual users
      for (const userId of selectedUsers) {
        await onAddParticipant(userId, participantRole);
      }

      // Add department managers
      for (const deptId of selectedDepartments) {
        const dept = departments.find(d => d.id === deptId);
        if (dept?.headUserId) {
          await onAddParticipant(dept.headUserId, 'responsible');
        }
      }

      setSelectedUsers([]);
      setSelectedDepartments([]);
      setShowAddModal(false);
      
      toast({
        title: "Éxito",
        description: "Participantes agregados correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al agregar participantes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleDepartmentSelection = (deptId: string) => {
    setSelectedDepartments(prev => 
      prev.includes(deptId) 
        ? prev.filter(id => id !== deptId)
        : [...prev, deptId]
    );
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'responsible': return 'bg-blue-100 text-blue-800';
      case 'supervisor': return 'bg-purple-100 text-purple-800';
      case 'reporter': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'responsible': return 'Responsable';
      case 'supervisor': return 'Supervisor';
      case 'reporter': return 'Reportero';
      default: return 'Participante';
    }
  };

  const getInitials = (firstName?: string, lastName?: string, email?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) return firstName[0].toUpperCase();
    if (email) return email.substring(0, 2).toUpperCase();
    return 'U';
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-medium">Participantes</h3>
            <Badge variant="secondary">
              {participants.length}
            </Badge>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar
          </Button>
        </div>

        {/* Participants List */}
        <div className="space-y-3">
          {participants.map((participant) => (
            <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">
                    {getInitials(participant.user.firstName, participant.user.lastName, participant.user.email)}
                  </span>
                </div>
                <div>
                  <p className="font-medium">
                    {participant.user.firstName} {participant.user.lastName}
                  </p>
                  <p className="text-sm text-gray-600">{participant.user.email}</p>
                  {participant.user.center && (
                    <p className="text-xs text-gray-500">
                      {participant.user.center.name} ({participant.user.center.code})
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getRoleColor(participant.role)}>
                  {getRoleText(participant.role)}
                </Badge>
                {participant.role !== 'reporter' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveParticipant(participant.userId)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          {participants.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No hay participantes asignados</p>
            </div>
          )}
        </div>

        {/* Add Participants Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Agregar Participantes</DialogTitle>
            </DialogHeader>

            <div className="overflow-y-auto max-h-[60vh]">
              <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as 'users' | 'departments')}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="users">
                    <Users className="h-4 w-4 mr-2" />
                    Usuarios
                  </TabsTrigger>
                  <TabsTrigger value="departments">
                    <Building className="h-4 w-4 mr-2" />
                    Departamentos
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="space-y-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Rol del participante</label>
                    <Select value={participantRole} onValueChange={setParticipantRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="participant">Participante</SelectItem>
                        <SelectItem value="responsible">Responsable</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Seleccionar usuarios:</h4>
                    {availableUsers.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => toggleUserSelection(user.id)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedUsers.includes(user.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{user.firstName} {user.lastName}</p>
                            <p className="text-sm text-gray-600">{user.email}</p>
                            <p className="text-xs text-gray-500">{user.role}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => toggleUserSelection(user.id)}
                            className="w-4 h-4 text-blue-600"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="departments" className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Seleccionar departamentos (se agregará el gerente):</h4>
                    {departments.map((dept) => (
                      <div
                        key={dept.id}
                        onClick={() => dept.headUserId && toggleDepartmentSelection(dept.id)}
                        className={`p-3 border rounded-lg transition-colors ${
                          dept.headUserId 
                            ? selectedDepartments.includes(dept.id)
                              ? 'border-blue-500 bg-blue-50 cursor-pointer'
                              : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                            : 'border-gray-100 bg-gray-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{dept.name}</p>
                            <p className="text-sm text-gray-600">{dept.code}</p>
                            {dept.head ? (
                              <p className="text-xs text-green-600">
                                Gerente: {dept.head.firstName} {dept.head.lastName}
                              </p>
                            ) : (
                              <p className="text-xs text-red-500">Sin gerente asignado</p>
                            )}
                          </div>
                          {dept.headUserId && (
                            <input
                              type="checkbox"
                              checked={selectedDepartments.includes(dept.id)}
                              onChange={() => toggleDepartmentSelection(dept.id)}
                              className="w-4 h-4 text-blue-600"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleAddParticipants}
                disabled={loading || (selectedUsers.length === 0 && selectedDepartments.length === 0)}
              >
                {loading ? 'Agregando...' : `Agregar ${selectedUsers.length + selectedDepartments.length}`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default ParticipantsManager;