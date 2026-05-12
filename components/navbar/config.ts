/**
 * Static navbar configuration.
 * Central place for labels, SVG geometry, navbar sizing, and animation frames.
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

/* Knob geometry: visual angles are clockwise from top; SVG math is converted. */
export const LED_DEGREES_FROM_TOP: readonly [number, number, number] = [
  61, 91, 121,
] as const;

// Matches the visible knob SVG box in KnobJackCell.module.css.
export const KNOB_ARTWORK_SIZE = 48;
// The SVG hit circle follows the visible artwork diameter.
export const KNOB_RADIUS = KNOB_ARTWORK_SIZE / 2;
export const LED_ORBIT_RADIUS = 44;
export const KNOB_CANVAS_SIZE = 80;
export const KNOB_SVG_WIDTH = 160;

export const KNOB_CENTER_X = KNOB_CANVAS_SIZE / 2;
export const KNOB_CENTER_Y = KNOB_CANVAS_SIZE / 2;

/* Responsive shell: total height includes the baseline artwork. */
export const DESIGN_HEIGHT = 120;
export const NAVBAR_VISUAL_WIDTH_PERCENT = 100;
// Unscaled visual thickness of BaseLineNavbar.svg.
export const BASE_LINE_HEIGHT = 8;
// The current cell artwork was tuned at this interactive faceplate height.
export const ARTWORK_CELL_SCALE_BASE_HEIGHT = 112;

/* Per-knob SVG nudges; CSS modules own visual sizes and colors. */
export const KNOB_OFFSETS = {
  jw: {
    label: [
      { x: -2, y: 7 },
      { x: -4, y: 1 },
      { x: -2, y: -6 },
    ],
    led: [
      { x: 3, y: -1 },
      { x: 3, y: 0 },
      { x: 3, y: 1 },
    ],
  },
  ihm: {
    label: [
      { x: -2, y: 7 },
      { x: -4, y: 1 },
      { x: -2, y: -6 },
    ],
    led: [
      { x: 3, y: -1 },
      { x: 3, y: 0 },
      { x: 3, y: 1 },
    ],
  },
} as const;

export interface SvgPoint {
  x: number;
  y: number;
}

export function ledAngleToTrigDegrees(degreesFromTop: number): number {
  return 90 - degreesFromTop;
}

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function svgPoint(radius: number, trigDegrees: number): SvgPoint {
  const radians = degreesToRadians(trigDegrees);
  return {
    x: KNOB_CENTER_X + radius * Math.cos(radians),
    y: KNOB_CENTER_Y - radius * Math.sin(radians),
  };
}
