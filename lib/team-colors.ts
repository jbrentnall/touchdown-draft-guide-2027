/**
 * Team colours keyed by school name (uppercased). Add a school here each
 * season by copying a row and filling in [primary, secondary] hex.
 *
 * These are the prototype's starter values -- Jack's own placeholders to
 * refine, not verified brand hex codes. Treat them as approximate.
 *
 * `school` is a controlled value: it must resolve to a key here (directly,
 * or via SCHOOL_ALIASES below) for team theming and board filtering to
 * work. The sync scripts (build-dev-data.mjs, sync-sheet.mjs) warn loudly
 * about any school that doesn't resolve.
 */
export const TEAM_COLORS: Record<string, [primary: string, secondary: string]> = {
  "TEXAS A&M": ["#500000", "#ffffff"],
  CLEMSON: ["#F56600", "#522D80"],
  INDIANA: ["#990000", "#EEEDEB"],
  LSU: ["#461D7C", "#FDD023"],
  ALABAMA: ["#9E1B32", "#ffffff"],
  OREGON: ["#154733", "#FEE123"],
  USC: ["#990000", "#FFC72C"],
  "OHIO STATE": ["#BB0000", "#666666"],
  "PENN STATE": ["#041E42", "#ffffff"],
  MIAMI: ["#005030", "#F47321"],
  TEXAS: ["#BF5700", "#ffffff"],
  CINCINNATI: ["#E00122", "#000000"],
  TENNESSEE: ["#FF8200", "#58595B"],
  GEORGIA: ["#BA0C2F", "#000000"],
  IOWA: ["#000000", "#FFCD00"],
  "TEXAS TECH": ["#CC0000", "#000000"],
  ARKANSAS: ["#9D2235", "#ffffff"],
  "NORTH DAKOTA STATE": ["#00593C", "#FFC72C"],
  WASHINGTON: ["#4B2E83", "#B7A57A"],
  OKLAHOMA: ["#841617", "#FDF9D8"],
  "BOSTON COLLEGE": ["#98002E", "#BC9B6A"],
  TCU: ["#4D1979", "#A3A9AC"],
  "OLE MISS": ["#14213D", "#CE1126"],
  UTAH: ["#CC0000", "#000000"],
  MICHIGAN: ["#00274C", "#FFCB05"],
  "NOTRE DAME": ["#0C2340", "#C99700"],
  "ARIZONA STATE": ["#8C1D40", "#FFC627"],
  AUBURN: ["#0C2340", "#DD550C"],
  FLORIDA: ["#0021A5", "#FA4616"],
  SMU: ["#354CA1", "#C8102E"],
  ILLINOIS: ["#13294B", "#E84A27"],
  VANDERBILT: ["#000000", "#866D4B"],
  BAYLOR: ["#154734", "#FFB81C"],
  "NC STATE": ["#CC0000", "#000000"],
  "KANSAS STATE": ["#512888", "#ffffff"],
  DUKE: ["#00539B", "#ffffff"],
  "SOUTH CAROLINA": ["#73000A", "#000000"],
  MISSOURI: ["#000000", "#F1B82D"],
  ARIZONA: ["#0C234B", "#AB0520"],
  KANSAS: ["#0051BA", "#E8000D"],
  UCONN: ["#000E2F", "#ffffff"],
  LOUISVILLE: ["#AD0000", "#000000"],
  "MISSISSIPPI STATE": ["#660000", "#ffffff"],
  "WAKE FOREST": ["#000000", "#9E7E38"],
  UTSA: ["#0C2340", "#F15A22"],
  NEBRASKA: ["#E41C38", "#ffffff"],
  KENTUCKY: ["#0033A0", "#ffffff"],
  "FLORIDA INTERNATIONAL": ["#081E3F", "#B6862C"],
  PITT: ["#003594", "#FFB81C"],
  VIRGINIA: ["#232D4B", "#E57200"],
  "GEORGIA STATE": ["#0039A6", "#C60C30"],
  "GEORGIA TECH": ["#003057", "#B3A369"],
  HOUSTON: ["#C8102E", "#ffffff"],
  WISCONSIN: ["#C5050C", "#ffffff"],
  STANFORD: ["#8C1515", "#ffffff"],
  "BOISE STATE": ["#0033A0", "#D64309"],
  NORTHWESTERN: ["#4E2A84", "#ffffff"],
  "MICHIGAN STATE": ["#18453B", "#ffffff"],
  "FLORIDA STATE": ["#782F40", "#CEB888"],
  "IOWA STATE": ["#C8102E", "#F1BE48"],
  "SOUTHEASTERN LOUISIANA": ["#046A38", "#ffffff"],
  NAVY: ["#00205B", "#C5B783"],
  UCF: ["#000000", "#BA9B37"],
  "WESTERN MICHIGAN": ["#6C4023", "#B5A167"],
  COLORADO: ["#000000", "#CFB87C"],
  "SAN DIEGO STATE": ["#A6192E", "#000000"],
  CALIFORNIA: ["#003262", "#FDB515"],
  MARYLAND: ["#E03A3E", "#FFD520"],
  TOLEDO: ["#15397F", "#FFD200"],

  // Added for the 2027 class (schools not in last year's 2026 board):
  MINNESOTA: ["#7A0019", "#FFCC33"],
  "OKLAHOMA STATE": ["#FF7300", "#000000"],
  UCLA: ["#2D68C4", "#F2A900"],
  "YOUNGSTOWN STATE": ["#CC0000", "#ffffff"],
  "IDAHO STATE": ["#F1592A", "#000000"],
  "NORTHERN ARIZONA": ["#003876", "#F1B300"],
  RUTGERS: ["#CC0033", "#000000"],
  BYU: ["#002E5D", "#ffffff"],
  "WEST VIRGINIA": ["#002855", "#EAAA00"],
  LIBERTY: ["#CC092F", "#002855"],
  MONTANA: ["#7C2529", "#C0C0C0"],
  "ILLINOIS STATE": ["#CE0F3D", "#ffffff"],
  "COLORADO STATE": ["#1E4D2B", "#C8C372"],
  "NORTH TEXAS": ["#00853E", "#ffffff"],
  "TEXAS STATE": ["#501214", "#FFC72C"],
  "WESTERN KENTUCKY": ["#C60C30", "#ffffff"],
  USF: ["#006747", "#CFC493"],
  "RHODE ISLAND": ["#002147", "#8FBBDA"],
  "FRESNO STATE": ["#DB0032", "#003594"],
  "NORTHERN ILLINOIS": ["#C8102E", "#000000"],
  TEMPLE: ["#9D2235", "#ffffff"],
  "VIRGINIA TECH": ["#630031", "#CF4420"],
  "LOUISIANA TECH": ["#C41230", "#041E42"],
  "OREGON STATE": ["#DC4405", "#000000"],
  SYRACUSE: ["#D44500", "#000E54"],
  "CENTRAL ARKANSAS": ["#4B116F", "#A7A9AC"],
  "NORTH CAROLINA": ["#7BAFD4", "#ffffff"],
  MEMPHIS: ["#003087", "#898D8D"],
  TROY: ["#8B2332", "#A2AAAD"],
  "NORTH DAKOTA": ["#009A44", "#ffffff"],
  "NEW MEXICO": ["#BA0C2F", "#A7A8AA"],
  TULANE: ["#00693E", "#418FDE"],
  YALE: ["#00356B", "#ffffff"],
  BUFFALO: ["#005BBB", "#041C2C"],
};

