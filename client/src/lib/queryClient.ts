// client/src/lib/queryClient.ts - ACTUALIZAR para incluir token JWT
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error: any) => {
        // No retry on auth errors
        if (error?.status === 401) return false;
        return failureCount < 3;
      },
    },
  },
});

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token');
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(endpoint, config);
  
  if (response.status === 401) {
    localStorage.removeItem('auth_token');
    window.location.href = '/';
    throw new Error('Authentication failed');
  }
  
  return response;
}