import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ContainerMode = "fluid" | "grid" | "prose" | "full";

interface ContainerProps {
  children: ReactNode;
  mode?: ContainerMode;
  className?: string;
  as?: "div" | "section" | "main" | "article";
}

/**
 * Ultrawide-aware container.
 *
 * - `fluid`: default, max 1920px cap, fluid padding.
 * - `grid`:  like fluid, widens on ultrawide up to 120rem — used for dashboards.
 * - `prose`: 72ch reading width for text-heavy pages.
 * - `full`:  true edge-to-edge (for hero bleeds).
 */
export function Container({
  children,
  mode = "fluid",
  className,
  as: Tag = "div",
}: ContainerProps) {
  const styles: Record<ContainerMode, string> = {
    fluid: "container-fluid",
    grid: "container-fluid",
    prose: "container-prose container-fluid",
    full: "w-full",
  };

  return <Tag className={cn(styles[mode], className)}>{children}</Tag>;
}
