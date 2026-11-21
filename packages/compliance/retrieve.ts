import { load } from "cheerio";
import { extractText, getDocumentProxy } from "unpdf";
import type { ComplianceSource } from "./catalog";

const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;
const MAX_PDF_PAGES = 250;
const MAX_PASSAGES = 3;
const EXCERPT_LENGTH = 320;
const APPROVED_HOSTS = new Set([
  "www.boston.gov",
  "permits.boston.gov",
  "www.bostonplans.org",
  "www.mass.gov",
  "malegislature.gov",
]);

function normalize(text: string) {
  return text.replace(/\s+/gu, " ").trim();
}

function htmlSections(html: string) {
  const $ = load(html);
  $("script, style, noscript, template, nav, footer, [hidden], [aria-hidden=true]").remove();
  const document = $("article.node, section.mainContent article").first();
  const main = document.length ? document : $("main, [role=main], #content").first();
  main.find("td, th, br").after(" ");
  return main.find("h1, h2, h3, h4, p, li, tr, .field-name-field-summary")
    .toArray()
    .map((node) => normalize($(node).text()))
    .filter(Boolean);
}

async function downloadDocument(source: ComplianceSource, fetchDocument: typeof fetch) {
  let url = new URL(source.url);
  const signal = AbortSignal.timeout(12_000);

  for (let redirects = 0; redirects <= 3; redirects++) {
    if (
      url.protocol !== "https:" || url.port || url.username || url.password ||
      !APPROVED_HOSTS.has(url.hostname)
    ) {
      throw new Error("Publisher redirected outside the approved source hosts.");
    }

    const response = await fetchDocument(url, {
      signal,
      redirect: "manual",
      headers: { accept: "text/html, application/pdf" },
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      const location = response.headers.get("location");
      if (!location) throw new Error("Publisher redirect had no destination.");
      url = new URL(location, url);
      continue;
    }
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      throw new Error(`Publisher returned HTTP ${response.status}.`);
    }

    const mediaType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    if (mediaType !== "text/html" && mediaType !== "application/pdf") {
      await response.body.cancel();
      throw new Error("Publisher returned an unsupported document type.");
    }
    if (Number(response.headers.get("content-length")) > MAX_DOCUMENT_BYTES) {
      await response.body.cancel();
      throw new Error("Publisher document exceeds the size limit.");
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_DOCUMENT_BYTES) {
          await reader.cancel();
          throw new Error("Publisher document exceeds the size limit.");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    return { url: url.href, mediaType, bytes: Buffer.concat(chunks, size) };
  }

  throw new Error("Publisher exceeded the redirect limit.");
}

function findPassages(sections: string[], query: string | undefined, isPdf: boolean) {
  const pattern = query && escapeRegExp(normalize(query));
  const matcher = pattern
    ? new RegExp(`(?<![\\p{L}\\p{N}])${pattern}(?![\\p{L}\\p{N}])`, "iu")
    : undefined;
  const passages = [];
  const seen = new Set<string>();

  for (const [index, text] of sections.entries()) {
    if (!text) continue;
    const match = matcher?.exec(text);
    if (matcher && !match) continue;
    const start = Math.max(0, (match?.index ?? 0) - 60);
    const end = start + EXCERPT_LENGTH;
    const excerpt = `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
    if (seen.has(excerpt)) continue;
    seen.add(excerpt);
    passages.push({ page: isPdf ? index + 1 : null, excerpt });
    if (passages.length === MAX_PASSAGES) break;
  }

  return passages;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function retrieveComplianceSource(
  source: ComplianceSource,
  query?: string,
  fetchDocument: typeof fetch = fetch,
) {
  let document;
  try {
    document = await downloadDocument(source, fetchDocument);
  } catch (error) {
    return {
      status: "unavailable" as const,
      message: error instanceof Error ? error.message : "Publisher request failed.",
    };
  }

  const isPdf = document.mediaType === "application/pdf";
  let sections: string[];
  try {
    if (isPdf) {
      const pdf = await getDocumentProxy(new Uint8Array(document.bytes), {
        isEvalSupported: false,
        verbosity: 0,
      });
      try {
        if (pdf.numPages > MAX_PDF_PAGES) {
          return { status: "unavailable" as const, message: "Publisher PDF exceeds the page limit." };
        }
        const { text } = await extractText(pdf);
        sections = text.map(normalize);
      } finally {
        await pdf.destroy();
      }
    } else {
      sections = htmlSections(document.bytes.toString("utf8"));
    }
  } catch {
    return { status: "unavailable" as const, message: "Publisher document could not be parsed." };
  }

  if (!sections.some(Boolean)) {
    return {
      status: "unavailable" as const,
      message: "Publisher document has no extractable text. Open the publisher URL to read it directly.",
    };
  }
  const passages = findPassages(sections, query, isPdf);
  return {
    status: passages.length ? "retrieved" as const : "no_match" as const,
    retrievedAt: new Date().toISOString(),
    retrievedUrl: document.url,
    passages,
    ...(passages.length === 0 && {
      message: "The exact phrase was absent from the extracted text. Try a shorter phrase or consult the publisher document.",
    }),
  };
}
