'use client';

/**
 * KnobCell.tsx
 * ─────────────────────────────────────────────────────────────────
 * Reusable knob section cell — used for both "I Hate Music" (IHM)
 * and "Jason Walton" (JW).
 *
 * Behaviour:
 *   · Draws an SVG knob face with tick marks and an animated
 *     indicator dot.
 *   · Three LEDs orbit the knob at 45°, 90°, 135° (right side).
 *   · Clicking a LED activates the section and rotates the indicator
 *     dot to point at that LED.
 *   · Clicking the knob face deactivates this section; the dot
 *     returns to the default top position.
 *   · When another section becomes active, the dot resets and LEDs
 *     go dark automatically (driven by activePage context).
 * ─────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavbarContext } from '../../lib/NavbarContext';
import {
  KNOB_R,
  LED_ORBT,
  DOT_DIST,
  KNOB_CANVAS,
  CX,
  CY,
  DEFAULT_TRIG_DEG,
  LED_DEG_FROM_TOP,
  ledToTrig,
  svgPoint,
  toRad,
  type SectionId,
} from '../../lib/navbarConfig';
import JackPort from './JackPort';

interface KnobCellProps {
  /** Unique section identifier — must match a SectionId key. */
  sectionId: SectionId;
  /** Human-readable label shown above the knob. */
  label: string;
  /** Exactly 3 link names for the LED labels. */
  links: readonly string[];
  /** CSS colour string for this section's glow/LED colour. */
  glow: string;
}

