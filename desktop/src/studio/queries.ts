import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { loadStudioState } from "./client";
export const studioStateQueryKey = ["studio", "state"] as const;

export function useStudioState() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: studioStateQueryKey,
    queryFn: () => loadStudioState(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  useEffect(() => {
    const refresh = () => void queryClient.invalidateQueries({ queryKey: studioStateQueryKey });
    window.addEventListener("studio-credentials-updated", refresh);
    return () => window.removeEventListener("studio-credentials-updated", refresh);
  }, [queryClient]);
  return query;
}
