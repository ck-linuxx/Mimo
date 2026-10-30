import { QueryClient } from '@tanstack/react-query';
import { PluggyError } from 'services/pluggy/types';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutos de cache fresco
      gcTime: 1000 * 60 * 30, // 30 minutos em memória
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof PluggyError && (error.kind === 'auth' || error.kind === 'rate_limit')) {
          return false;
        }
        return failureCount < 1;
      },
    },
  },
});

