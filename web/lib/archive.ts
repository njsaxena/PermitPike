export const ARCHIVE_PORTAL_URL = "https://scerisecm.boston.gov/ScerIS/CmPublic/";

export function archivePermitId(value: string | string[] | undefined): string | null {
  return typeof value === "string" && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value) ? value : null;
}

export interface ArchiveChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ArchiveChatInput {
  query: string;
  history?: ArchiveChatTurn[];
  recordContext?: string[];
}

export interface ArchiveRecord {
  permitNumber: string;
  workType: string | null;
  permitType: string | null;
  description: string | null;
  details?: string | null;
  issuedDate: string | null;
  status: string | null;
  address: string | null;
  zip: string | null;
  parcelId: string | null;
  sourceUrl: string;
}

export interface ArchiveDocument {
  id: string;
  title: string;
  description: string;
  url: string;
  fileType: "PDF" | "Web";
  source: string;
}

export interface ArchiveChatResponse {
  status: "results" | "clarify" | "not_found" | "unavailable";
  answer: string;
  records: ArchiveRecord[];
  documents: ArchiveDocument[];
  suggestions: string[];
  scanPermitNumbers: string[];
  engine: "gemini" | "local";
}

export type ArchiveSearchResult = Omit<ArchiveChatResponse, "engine">;
