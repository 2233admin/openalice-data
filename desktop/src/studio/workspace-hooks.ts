import { useEffect, useState } from "react";
import { readWorkspaceStore, subscribeWorkspaceStore, type WorkspaceStore } from "./workspace-store";

export function useWorkspaceStore(): WorkspaceStore {
  const [store, setStore] = useState<WorkspaceStore>(() => readWorkspaceStore());
  useEffect(() => subscribeWorkspaceStore(() => setStore(readWorkspaceStore())), []);
  return store;
}
