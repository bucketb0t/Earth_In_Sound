/**
 * Static navbar configuration.
 * Central place for labels, SVG geometry, navbar sizing, and artwork tuning.
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
  60, 90, 120,
] as const;

// Diameter of the invisible SVG hit circle used for knob click/drag events.
export const KNOB_ARTWORK_SIZE = 48;
export const KNOB_RADIUS = KNOB_ARTWORK_SIZE / 2;
export const LED_ORBIT_RADIUS = 42;
export const KNOB_CANVAS_SIZE = 80;
export const KNOB_SVG_WIDTH = 160;

export const KNOB_CENTER_X = KNOB_CANVAS_SIZE / 2;
export const KNOB_CENTER_Y = KNOB_CANVAS_SIZE / 2;

/* Responsive shell: total height includes the baseline artwork. */
export const DESIGN_HEIGHT = 118;
// Unscaled visual thickness of BaseLineNavbar.svg.
export const BASE_LINE_HEIGHT = 8;
// Reference faceplate height used by artwork scaling.
export const ARTWORK_CELL_SCALE_BASE_HEIGHT = 112;

/* Largest zoom-independent layout width that uses the compact arrangement. */
export const NAVBAR_COMPACT_MAX_WIDTH_PX = 1024;

/*
 * Shared knob/jack tuning.
 * These numbers drive the physical placement of the visible knob art, LEDs,
 * labels, and jack hardware. CSS owns assets/styles; this object owns layout.
 */
export const KNOB_LAYOUT = {
  /*
   * dragStepPx controls how many pointer pixels equal one menu step while
   * dragging a knob vertically.
   */
  dragStepPx: 18,
  /*
   * choiceLightSize is the SVG foreignObject box used for LED artwork.
   */
  choiceLightSize: 11,
  /*
   * labelOrbitGap pushes text labels farther from the knob center than LEDs.
   */
  labelOrbitGap: 16,
  module: {
    maxWidth: 160,
    offset: { x: -2, y: 10 },
  },
  artwork: {
    /*
     * These values place and animate the visible knob SVG inside the invisible
     * SVG hit target used for pointer/keyboard interaction.
     */
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
    /*
     * Jack values place the socket and cable relative to the knob cell. Socket
     * and plug sizes are separate because their artwork proportions differ.
     */
    socketWidth: 16,
    plugWidth: 22,
    plugHeight: 48,
    anchor: { top: 25, right: 25 },
    plugTipCorrection: { x: "18%", y: "-19%" },
  },
} as const;

/*
 * Shared knob SVG nudges.
 * JWW and IHM intentionally read the same object so LEDs and labels stay on
 * matching lines whenever these values are tuned.
 */
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

/**
 * Converts designer-friendly clock angles into SVG math angles.
 */
export function ledAngleToTrigDegrees(degreesFromTop: number): number {
  return 90 - degreesFromTop;
}

/**
 * Converts degrees into radians for Math.sin/cos.
 */
export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Converts polar knob coordinates into SVG x/y coordinates.
 */
export function svgPoint(radius: number, trigDegrees: number): SvgPoint {
  const radians = degreesToRadians(trigDegrees);
  return {
    x: KNOB_CENTER_X + radius * Math.cos(radians),
    y: KNOB_CENTER_Y - radius * Math.sin(radians),
  };
}
