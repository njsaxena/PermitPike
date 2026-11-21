# DESIGN.md

The PermitPike design system. Read this before building or changing any UI.
Live reference: `/design` (`web/app/design/page.tsx`).

## Direction

"Boston permit office, made modern." Official, calm and precise, with some civic pride
and one lively color. It should feel like a well-designed city form, not a startup site.
It draws on Boston's buildings and streets, not its brands.

| Source | Becomes |
|---|---|
| City Hall brutalism | Strong rectangles, 1px borders, a visible grid, square corners |
| Breaker panels, city lots, the Mass Pike | The logo: a brick grid with the Pike cut through it |
| State House dome | `accent` dome gold: the one lively color |
| Back Bay / Beacon Hill brick | `critical`: failures, returns, the trail path |
| The Freedom Trail | `TrailTimeline`: a solid brick-red line from filed to signed |
| Quincy granite | Neutrals and borders |
| Brass fittings | `warning` |
| Boston Common | `positive` green |
| Triple-deckers, brownstones, gas lamps | Line drawings for empty states and role choice |

## Where things live

- `web/styles/tokens.css`: raw values as `--pp-*` custom properties.
- `web/app/globals.css`: maps tokens into the Tailwind theme. Tailwind's default colors,
  shadows, blur, radii and type sizes are cleared, so only these tokens exist. Also holds
  `.pp-label`, `.pp-link` and all motion.
- `web/components/ui/`: primitives, exported from `index.ts`.
- Shared data shapes come from `@permitpike/contract`. Never redefine them in UI code.

## Tokens

### Color (Tailwind name → value)

| Token | Value | Use |
|---|---|---|
| `ink` | `#15191F` | Text, focus ring, edges of yellow fills, done markers |
| `muted` | `#5E6670` | Secondary text |
| `border` | `#D6D9DC` | Dividers, card edges |
| `border-strong` | `#848C95` | Form control edges (3:1, WCAG 1.4.11) |
| `background` | `#F7F6F3` | Page (limestone) |
| `surface` | `#FFFFFF` | Cards, controls |
| `sunken` | `#EFEEE9` | Drop zones, chips, disabled fills |
| `accent` / `-tint` | `#FFD21F` / `#FFF4BF` | Primary buttons, selected tab's count chip, current trail stop |
| `critical` / `-tint` | `#A23B2A` / `#F7ECE9` | Fail, returned, destructive, trail path |
| `warning` / `-tint` | `#8C6210` / `#F8F1E2` | Warn checks, conditions |
| `positive` / `-tint` | `#2F6B3F` / `#EAF2EC` | Pass, approved |
| `--pp-harbor` / `-tint` (map only) | `#1F3A5F` / navy at 12% | Parcel outline and its pale fill on property maps. Not a Tailwind color; never text, controls or UI lines |

**Dome gold is a fill, never text, never a line on its own.** It is 12.2:1 under ink text
but only 1.3:1 against limestone, so every yellow fill carries ink text and a 1px ink edge,
and the focus ring is ink. Links are ink and semibold.

**No underlines.** Links, quiet buttons and tabs carry no underline of any color.

**Hover is a wash, never a color swap.** Anything clickable gets `--pp-hover` (ink at 10%)
on hover. Transparent controls (links, quiet buttons, table rows, role cards) take it as
their background; filled ones (gold primary, white secondary, brick destructive, tabs, cards,
the drop zone) get it laid over their fill with the `wash` utility, so they darken a touch
and keep their color and edge. There are no separate `-hover` colors. Gold is never a hover
color. Where a whole row is the link, only the row shows the wash.

**System text selection.** Never restyle `::selection`; selected text uses the browser's own highlight.

**No overscroll bounce.** `html` and `body` set `overscroll-behavior: none`: the page stops at its top and bottom instead of rubber-banding past them.

Every text/background pair passes WCAG AA. Tints are for backgrounds only.

### Type

