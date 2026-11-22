/**
 * HTML templates for the example documents. build.ts fills them from the same data as the
 * example records, so every number on a document matches the extracted fields.
 * Brands, products, people and companies are fictional. Each document says so in its footer.
 */

const esc = (s: string | number) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const DEMO_NOTE = "Fictional document made for PermitPike demo use. Not a real product or project.";

// ---------------------------------------------------------------------------
// Spec sheet (letter, portrait PDF)
// ---------------------------------------------------------------------------

export interface SpecSheet {
  brand: string;
  /** Hex color for the brand band. */
  color: string;
  product: string;
  model: string;
  tagline: string;
  sections: { title: string; rows: [string, string][] }[];
  notes: string[];
  docNumber: string;
}

export function specSheetHtml(s: SpecSheet): string {
  const sections = s.sections
    .map(
      (sec) => `
      <section>
        <h3>${esc(sec.title)}</h3>
        <table>${sec.rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</table>
      </section>`,
    )
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { size: letter; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: #1d232a; font-size: 10.5pt; }
    .band { background: ${s.color}; color: #fff; padding: 34px 48px 28px; }
    .brand { font-size: 13pt; font-weight: 700; letter-spacing: 0.02em; opacity: 0.92; }
    h1 { margin: 18px 0 4px; font-size: 26pt; font-weight: 700; }
    .model { font-size: 12pt; opacity: 0.9; }
    .tagline { padding: 18px 48px 4px; font-size: 11.5pt; color: #3b4652; }
    main { padding: 8px 48px 0; columns: 2; column-gap: 32px; }
    section { break-inside: avoid; margin-bottom: 18px; }
    h3 { margin: 0 0 6px; font-size: 10.5pt; color: ${s.color}; border-bottom: 1.5px solid ${s.color}; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 4px 0; border-bottom: 1px solid #e3e6ea; vertical-align: top; font-size: 9.5pt; }
    th { font-weight: 500; color: #56616d; width: 52%; padding-right: 8px; }
    td { font-weight: 600; }
    .notes { margin: 6px 48px 0; padding: 12px 16px; background: #f4f5f7; border-radius: 4px; font-size: 9pt; color: #3b4652; }
    .notes p { margin: 3px 0; }
    footer { position: fixed; bottom: 26px; left: 48px; right: 48px; font-size: 8pt; color: #7a848f; display: flex; justify-content: space-between; border-top: 1px solid #e3e6ea; padding-top: 8px; }
  </style></head><body>
    <div class="band">
      <div class="brand">${esc(s.brand)}</div>
      <h1>${esc(s.product)}</h1>
      <div class="model">Model ${esc(s.model)} · Product specifications</div>
    </div>
    <p class="tagline">${esc(s.tagline)}</p>
    <main>${sections}</main>
    <div class="notes">${s.notes.map((n) => `<p>${esc(n)}</p>`).join("")}</div>
    <footer><span>${esc(s.docNumber)} · Specifications subject to change without notice.</span><span>${DEMO_NOTE}</span></footer>
  </body></html>`;
}

// ---------------------------------------------------------------------------
// Site plan (letter, landscape PDF). Coordinates are feet; (0,0) is the lot's back-left corner.
// ---------------------------------------------------------------------------

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

export interface SitePlan {
  title: string;
  address: string;
  lot: { w: number; h: number };
  street: string;
  buildings: Rect[];
  /** The electrical panel. */
  panel: { x: number; y: number; label: string; labelLeft?: boolean };
  /** The new equipment. */
  equipment: Rect;
  /** Dashed wire run from the panel to the equipment, as points. */
  run: { x: number; y: number }[] | null;
  /** Horizontal dimension from the equipment's edge to a side lot line. */
  setback: { side: "left" | "right"; feet: number } | null;
  /** Dimension from the equipment to the nearest door or window. */
  opening: { x: number; y: number; feet: number; label: string } | null;
  notes: string[];
  drawnBy: string;
  date: string;
  revision: string;
}

export function sitePlanHtml(p: SitePlan): string {
  // px per foot: as large as fits the drawing area beside the title block.
  const S = Math.min(8, 600 / p.lot.h, 640 / p.lot.w);
  const ox = 70;
  const oy = 40;
  const X = (ft: number) => ox + ft * S;
  const Y = (ft: number) => oy + ft * S;
  const W = p.lot.w * S;
  const H = p.lot.h * S;

  const rect = (r: Rect, fill: string, stroke: string, bold = false) => `
    <rect x="${X(r.x)}" y="${Y(r.y)}" width="${r.w * S}" height="${r.h * S}" fill="${fill}" stroke="${stroke}" stroke-width="${bold ? 2.5 : 1.5}"/>
    <text x="${X(r.x + r.w / 2)}" y="${Y(r.y + r.h / 2) + 4}" text-anchor="middle" font-size="${bold ? 11 : 12}" font-weight="${bold ? 700 : 500}">${esc(r.label)}</text>`;

  const e = p.equipment;
  let dims = "";
  if (p.setback) {
    const yMid = Y(e.y + e.h / 2);
    const x1 = p.setback.side === "right" ? X(e.x + e.w) : X(0);
    const x2 = p.setback.side === "right" ? X(p.lot.w) : X(e.x);
    dims += `
      <line x1="${x1}" y1="${yMid}" x2="${x2}" y2="${yMid}" stroke="#c2410c" stroke-width="1.5" marker-start="url(#a)" marker-end="url(#a)"/>
      <rect x="${(x1 + x2) / 2 - 26}" y="${yMid - 24}" width="52" height="16" fill="#fff"/>
      <text x="${(x1 + x2) / 2}" y="${yMid - 12}" text-anchor="middle" font-size="12" font-weight="700" fill="#c2410c">${esc(p.setback.feet)}′-0″</text>`;
  }
  if (p.opening) {
    const ex = X(e.x + e.w / 2);
    const ey = Y(e.y);
    dims += `
      <line x1="${ex}" y1="${ey}" x2="${X(p.opening.x)}" y2="${Y(p.opening.y)}" stroke="#c2410c" stroke-width="1.5" marker-start="url(#a)" marker-end="url(#a)"/>
      <rect x="${X(p.opening.x) - 6}" y="${Y(p.opening.y) - 6}" width="12" height="12" fill="#fff" stroke="#1d232a"/>
      <text x="${(ex + X(p.opening.x)) / 2 + 8}" y="${(ey + Y(p.opening.y)) / 2}" font-size="12" font-weight="700" fill="#c2410c">${esc(p.opening.feet)}′-0″ to ${esc(p.opening.label)}</text>`;
  }
  const run = p.run
    ? `<polyline points="${p.run.map((pt) => `${X(pt.x)},${Y(pt.y)}`).join(" ")}" fill="none" stroke="#1d4ed8" stroke-width="2" stroke-dasharray="7 5"/>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { size: letter landscape; margin: 0; }
    html, body { margin: 0; height: 8.5in; overflow: hidden; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: #1d232a; }
    .sheet { position: relative; width: 11in; height: 8.5in; overflow: hidden; box-sizing: border-box; border: 10px solid #fff; outline: 1.5px solid #1d232a; outline-offset: -18px; }
    svg { position: absolute; left: 28px; top: 28px; }
    .tb { position: absolute; right: 28px; top: 28px; bottom: 28px; width: 250px; border-left: 1.5px solid #1d232a; padding: 16px 18px; box-sizing: border-box; font-size: 10pt; display: flex; flex-direction: column; gap: 10px; }
    .tb h1 { font-size: 14pt; margin: 0; }
    .tb .k { color: #56616d; font-size: 8.5pt; }
    .tb .v { font-weight: 600; }
    .tb ul { margin: 0; padding-left: 16px; font-size: 9pt; }
    .tb li { margin-bottom: 4px; }
    .legend { font-size: 9pt; }
    .foot { margin-top: auto; font-size: 7.5pt; color: #7a848f; }
  </style></head><body><div class="sheet">
    <svg width="${W + 160}" height="${H + 110}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif">
      <defs><marker id="a" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#c2410c"/></marker></defs>
      <rect x="${X(0)}" y="${Y(0)}" width="${W}" height="${H}" fill="#fbfbf8" stroke="#1d232a" stroke-width="2" stroke-dasharray="14 4 3 4"/>
      <text x="${X(0) - 8}" y="${Y(p.lot.h / 2)}" font-size="10" text-anchor="middle" transform="rotate(-90 ${X(0) - 8} ${Y(p.lot.h / 2)})" fill="#56616d">PROPERTY LINE</text>
      <text x="${X(p.lot.w) + 14}" y="${Y(p.lot.h / 2)}" font-size="10" text-anchor="middle" transform="rotate(90 ${X(p.lot.w) + 14} ${Y(p.lot.h / 2)})" fill="#56616d">PROPERTY LINE</text>
      <rect x="${X(-4)}" y="${Y(p.lot.h) + 14}" width="${W + 64}" height="34" fill="#e7e5df"/>
      <text x="${X(p.lot.w / 2)}" y="${Y(p.lot.h) + 36}" text-anchor="middle" font-size="12" font-weight="600" fill="#56616d">${esc(p.street.toUpperCase())}</text>
      ${p.buildings.map((b) => rect(b, "#eceff2", "#1d232a")).join("")}
      ${run}
      ${rect(e, "#fde7d9", "#c2410c", true)}
      <circle cx="${X(p.panel.x)}" cy="${Y(p.panel.y)}" r="7" fill="#1d4ed8"/>
      <text x="${X(p.panel.x) + (p.panel.labelLeft ? -11 : 11)}" y="${Y(p.panel.y) + 4}" text-anchor="${p.panel.labelLeft ? "end" : "start"}" font-size="11" font-weight="600" fill="#1d4ed8">${esc(p.panel.label)}</text>
      ${dims}
      <g transform="translate(${X(p.lot.w) + 60}, ${Y(4)})"><path d="M0,-18 L8,8 L0,3 L-8,8 z" fill="#1d232a"/><text y="24" text-anchor="middle" font-size="11" font-weight="700">N</text></g>
    </svg>
    <div class="tb">
      <h1>${esc(p.title)}</h1>
      <div><div class="k">Address</div><div class="v">${esc(p.address)}</div></div>
      <div><div class="k">Lot</div><div class="v">${esc(p.lot.w)} ft × ${esc(p.lot.h)} ft</div></div>
      <div class="legend"><span style="color:#1d4ed8">●</span> Panel &nbsp; <span style="color:#1d4ed8">- - -</span> Wire run &nbsp; <span style="color:#c2410c">◆</span> New work</div>
      <ul>${p.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
      <div><div class="k">Drawn by</div><div class="v">${esc(p.drawnBy)}</div></div>
      <div style="display:flex;gap:18px"><div><div class="k">Date</div><div class="v">${esc(p.date)}</div></div><div><div class="k">Revision</div><div class="v">${esc(p.revision)}</div></div><div><div class="k">Scale</div><div class="v">Not to scale</div></div></div>
      <div class="foot">${DEMO_NOTE}</div>
    </div>
  </div></body></html>`;
}

// ---------------------------------------------------------------------------
// Panel photo (an illustration of the open panel, rendered to JPEG)
// ---------------------------------------------------------------------------

export interface Breaker {
  amps: number;
  poles: 1 | 2;
  label: string;
}

export interface PanelPhoto {
  brand: string;
  busAmps: number;
  mainAmps: number;
  /** Total single-pole spaces. Must be even (two columns). */
  slots: number;
  /** Breakers in fill order, left column top to bottom, then right column. */
  breakers: Breaker[];
  caption: string;
}

/** Used spaces, counting two-pole breakers as two. */
export const usedSpaces = (b: Breaker[]) => b.reduce((n, x) => n + x.poles, 0);

/** Pixel size of the rendered panel image. */
export const PANEL_WIDTH = 1200;
export const panelPhotoHeight = (p: PanelPhoto) => 200 + (p.slots / 2) * Math.min(34, Math.floor(980 / (p.slots / 2))) + 300 + 190;

export function panelPhotoHtml(p: PanelPhoto): string {
  const rows = p.slots / 2;
  const rowH = Math.min(34, Math.floor(980 / rows));
  const colW = 210;
  const left = 470;
  const top = 360;

  // Lay breakers into two columns.
  const cols: (Breaker | null)[][] = [[], []];
  for (const b of p.breakers) {
    const col = cols.find((k) => k.length + b.poles <= rows);
    if (!col) throw new Error(`${p.brand} panel: breakers do not fit in ${p.slots} spaces`);
    col.push(b);
    if (b.poles === 2) col.push(null);
  }
  const out: string[] = [];
  const directory: string[] = [];
  let circuit = 1;
  cols.forEach((col, ci) => {
    for (let r = 0; r < rows; r++) {
      const x = left + ci * (colW + 60);
      const y = top + r * rowH;
      const b = col[r];
      if (b === undefined) {
        out.push(`<rect x="${x}" y="${y + 3}" width="${colW}" height="${rowH - 6}" rx="3" fill="#cfd3d8" stroke="#b3b9c0"/>
          <circle cx="${x + colW / 2}" cy="${y + rowH / 2}" r="${rowH / 4}" fill="#bfc4ca" stroke="#a6acb3"/>`);
        continue;
      }
      if (b === null) continue;
      const h = rowH * b.poles - 6;
      const hx = ci === 0 ? x + colW - 70 : x + 16;
      out.push(`<rect x="${x}" y="${y + 3}" width="${colW}" height="${h}" rx="3" fill="#2b2f35" stroke="#16181b"/>
        <rect x="${hx}" y="${y + 3 + h / 2 - 8}" width="54" height="16" rx="2" fill="#4a5058"/>
        <text x="${ci === 0 ? x + 14 : x + colW - 14}" y="${y + 3 + h / 2 + 5}" font-size="14" font-weight="700" fill="#e8eaed" text-anchor="${ci === 0 ? "start" : "end"}">${b.amps}</text>`);
      directory.push(`${circuit}. ${b.label} (${b.amps} A${b.poles === 2 ? ", 2P" : ""})`);
      circuit += 1;
    }
  });

  const boxH = rows * rowH + 300;
  const height = panelPhotoHeight(p);
  const mainX = left + colW - 40;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { margin: 0; background: #8f8a80; }
  </style></head><body>
  <svg width="${PANEL_WIDTH}" height="${height}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif">
    <defs>
      <linearGradient id="wall" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#a39e93"/><stop offset="1" stop-color="#7f7a70"/></linearGradient>
      <linearGradient id="steel" x1="0" x2="1"><stop offset="0" stop-color="#e2e5e8"/><stop offset="0.5" stop-color="#f1f3f5"/><stop offset="1" stop-color="#d3d7db"/></linearGradient>
    </defs>
    <rect width="${PANEL_WIDTH}" height="${height}" fill="url(#wall)"/>
    <!-- open door, left -->
    <polygon points="90,170 400,210 400,${210 + boxH - 40} 90,${170 + boxH + 40}" fill="url(#steel)" stroke="#9aa1a8" stroke-width="2"/>
    <rect x="130" y="290" width="230" height="${Math.max(360, directory.length * 22 + 70)}" fill="#fffdf4" stroke="#c8c2ae" transform="skewY(4)"/>
    <text x="150" y="330" font-size="15" font-weight="700" fill="#333" transform="skewY(4)">CIRCUIT DIRECTORY</text>
    ${directory.map((d, i) => `<text x="150" y="${362 + i * 22}" font-size="13" fill="#2b3a67" font-family="Bradley Hand, Comic Sans MS, cursive" transform="skewY(4)">${esc(d)}</text>`).join("")}
    <!-- enclosure -->
    <rect x="410" y="200" width="${colW * 2 + 180}" height="${boxH}" rx="6" fill="url(#steel)" stroke="#8d949b" stroke-width="3"/>
    <rect x="440" y="230" width="${colW * 2 + 120}" height="${boxH - 60}" rx="4" fill="#e6e9ec" stroke="#a6adb4" stroke-width="2"/>
    <!-- main breaker -->
    <rect x="${mainX}" y="250" width="160" height="84" rx="4" fill="#25292e" stroke="#111"/>
    <rect x="${mainX + 30}" y="276" width="100" height="22" rx="3" fill="#454b53"/>
    <text x="${mainX + 80}" y="322" font-size="20" font-weight="800" fill="#f1f3f5" text-anchor="middle">${p.mainAmps}</text>
    <text x="${mainX + 80}" y="268" font-size="10" fill="#c8ccd1" text-anchor="middle" letter-spacing="1">MAIN</text>
    ${out.join("")}
    <!-- rating label -->
    <rect x="460" y="${top + rows * rowH + 24}" width="${colW * 2 + 80}" height="76" fill="#f7f4e4" stroke="#bdb595"/>
    <text x="478" y="${top + rows * rowH + 50}" font-size="15" font-weight="800" fill="#2a2a2a">${esc(p.brand.toUpperCase())} LOADCENTER</text>
    <text x="478" y="${top + rows * rowH + 72}" font-size="13" fill="#2a2a2a">RATED ${p.busAmps} A · 120/240 V 1Ø 3W · ${p.slots} SPACES</text>
    <text x="478" y="${top + rows * rowH + 90}" font-size="11" fill="#555">MAIN BREAKER ${p.mainAmps} A · SUITABLE FOR USE AS SERVICE EQUIPMENT</text>
    <!-- caption -->
    <rect x="0" y="${height - 70}" width="${PANEL_WIDTH}" height="70" fill="rgba(0,0,0,0.55)"/>
    <text x="40" y="${height - 28}" font-size="22" fill="#fff">${esc(p.caption)}</text>
    <text x="${PANEL_WIDTH - 40}" y="${height - 28}" font-size="14" fill="#ddd" text-anchor="end">Illustration · ${esc(DEMO_NOTE)}</text>
  </svg></body></html>`;
}

/** Fill a panel with generic circuits until `available` spaces are left open. */
export function fillPanel(slots: number, available: number, named: Breaker[]): Breaker[] {
  const generic: Breaker[] = [
    { amps: 15, poles: 1, label: "Bedroom lights" },
    { amps: 20, poles: 1, label: "Kitchen counter" },
    { amps: 20, poles: 1, label: "Kitchen counter 2" },
    { amps: 15, poles: 1, label: "Bath" },
    { amps: 20, poles: 1, label: "Laundry" },
    { amps: 15, poles: 1, label: "Living room" },
    { amps: 15, poles: 1, label: "Hall + stairs" },
    { amps: 20, poles: 1, label: "Basement" },
    { amps: 15, poles: 1, label: "Front bedroom" },
    { amps: 20, poles: 1, label: "Dining" },
    { amps: 15, poles: 1, label: "Exterior lights" },
    { amps: 20, poles: 1, label: "Fridge" },
    { amps: 15, poles: 1, label: "Office" },
    { amps: 20, poles: 1, label: "Garage outlets" },
    { amps: 15, poles: 1, label: "Smoke detectors" },
    { amps: 20, poles: 1, label: "Bath 2" },
    { amps: 15, poles: 1, label: "Back bedroom" },
    { amps: 20, poles: 1, label: "Microwave" },
    { amps: 15, poles: 1, label: "Attic" },
    { amps: 20, poles: 1, label: "Spare outlets" },
  ];
  const target = slots - available;
  const out = [...named];
  let i = 0;
  while (usedSpaces(out) < target) {
    const g = generic[i % generic.length]!;
    out.push(i < generic.length ? g : { ...g, label: `${g.label} (${Math.floor(i / generic.length) + 1})` });
    i += 1;
  }
  if (usedSpaces(out) !== target) throw new Error(`Panel fill overshot: ${usedSpaces(out)} used, wanted ${target}`);
  return out;
}

// ---------------------------------------------------------------------------
// Load calculation worksheet (letter, portrait PDF). The electrician's NEC 2026 120.83
// worksheet: the house as it is, the new circuit, and the worked calculation.
// ---------------------------------------------------------------------------

export interface LoadSheet {
  title: string;
  address: string;
  preparedBy: string;
  license: string;
  date: string;
  service: { voltage: number; existingAmps: number; calculatedOnAmps: number };
  dwelling: { squareFeet: number; smallApplianceCircuits: number; laundryCircuit: boolean };
  /** Existing fixed appliances and heating/cooling that stay in service, with nameplate VA. */
  appliances: { name: string; va: number; heatingOrCooling: boolean }[];
  /** The circuit the job adds. */
  newCircuit: { equipment: string; breakerAmps: number; poles: number; conductor: string | null };
  /** The worked calculation, line by line. */
  steps: { label: string; va: number; citation: string }[];
  totalVA: number;
  totalAmps: number;
  percentOfRating: number;
}

export function loadSheetHtml(s: LoadSheet): string {
  const n = (v: number) => Math.round(v).toLocaleString("en-US");
  const fixed = s.appliances.filter((a) => !a.heatingOrCooling);
  const hvac = s.appliances.filter((a) => a.heatingOrCooling);
  const sum = (list: LoadSheet["appliances"]) => list.reduce((t, a) => t + a.va, 0);
  const rows = (list: LoadSheet["appliances"]) =>
    list.length ? list.map((a) => `<tr><th>${esc(a.name)}</th><td>${n(a.va)} VA</td></tr>`).join("") : `<tr><th>None</th><td>0 VA</td></tr>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { size: letter; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 40px 48px 70px; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: #1d232a; font-size: 10pt; }
    header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1d232a; padding-bottom: 10px; }
    h1 { margin: 0; font-size: 18pt; }
    .sub { color: #56616d; margin-top: 4px; }
    .meta { text-align: right; font-size: 9pt; color: #3b4652; line-height: 1.5; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 32px; margin-top: 16px; }
    section { break-inside: avoid; }
    h3 { margin: 0 0 6px; font-size: 10pt; border-bottom: 1.5px solid #1d232a; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 3.5px 0; border-bottom: 1px solid #e3e6ea; vertical-align: top; font-size: 9.5pt; }
    th { font-weight: 500; color: #3b4652; padding-right: 8px; }
    td { font-weight: 600; text-align: right; white-space: nowrap; }
    tr.total th, tr.total td { font-weight: 700; color: #1d232a; border-bottom: 1.5px solid #1d232a; }
    .calc { margin-top: 16px; }
    .calc td.cite { font-weight: 400; color: #7a848f; font-size: 8.5pt; text-align: left; padding-left: 12px; }
    footer { position: fixed; bottom: 26px; left: 48px; right: 48px; font-size: 8pt; color: #7a848f; display: flex; justify-content: space-between; border-top: 1px solid #e3e6ea; padding-top: 8px; }
  </style></head><body>
    <header>
      <div><h1>Load calculation worksheet</h1><div class="sub">${esc(s.title)} · NEC 2026 120.83, as adopted by 527 CMR 12.00</div></div>
      <div class="meta">${esc(s.address)}<br>Prepared by ${esc(s.preparedBy)}<br>License <span style="white-space:nowrap">${esc(s.license)}</span><br>${esc(s.date)}</div>
    </header>
    <div class="grid">
      <section><h3>Service</h3><table>
        <tr><th>Service voltage</th><td>${s.service.voltage} V</td></tr>
        <tr><th>Existing service rating</th><td>${s.service.existingAmps} A</td></tr>
        <tr><th>Calculated against</th><td>${s.service.calculatedOnAmps} A service</td></tr>
      </table></section>
      <section><h3>Dwelling</h3><table>
        <tr><th>Living area (outside dimensions)</th><td>${n(s.dwelling.squareFeet)} sq ft</td></tr>
        <tr><th>20 A small-appliance circuits</th><td>${s.dwelling.smallApplianceCircuits}</td></tr>
        <tr><th>Laundry circuit</th><td>${s.dwelling.laundryCircuit ? "Yes" : "No"}</td></tr>
      </table></section>
      <section><h3>Existing fixed appliances (nameplate)</h3><table>
        ${rows(fixed)}
        <tr class="total"><th>Total fixed appliances</th><td>${n(sum(fixed))} VA</td></tr>
      </table></section>
      <section><h3>Existing heating and cooling that stays</h3><table>
        ${rows(hvac)}
        <tr class="total"><th>Total existing heating and cooling</th><td>${n(sum(hvac))} VA</td></tr>
      </table></section>
      <section><h3>New circuit</h3><table>
        <tr><th>Equipment</th><td>${esc(s.newCircuit.equipment)}</td></tr>
        <tr><th>Proposed breaker</th><td>${s.newCircuit.breakerAmps} A ${s.newCircuit.poles}P</td></tr>
        <tr><th>Conductor</th><td>${s.newCircuit.conductor ? `${esc(s.newCircuit.conductor)} AWG Cu` : "Existing"}</td></tr>
      </table></section>
      <section><h3>Result</h3><table>
        <tr><th>Total calculated load</th><td>${n(s.totalVA)} VA</td></tr>
        <tr><th>At ${s.service.voltage} V</th><td>${Math.round(s.totalAmps)} A</td></tr>
        <tr class="total"><th>Share of the ${s.service.calculatedOnAmps} A service</th><td>${Math.round(s.percentOfRating)}%</td></tr>
      </table></section>
    </div>
    <section class="calc"><h3>Worked calculation</h3><table>
      ${s.steps.map((st) => `<tr><th>${esc(st.label)}</th><td>${n(st.va)} VA</td><td class="cite">${esc(st.citation)}</td></tr>`).join("")}
    </table></section>
    <footer><span>Load calculation · ${esc(s.address)}</span><span>${DEMO_NOTE}</span></footer>
  </body></html>`;
}
