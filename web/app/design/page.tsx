import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Plus,
  CircleAlert,
  CornerDownLeft,
  FileText,
  HardHat,
  Info,
  Landmark,
  ListChecks,
  Loader,
  TriangleAlert,
  Upload,
  UserCheck,
  UtilityPole,
  X,
} from "lucide-react";
import { JOB_TYPE_LABELS } from "@permitpike/contract";
import { Parcel } from "@permitpike/contract";
import demoParcels from "@/lib/parcel/demo-parcels.json";
import { QueueMapDemo } from "./MapDemo";
import {
  BostonDrawing,
  ButtonLink,
  ExampleCard,
  ExampleDetail,
  BOSTON_DRAWING_LABELS,
  Button,
  Callout,
  Card,
  MapUnavailable,
  PropertyCard,
  PropertyMap,
  ZoningChips,
  Checkbox,
  CheckRow,
  CheckRowRunning,
  CheckSummary,
  ChoiceGroup,
  CitationChip,
  DiffView,
  EmptyState,
  FileDrop,
  HeaderShell,
  Input,
  PermitPikeLogo,
  PermitPikeMark,
  PermitCard,
  PermitQueue,
  Radio,
  RecommendationCard,
  RiskBadge,
  RoleChoiceCard,
  Select,
  SignatureBlock,
  StatusChip,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  Textarea,
  TrailTimeline,
  type BostonDrawingKind,
  type ButtonVariant,
  type StatusChipStatus,
} from "@/components/ui";
import { fieldGroups } from "@/lib/example-fields";
import {
  APPLICATIONS,
  EXAMPLES,
  EXAMPLE_CHECKS,
  EXAMPLE_FIELD_CHECKS,
  EXAMPLE_RULE_TITLES,
  CHECKS,
  DIFF,
  FILES,
  QUEUE,
  TRAIL_FILED,
  TRAIL_RETURNED,
  TRAIL_REVIEW,
  TRAIL_SIGNED,
} from "./samples";
import { DialogDemo } from "./DialogDemo";
import { DocumentSlotDemo } from "./DocumentSlotDemo";

export const metadata: Metadata = {
  title: "Design system · PermitPike",
  robots: { index: false },
};

// ---------------------------------------------------------------------------
// Token data shown on this page (values mirror styles/tokens.css)
// ---------------------------------------------------------------------------

const LIMESTONE = "#F7F6F3";
const SURFACE = "#FFFFFF";

type Swatch = { token: string; hex: string; name: string; on?: { hex: string; label: string }[] };

const COLOR_GROUPS: { title: string; swatches: Swatch[] }[] = [
  {
    title: "Neutrals",
    swatches: [
      { token: "ink", hex: "#15191F", name: "Ink", on: [{ hex: LIMESTONE, label: "limestone" }, { hex: SURFACE, label: "surface" }] },
      { token: "muted", hex: "#5E6670", name: "Muted granite", on: [{ hex: LIMESTONE, label: "limestone" }, { hex: SURFACE, label: "surface" }] },
      { token: "border", hex: "#D6D9DC", name: "Border granite", on: [{ hex: SURFACE, label: "surface" }] },
      { token: "border-strong", hex: "#848C95", name: "Control granite", on: [{ hex: LIMESTONE, label: "limestone" }, { hex: SURFACE, label: "surface" }] },
      { token: "background", hex: "#F7F6F3", name: "Limestone" },
      { token: "surface", hex: "#FFFFFF", name: "Surface" },
      { token: "sunken", hex: "#EFEEE9", name: "Sunken granite" },
    ],
  },
  {
    title: "Accent",
    swatches: [
      { token: "accent", hex: "#FFD21F", name: "Dome gold", on: [{ hex: "#15191F", label: "ink text" }] },
      { token: "accent-tint", hex: "#FFF4BF", name: "Dome tint", on: [{ hex: "#15191F", label: "ink text" }] },
    ],
  },
  {
    title: "Status",
    swatches: [
      { token: "critical", hex: "#A23B2A", name: "Brick", on: [{ hex: LIMESTONE, label: "limestone" }, { hex: "#F7ECE9", label: "tint" }] },
      { token: "critical-tint", hex: "#F7ECE9", name: "Brick tint" },
      { token: "warning", hex: "#8C6210", name: "Brass", on: [{ hex: LIMESTONE, label: "limestone" }, { hex: "#F8F1E2", label: "tint" }] },
      { token: "warning-tint", hex: "#F8F1E2", name: "Brass tint" },
      { token: "positive", hex: "#2F6B3F", name: "Common green", on: [{ hex: LIMESTONE, label: "limestone" }, { hex: "#EAF2EC", label: "tint" }] },
      { token: "positive-tint", hex: "#EAF2EC", name: "Common tint" },
    ],
  },
];

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const TYPE_SCALE = [
  { token: "text-display", px: 40, lh: 48, sample: "Review queue", note: "Display, wide. Sparingly.", className: "text-display font-semibold" },
  { token: "text-title", px: 26, lh: 32, sample: "Heat pump and panel upgrade", note: "Page title, wide", className: "text-title font-semibold" },
  { token: "text-lg", px: 18, lh: 28, sample: "118 Marlborough St, Back Bay", note: "Card address, normal width", className: "text-lg font-semibold" },
  { token: "text-base", px: 15, lh: 22.5, sample: "The outdoor unit's nameplate lists a 23.0 A minimum circuit ampacity and a 45 A maximum overcurrent device.", note: "Body, 1.5 line height", className: "text-base" },
  { token: "text-sm", px: 13, lh: 20, sample: "Field labels, table cells, chips", note: "Small", className: "text-sm" },
  { token: "text-label", px: 12, lh: 16, sample: "Section label", note: "Uppercase, 0.08em, ink", className: "pp-label" },
];

