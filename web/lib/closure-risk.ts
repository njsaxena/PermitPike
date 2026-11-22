import {
  JOB_TYPE_LABELS,
  PermitRiskScoreRequest,
  type Application,
  type Extraction,
  type PermitRiskScoreRequest as PermitRiskScoreRequestType,
} from "@permitpike/contract";

const BOSTON_JOB_MAPPING: Record<
  Application["jobType"],
  Pick<PermitRiskScoreRequestType, "workType" | "permitTypeDescr">
> = {
  heat_pump_panel: { workType: "ELECTRICAL", permitTypeDescr: "Electrical Permit" },
  ev_charger: { workType: "SPCEVE", permitTypeDescr: "Short Form Bldg Permit" },
  home_battery: { workType: "SOL", permitTypeDescr: "Electrical Permit" },
};

/** Builds features from the saved application; contractor identity is never sent. */
export function buildPermitRiskScoreRequest(
  application: Pick<Application, "jobType" | "address" | "parcel">,
  extraction: Extraction | null,
  applicantPriorClosureRate: number,
  supplemental: { estimatedProjectCost?: number | null; jobDescription?: string | null } = {},
): PermitRiskScoreRequestType {
  const parcelZip = application.parcel?.assessorAddress?.match(/\b(\d{5})(?:-\d{4})?\s*$/)?.[1];
  return PermitRiskScoreRequest.parse({
    ...BOSTON_JOB_MAPPING[application.jobType],
    occupancyType: null,
    zip: parcelZip ?? application.address.zip ?? null,
    declaredValuation: supplemental.estimatedProjectCost ?? null,
    sqFeet: extraction?.fields.existingLoad.dwellingSqFt ?? null,
    totalFees: null,
    issuedDate: new Date().toISOString(),
    expirationDate: null,
    description: supplemental.jobDescription?.trim() || JOB_TYPE_LABELS[application.jobType],
    applicantPriorClosureRate,
  });
}
