import type { JobType } from "@permitpike/contract";

type Authority = "statute" | "regulation" | "zoning_code" | "administrative_bulletin" | "guidance";

export interface ComplianceSource {
  id: string;
  title: string;
  citation: string;
  jurisdiction: "Boston" | "Massachusetts";
  authority: Authority;
  url: string;
  authorityPage?: string;
  edition?: string;
  effectiveDate?: string;
  scope: string;
  jobTypes: readonly JobType[];
  keywords: string;
}

const allJobs: readonly JobType[] = ["heat_pump_panel", "ev_charger", "home_battery"];

export const sourceCatalogReviewedOn = "2026-11-21";

export const complianceSources: readonly ComplianceSource[] = [
  {
    id: "ma-electrical-code",
    title: "Massachusetts Electrical Code amendments",
    citation: "527 CMR 12.00",
    jurisdiction: "Massachusetts",
    authority: "regulation",
    url: "https://www.mass.gov/doc/527-cmr-1200-massachusetts-electrical-code-effective-42426/download",
    authorityPage: "https://www.mass.gov/info-details/massachusetts-electrical-code",
    edition: "2026 NEC",
    effectiveDate: "2026-04-24",
    scope: "Massachusetts amendments and rules adopting the NEC. Consult the adopted NFPA 70 edition for base NEC text and the state index for later changes or earlier editions.",
    jobTypes: allJobs,
    keywords: "NFPA 70 electrical wiring load calculation service panel breaker GFCI heat pump EV charger EVSE battery energy storage equipment",
  },
  {
    id: "ma-electrical-wiring-statute",
    title: "Regulations relative to electrical wiring and fixtures",
    citation: "M.G.L. c. 143, § 3L",
    jurisdiction: "Massachusetts",
    authority: "statute",
    url: "https://malegislature.gov/laws/generallaws/parti/titlexx/chapter143/section3l",
    scope: "State authority for electrical wiring regulations and notice of installations to the inspector of wires.",
    jobTypes: allJobs,
    keywords: "electrical wiring permit application inspection notice inspector of wires",
  },
  {
    id: "boston-electrical-permit",
    title: "Boston Electrical Permit",
    citation: "Boston Inspectional Services, Electrical Permit",
    jurisdiction: "Boston",
    authority: "guidance",
    url: "https://www.boston.gov/permitting/permits/electrical-permit",
    scope: "City application, license information, supporting documents, fees and inspection process for electrical permits.",
    jobTypes: allJobs,
    keywords: "electrical permit application inspection license fees electrician",
  },
  {
    id: "boston-service-upgrade",
    title: "Make an Electrical Service Upgrade",
    citation: "Boston Permitting, Make an Electrical Service Upgrade",
    jurisdiction: "Boston",
    authority: "guidance",
    url: "https://www.boston.gov/boston-permitting/install-or-replace/make-electrical-service-upgrade",
    scope: "Boston permitting guidance for electrical service upgrades and related work.",
    jobTypes: ["heat_pump_panel"],
    keywords: "heat pump electrical panel upgrade service capacity meter utility installer",
  },
  {
    id: "boston-evse-bulletin",
    title: "Boston EV Charging Station Installation Bulletin",
    citation: "Boston Inspectional Services Commissioner’s Bulletin CB2024-03",
    jurisdiction: "Boston",
    authority: "administrative_bulletin",
    url: "https://www.boston.gov/sites/default/files/file/2024/09/CB2024-03.pdf",
    scope: "City administrative procedures for residential and commercial electric vehicle charging stations.",
    jobTypes: ["ev_charger"],
    keywords: "EVSE EV electric vehicle charger charging station residential garage parking installation electrical permit",
  },
  {
    id: "boston-evse-installation-guide",
    title: "Electric Vehicle Charger Installation Guide",
    citation: "Boston, How-to Guide: Electric Vehicle Charger Installation",
    jurisdiction: "Boston",
    authority: "guidance",
    url: "https://permits.boston.gov/sites/default/files/file/2020/06/How%20To%20Install%20an%20EVSE%20.pdf",
    scope: "City application and installation guidance. Check the later CB2024-03 bulletin for administrative requirements.",
    jobTypes: ["ev_charger"],
    keywords: "EVSE EV electric vehicle charger charging station residential garage parking installation electrical permit",
  },
  {
    id: "boston-zoning-designation",
    title: "Check a Building’s Zoning Designation",
    citation: "Boston Inspectional Services, How to Check a Building’s Zoning Designation",
    jurisdiction: "Boston",
    authority: "guidance",
    url: "https://www.boston.gov/departments/inspectional-services/how-check-buildings-zoning-designation",
    authorityPage: "https://www.bostonplans.org/planning-zoning/zoning-code",
    scope: "Find the parcel’s zoning district, subdistrict, overlays and dimensional tables before evaluating equipment placement or setbacks.",
    jobTypes: allJobs,
    keywords: "district zoning overlay setback outdoor unit property line dimensional placement heat pump lot line",
  },
  {
    id: "boston-noise-regulations",
    title: "Boston Noise Regulations",
    citation: "Boston Air Pollution Control Commission, Noise Regulations, Regulation 2",
    jurisdiction: "Boston",
    authority: "regulation",
    url: "https://permits.boston.gov/sites/default/files/embed/n/noise_reg_boston.pdf",
    scope: "Noise standards by receiving use and zoning district, relevant to outdoor mechanical equipment and battery installations.",
    jobTypes: ["heat_pump_panel", "home_battery"],
    keywords: "noise heat pump outdoor unit mechanical equipment battery sound decibel lot line residential",
  },
  {
    id: "ma-fire-code",
    title: "Massachusetts Comprehensive Fire Safety Code amendments",
    citation: "527 CMR 1.00",
    jurisdiction: "Massachusetts",
    authority: "regulation",
    url: "https://www.mass.gov/doc/massachusetts-527-cmr-100-2021-edition-effective-may-12-2023/download",
    authorityPage: "https://www.mass.gov/info-details/massachusetts-fire-code",
    edition: "2021 NFPA 1",
    effectiveDate: "2023-05-12",
    scope: "Massachusetts fire code amendments. Start with Chapter 52 for energy storage systems and check the state index for errata and later amendments.",
    jobTypes: ["home_battery"],
    keywords: "chapter 52 NFPA 855 ESS BESS battery energy storage systems one and two family residential fire safety clearance",
  },
  {
    id: "boston-battery-zoning",
    title: "Battery Energy Storage Systems and Consolidated Local Permit",
    citation: "Boston Zoning Code, Article 88",
    jurisdiction: "Boston",
    authority: "zoning_code",
    url: "https://www.bostonplans.org/getattachment/9b61a8a4-1fec-49a4-85b1-fad8887646dd",
    authorityPage: "https://www.bostonplans.org/planning-zoning/zoning-initiatives/adopted/energy-infrastructure-zoning-and-permitting",
    effectiveDate: "2026-09-14",
    scope: "Adopted zoning amendment for battery storage uses and consolidated permitting. Check the definitions and applicability before citing it for a home installation.",
    jobTypes: ["home_battery"],
    keywords: "BESS ESS battery energy storage accessory use site footprint dimensions zoning setback consolidated local permit",
  },
  {
    id: "boston-battery-zoning-overview",
    title: "Small Clean Energy Infrastructure Permitting and Zoning",
    citation: "Boston Planning Department, Small Clean Energy Infrastructure Permitting and Zoning",
    jurisdiction: "Boston",
    authority: "guidance",
    url: "https://www.bostonplans.org/planning-zoning/zoning-initiatives/adopted/energy-infrastructure-zoning-and-permitting",
    authorityPage: "https://www.bostonplans.org/getattachment/9b61a8a4-1fec-49a4-85b1-fad8887646dd",
    scope: "City overview of Article 88 and the consolidated permit process. Consult the adopted text for definitions and thresholds.",
    jobTypes: ["home_battery"],
    keywords: "BESS ESS battery energy storage accessory use site footprint dimensions zoning setback consolidated local permit",
  },
];