- **Red Hat Text** for all UI text (SIL Open Font License, loaded with `next/font/google`
  as a variable font, weights 300 to 700). Open shapes with a technical edge; amps and
  permit numbers read clearly. Public Sans Bold is kept for the wordmark only. **No
  monospace.** Permit numbers, code citations and electrical values (`200 A`, `240 V`) are
  Red Hat Text with even-width figures (`tabular-nums` is set on `<html>`). The
  `font-mono` utility still exists as the marker for "a value" and maps to Red Hat Text.
- Avoid the usual app defaults (Inter, DM Sans, Space Grotesk, Manrope, Geist, Plus
  Jakarta) and the faces already tried and dropped (Overpass, Archivo, plain Public Sans).
- **Headings are regular weight (400), not bold.** Size carries the hierarchy. Only the
  wordmark is bold. Small emphasis (labels, buttons, links) stays semibold.
- **Dates are written in words**: "November 21st", with the time on its own line as
  "9:14 AM". Use `longDate` and `clockTime` from `web/lib/format.ts`. The year shows only
  when it is not this year. Raw `2026-11-21 09:14` stamps stay only on formal records
  (`SignatureBlock`).
- Scale: `text-label` 12 · `text-sm` 13 · `text-base` 15 (1.5 line height) · `text-lg` 18 ·
  `text-title` 26 · `text-display` 40 (sparingly).
- `.pp-label`: 12px, uppercase, 0.08em letter-spacing, bold, ink. See the no-eyebrows
  rule for where it may go.

### Shape and space

- 4px spacing grid (`--spacing: 4px`). Prefer multiples of 8.
- Corners: square. No rounded corners anywhere (`--pp-radius: 0`; Tailwind radius tokens are cleared).
- Borders are 1px. Card padding is 24px (`p-card`). Page max width is 1100px (`max-w-page`).
  The review workspace (one permit open for an official) is wider, 1400px
  (`--pp-workspace-width`), so documents and evidence fit side by side; its header widens to match.
- Focus: one 2px ink line drawn over the element's border (offset -1px), so it never
  reads as a double border. Never remove it.

### Motion

One authored moment, plus small supporting motion. All of it sits inside
`prefers-reduced-motion: no-preference`; with reduced motion or no JavaScript, everything
renders in its final state. `<MotionObserver>` (in the root layout) adds `data-motion-in`
when an element scrolls into view.

| Motion | Hook | Spec |
|---|---|---|
| The trail lays itself, stop by stop | `data-motion="trail"` (TrailTimeline) | 640ms ease-out, 260ms per stop |
| Checks settle in order | `data-motion="rows"` on the list | 320ms rise, 70ms stagger |
| Confidence meter fills | `data-motion="meter"` (RecommendationCard) | 640ms, 150ms delay |
| Drop arrow lifts | `data-dragging` (FileDrop) | 320ms, 3px |
| Running check blinks | `data-running` (CheckRowRunning) | 1.2s, stepped |
| Dialog rises | `dialog[open]` | 320ms, 6px; backdrop fades |

Easing is `--pp-ease-out` (`cubic-bezier(0.16, 1, 0.3, 1)`). No bounce, no spring, no
motion on hover beyond color.

### Logo

`PermitPikeLogo` (mark plus wordmark) and `PermitPikeMark` in `components/ui/Logo.tsx`.

- Mark: a 4×4 grid of square cells in three flat brick steps (`critical`, and the
  logo-only `--pp-brick-step-2` `#DDA89B` and `--pp-brick-step-3` `#EFD9D3`). The darkest
  cells form a blocky "P". One knockout line, the Mass Pike, crosses the bottom right.
- Wordmark: "PermitPike" in Public Sans Bold, -0.02em, ink. All other text is Red Hat
  Text, at regular weight for headings.
- In the site header the logo is followed, from `lg` up, by the slogan "Boston's Fast Lane
  for Electrical Permits" in small muted text.
- Cut the Pike line in the color behind the mark (`on="surface"` or `"background"`).
- Never recolor it, outline it, add effects, or put the brick steps anywhere else in the UI.

### Imagery

