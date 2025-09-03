// client/src/lib/queryClient.ts - OPTIMIZED VERSION
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - reduce API calls
      gcTime: 1000 * 60 * 30, // 30 minutes cache
      retry: (failureCount, error: any) => {
        // No retry on auth errors
        if (error?.status === 401) return false;
        return failureCount < 2; // Reduce retries from 3 to 2
      },
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnReconnect: true,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false, // Don't retry mutations
    },
  },
});

// Optimized API request function with connection pooling
export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token');
  
  const config: RequestInit = {
    ...options,
    // Enable keep-alive for connection reuse
    keepalive: true,
    headers: {
      'Content-Type': 'application/json',
      'Connection': 'keep-alive',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(endpoint, {
      ...config,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/';
      throw new Error('Authentication failed');
    }
    
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

// Prefetch common data
export function prefetchDashboardData() {
  const token = localStorage.getItem('auth_token');
  if (!token) return;

  // Prefetch common queries
  queryClient.prefetchQuery({
    queryKey: ['/api/dashboard/global-stats'],
    queryFn: () => apiRequest('/api/dashboard/global-stats').then(r => r.json()),
  });

  queryClient.prefetchQuery({
    queryKey: ['/api/centers'],
    queryFn: () => apiRequest('/api/centers').then(r => r.json()),
  });
}