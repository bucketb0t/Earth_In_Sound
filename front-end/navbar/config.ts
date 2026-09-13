/** Navbar labels, artwork geometry, and responsive sizing. */

export type SectionId = "eis" | "ihm" | "jw";
export type KnobSectionId = Exclude<SectionId, "eis">;

// Link order determines physical control stops.
export const EIS_LINKS = ["Home", "About", "Contact"] as const;
export const JW_LINKS = ["Biography", "Discography", "Production"] as const;
export const IHM_LINKS = ["Podcast", "Community", "Patreon"] as const;

export const SECTION_LINKS: Record<SectionId, readonly string[]> = {
  eis: EIS_LINKS,
  jw: JW_LINKS,
  ihm: IHM_LINKS,
};

/* Angles run clockwise from the top; convert them for SVG trigonometry. */
export const LED_DEGREES_FROM_TOP: readonly [number, number, number] = [
  60, 90, 120,
] as const;

// Pointer hit-circle diameter in SVG units.
export const KNOB_ARTWORK_SIZE = 48;
export const KNOB_RADIUS = KNOB_ARTWORK_SIZE / 2;
export const LED_ORBIT_RADIUS = 42;
export const KNOB_CANVAS_SIZE = 80;
export const KNOB_SVG_WIDTH = 160;

export const KNOB_CENTER_X = KNOB_CANVAS_SIZE / 2;
export const KNOB_CENTER_Y = KNOB_CANVAS_SIZE / 2;

/* Navbar height includes the baseline. */
export const DESIGN_HEIGHT = 118;
export const BASE_LINE_HEIGHT = 8;
// Reference faceplate height for artwork scaling.
export const ARTWORK_CELL_SCALE_BASE_HEIGHT = 112;

/* Maximum zoom-independent width for compact layout. */
export const NAVBAR_COMPACT_MAX_WIDTH_PX = 1024;

export const KNOB_LAYOUT = {
  /* Vertical pointer distance per knob stop. */
  dragStepPx: 18,
  /* LED artwork box size in SVG units. */
  choiceLightSize: 11,
  /* Radial gap between LEDs and labels. */
  labelOrbitGap: 16,
  module: {
    maxWidth: 160,
    offset: { x: -2, y: 10 },
  },
  artwork: {
    /* Visible knob placement and press animation within its hit circle. */
    size: 52.5,
    leftPercent: 23,
    topPercent: 52,
    pressedScale: 0.92,
    rotation: {
      idle: 0,
      top: 60,
      middle: 90,
      bottom: 120,
    },
  },
  jack: {
    /* Socket and cable share an anchor; their artwork sizes remain independent. */
    socketWidth: 16,
    plugWidth: 22,
    plugHeight: 48,
    anchor: { top: 25, right: 25 },
    plugTipCorrection: { x: "18%", y: "-19%" },
  },
} as const;

/* Shared SVG nudges keep JWW and IHM LEDs and labels aligned. */
const SHARED_KNOB_OFFSETS = {
  label: [
    { x: 2, y: 7.5 },
    { x: 0, y: 3 },
    { x: 2, y: -1.5 },
  ],
  led: [
    { x: 3, y: -1 },
    { x: 3, y: 2 },
    { x: 3, y: 5 },
  ],
} as const;

export const KNOB_OFFSETS: Record<KnobSectionId, typeof SHARED_KNOB_OFFSETS> = {
  jw: SHARED_KNOB_OFFSETS,
  ihm: SHARED_KNOB_OFFSETS,
};

export interface SvgPoint {
  x: number;
  y: number;
}

/** Convert clockwise clock angles to SVG angles. */
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
