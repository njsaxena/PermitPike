/** "2026-11-21 09:14" in the viewer's time zone, for mono timestamps. */
export function stamp(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function streetLine(a: { street: string; unit: string | null }): string {
  return a.unit ? `${a.street}, Unit ${a.unit}` : a.street;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Date and time parts from "2026-11-21 09:14" (taken as written, so server and browser
 * agree) or from a full ISO string (converted to the viewer's time zone).
 */
function parts(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/.exec(value.trim());
  if (m) {
    return { y: +m[1]!, mo: +m[2]! - 1, d: +m[3]!, h: m[4] ? +m[4] : null, mi: m[5] ? +m[5] : null };
  }
  const t = new Date(value);
  return { y: t.getFullYear(), mo: t.getMonth(), d: t.getDate(), h: t.getHours(), mi: t.getMinutes() };
}

function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${suffix}`;
}

/** "November 21st". Adds the year only when it is not this year: "December 30th, 2025". */
export function longDate(value: string): string {
  const p = parts(value);
  const text = `${MONTHS[p.mo]} ${ordinal(p.d)}`;
  return p.y === new Date().getFullYear() ? text : `${text}, ${p.y}`;
}

/** "9:14 AM", or "" when the value has no time. */
export function clockTime(value: string): string {
  const p = parts(value);
  if (p.h === null || p.mi === null) return "";
  const h12 = p.h % 12 === 0 ? 12 : p.h % 12;
  return `${h12}:${String(p.mi).padStart(2, "0")} ${p.h < 12 ? "AM" : "PM"}`;
}
