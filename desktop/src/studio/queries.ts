import { useQuery } from "@tanstack/react-query";
import { loadStudioState } from "./client";

export const studioStateQueryKey = ["studio", "state"] as const;

export function useStudioState() {
  return useQuery({
    queryKey: studioStateQueryKey,
    queryFn: () => loadStudioState(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
