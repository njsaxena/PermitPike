import { PermitCard, PROGRESS_GROUPS, type PermitSummary } from "./PermitCard";
import { ApprovedPermitTable, OpenPermitTable } from "./PermitTable";
import { Tabs } from "./Tabs";

const OPEN_GROUPS = PROGRESS_GROUPS.filter((g) => g.id !== "approved");

function Count({ n }: { n: number }) {
  return (
    <span className="flex h-6 min-w-6 items-center justify-center bg-surface px-1.5 font-mono text-sm font-normal">
      {n}
    </span>
  );
}

/**
 * The queue of permits. Open work is a board with one column per stage (or the same
 * permits as a table); approved permits sit apart underneath, since nobody acts on them.
 * Within a board column, permits keep the order they are passed in (the API sends
 * highest risk first, then newest). The tables sort by any column.
 */
export function PermitQueue({
  permits,
  hrefFor,
  label = "Permit queue",
}: {
  permits: PermitSummary[];
  /** Optional link for each permit, e.g. (p) => `/review/${p.id}`. */
  hrefFor?: (p: PermitSummary) => string;
  label?: string;
}) {
  const columns = OPEN_GROUPS.map((g) => ({
    ...g,
    permits: permits.filter((p) => g.statuses.includes(p.status)),
  }));
  const open = columns.flatMap((c) => c.permits);
  const approved = permits.filter((p) => p.status === "approved");

  const board = (
    <div className="grid gap-4 md:grid-cols-3">
      {columns.map((c) => (
        <section
          key={c.id}
          aria-labelledby={`queue-${c.id}`}
          className="flex min-w-0 flex-col gap-3 border border-border bg-sunken p-3"
        >
          <h3 id={`queue-${c.id}`} className="flex items-center justify-between gap-2.5 font-semibold text-ink">
            {c.title}
            <Count n={c.permits.length} />
          </h3>
          {c.permits.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {c.permits.map((p) => (
                <li key={p.id}>
                  <PermitCard permit={p} href={hrefFor?.(p)} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted">None right now.</p>
          )}
        </section>
      ))}
    </div>
  );

  // Links are worked out here on the server; the sortable tables are client components.
  const rows = (list: PermitSummary[]) => list.map((p) => ({ permit: p, href: hrefFor?.(p) }));
  const table = <OpenPermitTable rows={rows(open)} label={`${label}, open permits`} />;

  return (
    <div className="flex flex-col gap-12">
      <Tabs
        label={label}
        items={[
          { id: "board", label: "Board", count: open.length, content: board },
          { id: "table", label: "Table", content: table },
        ]}
      />

      <section aria-labelledby="queue-approved" className="flex flex-col gap-4 border-t border-border pt-8">
        <h3 id="queue-approved" className="flex items-center gap-2.5 text-lg font-semibold text-ink">
          Approved
          <span className="flex h-6 min-w-6 items-center justify-center bg-sunken px-1.5 font-mono text-sm font-normal">
            {approved.length}
          </span>
        </h3>
        {approved.length === 0 ? (
          <p className="text-sm text-muted">No permits approved yet.</p>
        ) : (
          <ApprovedPermitTable rows={rows(approved)} label="Approved permits" />
        )}
      </section>
    </div>
  );
}
