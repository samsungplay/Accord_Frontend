import { QueryClient } from "@tanstack/react-query";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: false,
      retry: 0,
    },
  },
});

export default queryClient;
