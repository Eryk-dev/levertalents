import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type LoadingVariant = "spinner" | "skeleton" | "inline";
type SkeletonLayout = "cards" | "list" | "stats" | "table";

interface LoadingStateProps {
  variant?: LoadingVariant;
  layout?: SkeletonLayout;
  count?: number;
  message?: string;
  className?: string;
}

export function LoadingState({
  variant = "skeleton",
  layout = "cards",
  count = 3,
  message,
  className,
}: LoadingStateProps) {
  if (variant === "spinner") {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-4 py-16", className)}>
        <div className="h-6 w-6 rounded-full border-2 border-clay border-b-transparent animate-spin" />
        {message && <p className="text-[13px] text-dust italic">{message}</p>}
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2 text-[13px] text-dust", className)}>
        <div className="h-3 w-3 rounded-full border-2 border-clay border-b-transparent animate-spin" />
        <span className="italic">{message || "Carregando…"}</span>
      </div>
    );
  }

  if (layout === "stats") {
    return (
      <div className={cn("grid gap-6 md:grid-cols-2 lg:grid-cols-3", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-[var(--radius)] border border-border bg-card p-6 space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (layout === "list") {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-[var(--radius)] border border-border bg-card p-4 flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (layout === "table") {
    return (
      <div className={cn("rounded-[var(--radius)] border border-border overflow-hidden", className)}>
        <div className="bg-muted/50 p-3 flex gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="p-4 border-t border-border flex gap-4 items-center">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }

  // cards
  return (
    <div className={cn("grid gap-6 md:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-[var(--radius)] border border-border bg-card p-6 space-y-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
          <div className="pt-3 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );
}
