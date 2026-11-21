import type { LoadCalcMethod, LoadCalcOutcome, LoadCalcResult } from "@permitpike/contract";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { cx } from "@/lib/cx";
import { codeSource } from "@/lib/review-sources";

/*
 * The load calculation, shown the way an official checks one by hand: every line with
 * its volt-amps and the code section it comes from, then the totals against the service
 * rating. Numbers come from packages/loadcalc; nothing is recomputed here.
 */

const METHOD: Record<LoadCalcMethod, string> = {
  nec_120_83: "Existing dwelling, optional calculation from floor area and nameplates (NEC 2026 120.83)",
  nec_120_87: "Existing load from measured maximum demand (NEC 2026 120.87)",
};

const OUTCOME: Record<LoadCalcOutcome, { label: string; className: string; bar: string }> = {
  fits: { label: "Fits the service", className: "border-positive bg-positive-tint text-positive", bar: "bg-positive" },
  tight: { label: "Tight: close to the rating", className: "border-warning bg-warning-tint text-warning", bar: "bg-warning" },
  needs_upgrade: { label: "Needs a service upgrade", className: "border-critical bg-critical-tint text-critical", bar: "bg-critical" },
};

const va = (n: number) => `${Math.round(n).toLocaleString("en-US")} VA`;
const amps = (n: number) => `${n.toLocaleString("en-US", { maximumFractionDigits: 1 })} A`;

/** How much of the service the calculated load uses, as a flat bar with the 80% and 100% marks. */
export function ServiceMeter({ calc, label }: { calc: LoadCalcResult; label: string }) {
  const o = OUTCOME[calc.result];
  const pct = Math.round(calc.percentOfRating);
  const width = Math.min(100, (calc.percentOfRating / 125) * 100);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-semibold text-ink">{label}</span>
        <span className="text-ink">
          <span className="text-lg">{amps(calc.totalAmps)}</span>
          <span className="text-muted"> of {amps(calc.serviceAmps)} · </span>
          <span className={cx("font-semibold", pct > 100 ? "text-critical" : "text-ink")}>{pct}%</span>
        </span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={125}
        aria-valuenow={pct}
        aria-valuetext={`${pct} percent of the ${calc.serviceAmps} amp service`}
        className="relative h-3 border border-ink bg-surface"
      >
        <div className={cx("h-full", o.bar)} style={{ width: `${width}%` }} />
        {[80, 100].map((m) => (
          <span key={m} aria-hidden className="absolute -top-1 -bottom-1 w-px bg-ink" style={{ left: `${(m / 125) * 100}%` }} />
        ))}
      </div>
      <div className="relative h-4 text-sm text-muted" aria-hidden>
        <span className="absolute -translate-x-1/2" style={{ left: `${(80 / 125) * 100}%` }}>
          80%
        </span>
        <span className="absolute -translate-x-1/2" style={{ left: `${(100 / 125) * 100}%` }}>
          100%
        </span>
      </div>
      <span className={cx("inline-flex h-6 items-center self-start border px-2 text-sm font-semibold", o.className)}>
        {o.label}
      </span>
    </div>
  );
}

export function LoadCalcPanel({
  calc,
  before,
}: {
  calc: LoadCalcResult;
  /** The same load on the existing service, when the job includes a service upgrade. */
  before?: LoadCalcResult | null;
}) {
  const source = codeSource("NEC 2026 120.83");
  return (
    <div className="flex flex-col gap-6">
      {/* What this is, for officials who don't run these by hand every day. */}
      <div className="flex max-w-prose flex-col gap-2 text-ink">
        <p>
          Can the home&apos;s electrical service carry the new equipment? PermitPike adds up what the home already
          draws and the new load, line by line as the electrical code sets out, and compares the total to the{" "}
          <span className="font-semibold">{calc.serviceAmps} A</span> service.
        </p>
        <p className="text-sm text-muted">
          Under 80% of the rating fits. 80 to 100% is tight: allowed, but with little room left. Over 100% needs a
          bigger service before the work can go ahead. The 80% line is a PermitPike setting, not a code rule.
        </p>
      </div>
      <div className="flex flex-col gap-5 border border-border bg-surface p-card">
        <ServiceMeter calc={calc} label={before ? "On the new service" : "Calculated load"} />
        {before && (
          <div className="border-t border-border pt-5">
            <ServiceMeter calc={before} label="On the existing service" />
          </div>
        )}
      </div>

      <p className="text-sm text-muted">
        Method: {/* Stored results from before `method` existed default to 120.83, as the contract does. */}
        <span className="text-ink">{METHOD[calc.method ?? "nec_120_83"]}</span>
        {source && (
          <>
            {" · "}
            <a href={source.url} target="_blank" rel="noreferrer" className="pp-link">
              {source.name}
            </a>
          </>
        )}
      </p>

      <div className="overflow-x-auto">
        <Table aria-label="Load calculation, line by line">
          <TableHead>
            <TableRow>
              <TableHeader>Line</TableHeader>
              <TableHeader numeric>Volt-amps</TableHeader>
              <TableHeader>Code</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {calc.steps.map((s, i) => (
              <TableRow key={`${s.label}-${i}`}>
                <TableCell className="min-w-56">{s.label}</TableCell>
                <TableCell numeric className="whitespace-nowrap">
                  {va(s.va)}
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap text-muted">{s.citation}</TableCell>
              </TableRow>
            ))}
            <TotalRow label="Existing load after demand factors" value={va(calc.existingVA)} />
            <TotalRow label="New load" value={va(calc.addedVA)} />
            <TotalRow label="Total calculated load" value={va(calc.totalCalculatedVA)} strong />
            <TotalRow label={`At 240 V`} value={amps(calc.totalAmps)} strong />
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function TotalRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <TableRow className="border-t border-ink">
      <TableCell className={cx(strong && "font-semibold")}>{label}</TableCell>
      <TableCell numeric className={cx("whitespace-nowrap", strong && "font-semibold")}>
        {value}
      </TableCell>
      <TableCell />
    </TableRow>
  );
}
