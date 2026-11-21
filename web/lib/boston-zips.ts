/**
 * Boston ZIP code -> neighborhood, so the filing form doesn't have to ask for it.
 * A ZIP can span two neighborhoods; this is the main one, for display only.
 * The parcel lookup's neighborhood wins when there is one.
 */
const ZIP_NEIGHBORHOOD: Record<string, string> = {
  "02108": "Beacon Hill",
  "02109": "Downtown",
  "02110": "Downtown",
  "02111": "Chinatown",
  "02113": "North End",
  "02114": "West End",
  "02115": "Fenway",
  "02116": "Back Bay",
  "02118": "South End",
  "02119": "Roxbury",
  "02120": "Mission Hill",
  "02121": "Dorchester",
  "02122": "Dorchester",
  "02124": "Dorchester",
  "02125": "Dorchester",
  "02126": "Mattapan",
  "02127": "South Boston",
  "02128": "East Boston",
  "02129": "Charlestown",
  "02130": "Jamaica Plain",
  "02131": "Roslindale",
  "02132": "West Roxbury",
  "02134": "Allston",
  "02135": "Brighton",
  "02136": "Hyde Park",
  "02163": "Allston",
  "02199": "Back Bay",
  "02203": "Downtown",
  "02210": "South Boston",
  "02215": "Fenway",
};

export function neighborhoodForZip(zip: string): string | null {
  return ZIP_NEIGHBORHOOD[zip.trim()] ?? null;
}
