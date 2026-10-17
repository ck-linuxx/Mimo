import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutos de cache fresco
      gcTime: 1000 * 60 * 30, // 30 minutos em memória
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

