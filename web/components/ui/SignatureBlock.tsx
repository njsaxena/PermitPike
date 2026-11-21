import { cx } from "@/lib/cx";

/*
 * The official's sign-off, drawn like the signature line on a paper permit.
 * Only a human official signs. Nothing in PermitPike renders this for the AI.
 * No stamps, seals or rubber-stamp effects (see DESIGN.md).
 */
export interface SignatureBlockProps {
  /** Name of the signing official. Omit while the permit is unsigned. */
  name?: string;
  /** Their role, e.g. "Building official". */
  role?: string;
  /** Mono timestamp, e.g. "21 NOV 2026 14:08". */
  signedAt?: string;
  /** Permit number, e.g. "EL-2026-04817". */
  permitNumber: string;
  className?: string;
}

export function SignatureBlock({
  name,
  role = "Building official",
  signedAt,
  permitNumber,
  className,
}: SignatureBlockProps) {
  const signed = Boolean(name && signedAt);
  return (
    <div className={cx("flex flex-col gap-3 border border-border bg-surface p-card", className)}>
      <div className="flex min-h-10 items-end">
        {signed ? (
          <span className="text-title tracking-tight text-ink">{name}</span>
        ) : (
          <span className="text-muted">Not signed yet</span>
        )}
      </div>
      <div className={cx("h-0 border-t-2", signed ? "border-ink" : "border-dashed border-border-strong")} />
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_auto_1fr]">
        <div>
          <dt className="sr-only">Role</dt>
          <dd className="font-semibold text-ink">{signed ? role : `${role} signs here`}</dd>
        </div>
        {signedAt && (
          <div>
            <dt className="sr-only">Signed</dt>
            <dd className="font-mono text-muted">{signedAt}</dd>
          </div>
        )}
        <div className="sm:text-right">
          <dt className="sr-only">Permit number</dt>
          <dd className="font-mono whitespace-nowrap text-ink">{permitNumber}</dd>
        </div>
      </dl>
    </div>
  );
}
