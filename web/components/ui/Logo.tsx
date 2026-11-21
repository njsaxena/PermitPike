import { cx } from "@/lib/cx";

/*
 * The PermitPike logo: a 4×4 grid of square cells (a breaker-panel directory, or city
 * lots) in three flat brick steps. The darkest cells form a blocky "P". One knockout
 * line crosses the bottom right: the Mass Pike. Geometry matches the logo canvas.
 */

const DARK = "var(--pp-critical)";
const MID = "var(--pp-brick-step-2)";
const LIGHT = "var(--pp-brick-step-3)";

/** Row by row, left to right. */
const CELLS = [
  [DARK, DARK, DARK, MID],
  [DARK, LIGHT, DARK, MID],
  [DARK, DARK, DARK, LIGHT],
  [DARK, MID, LIGHT, MID],
] as const;

/** What the Pike line is cut in. "transparent" cuts it out, for the mark over a picture. */
/** The Mass Pike line, corner to corner across the bottom right. */
const PIKE = { x1: 16.8, y1: 104.2, x2: 111.2, y2: 68.8 };

export type LogoKnockout = "surface" | "background" | "transparent";

export interface PermitPikeMarkProps {
  /** Pixel size of the square mark. */
  size?: number;
  /** Color behind the mark; the Pike line is cut in this color. */
  on?: LogoKnockout;
  /** Accessible name. Omit when the wordmark sits next to it. */
  title?: string;
  className?: string;
}

export function PermitPikeMark({ size = 32, on = "surface", title, className }: PermitPikeMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cx("block shrink-0 overflow-hidden", className)}
    >
      {on === "transparent" && (
        // One transparent mark per page, so a fixed id is safe.
        <mask id="pp-pike-knockout">
          <rect width={100} height={100} fill="#fff" />
          <line {...PIKE} stroke="#000" strokeWidth={4} />
        </mask>
      )}
      <g mask={on === "transparent" ? "url(#pp-pike-knockout)" : undefined}>
        {CELLS.map((row, r) =>
          row.map((fill, c) => (
            <rect key={`${r}-${c}`} x={c * 26} y={r * 26} width={22} height={22} fill={fill} />
          )),
        )}
      </g>
      {on !== "transparent" && (
        <line
          {...PIKE}
          stroke={on === "surface" ? "var(--pp-surface)" : "var(--pp-background)"}
          strokeWidth={4}
        />
      )}
    </svg>
  );
}

/** Mark plus the "PermitPike" wordmark in Public Sans Bold. */
export function PermitPikeLogo({
  size = "md",
  on = "surface",
  className,
}: {
  /** sm: 28px mark, 18px type (headers). lg: 64px mark, 56px type. */
  size?: "sm" | "md" | "lg";
  on?: LogoKnockout;
  className?: string;
}) {
  const s = {
    sm: { mark: 28, gap: "gap-2.5", text: "text-lg" },
    md: { mark: 40, gap: "gap-3", text: "text-title" },
    lg: { mark: 64, gap: "gap-5", text: "text-[56px] leading-[64px]" },
  }[size];
  return (
    <span className={cx("inline-flex items-center", s.gap, className)}>
      <PermitPikeMark size={s.mark} on={on} />
      <span
        className={cx("font-bold tracking-[-0.02em] text-ink", s.text)}
        style={{ fontFamily: "var(--pp-font-wordmark)" }}
      >
        PermitPike
      </span>
    </span>
  );
}
