// client/src/hooks/useAuth.ts - REEMPLAZAR COMPLETO
import { useQuery } from "@tanstack/react-query";

// client/src/hooks/useAuth.ts - ACTUALIZAR
export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch('/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        localStorage.removeItem('auth_token');
        throw new Error('Authentication failed');
      }

      return response.json();
    },
  });

  return {
    user,
    isLoading,
    error, // ← AGREGAR ESTA LÍNEA
    isAuthenticated: !!user && !!localStorage.getItem('auth_token'),
    logout: () => {
      localStorage.removeItem('auth_token');
      window.location.href = '/';
    }
  };
}