const MONO_SAMPLES = [
  { use: "Permit number", text: "EL-2026-04417" },
  { use: "Code citation", text: "NEC 220.83 · 527 CMR 12.00" },
  { use: "Timestamp", text: "2026-11-21 10:42 EST" },
  { use: "Electrical values", text: "200 A · 240 V · 9,600 VA" },
];

const SPACING = [1, 2, 3, 4, 6, 8, 12, 16];

const ICONS = [
  { Icon: Check, name: "Check", use: "Pass, done" },
  { Icon: X, name: "X", use: "Fail, remove" },
  { Icon: TriangleAlert, name: "TriangleAlert", use: "Warning" },
  { Icon: CircleAlert, name: "CircleAlert", use: "Field error" },
  { Icon: Info, name: "Info", use: "Info callout" },
  { Icon: UtilityPole, name: "UtilityPole", use: "Utility flag" },
  { Icon: Upload, name: "Upload", use: "File drop" },
  { Icon: FileText, name: "FileText", use: "File chip" },
  { Icon: Plus, name: "Plus", use: "Add a document" },
  { Icon: ListChecks, name: "ListChecks", use: "With conditions" },
  { Icon: CornerDownLeft, name: "CornerDownLeft", use: "Return" },
  { Icon: HardHat, name: "HardHat", use: "Applicant" },
  { Icon: Landmark, name: "Landmark", use: "Reviewer" },
  { Icon: UserCheck, name: "UserCheck", use: "Override" },
  { Icon: ChevronDown, name: "ChevronDown", use: "Select" },
  { Icon: ArrowRight, name: "ArrowRight", use: "Diff" },
  { Icon: Loader, name: "Loader", use: "Loading" },
];

const DRAWING_KINDS: { kind: BostonDrawingKind; name: string }[] = [
  { kind: "city-hall", name: "City Hall" },
  { kind: "brownstone", name: "Back Bay brownstone" },
  { kind: "triple-decker", name: "Triple-decker" },
  { kind: "gas-lamp", name: "Beacon Hill gas lamp" },
];

const MOTION = [
  { name: "Trail lays itself", spec: "640ms ease-out · 260ms per stop" },
  { name: "Checks settle in order", spec: "320ms rise · 70ms stagger" },
  { name: "Confidence meter fills", spec: "640ms ease-out · 150ms delay" },
  { name: "Drop arrow lifts", spec: "320ms · 3px while dragging" },
  { name: "Dialog rises", spec: "320ms · 6px, backdrop fades" },
  { name: "Reduced motion", spec: "all of it off; final state shown" },
];

const [MAP_BROOKSIDE, MAP_DORCHESTER] = demoParcels.map((p) => Parcel.parse(p)) as [Parcel, Parcel, Parcel];
const MAP_ADDRESS = { street: "28 Brookside Ave", unit: null, neighborhood: "Jamaica Plain", city: "Boston", state: "MA", zip: "02130" } as const;

const SECTIONS = [
  ["logo", "Logo"],
  ["color", "Color"],
  ["type", "Type"],
  ["drawings", "Boston drawings"],
  ["motion", "Motion"],
  ["spacing", "Spacing & corners"],
  ["icons", "Icons"],
  ["button", "Button"],
  ["input", "Input"],
  ["select", "Select"],
  ["textarea", "Textarea"],
  ["choice", "Checkbox & radio"],
  ["filedrop", "FileDrop"],
  ["documentslot", "DocumentSlot"],
  ["statuschip", "StatusChip"],
  ["riskbadge", "RiskBadge"],
  ["checkrow", "CheckRow"],
  ["recommendation", "RecommendationCard"],
  ["signature", "SignatureBlock"],
  ["dialog", "ConfirmDialog"],
  ["trail", "TrailTimeline"],
  ["diff", "DiffView"],
  ["queue", "Permit queue"],
  ["map", "Property map"],
  ["table", "Table"],
  ["library", "Example library"],
  ["callout", "Callout"],
  ["card", "Card"],
  ["empty", "EmptyState"],
  ["tabs", "Tabs"],
  ["header", "Header shell"],
  ["rolechoice", "RoleChoiceCard"],
] as const;

type SectionId = (typeof SECTIONS)[number][0];

// ---------------------------------------------------------------------------
// Page scaffolding
// ---------------------------------------------------------------------------

function Section({ id, children }: { id: SectionId; children: ReactNode }) {
  const title = SECTIONS.find(([s]) => s === id)?.[1] ?? id;
  return (
    <section
      id={id}
      aria-labelledby={`${id}-label`}
      className="grid scroll-mt-6 gap-6 border-t border-border py-10 md:grid-cols-[176px_minmax(0,1fr)] md:gap-10"
    >
      <h2 id={`${id}-label`} className="pp-label pt-0.5">
        {title}
      </h2>
      <div className="flex min-w-0 flex-col gap-8">{children}</div>
    </section>
  );
}

/** A labeled sample. The caption names the state shown. */
function Sample({ state, children, className }: { state: string; children: ReactNode; className?: string }) {
  return (
    <figure className={className}>
      <div>{children}</div>
      <figcaption className="mt-2 font-mono text-label text-muted">{state}</figcaption>
    </figure>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm text-ink">{title}</h3>
      {children}
    </div>
  );
}

