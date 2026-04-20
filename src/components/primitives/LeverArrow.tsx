import { cn } from "@/lib/utils";

interface LeverArrowProps {
  className?: string;
  animate?: boolean;
  /** Kept for API compatibility — the official arrow is a single filled glyph. */
  variant?: "solid" | "outline" | "duotone";
}

/**
 * The Lever arrow — official brand symbol (Prancheta 7 of marca kit).
 * Filled polygon apex-up-right; uses currentColor so it adopts
 * the nearest text color (pair with `text-turquoise` for brand cyan).
 */
export function LeverArrow({ className, animate = false }: LeverArrowProps) {
  return (
    <svg
      viewBox="-66 -1 570 572"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("inline-block", animate && "animate-fade-in", className)}
      aria-hidden="true"
    >
      <polygon
        fill="currentColor"
        points="438.23 0 438.23 568.39 400.53 448.27 386.78 404.38 328.69 219.08 139.08 282.31 95.19 296.89 0 328.61 81.14 267.80 118.76 239.55"
      />
    </svg>
  );
}

/**
 * Decorative arrow pattern — diagonal lines converging into the
 * official Lever symbol at the top-right. Use for hero backgrounds,
 * section dividers, empty states.
 */
export function LeverArrowPattern({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("inline-block", className)}
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="1.25" strokeLinecap="round">
        <path d="M20 380 L380 20" opacity="0.55" />
        <path d="M60 380 L380 60" opacity="0.42" />
        <path d="M100 380 L380 100" opacity="0.32" />
        <path d="M140 380 L380 140" opacity="0.24" />
        <path d="M180 380 L380 180" opacity="0.18" />
        <path d="M220 380 L380 220" opacity="0.12" />
        <path d="M260 380 L380 260" opacity="0.08" />
      </g>
      <g transform="translate(296 20) scale(0.182)">
        <polygon
          fill="currentColor"
          points="438.23 0 438.23 568.39 400.53 448.27 386.78 404.38 328.69 219.08 139.08 282.31 95.19 296.89 0 328.61 81.14 267.80 118.76 239.55"
        />
      </g>
    </svg>
  );
}
