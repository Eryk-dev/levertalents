import type { CSSProperties, ReactNode } from "react";

/* ──────────────────────────────────────────────────────────────
 * ICONS — Linear-style inline icon paths (16px default, stroke).
 * Imported from the reference `tokens.jsx` (source of truth).
 * Paths use `viewBox="0 0 24 24"` and expect `stroke="currentColor"`.
 * Each entry is either:
 *   - a single SVG path `d` string, rendered as <path d={...} />
 *   - a ReactNode fragment (multi-element icon, rendered as-is)
 * ─────────────────────────────────────────────────────────────── */

export type IconPath = string | ReactNode;

export const ICONS: Record<string, IconPath> = {
  home:     "M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z",
  target:   (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </>
  ),
  chart:    "M3 3v18h18 M7 15l3-4 3 2 5-7",
  pulse:    "M3 12h4l2-7 4 14 2-7h6",
  users:    (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 20c.5-4 3.5-6 7-6s6.5 2 7 6" />
      <circle cx="17" cy="7" r="2.5" />
      <path d="M22 17c-.3-2.5-2-4-4.5-4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18 M8 3v4 M16 3v4" />
    </>
  ),
  kanban:   (
    <>
      <rect x="3" y="4" width="5" height="12" rx="1" />
      <rect x="10" y="4" width="5" height="16" rx="1" />
      <rect x="17" y="4" width="4" height="8" rx="1" />
    </>
  ),
  briefcase:(
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M3 13h18" />
    </>
  ),
  userPlus: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 20c.5-4 3.5-6 7-6 M17 11v6 M14 14h6" />
    </>
  ),
  sparkles: "M12 3l1.8 4.5L18 9l-4.2 1.5L12 15l-1.8-4.5L6 9l4.2-1.5zM19 14l.9 2.3L22 17l-2.1.7L19 20l-.9-2.3L16 17l2.1-.7z",
  building: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M9 8h2 M13 8h2 M9 12h2 M13 12h2 M9 16h2 M13 16h2" />
    </>
  ),
  search:   (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  bell:     "M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8 M10 21a2 2 0 0 0 4 0",
  plus:     "M12 5v14 M5 12h14",
  arrow:    "M5 12h14 m-5-5 5 5-5 5",
  arrowUp:  "M12 19V5 m-5 5 5-5 5 5",
  check:    "M4 12l5 5L20 6",
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l3 3 5-6" />
    </>
  ),
  clock:    (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  more:     (
    <>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" />
    </>
  ),
  filter:   "M4 5h16 M7 12h10 M10 19h4",
  menu:     "M4 6h16 M4 12h16 M4 18h16",
  chevDown: "M6 9l6 6 6-6",
  chevRight:"M9 6l6 6-6 6",
  chevLeft: "M15 6l-6 6 6 6",
  x:        "M6 6l12 12 M18 6 6 18",
  star:     "M12 3l2.8 6 6.2.9-4.5 4.4 1 6.2L12 17.8 6.5 20.5l1-6.2L3 9.9 9.2 9z",
  message:  "M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  book:     (
    <>
      <path d="M4 4h10a4 4 0 0 1 4 4v13H8a4 4 0 0 1-4-4z" />
      <path d="M4 17a4 4 0 0 1 4-4h10" />
    </>
  ),
  zap:      "M13 2 3 14h8l-1 8 10-12h-8z",
  fire:     "M12 3s4 4 4 8a4 4 0 0 1-8 0c0-2 2-3 2-5s-2 0 2-3zM8 14c0 3 2 7 4 7s4-4 4-7",
  trending: "M3 17l6-6 4 4 8-8 M15 7h6v6",
  flag:     "M4 21V4 M4 4h12l-2 4 2 4H4",
  tag:      (
    <>
      <path d="M3 12V4h8l10 10-8 8z" />
      <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" />
    </>
  ),
  download: "M12 4v12 m-5-5 5 5 5-5 M4 20h16",
  send:     "M3 11 21 4l-7 18-3-8z",
  grid:     "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
  layers:   "M12 3 2 8l10 5 10-5z M2 14l10 5 10-5 M2 11l10 5 10-5",
  lightning:"M13 2 4 14h7l-1 8 9-12h-7z",
  command:  (
    <>
      <path d="M7 7a2 2 0 1 1 4 0v4 m6-4a2 2 0 1 0-4 0v4 m0 2v-2 m4 0a2 2 0 1 1-4 0 m0 0H7 m4 0a2 2 0 1 1-4 0 M17 13a2 2 0 1 0 4 0" />
    </>
  ),
  sun:      (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2 M12 20v2 M4 12H2 M22 12h-2 M5 5l1.5 1.5 M17.5 17.5 19 19 M5 19l1.5-1.5 M17.5 6.5 19 5" />
    </>
  ),
  rows:     "M3 6h18 M3 12h18 M3 18h18",
  close:    "M6 6l12 12 M18 6 6 18",
  phone:    "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
};

export type IconName = keyof typeof ICONS;

interface IconProps {
  /** Name of the icon in `ICONS`. */
  name: IconName;
  /** Size in px (width & height). Default: 16. */
  size?: number;
  /** Stroke width. Default: 1.6 (matches reference tokens). */
  strokeWidth?: number;
  /** Extra class applied to the <svg>. Use for `text-*` color utilities. */
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean;
}

/**
 * Linear-style inline icon. Uses `currentColor` — colour with
 * text-* utilities (e.g. `text-text-muted`). Do not pass a `color`
 * prop; style via parent.
 */
export function Icon({
  name,
  size = 16,
  strokeWidth = 1.6,
  className,
  style,
  "aria-hidden": ariaHidden = true,
}: IconProps) {
  const d = ICONS[name];
  if (d === undefined) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden={ariaHidden}
    >
      {typeof d === "string" ? <path d={d} /> : d}
    </svg>
  );
}
