// client/src/components/ParticipantSelector.tsx
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, User, MapPin, Briefcase, Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  center?: {
    name: string;
    code: string;
  };
  departmentInfo?: {
    name: string;
    code: string;
  };
}

interface ParticipantSelectorProps {
  participants: Array<{
    userId: string;
    user: User;
    role: string;
  }>;
  selectedUserId?: string;
  onSelectUser: (userId: string, user: User) => void;
  placeholder?: string;
  label?: string;
}

export function ParticipantSelector({
  participants,
  selectedUserId,
  onSelectUser,
  placeholder = "Seleccionar participante",
  label = "Asignado a"
}: ParticipantSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const selectedUser = participants.find(p => p.userId === selectedUserId)?.user;

  const filteredParticipants = participants.filter(participant => {
    const user = participant.user;
    const searchLower = searchTerm.toLowerCase();
    
    return (
      user.firstName.toLowerCase().includes(searchLower) ||
      user.lastName.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.role.toLowerCase().includes(searchLower) ||
      (user.center?.name.toLowerCase().includes(searchLower)) ||
      (user.center?.code.toLowerCase().includes(searchLower)) ||
      (user.departmentInfo?.name.toLowerCase().includes(searchLower)) ||
      (user.departmentInfo?.code.toLowerCase().includes(searchLower))
    );
  });

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
      
      {/* Mostrar usuario seleccionado */}
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
          placeholder="Buscar participante..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista de participantes disponibles */}
      <div className="max-h-60 overflow-y-auto space-y-2">
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
                    ? 'bg-blue-50 border-blue-200' 
                    : 'hover:bg-gray-50 border-gray-200'
                }`}
                onClick={() => onSelectUser(user.id, user)}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">
                      {user.firstName} {user.lastName}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {participant.role}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-600 truncate">{user.email}</div>
                </div>
                
                <div className="flex gap-1 flex-shrink-0">
                  <Badge className={getRoleColor(user.role)} variant="secondary">
                    {user.role}
                  </Badge>
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

                {isSelected && (
                  <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}