const BUTTON_VARIANTS: { variant: ButtonVariant; label: string }[] = [
  { variant: "primary", label: "Submit" },
  { variant: "secondary", label: "Save draft" },
  { variant: "quiet", label: "View files" },
  { variant: "destructive", label: "Withdraw" },
];

const STATUSES: StatusChipStatus[] = [
  "draft",
  "submitted",
  "ai_review",
  "awaiting_official",
  "returned",
  "approved",
];

const JOB_OPTIONS = Object.entries(JOB_TYPE_LABELS).map(([value, label]) => ({ value, label }));

// ---------------------------------------------------------------------------

export default function DesignPage() {
  return (
    <div className="max-w-page">
      <div className="grid items-end gap-8 border-b border-ink pb-8 md:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-6">
          <PermitPikeLogo size="md" on="background" />
          <h1 className="text-display tracking-tight text-ink">Design system</h1>
          {/* The two sides of PermitPike, live: file a permit, then review it. */}
          <div className="flex flex-wrap gap-3">
            <ButtonLink
              href="/apply"
              variant="secondary"
              icon={<ArrowRight aria-hidden className="size-4" strokeWidth={1.75} />}
            >
              The applicant portal
            </ButtonLink>
            <ButtonLink
              href="/review"
              variant="secondary"
              icon={<ArrowRight aria-hidden className="size-4" strokeWidth={1.75} />}
            >
              The review portal
            </ButtonLink>
          </div>
        </div>
        <BostonDrawing kind="city-hall" className="hidden md:block" />
      </div>

      <nav aria-label="Sections" className="mt-6 mb-10">
        <ul className="flex max-w-4xl flex-wrap gap-x-5 gap-y-2 text-sm">
          {SECTIONS.map(([id, title]) => (
            <li key={id}>
              <a href={`#${id}`} className="text-muted transition-colors duration-100 hov:text-ink">
                {title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* ------------------------------------------------------------------ Logo */}
      <Section id="logo">
        <div className="flex flex-wrap items-end gap-10">
          <Sample state="lg, on limestone">
            <PermitPikeLogo size="lg" on="background" />
          </Sample>
          <Sample state="sm, header, on surface">
            <div className="border border-border bg-surface px-4 py-3">
              <PermitPikeLogo size="sm" />
            </div>
          </Sample>
        </div>
        <div className="flex flex-wrap items-end gap-8">
          {[64, 40, 28, 16].map((n) => (
            <Sample key={n} state={`mark ${n}px`}>
              <PermitPikeMark size={n} on="background" />
            </Sample>
          ))}
        </div>
        <p className="max-w-prose text-sm text-ink">
          A breaker-panel grid in three brick steps; the dark cells spell P, and the cut line is
          the Mass Pike. The wordmark is Public Sans Bold. Cut the Pike in the color behind the
          mark. No other colors, outlines or effects.
        </p>
      </Section>

      {/* ----------------------------------------------------------------- Color */}
      <Section id="color">
        {COLOR_GROUPS.map((group) => (
          <Group key={group.title} title={group.title}>
            <ul className="grid grid-cols-2 border-t border-l border-border sm:grid-cols-3 lg:grid-cols-4">
              {group.swatches.map((s) => (
                <li key={s.token} className="flex flex-col border-r border-b border-border bg-surface">
                  <span aria-hidden className="h-16 border-b border-border" style={{ backgroundColor: s.hex }} />
                  <span className="flex flex-col gap-0.5 p-3">
                    <span className="text-sm font-semibold text-ink">{s.name}</span>
                    <span className="font-mono text-label text-muted">--pp-{s.token}</span>
                    <span className="font-mono text-label text-ink">{s.hex}</span>
                    {s.on?.map((o) => {
                      const ratio = contrast(s.hex, o.hex);
                      return (
                        <span key={o.label} className="font-mono text-label text-muted">
                          {ratio.toFixed(1)}:1 {o.label}
                        </span>
                      );
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </Group>
        ))}
      </Section>

      {/* ------------------------------------------------------------------ Type */}
      <Section id="type">
        <Group title="Red Hat Text: headings regular weight">
          <ul className="border-t border-border">
            {TYPE_SCALE.map((t) => (
              <li key={t.token} className="grid gap-2 border-b border-border py-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-6">
                <span className="flex flex-col font-mono text-label text-muted">
                  <span className="text-ink">{t.token}</span>
                  <span>
                    {t.px}/{t.lh}px
                  </span>
                  <span className="font-sans">{t.note}</span>
                </span>
                <span className={`${t.className} min-w-0 text-ink`}>{t.sample}</span>
              </li>
            ))}
          </ul>
        </Group>
        <Group title="Values: Red Hat Text with even-width figures">
          <ul className="border-t border-border">
            {MONO_SAMPLES.map((m) => (
              <li key={m.use} className="grid gap-2 border-b border-border py-3 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-6">
                <span className="text-sm text-muted">{m.use}</span>
                <span className="font-mono text-base text-ink">{m.text}</span>
              </li>
            ))}
          </ul>
        </Group>
        <Group title="Weights">
          <p className="flex flex-wrap gap-6 text-lg text-ink">
            <span className="font-normal">Regular 400</span>
            <span className="font-medium">Medium 500</span>
            <span className="font-semibold">Semibold 600</span>
            <span className="font-bold">Bold 700</span>
          </p>
        </Group>
      </Section>

      {/* ------------------------------------------------------------- Drawings */}
      <Section id="drawings">
        <ul className="grid border-t border-l border-border sm:grid-cols-2">
          {DRAWING_KINDS.map((k) => (
            <li key={k.kind} className="flex flex-col gap-4 border-r border-b border-border bg-surface p-card">
              <BostonDrawing kind={k.kind} title={BOSTON_DRAWING_LABELS[k.kind]} />
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-ink">{k.name}</span>
                <span className="font-mono text-label text-muted">{k.kind}</span>
              </span>
            </li>
          ))}
        </ul>

      </Section>

      {/* ---------------------------------------------------------------- Motion */}
      <Section id="motion">
        <ul className="grid gap-x-6 gap-y-2 border-t border-border sm:grid-cols-2">
          {MOTION.map((m) => (
            <li key={m.name} className="flex flex-col gap-0.5 border-b border-border py-3">
              <span className="text-sm font-semibold text-ink">{m.name}</span>
              <span className="font-mono text-label text-muted">{m.spec}</span>
            </li>
          ))}
        </ul>
        <Sample state="the trail lays itself when it scrolls into view">
          <TrailTimeline steps={TRAIL_SIGNED} label="Motion sample" />
        </Sample>
      </Section>

      {/* -------------------------------------------------------- Spacing & radius */}
      <Section id="spacing">
        <Group title="Spacing, 4px grid">
          <ul className="flex flex-col gap-2">
            {SPACING.map((n) => (
              <li key={n} className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-4">
                <span className="font-mono text-sm text-ink">
                  {n * 4}px <span className="text-muted">· {n}</span>
                </span>
                <span aria-hidden className="h-4 border border-ink bg-accent" style={{ width: n * 4 }} />
              </li>
            ))}
          </ul>
        </Group>
        <Group title="Corners and border">
          <div className="flex flex-wrap gap-6">
            <Sample state="0 radius · every component">
              <span aria-hidden className="block size-20 border border-ink bg-surface" />
            </Sample>
            <Sample state="1px border, all components">
              <span aria-hidden className="block h-20 w-40 border border-border bg-surface" />
            </Sample>
          </div>
        </Group>
        <Group title="Card padding, 24px">
          <div className="max-w-md border border-border bg-surface">
            <div className="m-card border border-dashed border-ink bg-accent-tint p-2 font-mono text-sm text-ink">
              content box
            </div>
          </div>
        </Group>
        <Group title="Focus ring">
          <div className="flex flex-wrap gap-6">
            <Sample state="one 2px ink line, drawn over the border">
              <span data-demo="focus" className="block h-10 w-40 border border-border-strong bg-surface" />
            </Sample>
          </div>
        </Group>
      </Section>

      {/* ----------------------------------------------------------------- Icons */}
      <Section id="icons">
        <p className="max-w-prose text-sm text-muted">
          lucide-react at 1.75 stroke, 16 or 20px. Always paired with text or an accessible name.
        </p>
        <ul className="grid grid-cols-2 border-t border-l border-border sm:grid-cols-4">
          {ICONS.map(({ Icon, name, use }) => (
            <li key={name} className="flex items-center gap-3 border-r border-b border-border bg-surface p-3">
              <Icon aria-hidden className="size-5 shrink-0 text-ink" strokeWidth={1.75} />
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-mono text-label text-ink">{name}</span>
                <span className="text-label text-muted">{use}</span>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {/* ---------------------------------------------------------------- Button */}
      <Section id="button">
        <div className="overflow-x-auto">
          <table className="border-collapse">
            <thead>
              <tr>
                {["variant", "default", "hover", "focus", "disabled", "loading"].map((h) => (
                  <th key={h} scope="col" className="pr-6 pb-3 text-left font-mono text-label font-normal text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BUTTON_VARIANTS.map(({ variant, label }) => (
                <tr key={variant}>
                  <th scope="row" className="pr-6 pb-4 text-left font-mono text-label font-normal text-ink">
                    {variant}
                  </th>
                  <td className="pr-6 pb-4"><Button variant={variant}>{label}</Button></td>
                  <td className="pr-6 pb-4"><Button variant={variant} data-demo="hover">{label}</Button></td>
                  <td className="pr-6 pb-4"><Button variant={variant} data-demo="focus">{label}</Button></td>
                  <td className="pr-6 pb-4"><Button variant={variant} disabled>{label}</Button></td>
                  <td className="pr-6 pb-4"><Button variant={variant} loading>{label}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="max-w-prose text-sm text-ink">
          Destructive is only for withdrawing or deleting. An official returning an application uses
          secondary: returning is a normal outcome, not a deletion.
        </p>
        <div className="flex flex-wrap items-end gap-6">
          <Sample state="return for fixes, secondary">
            <Button variant="secondary" icon={<CornerDownLeft aria-hidden className="size-4" strokeWidth={1.75} />}>
              Return for fixes
            </Button>
          </Sample>
          <Sample state="size sm">
            <Button size="sm">Add condition</Button>
          </Sample>
          <Sample state="with icon">
            <Button variant="secondary" icon={<Upload aria-hidden className="size-4" strokeWidth={1.75} />}>
              Upload files
            </Button>
          </Sample>
          <Sample state="sm, quiet, icon">
            <Button size="sm" variant="quiet" icon={<FileText aria-hidden className="size-4" strokeWidth={1.75} />}>
              Spec sheet
            </Button>
          </Sample>
        </div>
      </Section>

      {/* ----------------------------------------------------------------- Input */}
      <Section id="input">
        <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          <Sample state="default, empty">
            <Input label="Street address" placeholder="118 Marlborough St" />
          </Sample>
          <Sample state="filled">
            <Input label="Street address" defaultValue="118 Marlborough St" />
          </Sample>
          <Sample state="hover">
            <Input label="Street address" defaultValue="118 Marlborough St" data-demo="hover" />
          </Sample>
          <Sample state="focus">
            <Input label="Street address" defaultValue="118 Marlborough St" data-demo="focus" />
          </Sample>
          <Sample state="required">
            <Input label="License number" required mono defaultValue="A-21894" />
          </Sample>
          <Sample state="error">
            <Input label="ZIP code" defaultValue="0211" mono error="Enter a 5-digit Boston ZIP code." />
          </Sample>
          <Sample state="disabled">
            <Input label="City" defaultValue="Boston" disabled />
          </Sample>
          <Sample state="read-only, mono">
            <Input label="Permit number" defaultValue="EL-2026-04417" mono readOnly />
          </Sample>
          <Sample state="mono, unit">
            <Input label="Proposed breaker" defaultValue="45" mono unit="A" inputMode="numeric" />
          </Sample>
          <Sample state="read from upload, needs a check">
            <Input
              label="Minimum circuit ampacity"
              defaultValue="23.0"
              mono
              unit="A"
              extracted="confirm"
              extractedSource="the spec sheet"
            />
          </Sample>
          <Sample state="read from upload, confirmed">
            <Input label="Maximum overcurrent protection" defaultValue="45" mono unit="A" extracted="confirmed" />
          </Sample>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- Select */}
      <Section id="select">
        <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          <Sample state="placeholder">
            <Select label="Job type" options={JOB_OPTIONS} placeholder="Choose a job type" defaultValue="" />
          </Sample>
          <Sample state="selected">
            <Select label="Job type" options={JOB_OPTIONS} defaultValue="heat_pump_panel" />
          </Sample>
          <Sample state="focus">
            <Select label="Job type" options={JOB_OPTIONS} defaultValue="ev_charger" data-demo="focus" />
          </Sample>
          <Sample state="open (active row in tint, chosen row checked)" className="pb-44">
            <Select label="Job type" options={JOB_OPTIONS} defaultValue="heat_pump_panel" data-demo="focus open" />
          </Sample>
          <Sample state="error">
            <Select
              label="Service voltage"
              mono
              options={[
                { value: "120/240", label: "120/240 V, single phase" },
                { value: "208", label: "208 V, three phase" },
              ]}
              placeholder="Choose voltage"
              defaultValue=""
              error="Choose the service voltage from the panel label."
            />
          </Sample>
          <Sample state="disabled">
            <Select label="Utility" options={[{ value: "eversource", label: "Eversource" }]} disabled />
          </Sample>
        </div>
      </Section>

      {/* -------------------------------------------------------------- Textarea */}
      <Section id="textarea">
        <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2">
          <Sample state="default">
            <Textarea label="What changed in this version" placeholder="Replaced 50 A breaker with 45 A." />
          </Sample>
          <Sample state="focus, filled">
            <Textarea
              label="What changed in this version"
              data-demo="focus"
              defaultValue="Replaced 50 A breaker with 45 A. Added a non-fused disconnect next to the outdoor unit."
            />
          </Sample>
          <Sample state="error">
            <Textarea label="Reason for return" required error="A reason is required to return an application." />
          </Sample>
          <Sample state="disabled">
            <Textarea label="Reviewer note" disabled defaultValue="Locked after signing." />
          </Sample>
        </div>
      </Section>

      {/* --------------------------------------------------------------- Choice */}
      <Section id="choice">
        <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2">
          <Sample state="checkbox: unchecked, checked, focus, disabled">
            <div className="flex flex-col gap-3">
              <Checkbox label="Panel has open spaces" />
              <Checkbox label="Load calculation attached" defaultChecked />
              <Checkbox label="Disconnect within sight" data-demo="focus" />
              <Checkbox label="Utility work order filed" disabled />
              <Checkbox label="Locked after signing" disabled defaultChecked />
            </div>
          </Sample>
          <Sample state="radio group, one with a description">
            <ChoiceGroup legend="Service voltage">
              <Radio name="demo-voltage" label="120/240 V, single phase" defaultChecked />
              <Radio
                name="demo-voltage"
                label="208 V, three phase"
                description="Rare in Boston houses. Check the panel label."
              />
              <Radio name="demo-voltage" label="Not sure" data-demo="hover" />
            </ChoiceGroup>
          </Sample>
        </div>
      </Section>

      {/* -------------------------------------------------------------- FileDrop */}
      <Section id="filedrop">
        <div className="grid gap-x-6 gap-y-8 lg:grid-cols-2">
          <Sample state="idle (drag or click)">
            <FileDrop label="Supporting documents" accept=".pdf,.jpg,.png" />
          </Sample>
          <Sample state="dragging over">
            <FileDrop label="Supporting documents" accept=".pdf,.jpg,.png" data-demo="dragging" />
          </Sample>
          <Sample state="focus">
            <FileDrop label="Supporting documents" accept=".pdf,.jpg,.png" data-demo="focus" />
          </Sample>
          <Sample state="with files">
            <FileDrop label="Supporting documents" accept=".pdf,.jpg,.png" defaultFiles={FILES} />
          </Sample>
          <Sample state="error">
            <FileDrop
              label="Panel photo"
              accept=".jpg,.png"
              multiple={false}
              error="Attach at least one photo of the open panel."
            />
          </Sample>
          <Sample state="disabled">
            <FileDrop label="Supporting documents" disabled defaultFiles={FILES.slice(0, 1)} />
          </Sample>
        </div>
      </Section>

      {/* ---------------------------------------------------------- DocumentSlot */}
      <Section id="documentslot">
        <p className="max-w-prose text-ink">
          One row per document the job needs, so the electrician sees exactly what to attach. The square
          fills with gold and a check once a file is in. Rows take drops and several files.
        </p>
        <div className="grid max-w-2xl gap-y-8">
          <Sample state="empty, required">
            <DocumentSlotDemo
              title="Heat pump spec sheet"
              hint="The manufacturer's sheet for the outdoor unit listing minimum circuit ampacity (MCA) and maximum overcurrent protection (MOCP)."
              required
              accept=".pdf,.jpg,.png"
            />
          </Sample>
          <Sample state="attached">
            <DocumentSlotDemo
              title="Photo of the electrical panel"
              hint="The main breaker and interior label must be readable."
              required
              accept=".jpg,.png"
              files={FILES.slice(0, 1)}
            />
          </Sample>
          <Sample state="optional, focus">
            <DocumentSlotDemo
              title="Site plan"
              hint="Location for outdoor unit and disconnect."
              accept=".pdf,.jpg,.png"
              data-demo="focus"
            />
          </Sample>
          <Sample state="dragging over">
            <DocumentSlotDemo
              title="Load calculation"
              hint="PermitPike runs this either way."
              data-demo="dragging"
            />
          </Sample>
          <Sample state="error">
            <DocumentSlotDemo
              title="Photo of the electrical panel"
              hint="The main breaker and interior label must be readable."
              required
              error="Attach the photo of the electrical panel."
            />
          </Sample>
          <Sample state="disabled (uploading)">
            <DocumentSlotDemo
              title="Charger spec sheet"
              hint="The manufacturer's sheet showing the charger's amperage and the breaker size it needs."
              required
              disabled
              files={FILES.slice(0, 2)}
            />
          </Sample>
        </div>
      </Section>

      {/* ------------------------------------------------------------ StatusChip */}
      <Section id="statuschip">
        <div className="flex flex-wrap gap-6">
          {STATUSES.map((s) => (
            <Sample key={s} state={s}>
              <StatusChip status={s} />
            </Sample>
          ))}
        </div>
      </Section>

      {/* ------------------------------------------------------------- RiskBadge */}
      <Section id="riskbadge">
        <div className="flex flex-wrap gap-6">
          {(["low", "med", "high"] as const).map((r) => (
            <Sample key={r} state={r}>
              <RiskBadge level={r} />
            </Sample>
          ))}
        </div>
      </Section>

      {/* -------------------------------------------------------------- CheckRow */}
      <Section id="checkrow">
        <div className="flex flex-wrap items-end gap-8">
          <Sample state="citation chip">
            <CitationChip citation="NEC 220.83" />
          </Sample>
          <Sample state="summary, all passing (zeros dimmed)">
            <CheckSummary counts={{ fail: 0, warn: 0, pass: 6 }} />
          </Sample>
        </div>
        <Card label="Checks" actions={<CheckSummary checks={CHECKS} />}>
          <ul data-motion="rows" className="-my-4">
            {CHECKS.map((c) => (
              <CheckRow key={c.title} {...c} />
            ))}
          </ul>
        </Card>
        <Sample state="overridden by an official, and still running">
          <Card>
            <ul className="-my-4">
              <CheckRow
                {...CHECKS[2]!}
                overridden={{
                  by: "M. Okafor",
                  reason: "Measured 37 in. of clearance on site, 22 Nov.",
                }}
              />
              <CheckRowRunning title="Grounding electrode conductor size" />
            </ul>
          </Card>
        </Sample>
      </Section>

      {/* ---------------------------------------------------- RecommendationCard */}
      <Section id="recommendation">
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <RecommendationCard
            decision="approve"
            confidence={0.92}
            summary="Load calc passes under NEC 220.83 with 38 A of headroom. Breaker, conductor and disconnect match the nameplate."
            meta="v2 · 2026-11-21 09:16"
          />
          <RecommendationCard
            decision="approve_with_conditions"
            confidence={0.74}
            summary="Approvable if the front working clearance at the panel is confirmed on site. All other checks pass."
            conditions={[
              "Confirm 36 in. of working clearance in front of the panel at inspection.",
              "Label the new disconnect for the outdoor unit.",
            ]}
            meta="v1 · 2026-11-21 09:16"
          />
          <RecommendationCard
            decision="return_for_fixes"
            confidence={0.88}
            summary="The breaker is above the unit's maximum overcurrent protection (MOCP), and no disconnect is shown within sight of the outdoor unit."
            meta="v1 · 2026-11-20 15:49"
          />
        </div>
      </Section>

      {/* --------------------------------------------------------- Signature */}
      <Section id="signature">
        <div className="grid gap-6 lg:grid-cols-2">
          <Sample state="signed by an official">
            <SignatureBlock name="M. Okafor" signedAt="22 NOV 2026 10:41" permitNumber="EL-2026-04417" />
          </Sample>
          <Sample state="waiting for a signature">
            <SignatureBlock permitNumber="EL-2026-04417" />
          </Sample>
        </div>
      </Section>

      {/* ------------------------------------------------------------ Dialog */}
      <Section id="dialog">
        <Sample state="drawn in place; confirm stays disabled until the box is ticked">
          <DialogDemo />
        </Sample>
        <Sample state="live modal: Escape or Cancel closes, focus returns">
          <DialogDemo live />
        </Sample>
      </Section>

      {/* --------------------------------------------------------- TrailTimeline */}
      <Section id="trail">
        <Sample state="just filed">
          <TrailTimeline steps={TRAIL_FILED} />
        </Sample>
        <Sample state="in review, utility step skipped">
          <TrailTimeline steps={TRAIL_REVIEW} />
        </Sample>
        <Sample state="returned for fixes at review">
          <TrailTimeline steps={TRAIL_RETURNED} />
        </Sample>
        <Sample state="signed">
          <TrailTimeline steps={TRAIL_SIGNED} />
        </Sample>
      </Section>

      {/* -------------------------------------------------------------- DiffView */}
      <Section id="diff">
        <DiffView rows={DIFF} beforeLabel="Version 1" afterLabel="Version 2" caption="Changes from version 1 to version 2" />
      </Section>

      {/* ----------------------------------------------------------------- Queue */}
      <Section id="queue">
        <div className="grid gap-4 sm:grid-cols-2">
          <Sample state="panel, waiting for an official">
            <PermitCard permit={QUEUE[1]!} />
          </Sample>
          <Sample state="panel, returned; as a link (hover)">
            <PermitCard permit={QUEUE[2]!} href="#queue" />
          </Sample>
        </div>
        <Sample state="queue: panels grouped by progress, oldest first; same order as a table">
          <PermitQueue permits={QUEUE} label="Permit queue sample" />
        </Sample>
      </Section>

      {/* ----------------------------------------------------------------- Map */}
      <Section id="map">
        <div className="grid gap-6 lg:grid-cols-2">
          <Sample state="PropertyMap: pin, parcel outline in harbor navy, pale fill">
            <PropertyMap parcel={MAP_DORCHESTER} address="210 Dorchester St, Boston MA 02127" />
          </Sample>
          <Sample state="MapUnavailable: lookup failed, slow (over 3 s) or no match">
            <MapUnavailable address="48 Brookside Ave, Boston MA 02130" />
          </Sample>
        </div>
        <Sample state="ZoningChips: district (ink edge), then overlays">
          <ZoningChips parcel={MAP_DORCHESTER} />
        </Sample>
        <div className="grid gap-6 lg:grid-cols-2">
          <Sample state="PropertyCard: reviewer detail, beside the checks, with the setback table">
            <PropertyCard parcel={MAP_BROOKSIDE} address={MAP_ADDRESS} setbackCheck />
          </Sample>
          <Sample state="PropertyCard: no saved parcel">
            <PropertyCard parcel={null} address={MAP_ADDRESS} />
          </Sample>
        </div>
        <Sample state="PermitsMap: queue pins marked by status, with the key">
          <QueueMapDemo />
        </Sample>
      </Section>

      {/* ----------------------------------------------------------------- Table */}
      <Section id="table">
        <Sample state="rows, hover on second row">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Permit</TableHeader>
                <TableHeader>Address</TableHeader>
                <TableHeader>Job</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Risk</TableHeader>
                <TableHeader numeric>Filed</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {APPLICATIONS.map((a, i) => (
                <TableRow key={a.permit} interactive data-demo={i === 1 ? "hover" : undefined}>
                  <TableCell mono>{a.permit}</TableCell>
                  <TableCell className="min-w-44">
                    {a.address}
                    <span className="block text-sm text-muted">{a.neighborhood}</span>
                  </TableCell>
                  <TableCell className="text-sm">{JOB_TYPE_LABELS[a.jobType]}</TableCell>
                  <TableCell>
                    <StatusChip status={a.status} />
                  </TableCell>
                  <TableCell>
                    <RiskBadge level={a.risk} />
                  </TableCell>
                  <TableCell numeric>{a.filed}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Sample>
        <Sample state="empty">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Permit</TableHeader>
                <TableHeader>Address</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader numeric>Filed</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableEmpty colSpan={4}>No applications are waiting for review.</TableEmpty>
            </TableBody>
          </Table>
        </Sample>
      </Section>


      {/* ------------------------------------------------------- Example library */}
      <Section id="library">
        <Sample state="library: filter by job type; each card says what the example is and the outcome it expects">
          <Tabs
            label="Example permits by job type"
            items={[
              { id: "all", label: "All", count: EXAMPLES.length },
              ...(["heat_pump_panel", "ev_charger", "home_battery"] as const).map((j) => ({
                id: j,
                label: JOB_TYPE_LABELS[j],
                count: EXAMPLES.filter((e) => e.fields.jobType === j).length,
              })),
            ].map((t) => ({
              ...t,
              content: (
                <div className="grid gap-4 sm:grid-cols-2">
                  {EXAMPLES.filter((e) => t.id === "all" || e.fields.jobType === t.id).map((e) => (
                    <ExampleCard key={e.id} example={e} titles={EXAMPLE_RULE_TITLES} href="#library" />
                  ))}
                </div>
              ),
            }))}
          />
        </Sample>
        <Sample state="one example opened: every check in plain words, failures first; all fields behind a toggle, marked by their check">
          <ExampleDetail
            example={EXAMPLES[0]!}
            checks={EXAMPLE_CHECKS}
            groups={fieldGroups(EXAMPLES[0]!.fields)}
            fieldChecks={EXAMPLE_FIELD_CHECKS}
          />
        </Sample>
      </Section>
      {/* --------------------------------------------------------------- Callout */}
      <Section id="callout">
        <Callout tone="info" title="Load calc uses NEC 220.83">
          No 12-month demand history was provided, so the optional method for existing dwellings applies.
        </Callout>
        <Callout tone="warning" title="Low confidence on extracted MCA">
          The spec sheet scan is unclear. Confirm <span className="font-mono">23.0 A</span> before submitting.
        </Callout>
        <Callout tone="utility" title="Eversource service upgrade required">
          The new <span className="font-mono">200 A</span> service needs a utility work order before inspection.
        </Callout>
        <Callout tone="info" title="Title-only callout" />
      </Section>

      {/* ------------------------------------------------------------------ Card */}
      <Section id="card">
        <div className="grid gap-6 lg:grid-cols-3">
          <Sample state="body only">
            <Card>
              <p className="text-ink">118 Marlborough St, Back Bay</p>
              <p className="mt-1 font-mono text-sm text-muted">EL-2026-04417</p>
            </Card>
          </Sample>
          <Sample state="label, actions, footer">
            <Card
              label="Service"
              actions={<StatusChip status="awaiting_official" />}
              footer={
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="secondary">Edit</Button>
                  <Button size="sm">Confirm</Button>
                </div>
              }
            >
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-muted">Service</dt>
                <dd className="font-mono text-ink">200 A</dd>
                <dt className="text-muted">Voltage</dt>
                <dd className="font-mono text-ink">120/240 V</dd>
                <dt className="text-muted">Open spaces</dt>
                <dd className="font-mono text-ink">4</dd>
              </dl>
            </Card>
          </Sample>
          <Sample state="selected">
            <Card label="Version 2" selected>
              <p className="text-ink">Resubmitted with a 45 A breaker.</p>
              <p className="mt-1 font-mono text-sm text-muted">2026-11-21 13:40</p>
            </Card>
          </Sample>
        </div>
      </Section>

      {/* --------------------------------------------------------------- Empty */}
      <Section id="empty">
        <Sample state="reviewer queue, nothing waiting">
          <EmptyState drawing="gas-lamp" message="No applications are waiting for review." />
        </Sample>
        <Sample state="applicant, no applications yet, with an action">
          <EmptyState
            drawing="triple-decker"
            message="You have not filed an application yet."
            action={<Button>Start an application</Button>}
          />
        </Sample>
      </Section>

      {/* ------------------------------------------------------------------ Tabs */}
      <Section id="tabs">
        <Sample state="selected, unselected, disabled (arrow keys move)">
          <Tabs
            label="Application sections"
            items={[
              { id: "checks", label: "Checks", count: 4, content: <p className="text-ink">Four checks ran against NEC 2023 and 527 CMR 12.00.</p> },
              { id: "load", label: "Load calc", content: <p className="font-mono text-ink">162 A of 200 A · 81% utilization</p> },
              { id: "files", label: "Files", count: 3, content: <p className="text-ink">Three files attached.</p> },
              { id: "history", label: "History", disabled: true, content: null },
            ]}
          />
        </Sample>
        <Sample state="hover on Files">
          <Tabs
            label="Application sections, hover sample"
            demoHoverId="files"
            items={[
              { id: "checks", label: "Checks", count: 4, content: <p className="text-ink">Four checks.</p> },
              { id: "load", label: "Load calc", content: null },
              { id: "files", label: "Files", count: 3, content: null },
            ]}
          />
        </Sample>
      </Section>

      {/* -------------------------------------------------------------- Header */}
      <Section id="header">
        <Sample state="entered as an applicant">
          <div className="overflow-hidden border border-border">
            <HeaderShell role="applicant" action={<a href="#header" className="pp-link text-sm">Leave</a>} />
          </div>
        </Sample>
        <Sample state="entered as a reviewer">
          <div className="overflow-hidden border border-border">
            <HeaderShell role="reviewer" action={<a href="#header" className="pp-link text-sm">Leave</a>} />
          </div>
        </Sample>
        <Sample state="entry screen, no role yet">
          <div className="overflow-hidden border border-border">
            <HeaderShell />
          </div>
        </Sample>
      </Section>

      {/* ---------------------------------------------------------- RoleChoice */}
      <Section id="rolechoice">
        <div className="grid gap-6 sm:grid-cols-2">
          <Sample state="default">
            <RoleChoiceCard icon={HardHat} label="Electrician" drawing="triple-decker" />
          </Sample>
          <Sample state="selected">
            <RoleChoiceCard icon={Landmark} label="Building official" drawing="city-hall" selected />
          </Sample>
          <Sample state="hover">
            <RoleChoiceCard icon={HardHat} label="Electrician" drawing="triple-decker" data-demo="hover" />
          </Sample>
          <Sample state="focus">
            <RoleChoiceCard icon={Landmark} label="Building official" drawing="city-hall" data-demo="focus" />
          </Sample>
          <Sample state="disabled">
            <RoleChoiceCard icon={HardHat} label="Electrician" drawing="triple-decker" disabled />
          </Sample>
        </div>
      </Section>
    </div>
  );
}