Line drawings of Boston's built environment, drawn for PermitPike in `BostonDrawing`:
`city-hall`, `brownstone`, `triple-decker`, `gas-lamp`. Ink at 1.5px, granite for fine
detail, and exactly **one** dome-gold light per drawing (a lit window, a flame).
Decorative by default (`aria-hidden`); pass `title` when the drawing carries meaning.
Use them for empty states, role choice and the `/design` header, not as wallpaper.
They are illustrations, never the logo.

## Rules

### No eyebrows (strict)

An **eyebrow** is a short line of text (often small, uppercase, letter-spaced or colored)
placed directly above a heading or title to categorize or introduce it.
"RECOMMENDATION" above "Approve" is an eyebrow. So is "STEP 2" above "Upload files",
or "FOR ELECTRICIANS" above a page title.

Eyebrows are banned everywhere: pages, cards, modals, empty states, marketing copy.

- If the category matters, put it in the heading itself ("PermitPike recommends approval", not
  "RECOMMENDATION" + "Approve").
- If it doesn't, delete it.
- The `.pp-label` style is allowed only where it **is** the heading, with no other heading
  under it:
  - a section label in a side column, beside its content (as on `/design`)
  - a card header label in its own ruled header row (`Card label=…`)
  - table column headers
  - a run-in label on the same line as its text (`FIX` in `CheckRow`)
- Never stack two text lines where the top one only labels the bottom one. Metadata
  (timestamps, permit numbers) goes **below** or **beside** a title, never above it.

### No stamps (strict)

No rubber stamps, seals, rotated badges, "APPROVED" ink marks or stamp textures, for
the AI or for officials. An official's sign-off is a `SignatureBlock`: a signature line
with name, role, a mono timestamp and the permit number.

### Banned

- Gradients, glassmorphism, drop shadows, glow, blur, neon
- Purple or violet anywhere; more than one accent color
- Emoji, sparkle icons, "AI-powered" badges, robot imagery
- Eyebrows and stamps (above)
- Colored side stripes thicker than 1px (`border-l-4` and similar). Use a full box or a tinted fill.
- Subtitles or helper text under headings, labels or cards, unless it prevents an error
- "Welcome to", "Get started", "Unlock", "Seamless", lorem ipsum
- Rounded corners of any size, pill shapes, centered page layouts
- MBTA logos or line colors, skyline clip art, sports teams, lobsters, "wicked" jokes

### Roles

People enter as an electrician (applicant) or a building official (reviewer) on the entry
screen (`/`) and stay that role. There is no switch in the header; "Leave" returns to
the entry screen.

### Content

- The AI only recommends. Its output always reads "PermitPike recommends …", is marked
  `Advisory` and uses ink text (never a verdict color). Only an official's action is
  shown as a decision.
- Values read from uploads are never filled in silently: `Input extracted="confirm"` until
  the applicant checks them.
- Destructive buttons are only for withdrawing or deleting. Returning an application for
  fixes is a normal outcome and uses `secondary`.
- Checks are listed failures first, then warnings, then passes, under a `CheckSummary`:
  X, triangle and check icons, each beside a large count.
- Every check shows its code citation in a chip, and links to the published source when
  `packages/compliance/catalog.ts` lists it (`codeSource()` in `web/lib/review-sources.ts`).
  Never write code text or section titles in the UI; name the source and link to it.
- Spell out abbreviations the first time: "maximum overcurrent protection (MOCP)".
- Use real units and plain words: "45 A breaker", not "breaker amperage value".

### Accessibility

- AA contrast for all text; 3:1 for control edges and meaningful icons.
- Every input has a visible `<label>`. No placeholder-only fields.
- Status is never color-only: each status chip has its own mark shape (empty, outlined,
  half, full, X, check); risk has bars; trail markers differ by fill and icon.
- Everything works by keyboard. Tabs use arrow keys;
  dialogs are native `<dialog>` (focus trapped, Escape closes).
- A loading button uses `aria-disabled` and `aria-busy`, not `disabled`, so it keeps focus.
- Icons are `aria-hidden` and paired with text or an accessible name.

### Responsive

- Below `sm` (640px): `TrailTimeline` turns vertical and multi-column grids stack.
- Wide tables scroll inside their own container; the page never scrolls sideways.

