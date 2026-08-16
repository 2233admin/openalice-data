import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

function Base() {
  const navigate = useNavigate({ from: "/" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let redirected = false;
    let unlistenStatus: (() => void) | undefined;
    let unlistenDir: (() => void) | undefined;

    const redirect = (targetRoute: "/home" | "/setup") => {
      if (cancelled || redirected) return;
      redirected = true;
      clearTimeout(timeoutId);
      setLoading(false);
      void navigate({ to: targetRoute });
    };

    const timeoutId = setTimeout(() => {
      if (cancelled || redirected) return;
      void invoke<{ is_installed: boolean }>("get_installation_state")
        .then((state) => {
          console.log("Installation state from invoke:", state);
          redirect(state.is_installed ? "/home" : "/setup");
        })
        .catch((error) => {
          console.error("Error getting installation state:", error);
          redirect("/setup");
        });
    }, 2000);

    void listen<boolean>("installation-status", (event) => {
      console.log("Received installation-status event:", event);
      redirect(event.payload ? "/home" : "/setup");
    }).then((unlisten) => {
      unlistenStatus = unlisten;
      if (cancelled) unlisten();
    }).catch((error) => {
      console.error("Error listening for installation status:", error);
    });

    void listen<string>("installation-directory", (event) => {
      console.log("Received installation-directory event:", event);
      localStorage.setItem("installationDirectory", event.payload);
    }).then((unlisten) => {
      unlistenDir = unlisten;
      if (cancelled) unlisten();
    }).catch((error) => {
      console.error("Error listening for installation directory:", error);
    });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      unlistenStatus?.();
      unlistenDir?.();
    };
  }, [navigate]);
  

  return (
    <div className="flex items-center justify-center h-screen">
      {loading && (
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">正在启动 OpenAlice Data Platform</h1>
          <p className="text-gray-600">正在检查安装状态…</p>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: Base,
});
