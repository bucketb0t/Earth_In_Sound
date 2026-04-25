/**
 * navbarConfig.ts
 * ─────────────────────────────────────────────────────────────────
 * Central configuration for the Earth In Sound navbar.
 *
 * All link labels, glow colours, knob geometry constants, and
 * section metadata live here so they can be imported by any
 * component without prop-drilling.
 * ─────────────────────────────────────────────────────────────────
 */

// ── Section identifiers ──────────────────────────────────────────

export type SectionId = 'eis' | 'ihm' | 'jw';

// ── Section navigation links ─────────────────────────────────────

/** EIS vertical slider: ordered top → bottom (positions 0, 1, 2). */
export const EIS_LINKS: readonly string[] = ['Home', 'About', 'Contact'] as const;

/** I Hate Music knob LEDs at 45° / 90° / 135° from top (right side). */
export const IHM_LINKS: readonly string[] = ['Episodes', 'Community', 'Patreon'] as const;

/** Jason Walton knob LEDs at 45° / 90° / 135° from top (right side). */
export const JW_LINKS: readonly string[] = ['Biography', 'Discography', 'Productions'] as const;

/**
 * Angular positions (degrees clockwise from top) for the three
 * LEDs on each knob section. Always on the right-hand arc.
 */
export const LED_DEG_FROM_TOP: readonly [number, number, number] = [45, 90, 135] as const;

// ── Section metadata ─────────────────────────────────────────────

/** Human-readable section names used in the status bar. */
export const SECTION_LABELS: Record<SectionId, string> = {
  eis: 'Earth In Sound',
  ihm: 'I Hate Music',
  jw: 'Jason Walton',
};

/**
 * CSS colour strings for each section's glow / LED / jack colour.
 *   eis → green   (#22c55e)
 *   ihm → red     (#ef4444)
 *   jw  → blue    (#3b82f6)
 */
export const SECTION_GLOWS: Record<SectionId, string> = {
  eis: '#22c55e',
  ihm: '#ef4444',
  jw: '#3b82f6',
};

// ── Knob SVG geometry ────────────────────────────────────────────

/** Radius of the knob face circle (px). */
export const KNOB_R = 24;

/** Distance from knob centre to each LED's centre (px). */
export const LED_ORBT = 40;

/** Distance from knob centre to the animated indicator dot (px). */
export const DOT_DIST = 14;

/**
 * Total canvas size for the knob SVG.
 * Adds 20 px of margin so LEDs and labels that orbit outside the
 * knob edge are not clipped.
 */
export const KNOB_CANVAS = LED_ORBT * 2 + 20;

/** SVG canvas centre point (same for x and y). */
export const CX = KNOB_CANVAS / 2;
export const CY = KNOB_CANVAS / 2;

/**
 * Default indicator dot angle in standard-trig degrees (0 = right,
 * 90 = up). "Up" means the indicator rests at the top of the knob
 * when no LED is active.
 */
export const DEFAULT_TRIG_DEG = 90;

// ── Geometry helpers (pure functions, safe to import anywhere) ───

/**
 * Convert clockwise-from-top degrees to standard trig degrees.
 *
 * Clockwise-from-top: 0 = up, 90 = right, 180 = down, 270 = left.
 * Standard trig:      0 = right, 90 = up, 180 = left, 270 = down.
 */
export function ledToTrig(degFromTop: number): number {
  return 90 - degFromTop;
}

/** Convert degrees to radians. */
export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** X/Y coordinate on the SVG canvas. */
export interface SvgPoint {
  x: number;
  y: number;
}

/**
 * Compute an (x, y) point on the knob canvas at distance r from
 * the canvas centre, at a standard-trig angle.
 *
 * SVG y-axis points downward, so sin is negated.
 */
export function svgPoint(r: number, trigDeg: number): SvgPoint {
  const rad = toRad(trigDeg);
  return {
    x: CX + r * Math.cos(rad),
    y: CY - r * Math.sin(rad), // subtract: SVG y is flipped
  };
}

// ── Merch animation frames ───────────────────────────────────────

/**
 * Frame sequence played when the Merch button is pressed.
 * Block characters scramble before resolving to "MERCH".
 */
export const MERCH_FRAMES: readonly string[] = [
  '██', '▓▓', '▒▒', '░░', 'ME', 'RC', 'HH', '  ', 'MERCH',
] as const;

/** Interval between merch animation frames (ms). */
export const MERCH_FRAME_INTERVAL = 110;
