import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchEnvStatus, type EnvStatus } from "../api";

type EnvStatusContextValue = {
  status: EnvStatus | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const EnvStatusContext = createContext<EnvStatusContextValue | null>(null);

export function EnvStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<EnvStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await fetchEnvStatus());
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return <EnvStatusContext.Provider value={{ status, loading, refresh }}>{children}</EnvStatusContext.Provider>;
}

export function useEnvStatus() {
  const ctx = useContext(EnvStatusContext);
  if (!ctx) {
    throw new Error("useEnvStatus must be used within EnvStatusProvider");
  }
  return ctx;
}