### Icons

lucide-react only, 1.75 stroke, 16 or 20px. One icon per meaning (see `/design` → Icons).

## Review workspace

One permit, open for a building official (`/review/[id]`). Built from `ReviewWorkspace` in `web/components/review/`.

- **Layout.** A "Queue" link, then the heading (address, status, permit number, job,
  neighborhood, filed date in words) and who filed it, with "Change status" at the top
  right. Then the trail and two columns: documents on the left, held in view while the
  right side scrolls; PermitPike's recommendation and the evidence on the right. Below
  `lg` the columns stack and "Change status" sits under the heading.
- **Documents first.** The official reads the applicant's files, not a summary of them.
  `DocumentViewer` shows one document at a time, large, with zoom (fit, 50 to 300%) and
  "Open original". The document box is a fixed height; zooming scrolls inside it and
  never resizes it. Under each document: the values to check against it.
- **Confidence is shown, never hidden.** A value read with under 85% confidence, or not
  found, gets a brass tint and a sentence telling the official to read it from the
  document. Never fill a missing value with a guess.
- **"Check against", not "read from".** The extraction has no per-field provenance, so the
  UI says which document backs a value up (`fieldSource()`), not where the model read it.
- **Evidence tabs:** Checks (failures first; each has "Show in [document]", which opens
  that document, and its code source link), Permit record (below), Load calculation
  (every line with volt-amps and its code section, the totals, and a meter against the
  service with 80% and 100% marks; before and after when the service is upgraded),
  Inspection (the inspector's checklist and the code and city sources for the job type),
  History (submissions and decisions). The load calculation opens with two short
  paragraphs on what it answers (can the service carry the new load) and how to read the
  result (under 80% fits, 80 to 100% tight, over 100% needs a bigger service; 80% is a
  PermitPike setting). The inspection tab is the "Site inspection checklist", with one
  line saying a city inspector checks these on site after the work is done.
- **The permit record** is every value the permit rests on, in one place: PermitPike reads
  them (Gemini), the electrician confirms them when filing, and the official can correct
  any of them with "Edit record". Each row shows where its value came from: the document
  and confidence, or "Edited by you". Inputs, options and limits come from the contract's
  Zod schemas (`web/lib/record-edit.ts`). When an edited value fed a check, a warning says
  the checks ran on the earlier value. The live page shows the record
  read-only until the API can save edits (needs a contract change).
- **The decision.** "Change status" (gold, top right) opens a menu with the two moves:
  "Approve" and "Return for fixes", titles only, with "PermitPike recommends this" on the
  recommended one, which is listed first. Approving against the recommendation shows a
  warning icon instead of a check. Each opens its own
  confirmation. Approving past a failing check is "Approve anyway" and needs a written
  reason; approving needs the attestation tick; returning pre-fills the requested fixes
  from the checks. Only these change the permit. After a decision the control goes away
  and the page shows the `SignatureBlock` (approved) or the reasons (returned).
- **Bold carries the facts.** Values in the record and document panel, addresses in the
  queue, and the applicant's name are semibold; labels and provenance are regular, muted.
- **No helper sentences** that restate the layout ("Failures first…"). If the UI needs
  explaining, fix the UI.
- **Dates in words** everywhere in the workspace ("November 20th", "10:30 AM"); the
  numeric stamp appears only in `SignatureBlock`.

## Applicant portal

The electrician's side (`/apply`).

- **Home.** "Welcome back, [first name]." and how many permits are waiting on the city,
  "File a permit" (gold) at the top right, then "Your permits" as `PermitCard`s. No risk
  badges: risk is for the city's reviewers, not the electrician.
- **File a permit** opens on the three kinds of job (`StartPermit`), each with how many
  documents it needs. Below them, in a sunken panel, "Example permits to start from":
  small cards that say only the request ("Heat pump at 64 Ashfield St", neighborhood,
  number of documents). Never what PermitPike found or what the official decided: that
  is found out by filing it. A card opens its documents to look through (one tab per
  document, "Open original"), with "Start from this example".
- **Filing is always real.** Both paths open the same form (`/apply/new?job=<jobType>` or
  `?example=<slug>`, filled in with the example's documents attached). Filing uploads the
  documents and creates the permit, which PermitPike checks and officials then review in
  the queue. There is no pretend filing anywhere. Not signed in yet: name and license
  first, then straight back to the form that was picked.
- **One form.** `PermitForm` is the form without the saving; `FilePermitForm` uploads and
  files. Validation: street, 5-digit ZIP, cost in dollars, each required document. The cost
  groups itself with commas as it's typed (30000 → 30,000), keeping the caret in place.
- **After filing** the page leads with the tracking code, then the permit as it stands.
- **One permit** (`ApplicantPermitView`): heading, tracking code, trail, a one-line status
  ("Waiting for a building official. PermitPike found 1 problem they will look at."),
  the official's decision, the resubmit form when it came back, then "What PermitPike
  found" (checks, failures first, with fixes; the utility flag; the load on the service)
  and programs for the job.

## Components

| Component | Notes |
|---|---|
| `Button` | primary (gold), secondary, quiet, destructive; `sm`/`md`; `loading`, `disabled`, `icon` |
| `Input`, `Select`, `Textarea` | Visible label, `error`, `mono`, `unit` suffix; Input `extracted="confirm" \| "confirmed"`. Select is a custom listbox (no native dropdown): ink-edged list, tinted active row, check on the chosen row, keyboard and typeahead |
| `Checkbox`, `Radio`, `ChoiceGroup` | Square; checked = gold fill, ink edge, ink mark |
| `FileDrop` | Drag or click; file chips with remove; error and disabled states; announces changes |
| `DocumentSlot` | One row per document a job needs: title, Required/Optional, what a good one shows, its own Choose file button; gold check square once attached. Use on the filing form instead of one big drop zone |
| `StatusChip` | `draft` (UI-only) plus contract `ApplicationStatus` values |
| `RiskBadge` | low / med / high, with a three-bar meter; `plain` drops the box for panels and rows |
| `CheckRow` | Contract `CheckResult`: icon, title, citation chip, message, fix; `overridden`; `children` for row actions ("Show in site plan", the source link) |
| `CheckRowRunning` | Placeholder while a check runs |
| `CheckSummary` | Fail / warning / pass counts with their icons. `tiles` (zeros dimmed) for check lists; `inline` (no boxes, zeros left out) for panels and rows |
| `CitationChip` | Mono code citation |
| `RecommendationCard` | "PermitPike recommends …" in a tinted band, Advisory chip, confidence meter, summary, `conditions` |
| `SignatureBlock` | Official's sign-off line; signed and unsigned |
| `ConfirmDialog` | Native modal with summary, optional attestation checkbox, actions; `keepMounted` keeps the content in the page while closed (static copies) |
| `TrailTimeline` | Steps: done, current, returned, upcoming, skipped; vertical on phones |
| `PermitCard`, `MiniTrail` | One permit as a panel: status chip, address and job, then check counts and risk, then the filed date and permit number. One box on the card (the chip). `MiniTrail` shows progress in the table view |
| `ExampleCard`, `ExampleDetail`, `CheckList`, `FieldSheet`, `DecisionChip` | The example library (`EvalCase`s). Card: expected outcome, the example in one sentence, what PermitPike should find. Detail: outcome and sentence, then `CheckList`: every check on one line each, failures first, with a status tile, the plain-words result, the fix and the citation, and the verdict in words ("Fails", "Needs a look", "Passes"; screen-reader only on phones). Every field sits behind an "All fields" disclosure as a filled-in form via `fieldGroups()` (`web/lib/example-fields.ts`); each field a check read shows that check's mark, failing rows tinted brick. All text in Red Hat Text |
| `PermitQueue` | Open work as a Board: one column per stage (In progress, Waiting, Returned), each keeping the order passed in (the API sends highest risk first, then newest); a Table view of the same permits. Board and Table switch with icon-only tabs. Approved permits sit apart below, in a compact table, since nobody acts on them. In both tables the whole row opens the permit |
| `QueueWelcome` | The queue's title: "Welcome back, [first name]." and "There are [n] permits waiting for your review." (count of permits awaiting an official, in bold) |
| `ReviewWorkspace` | One permit for an official (see Review workspace). Takes a contract `ApplicationDetail`, the pinned version, PDF previews, an `actions` slot (top right), an optional `note`, and `recordEditable` |
| `PermitRecord` | The permit record tab: grouped values with provenance and check marks; "Edit record" swaps in a form validated against the contract |
| `DocumentViewer`, `FieldLine` | Document tabs (one per file kind), zoom toolbar, image or PDF; the values to check against each document with confidence and check marks |
| `LoadCalcPanel`, `ServiceMeter` | The worked load calculation and the flat service meter (80% and 100% marks; fits / tight / needs upgrade) |
| `ChangeStatus` | "Change status" button and menu (status now, approve, return; recommended first) and the approve and return dialogs; override needs a reason |
| `StartPermit` | First screen of "File a permit": one card per job type, then `ExamplePermits`. Cards hover with an ink edge and the wash |
| `ExamplePermits` | Example permits in a sunken panel: small cards with the request only; each opens a dialog with its documents in tabs and "Start from this example" |
| `PermitForm` | The filing form without the saving: job, address, ZIP, cost, description, one `DocumentSlot` per document. Starts filled in from `exampleInitial()` (`web/lib/example-filing.ts`) or empty; `FilePermitForm` wraps it to upload and file |
| `ApplicantPermitView` | One permit as the electrician sees it: tracking code, trail, status line, decision, then what PermitPike found. `justFiled` leads with the tracking code |
| `DiffView` | Before/after values; "Not set" and "Removed" for missing values |
| `Table` | Horizontal rules only |
| `Callout` | info, warning, utility; full box with an icon tile |
| `Card` | Optional header label, actions, footer; `selected` |
| `Tabs` | WAI-ARIA tabs drawn as a row of square buttons; the selected one is filled ink with a gold count chip. Optional `value`/`onChange` to control it (a check opening its document). Switching tabs keeps the tab bar where it was on screen, so a shorter panel never makes the page jump. `icon` plus `iconOnly` draws a square icon button with the label as its accessible name and tooltip |
| `HeaderShell` | Logo plus the role you entered as and a "Leave" link back to the entry screen. No role toggle. `wide` matches the review workspace |
| `RoleChoiceCard` | One label with an icon or a Boston drawing; the entry screen uses two |
| `PermitPikeLogo`, `PermitPikeMark` | The logo (see Logo) |
| `BostonDrawing` | Line drawings (see Imagery) |
| `EmptyState` | Drawing, one sentence, at most one action |
| `PropertyMap` | Leaflet map (next/dynamic, `ssr:false`) of one parcel: grayscale OpenStreetMap tiles with visible attribution, harbor-navy outline, brick-red square pin. Screen-reader summary on the focusable map; arrow keys pan, +/- zoom. The scroll wheel zooms the map while the pointer is over it, and the page stays still. The queue's permit map works the same way. With no parcel it renders `MapUnavailable` |
| `MapUnavailable` | The address as text plus "Map unavailable". Used whenever the lookup fails, finds nothing or takes over 3 seconds. Never blocks filing |
| `ZoningChips` | Zoning district (ink edge, subdistrict in mono), then overlays (quiet) |
| `PropertyCard` | Reviewer detail, beside the checks: map, parcel ID, assessor address, zoning, overlays and the article's dimensional tables (labelled "Setback table" when the job has a setback check) |
| `PermitsMap` | Queue map behind a "Show map" toggle: one pin per permit, pin heads reuse the `StatusChip` mark shapes and fills so status is never color-only; key with counts below |

## Adding or changing UI

1. Use tokens through Tailwind classes. Don't add hex values in components.
2. New component? Add it to `web/components/ui/`, export it from `index.ts`, and show
   every state on `/design`.
3. Check it against the rules above, especially no eyebrows, no stamps and no helper text.