/**
 * Short/alternate names that should resolve to a TEAM_COLORS key instead
 * of tripping the "unknown school" warning. Add entries here as they turn
 * up rather than duplicating colour rows.
 *
 * Keep in sync with the duplicate copy in scripts/build-dev-data.mjs
 * (that plain-Node script can't import this .ts file directly).
 */
export const SCHOOL_ALIASES: Record<string, string> = {
  CAL: "CALIFORNIA",
  PITTSBURGH: "PITT",
};

export function resolveSchoolKey(school: string): string {
  const key = school.trim().toUpperCase();
  return SCHOOL_ALIASES[key] ?? key;
}

export function hasTeamColors(school: string): boolean {
  return resolveSchoolKey(school) in TEAM_COLORS;
}

function relativeLuminance(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export interface TeamTheme {
  /** Thin stripe colour for board rows -- always the primary colour. */
  stripe: string;
  /** Profile header fill -- primary, unless too light, then secondary. */
  fill: string;
  /** Header text colour chosen for contrast against `fill`. */
  text: string;
}

/**
 * Ported 1:1 from the prototype's teamOf(): prefer the primary colour for
 * the header fill; if it's too light for white text (luminance > 0.55)
 * and the secondary colour is darker, fall back to the secondary. Then
 * pick black or white text by the luminance of whichever fill won.
 */
export function getTeamTheme(school: string): TeamTheme | null {
  const pair = TEAM_COLORS[resolveSchoolKey(school)];
  if (!pair) return null;
  const [primary, secondary] = pair;
  let fill = primary;
  if (relativeLuminance(primary) > 0.55 && relativeLuminance(secondary) < relativeLuminance(primary)) {
    fill = secondary;
  }
  const text = relativeLuminance(fill) > 0.5 ? "#0d1b2a" : "#ffffff";
  return { stripe: primary, fill, text };
}
