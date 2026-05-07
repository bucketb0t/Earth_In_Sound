/**
 * Static navbar configuration.
 * Central place for labels, colors, geometry, sizing, and animation frames.
 */

// State keys used by the EIS slider and shared knob sections.
export type SectionId = "eis" | "ihm" | "jw";
export type KnobSectionId = Exclude<SectionId, "eis">;

// Link order is positional: index 0 means the first physical control stop.
export const EIS_LINKS = ["Home", "About", "Contact"] as const;
export const JW_LINKS = ["Biography", "Discography", "Production"] as const;
export const IHM_LINKS = ["Podcast", "Community", "Patreon"] as const;

export const SECTION_LINKS: Record<SectionId, readonly string[]> = {
  eis: EIS_LINKS,
  jw: JW_LINKS,
  ihm: IHM_LINKS,
};

export const SECTION_LABELS: Record<SectionId, string> = {
  eis: "Earth In Sound",
  jw: "Jason Walton",
  ihm: "I Hate Music",
};

export const SECTION_GLOWS: Record<SectionId, string> = {
  eis: "#22c55e",
  jw: "#4daaff",
  ihm: "#ff4d4d",
};

/* Knob geometry: visual angles are clockwise from top; SVG math is converted. */
export const LED_DEG_FROM_TOP: readonly [number, number, number] = [
  45, 90, 135,
] as const;

export const KNOB_R = 18;
export const LED_ORBIT = 30;
export const DOT_DIST = 10.5;
export const KNOB_CANVAS = 80;
export const KNOB_SVG_W = 160;

export const CX = KNOB_CANVAS / 2;
export const CY = KNOB_CANVAS / 2;
export const DEFAULT_TRIG_DEG = 90;

/* Responsive shell: total height includes the baseline artwork. */
export const DESIGN_WIDTH = 1200;
export const DESIGN_HEIGHT = 120;
export const NAVBAR_VISUAL_WIDTH_PERCENT = 100;
// Unscaled visual thickness of BaseLineNavbar.svg.
export const BASE_LINE_HEIGHT = 8;

/* Fixed per-cell geometry; tune here before moving values into artwork later. */
export const CELL_GEOMETRY = {
  knob: {
    jw: {
      label: [
        { x: 3, y: 9 },
        { x: -3, y: 0 },
        { x: 3, y: -9 },
      ],
      led: [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ],
    },
    ihm: {
      label: [
        { x: 3, y: 9 },
        { x: -3, y: 0 },
        { x: 3, y: -9 },
      ],
      led: [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ],
    },
  },
  eis: {
    logoCellWidth: 180,
    logoWidth: 110,
    trackWidth: 8,
    thumbSize: 12,
    rowGap: 6,
  },
  account: {
    toggleGap: 5,
    displayMarginTop: 6,
    displayMaxWidth: 80,
  },
  cart: {
    btnSize: 46,
    wrapGap: 4,
  },
  store: {
    paddingX: 10,
    paddingY: 5,
  },
} as const;

export interface SvgPoint {
  x: number;
  y: number;
}

export function ledToTrig(degFromTop: number): number {
  return 90 - degFromTop;
}

export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function svgPoint(r: number, trigDeg: number): SvgPoint {
  const rad = toRad(trigDeg);
  return {
    x: CX + r * Math.cos(rad),
    y: CY - r * Math.sin(rad),
  };
}

/* Store scramble frames; ASCII avoids encoding surprises in source control. */
export const STORE_FRAMES: readonly string[] = [
  "##",
  "**",
  "//",
  "--",
  "S",
  "T",
  "O",
  "R",
  "E",
  "STORE",
] as const;

export const STORE_FRAME_INTERVAL = 110;
