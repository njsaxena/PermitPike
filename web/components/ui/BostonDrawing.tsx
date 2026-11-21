import type { SVGProps } from "react";
import { cx } from "@/lib/cx";

/*
 * Boston line drawings, authored for PermitPike. Ink line art with one dome-gold
 * light per drawing. Built environment only: no skyline clip art, no landmarks
 * used as logos of other organizations.
 */

export type BostonDrawingKind = "city-hall" | "brownstone" | "triple-decker" | "gas-lamp";

const INK = "var(--pp-ink)";
const GOLD = "var(--pp-accent)";
const FINE = "var(--pp-border-strong)";

const LABELS: Record<BostonDrawingKind, string> = {
  "city-hall": "Line drawing of Boston City Hall",
  brownstone: "Line drawing of a Back Bay brownstone with a stoop",
  "triple-decker": "Line drawing of a Boston triple-decker with stacked porches",
  "gas-lamp": "Line drawing of a Beacon Hill gas lamp",
};

function range(start: number, end: number, step: number) {
  const out: number[] = [];
  for (let v = start; v <= end; v += step) out.push(v);
  return out;
}

function CityHall() {
  return (
    <>
      {/* Plaza and piers */}
      <path d="M6 150 H234" />
      {[38, 68, 98, 136, 166, 196].map((x) => (
        <rect key={x} x={x} y={112} width={6} height={38} />
      ))}
      {/* Lower office tier: wide bays */}
      <rect x={30} y={96} width={180} height={16} />
      {range(50, 190, 20).map((x) => (
        <path key={x} d={`M${x} 96 V112`} />
      ))}
      {/* Middle tier */}
      <rect x={20} y={72} width={200} height={24} />
      {range(30, 210, 10).map((x) => (
        <path key={x} d={`M${x} 72 V96`} />
      ))}
      <rect x={150.75} y={78} width={8.5} height={14} fill={GOLD} />
      {/* Top tiers: the dense precast fins */}
      <rect x={10} y={38} width={220} height={34} />
      <path d="M10 55 H230" />
      {range(16, 224, 6).map((x) => (
        <path key={x} d={`M${x} 38 V55 M${x} 55 V72`} stroke={FINE} />
      ))}
      <path d="M6 38 H234" />
      {/* Projecting council chamber */}
      <rect x={96} y={96} width={48} height={30} fill="var(--pp-background)" />
      <path d="M96 106 H144 M96 116 H144" stroke={FINE} />
    </>
  );
}

function Brownstone() {
  const floors = [40, 72, 104];
  return (
    <>
      <path d="M6 150 H234" />
      {/* Body and cornice */}
      <rect x={60} y={30} width={124} height={120} />
      <rect x={54} y={22} width={136} height={8} />
      <path d="M58 30 H186" stroke={FINE} />
      {/* Bow front */}
      <path d="M66 30 V150 M78 30 V150 M118 30 V150 M130 30 V150" />
      {floors.map((y) => (
        <g key={y}>
          <rect x={83} y={y + 4} width={14} height={22} />
          <rect x={101} y={y + 4} width={14} height={22} />
          <rect x={69} y={y + 6} width={6} height={18} />
          <rect x={121} y={y + 6} width={6} height={18} />
          <path d={`M80 ${y + 28} H120`} stroke={FINE} />
        </g>
      ))}
      <rect x={101.75} y={76.75} width={12.5} height={20.5} fill={GOLD} />
      {/* Right bay: windows and the arched door */}
      <rect x={146} y={44} width={22} height={22} />
      <rect x={146} y={76} width={22} height={22} />
      <path d="M146 136 V114 A11 11 0 0 1 168 114 V136 Z" />
      <path d="M157 103 V136" stroke={FINE} />
      {/* Garden-level windows */}
      <rect x={84} y={138} width={30} height={8} stroke={FINE} />
      {/* Stoop */}
      <path d="M140 136 H174 V140 H182 V144 H190 V148 H198 V150" />
      <path d="M174 124 L200 144 V150 M174 124 V136" />
      {/* Gas lamp at the curb */}
      <path d="M220 150 V100" />
      <path d="M213 84 H227 L225 98 H215 Z" />
      <path d="M211 84 L220 76 L229 84" />
      <rect x={218} y={88} width={4} height={6} fill={GOLD} stroke="none" />
    </>
  );
}

