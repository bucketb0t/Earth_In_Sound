/** Navbar destinations, artwork geometry, and responsive sizing. */

export const SECTION_IDS = ["eis", "jw", "ihm"] as const;
export type SectionId = (typeof SECTION_IDS)[number];
export type KnobSectionId = Exclude<SectionId, "eis">;

export interface NavbarSectionLink {
  readonly label: string;
  readonly route: `/${string}`;
}

// Entry order determines physical control stops.
export const NAVBAR_SECTIONS = {
  eis: [
    { label: "Home", route: "/" },
    { label: "About", route: "/about" },
    { label: "Contact", route: "/contact" },
  ],
  jw: [
    { label: "Biography", route: "/jason-walton/biography" },
    { label: "Discography", route: "/jason-walton/discography" },
    { label: "Production", route: "/jason-walton/production" },
  ],
  ihm: [
    { label: "Podcast", route: "/i-hate-music/podcast" },
    { label: "Community", route: "/i-hate-music/community" },
    { label: "Patreon", route: "/i-hate-music/patreon" },
  ],
} as const satisfies Record<SectionId, readonly NavbarSectionLink[]>;

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
