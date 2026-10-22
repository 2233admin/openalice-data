import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export function DataCatalogPage() {
  const navigate = useNavigate();

  useEffect(() => {
    void navigate({ to: "/data-sources" });
  }, [navigate]);

  return null;
}

export const Route = createFileRoute("/data-catalog")({
  component: DataCatalogPage,
});
