import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/*
 * QueryProvider
 * -------------
 * Owns the TanStack Query client. Defaults favor a marketing site: generous
 * stale time (content rarely changes within a session), no aggressive refetch
 * on window focus, and a single retry to stay resilient without hammering the
 * API. The client lives in state so it's stable across re-renders but never
 * shared between tests/SSR requests.
 */

export function QueryProvider({ children }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 30,
            refetchOnWindowFocus: false,
            retry: 1,
          },
          mutations: { retry: 0 },
        },
      })
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

export default QueryProvider;
