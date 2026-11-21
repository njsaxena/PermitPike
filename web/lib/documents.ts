import type { FileKind, JobType } from "@permitpike/contract";

/** One document the filing form asks for. `kind` becomes FileRef.kind, so the agent knows what it is reading. */
export interface DocumentAsk {
  kind: FileKind;
  title: string;
  hint: string;
  required: boolean;
}

const PANEL_PHOTO: DocumentAsk = {
  kind: "panel_photo",
  title: "Photo of the electrical panel",
  hint: "Door open, with the main breaker and the label inside the door readable. A phone photo is fine.",
  required: true,
};

const LOAD_CALC: DocumentAsk = {
  kind: "load_calc",
  title: "Load calculation",
  hint: "Only if you already did one. PermitPike runs its own either way.",
  required: false,
};

const OTHER: DocumentAsk = {
  kind: "other",
  title: "Anything else",
  hint: "Single-line diagram, utility letter or anything else the official should see.",
  required: false,
};

/** What to upload for each job, in the order the form shows it. */
export const DOCUMENTS: Record<JobType, DocumentAsk[]> = {
  heat_pump_panel: [
    {
      kind: "spec_sheet",
      title: "Heat pump spec sheet",
      hint: "The manufacturer's sheet for the outdoor unit. It lists the minimum circuit ampacity (MCA) and maximum overcurrent protection (MOCP).",
      required: true,
    },
    PANEL_PHOTO,
    {
      kind: "site_plan",
      title: "Site plan",
      hint: "Where the outdoor unit and its disconnect go. A photo of a hand sketch is fine.",
      required: false,
    },
    LOAD_CALC,
    OTHER,
  ],
  ev_charger: [
    {
      kind: "spec_sheet",
      title: "Charger spec sheet",
      hint: "The manufacturer's sheet showing the charger's amperage and the breaker size it needs.",
      required: true,
    },
    PANEL_PHOTO,
    {
      kind: "site_plan",
      title: "Site plan",
      hint: "Where the charger mounts and how the wire runs from the panel. A photo of a hand sketch is fine.",
      required: false,
    },
    LOAD_CALC,
    OTHER,
  ],
  home_battery: [
    {
      kind: "spec_sheet",
      title: "Battery and inverter spec sheets",
      hint: "The manufacturer's sheets showing continuous output and the breaker or backfeed size.",
      required: true,
    },
    PANEL_PHOTO,
    {
      kind: "site_plan",
      title: "Site plan",
      hint: "Where the battery mounts, with the distance to doors and windows. A photo of a hand sketch is fine.",
      required: false,
    },
    LOAD_CALC,
    OTHER,
  ],
};

/** Best guess for files sent without a slot, such as corrected documents on a resubmit. */
export function guessKind(file: File): FileKind {
  if (file.type.startsWith("image/")) return "panel_photo";
  if (file.type === "application/pdf") return "spec_sheet";
  return "other";
}