function TripleDecker() {
  const levels = [42, 78, 114];
  return (
    <>
      <path d="M6 150 H234" />
      {/* Gable and body */}
      <path d="M64 44 L120 10 L176 44" />
      <path d="M70 44 H170" />
      <rect x={72} y={44} width={96} height={106} />
      <rect x={112} y={24} width={16} height={12} />
      {/* Clapboard on the side of the house */}
      {range(50, 146, 8).map((y) => (
        <path key={y} d={`M124 ${y} H168`} stroke={FINE} />
      ))}
      {levels.map((y) => (
        <g key={y}>
          {/* Porch: roof line, columns, railing and balusters */}
          <path d={`M72 ${y + 4} H122`} />
          <path d={`M75 ${y + 4} V${y + 36} M98 ${y + 4} V${y + 36} M120 ${y + 4} V${y + 36}`} />
          <path d={`M75 ${y + 25} H120`} />
          {range(79, 117, 4).map((x) => (
            <path key={x} d={`M${x} ${y + 25} V${y + 36}`} stroke={FINE} />
          ))}
          {/* Side windows */}
          <rect x={134} y={y + 8} width={22} height={20} fill="var(--pp-background)" />
          <path d={`M145 ${y + 8} V${y + 28}`} />
        </g>
      ))}
      <rect x={134.75} y={86.75} width={9.5} height={18.5} fill={GOLD} stroke="none" />
      {/* Front door, inside the ground-floor porch */}
      <rect x={102} y={126} width={14} height={24} />
    </>
  );
}

function GasLamp() {
  return (
    <>
      {/* Brick sidewalk */}
      <path d="M40 150 H200" />
      {range(40, 192, 16).map((x, i) => (
        <path key={x} d={`M${x + (i % 2) * 8} 150 V158`} stroke={FINE} />
      ))}
      <path d="M40 158 H200" stroke={FINE} />
      {/* Post, base and collar */}
      <rect x={110} y={138} width={20} height={12} />
      <rect x={116} y={72} width={8} height={66} />
      <rect x={112} y={66} width={16} height={6} />
      {/* Ladder rest */}
      <path d="M98 80 H142 M98 77 V83 M142 77 V83" />
      {/* Lantern, cap and finial */}
      <path d="M104 30 H136 L130 64 H110 Z" />
      <path d="M120 30 V64" stroke={FINE} />
      <path d="M100 30 L120 14 L140 30" />
      <circle cx={120} cy={10} r={3} />
      {/* The flame */}
      <path d="M120 58 C113 51 115 43 120 38 C125 43 127 51 120 58 Z" fill={GOLD} />
    </>
  );
}

const DRAWINGS: Record<BostonDrawingKind, () => React.JSX.Element> = {
  "city-hall": CityHall,
  brownstone: Brownstone,
  "triple-decker": TripleDecker,
  "gas-lamp": GasLamp,
};

export interface BostonDrawingProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  kind: BostonDrawingKind;
  /** Accessible name. Omit for decorative use (it is then hidden from assistive tech). */
  title?: string;
}

export function BostonDrawing({ kind, title, className, ...rest }: BostonDrawingProps) {
  const Drawing = DRAWINGS[kind];
  return (
    <svg
      viewBox="0 0 240 160"
      fill="none"
      stroke={INK}
      strokeWidth={1.5}
      strokeLinejoin="miter"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={cx("block h-auto w-full", className)}
      {...rest}
    >
      <Drawing />
    </svg>
  );
}

export const BOSTON_DRAWING_LABELS = LABELS;
