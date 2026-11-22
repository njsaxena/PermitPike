"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Archive, Download, ExternalLink, FileText, GitCompareArrows, History, Search } from "lucide-react";
import { Button, Callout } from "@/components/ui";
import type { ArchiveChatInput, ArchiveChatResponse, ArchiveDocument, ArchiveRecord } from "@/lib/archive";

const DATASET_URL = "https://data.boston.gov/dataset/approved-building-permits";
const RECORDS_GUIDE = "https://www.boston.gov/departments/inspectional-services/how-find-historical-permit-records";
const EXAMPLES = ["EV chargers in Dorchester since 2023", "Permits at 99 High Street", "Boston EV charger installation guides"];
const QUERY_LIMIT = 500;
const permitNumberInput = /^[A-Z0-9][A-Z0-9-]{1,23}$/i;

type Turn = {
  id: number;
  query: string;
  result?: ArchiveChatResponse;
  error?: string;
};

function publicUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && !url.username && !url.password && !url.port &&
        /(^|\.)(boston\.gov|cityofboston\.gov|bostonplans\.org|mass\.gov)$/i.test(url.hostname)) {
      return url.href;
    }
  } catch {
    return null;
  }
  return null;
}

function SourceLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="pp-link inline-flex items-center gap-1 text-sm">
      {children}
      <ExternalLink aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} />
    </a>
  );
}

function permitAddress(record: ArchiveRecord): string {
  const address = record.address?.trim() ?? "";
  const zip = record.zip?.trim() ?? "";
  return address && zip && !address.endsWith(zip) ? `${address}, ${zip}` : address || zip;
}

function permitDate(value: string | null | undefined): string {
  const day = value?.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (!day) return value ?? "";
  const parsed = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value ?? "";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(parsed);
}

function downloadSummaries(records: ArchiveRecord[]) {
  if (!records.length) return;
  const text = records.map(record => [
    `Permit ${record.permitNumber}`,
    ...[
      ["Address", permitAddress(record)],
      ["Issued", permitDate(record.issuedDate)],
      ["Status", record.status],
      ["Work type", record.workType],
      ["Permit type", record.permitType],
      ["Parcel", record.parcelId],
      ["City description", record.description],
      ["City work notes", record.details],
      ["City source", publicUrl(record.sourceUrl) ?? DATASET_URL],
    ].flatMap(([label, value]) => value ? [`${label}: ${value}`] : []),
  ].join("\n")).join("\n\n");
  const blob = new Blob(
    ["Generated permit record summaries\nExtracted from linked city records. Original documents are available from city sources.\n\n", text, "\n"],
    { type: "text/plain;charset=utf-8" },
  );
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  const number = records.length === 1 ? records[0]?.permitNumber.replace(/[^A-Za-z0-9-]+/g, "-") : null;
  anchor.download = number ? `boston-permit-${number}-summary.txt` : "boston-permit-record-summaries.txt";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 10_000);
}

