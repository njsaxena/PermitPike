import { createTool } from "@mastra/core/tools";
import { JobType } from "@permitpike/contract";
import { z } from "zod";
import { complianceSources, sourceCatalogReviewedOn, type ComplianceSource } from "./catalog";
import { retrieveComplianceSource } from "./retrieve";

function sourceMetadata(source: ComplianceSource) {
  const { keywords: _keywords, ...metadata } = source;
  return metadata;
}

function searchTerms(text: string) {
  return text.toLowerCase().match(/[\p{L}\p{N}]+(?:\.[\p{N}]+)*/gu) ?? [];
}

const catalogQuery = z.string().trim().min(1).max(160);
const searchComplianceSources = createTool({
  id: "search_compliance_sources",
  description: "Find Boston and Massachusetts residential electrical compliance sources by job type, topic, or citation. Returns source IDs and citations to use with get_compliance_source.",
  inputSchema: z.object({
    jobType: JobType.optional().describe("PermitPike job type"),
    query: catalogQuery.optional().describe("A short topic or citation, such as EVSE or 527 CMR 12.00"),
  }),
  execute: async ({ jobType, query }) => {
    const terms = [...new Set(searchTerms(query ?? ""))];
    const normalizedQuery = terms.join(" ");
    const matches = complianceSources.flatMap((source) => {
      if (jobType && !source.jobTypes.includes(jobType)) return [];
      const heading = searchTerms(`${source.title} ${source.citation}`);
      const searchable = new Set([...heading, ...searchTerms(`${source.keywords} ${source.scope}`)]);
      if (query && (!terms.length || !terms.every((term) => searchable.has(term)))) return [];
      const score = normalizedQuery && heading.join(" ").includes(normalizedQuery) ? 2 : 0;
      return [{ source, score }];
    });
    return {
      jurisdiction: "Boston, MA",
      catalogReviewedOn: sourceCatalogReviewedOn,
      coverage: "Selected sources for Boston residential electrical permits. An empty result does not establish that no requirement applies.",
      sources: matches.sort((a, b) => b.score - a.score).map(({ source }) => sourceMetadata(source)),
    };
  },
});

const getComplianceSource = createTool({
  id: "get_compliance_source",
  description: "Fetch the publisher document for a catalog source ID. Returns citation, authority, edition if known, retrieval status, and short excerpts from HTML or PDF with PDF page numbers.",
  inputSchema: z.object({
    sourceId: z.string().trim().min(1).max(100).describe("Source ID returned by search_compliance_sources"),
    query: catalogQuery.optional().describe("Exact phrase or section number to locate within the publisher document"),
  }),
  execute: async ({ sourceId, query }) => {
    const source = complianceSources.find(({ id }) => sourceId === id);
    if (!source) {
      return { status: "unknown_source", message: "Use search_compliance_sources to find a catalog source ID." };
    }

    return {
      source: sourceMetadata(source),
      catalogReviewedOn: sourceCatalogReviewedOn,
      ...(await retrieveComplianceSource(source, query)),
    };
  },
});

export const complianceTools = {
  search_compliance_sources: searchComplianceSources,
  get_compliance_source: getComplianceSource,
};
