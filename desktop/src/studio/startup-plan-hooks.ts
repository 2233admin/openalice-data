import { useEffect, useState } from "react";
import { readStartupPlanStore, subscribeStartupPlans, type StartupPlanStore } from "./startup-plan-store";

export function useStartupPlanStore(): StartupPlanStore {
  const [store, setStore] = useState<StartupPlanStore>(() => readStartupPlanStore());
  useEffect(() => subscribeStartupPlans(() => setStore(readStartupPlanStore())), []);
  return store;
}
