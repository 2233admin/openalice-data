import { useState } from "react";
import { StudioLink } from "./StudioLink";
import { startStudioService, waitForStudioService } from "./client";

interface ServiceStartActionProps {
  backendId?: string;
  href: string;
  label: string;
  className?: string;
  onStarted?: () => Promise<unknown> | unknown;
}

export function ServiceStartAction({
  backendId,
  href,
  label,
  className,
  onStarted,
}: ServiceStartActionProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!backendId) {
    return <StudioLink className={className} href={href}>{label}</StudioLink>;
  }

  const handleStart = async () => {
    setIsStarting(true);
    setError(null);
    try {
      const started = await startStudioService(backendId);
      await waitForStudioService(started);
      await onStarted?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        aria-busy={isStarting}
        className={`${className ?? ""} disabled:cursor-wait disabled:opacity-60`}
        disabled={isStarting}
        onClick={() => void handleStart()}
        type="button"
      >
        {isStarting ? "正在启动…" : label}
      </button>
      {error && <span className="text-xs text-theme-danger" role="alert">启动服务失败：{error}</span>}
    </span>
  );
}
