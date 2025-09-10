// client/src/hooks/useActionPlans.ts - Versión simplificada

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export interface ActionPlan {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: string;
  createdAt: string;
  userRole: 'assignee' | 'participant' | 'responsible';
  assignee: {
    firstName?: string;
    lastName?: string;
    name?: string;
    email: string;
  };
  incident: {
    title: string;
    center: { name: string };
    type: { name: string };
  };
  participants: any[];
  _count?: {
    tasks: number;
    completedTasks: number;
    comments: number;
  };
  progress?: number;
}

export function useActionPlans() {
  const queryClient = useQueryClient();

  // Obtener planes de acción asignados al usuario
  const {
    data: actionPlans,
    isLoading: loadingActionPlans,
    error: actionPlansError,
  } = useQuery<ActionPlan[]>({
    queryKey: ['/api/action-plans/assigned'],
    queryFn: async () => {
      const response = await apiRequest('/api/action-plans/assigned', {
        method: 'GET',
      });
      if (!response.ok) {
        throw new Error('Error fetching assigned action plans');
      }
      return response.json();
    },
    retry: false,
  });

  // Estadísticas calculadas
  const statistics = actionPlans ? {
    total: actionPlans.length,
    pending: actionPlans.filter(p => p.status === 'pending').length,
    inProgress: actionPlans.filter(p => p.status === 'in_progress').length,
    completed: actionPlans.filter(p => p.status === 'completed').length,
    overdue: actionPlans.filter(p => 
      p.status !== 'completed' && new Date(p.dueDate) < new Date()
    ).length,
    asResponsible: actionPlans.filter(p => 
      p.userRole === 'assignee' || p.userRole === 'responsible'
    ).length,
    asParticipant: actionPlans.filter(p => p.userRole === 'participant').length,
  } : {
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    asResponsible: 0,
    asParticipant: 0,
  };

  // Mutation para actualizar estado de plan
  const updateStatusMutation = useMutation({
    mutationFn: async ({ actionPlanId, status }: { actionPlanId: string; status: string }) => {
      const response = await apiRequest(`/api/action-plans/${actionPlanId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Error updating action plan status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/action-plans/assigned'] });
    },
  });

  return {
    // Data
    actionPlans: actionPlans || [],
    statistics,
    
    // Loading states
    loadingActionPlans,
    
    // Errors
    actionPlansError,
    
    // Mutations
    updateStatus: updateStatusMutation.mutate,
    updateStatusLoading: updateStatusMutation.isPending,
  };
}