export function ArchiveChat({ portalUrl }: { portalUrl: string }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const active = useRef<AbortController | null>(null);
  const nextId = useRef(0);
  const input = useRef<HTMLTextAreaElement>(null);
  const latest = useRef<HTMLElement>(null);
  const busy = turns.some(turn => !turn.result && !turn.error);

  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => {
    latest.current?.scrollIntoView({ block: "nearest" });
  }, [turns.length]);

  function clearSearch() {
    active.current?.abort();
    active.current = null;
    setTurns([]);
    setQuery("");
    input.current?.focus();
  }

  async function search(value: string, selectedPermits?: string[]) {
    const trimmed = value.trim().slice(0, QUERY_LIMIT);
    if (!trimmed || active.current) return;
    const request = new AbortController();
    active.current = request;
    const id = ++nextId.current;
    const history: ArchiveChatInput["history"] = turns.flatMap(turn => {
      if (!turn.result?.answer || turn.result.status === "unavailable") return [];
      return [
        { role: "user" as const, content: turn.query },
        { role: "assistant" as const, content: turn.result.answer.slice(0, 1200) },
      ];
    }).slice(-8);
    const recentRecords = turns.slice().reverse().find(turn => Boolean(turn.result?.records.length))?.result?.records ?? [];
    const recordContext = (selectedPermits ?? recentRecords.map(record => record.permitNumber))
      .filter(number => permitNumberInput.test(number));
    const body: ArchiveChatInput = {
      query: trimmed,
      history,
      ...(recordContext.length ? { recordContext: recordContext.slice(0, 12) } : {}),
    };
    setTurns(previous => [...previous, { id, query: trimmed }]);
    setQuery("");
    setRecent(previous => [trimmed, ...previous.filter(item => item !== trimmed)].slice(0, 6));

    try {
      const response = await fetch("/api/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: request.signal,
      });
      if (response.status === 429) {
        throw new Error("The archive received too many searches. Wait a minute and try again.");
      }
      if (!response.ok) throw new Error("The archive search could not finish. Try again in a moment.");
      const result = await response.json() as ArchiveChatResponse;
      if (!result || typeof result.answer !== "string" ||
          !Array.isArray(result.records) || !Array.isArray(result.documents) || !Array.isArray(result.suggestions)) {
        throw new Error("The archive returned an incomplete result. Try again in a moment.");
      }
      if (!request.signal.aborted) {
        setTurns(previous => previous.map(turn => turn.id === id ? { ...turn, result } : turn));
      }
    } catch (error) {
      if (!request.signal.aborted) {
        const message = error instanceof Error && error.message.startsWith("The ")
          ? error.message : "The archive search could not finish. Try again in a moment.";
        setTurns(previous => previous.map(turn => turn.id === id ? { ...turn, error: message } : turn));
      }
    } finally {
      if (active.current === request) active.current = null;
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void search(query);
  }

  function handleKeys(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void search(query);
    }
  }

  return (
    // On wide screens the chat fills the space under the title and scrolls inside itself; the page doesn't.
    <div className="grid items-start gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_15rem] lg:grid-rows-[minmax(0,1fr)] lg:items-stretch">
      <div className="flex min-w-0 flex-col border border-border bg-surface lg:min-h-0">
        <section className="min-h-64 max-h-[58vh] overflow-y-auto lg:min-h-0 lg:max-h-none lg:flex-1" aria-label="Archive search conversation">
          {turns.length === 0 ? (
            <div className="p-card">
              <div className="mb-4 inline-flex size-9 items-center justify-center border border-ink bg-accent-tint">
                <Archive aria-hidden className="size-5" strokeWidth={1.65} />
              </div>
              <h2 className="text-lg text-ink">Search Boston records</h2>
              <p className="mt-1 max-w-prose text-muted">
                Ask about a permit number, a street address, a type of work, or a city document.
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                {EXAMPLES.map(example => (
                  <button
                    key={example}
                    type="button"
                    className="border border-border bg-background p-3 text-left text-sm font-semibold text-ink hov:wash"
                    onClick={() => void search(example)}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ol className="flex flex-col gap-5 p-4 sm:p-card">
              {turns.map((turn, index) => (
                <li key={turn.id} className="flex flex-col gap-3">
                  <p className="max-w-[90%] self-end whitespace-pre-wrap break-words border border-border bg-sunken px-3 py-2 text-ink">
                    <span className="sr-only">Your search. </span>{turn.query}
                  </p>
                  <article ref={index === turns.length - 1 ? latest : undefined} aria-label="Archive response" className="min-w-0">
                    {turn.error && <Callout tone="warning" title={turn.error} />}
                    {!turn.error && !turn.result && <p role="status" className="text-sm text-muted">Searching Boston records…</p>}
                    {turn.result && (
                      <ArchiveResult
                        result={turn.result}
                        portalUrl={portalUrl}
                        busy={busy}
                        onSearch={(value, permits) => void search(value, permits)}
                      />
                    )}
                  </article>
                </li>
              ))}
            </ol>
          )}
        </section>

        <form className="flex flex-col gap-2 border-t border-border p-4 sm:flex-row sm:items-end" onSubmit={submit}>
          <label htmlFor="archive-search" className="sr-only">Search Boston records</label>
          <textarea
            id="archive-search"
            ref={input}
            rows={2}
            maxLength={QUERY_LIMIT}
            placeholder="Ask about a permit, address, or official document"
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={handleKeys}
            className="min-w-0 flex-1 resize-y border border-border-strong bg-surface px-3 py-2 text-base text-ink"
          />
          <Button type="submit" loading={busy} disabled={!query.trim() && !busy} icon={<Search aria-hidden className="size-4" strokeWidth={1.75} />}>
            Search
          </Button>
        </form>
      </div>

      <aside aria-label="Archive controls and sources" className="flex flex-col gap-4 border border-border bg-surface p-4 lg:max-h-full lg:min-h-0 lg:self-start lg:overflow-y-auto">
        <Button variant="secondary" size="sm" className="self-start" onClick={clearSearch} icon={<History aria-hidden className="size-4" strokeWidth={1.75} />}>
          New search
        </Button>
        {!!recent.length && (
          <div className="border-t border-border pt-4">
            <h2 className="text-base font-semibold text-ink">Recent searches</h2>
            <ul className="mt-2 flex flex-col gap-1">
              {recent.map(item => (
                <li key={item} className="min-w-0">
                  <button
                    type="button"
                    className="pp-link block w-full truncate text-left text-sm disabled:cursor-not-allowed disabled:text-muted"
                    title={item}
                    disabled={busy}
                    onClick={() => void search(item)}
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="border-t border-border pt-4">
          <h2 className="text-base font-semibold text-ink">Official sources</h2>
          <ul className="mt-2 flex flex-col gap-2">
            <li><SourceLink href={DATASET_URL}>Analyze Boston</SourceLink></li>
            <li><SourceLink href={portalUrl}>City document archive</SourceLink></li>
            <li><SourceLink href={RECORDS_GUIDE}>Historical records guide</SourceLink></li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

function ArchiveResult({
  result,
  portalUrl,
  busy,
  onSearch,
}: {
  result: ArchiveChatResponse;
  portalUrl: string;
  busy: boolean;
  onSearch: (query: string, permitNumbers?: string[]) => void;
}) {
  const records = result.records;
  const [selected, setSelected] = useState<ReadonlySet<number>>(() => new Set());
  const selectedRecords = records.filter((_, index) => selected.has(index));
  const selectedPermits = [...new Set(selectedRecords.map(record => record.permitNumber))]
    .filter(number => permitNumberInput.test(number)).slice(0, 12);

  function select(index: number) {
    setSelected(previous => {
      const changed = new Set(previous);
      if (changed.has(index)) changed.delete(index);
      else changed.add(index);
      return changed;
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <p role="status" className="whitespace-pre-line break-words text-ink">{result.answer}</p>
      {records.length > 0 && (
        <section aria-label="Permit records" className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-ink">Permit records ({records.length})</h3>
            <div className="flex flex-wrap gap-2">
              {records.length > 1 && (
                <Button variant="quiet" size="sm" onClick={() => setSelected(
                  selected.size === records.length ? new Set() : new Set(records.map((_, index) => index)),
                )}>
                  {selected.size === records.length ? "Clear selection" : "Select all"}
                </Button>
              )}
              {selectedPermits.length > 1 && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  icon={<GitCompareArrows aria-hidden className="size-4" strokeWidth={1.75} />}
                  onClick={() => onSearch(`Compare permits ${selectedPermits.join(", ")}`, selectedPermits)}
                >
                  Compare {selectedPermits.length}
                </Button>
              )}
              {selectedRecords.length > 0 && (
                <Button variant="secondary" size="sm" onClick={() => downloadSummaries(selectedRecords)} icon={<Download aria-hidden className="size-4" strokeWidth={1.75} />}>
                  Download {selectedRecords.length} {selectedRecords.length === 1 ? "summary" : "summaries"}
                </Button>
              )}
            </div>
          </div>
          <ul className="grid gap-2">
            {records.map((record, index) => (
              <li key={`${record.permitNumber}-${index}`}>
                <RecordCard record={record} portalUrl={portalUrl} checked={selected.has(index)} onSelect={() => select(index)} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {result.documents.length > 0 && (
        <section aria-label="Official documents">
          <h3 className="mb-2 text-base font-semibold text-ink">Official documents</h3>
          <ul className="grid gap-2">
            {result.documents.map(document => <li key={document.id}><DocumentCard document={document} /></li>)}
          </ul>
        </section>
      )}
      {!!result.scanPermitNumbers?.length && (
        <Callout title="Look for original scans in the city archive">
          <p className="text-sm">Use these permit numbers in the archive’s ISD Permit Images search.</p>
          <p className="my-1 break-words text-sm font-semibold">{result.scanPermitNumbers.join(", ")}</p>
          <SourceLink href={portalUrl}>Open city archive</SourceLink>
        </Callout>
      )}
      {result.suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Suggested searches">
          {result.suggestions.map(suggestion => (
            <Button key={suggestion} variant="secondary" size="sm" className="h-auto min-h-8 whitespace-normal text-left" disabled={busy} onClick={() => onSearch(suggestion)}>
              {suggestion}
            </Button>
          ))}
        </div>
      )}
      {result.engine === "gemini" && <p className="text-sm text-muted">Gemini interpreted the search. Verify details in the linked records.</p>}
    </div>
  );
}

function RecordCard({
  record,
  portalUrl,
  checked,
  onSelect,
}: {
  record: ArchiveRecord;
  portalUrl: string;
  checked: boolean;
  onSelect: () => void;
}) {
  const citySource = publicUrl(record.sourceUrl) ?? DATASET_URL;
  const address = permitAddress(record);
  return (
    <article className="min-w-0 border border-border bg-background p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <label className="inline-flex min-w-0 cursor-pointer items-center gap-2 font-semibold text-ink">
          <input type="checkbox" checked={checked} onChange={onSelect} className="size-4 shrink-0 accent-ink" />
          <span className="sr-only">Select permit </span>
          <span className="break-all">{record.permitNumber}</span>
        </label>
        {record.status && <span className="border border-border bg-surface px-2 py-0.5 text-sm text-muted">{record.status}</span>}
      </div>
      {address && <p className="mt-1 font-semibold break-words text-ink">{address}</p>}
      {(record.details || record.description) && <p className="mt-1 whitespace-pre-line break-words text-sm text-ink">{record.details || record.description}</p>}
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        {record.workType && <li>{record.workType}</li>}
        {record.permitType && record.permitType !== record.workType && <li>{record.permitType}</li>}
        {record.issuedDate && <li>Issued {permitDate(record.issuedDate)}</li>}
        {record.parcelId && <li>Parcel {record.parcelId}</li>}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-2">
        <SourceLink href={citySource}>City source</SourceLink>
        <SourceLink href={portalUrl}>Original scans</SourceLink>
        <Button variant="quiet" size="sm" onClick={() => downloadSummaries([record])} icon={<Download aria-hidden className="size-4" strokeWidth={1.75} />}>
          Download summary
        </Button>
      </div>
    </article>
  );
}

function DocumentCard({ document }: { document: ArchiveDocument }) {
  const href = publicUrl(document.url);
  if (!href) return null;
  return (
    <article className="flex flex-wrap items-center justify-between gap-3 border border-border bg-background p-3 sm:p-4">
      <div className="flex min-w-0 items-start gap-2">
        <FileText aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
        <div className="min-w-0">
          <p className="font-semibold break-words text-ink">{document.title}</p>
          {document.description && <p className="mt-0.5 break-words text-sm text-muted">{document.description}</p>}
          {document.source && <p className="mt-0.5 text-sm text-muted">{document.source}</p>}
        </div>
      </div>
      <SourceLink href={href}>{document.fileType?.toLowerCase().includes("pdf") ? "Open official PDF" : "Open official document"}</SourceLink>
    </article>
  );
}