export default function KnobCell({ sectionId, label, links, glow }: KnobCellProps) {
  const { activePage, knobNavTo, knobFaceClick } = useNavbarContext();

  const isActive = activePage?.section === sectionId;
  const activeIdx = isActive ? activePage.idx : -1;

  /** Ref to the SVG indicator dot — direct DOM mutations for smooth CSS transitions. */
  const dotRef = useRef<SVGCircleElement>(null);

  // ── Animate indicator dot whenever activePage changes ─────────

  useEffect(() => {
    const dot = dotRef.current;
    if (!dot) return;

    if (isActive) {
      const trigDeg = ledToTrig(LED_DEG_FROM_TOP[activeIdx]!);
      const pt = svgPoint(DOT_DIST, trigDeg);
      dot.setAttribute('cx', String(pt.x));
      dot.setAttribute('cy', String(pt.y));
      dot.setAttribute('fill', glow);
      dot.style.filter = `drop-shadow(0 0 4px ${glow})`;
    } else {
      const pt = svgPoint(DOT_DIST, DEFAULT_TRIG_DEG);
      dot.setAttribute('cx', String(pt.x));
      dot.setAttribute('cy', String(pt.y));
      dot.setAttribute('fill', '#888');
      dot.style.filter = 'none';
    }
  }, [isActive, activeIdx, glow]);

  // ── Tick marks ────────────────────────────────────────────────

  const ticks = Array.from({ length: 8 }, (_, i) => {
    const rad = toRad(i * 45);
    const cosr = Math.cos(rad);
    const sinr = Math.sin(rad);
    return (
      <line
        key={i}
        x1={CX + (KNOB_R - 4) * cosr}
        y1={CY - (KNOB_R - 4) * sinr}
        x2={CX + (KNOB_R + 1) * cosr}
        y2={CY - (KNOB_R + 1) * sinr}
        stroke="#333"
        strokeWidth="1"
      />
    );
  });

  // ── LED position data ─────────────────────────────────────────

  const ledPositions = LED_DEG_FROM_TOP.map((deg) => {
    const trigDeg = ledToTrig(deg);
    const ledPos = svgPoint(LED_ORBT, trigDeg);
    const lblPos = svgPoint(LED_ORBT + 16, trigDeg);
    return {
      ledPos: { x: Math.round(ledPos.x * 1000) / 1000, y: Math.round(ledPos.y * 1000) / 1000 },
      lblPos: { x: Math.round(lblPos.x * 1000) / 1000, y: Math.round(lblPos.y * 1000) / 1000 },
    };
  });

  // ── Initial indicator dot ─────────────────────────────────────

  const initDotPt = svgPoint(DOT_DIST, DEFAULT_TRIG_DEG);

  return (
    <div className="cell">
      <div className="cell-label">{label}</div>

      <div className="knob-wrap">
        {/* SVG: knob face, ticks, indicator dot */}
        <svg
          width={KNOB_CANVAS}
          height={KNOB_CANVAS}
          viewBox={`0 0 ${KNOB_CANVAS} ${KNOB_CANVAS}`}
          style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id={`kg-${sectionId}`} cx="40%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#5a5a5a" />
              <stop offset="100%" stopColor="#1a1a1a" />
            </radialGradient>
          </defs>

          <circle cx={CX} cy={CY} r={KNOB_R + 3} fill="#111" />

          <circle
            cx={CX}
            cy={CY}
            r={KNOB_R}
            fill={`url(#kg-${sectionId})`}
            stroke="#333"
            strokeWidth="1"
            style={{ cursor: 'pointer' }}
            onClick={() => knobFaceClick(sectionId)}
          />

          {ticks}

          <circle
            ref={dotRef}
            cx={initDotPt.x}
            cy={initDotPt.y}
            r={5}
            fill="#888"
            style={{ transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)' }}
          />

          <circle cx={CX} cy={CY} r={5} fill="#0a0a0a" />
        </svg>

        {/* LED divs + labels overlaid on SVG */}
        {links.map((link, i) => {
          const on = isActive && i === activeIdx;
          const { ledPos, lblPos } = ledPositions[i]!;

          return (
            <span key={link}>
              <div
                className={`led ${on ? 'on' : ''}`}
                id={`led-${sectionId}-${i}`}
                style={{
                  position: 'absolute',
                  left: Math.round((ledPos.x - 5) * 100) / 100,
                  top: Math.round((ledPos.y - 5) * 100) / 100,
                }}
                onClick={() => knobNavTo(sectionId, i)}
                role="button"
                tabIndex={0}
                onKeyDown={(e: KeyboardEvent<HTMLDivElement>) =>
                  e.key === 'Enter' && knobNavTo(sectionId, i)
                }
                aria-label={`${label}: ${link}`}
              />

              <span
                className={`link-label ${on ? 'on' : ''}`}
                id={`lbl-${sectionId}-${i}`}
                style={{
                  position: 'absolute',
                  left: Math.round(lblPos.x * 100) / 100,
                  top: Math.round((lblPos.y - 5) * 100) / 100,
                  transform: 'translateY(-50%)',
                }}
                onClick={() => knobNavTo(sectionId, i)}
              >
                {link}
              </span>
            </span>
          );
        })}
      </div>

      <JackPort active={isActive} glow={glow} />

      <style jsx>{`
        .cell {
          flex: 1 1 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 10px 8px;
          position: relative;
          min-width: 0;
          border-left: 1px solid #2a2a2a;
        }

        .cell-label {
          font-size: 8px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #555;
          margin-bottom: 6px;
          text-align: center;
          white-space: nowrap;
        }

        .knob-wrap {
          position: relative;
          width: ${KNOB_CANVAS}px;
          height: ${KNOB_CANVAS}px;
        }

        .led {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #111;
          border: 1px solid #2a2a2a;
          flex-shrink: 0;
          transition: background 0.25s, border-color 0.25s, box-shadow 0.25s;
          cursor: pointer;
        }
        .led.on {
          background: ${glow};
          border-color: ${glow};
          box-shadow: 0 0 6px ${glow}, 0 0 12px ${glow}66;
        }

        .link-label {
          font-size: 9px;
          letter-spacing: 0.05em;
          color: #444;
          transition: color 0.2s;
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
        }
        .link-label.on {
          color: ${glow};
        }
      `}</style>
    </div>
  );
}
