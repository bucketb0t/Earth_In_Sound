"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import {
  CELL_GEOMETRY,
  CX,
  CY,
  DEFAULT_TRIG_DEG,
  DOT_DIST,
  KNOB_CANVAS,
  KNOB_R,
  KNOB_SVG_W,
  LED_DEG_FROM_TOP,
  LED_ORBT,
  ledToTrig,
  svgPoint,
  toRad,
  type KnobSectionId,
} from "../config";
import { activateOnEnterOrSpace, useNavbarContext } from "../state";
import JackLEDPort from "./JackLEDPort";

export interface KnobCellProps {
  sectionId: KnobSectionId;
  label: string;
  links: readonly string[];
  glow: string;
}

/**
 * Shared rotary knob cell.
 *
 * Jason Walton and I Hate Music use the same interaction model: a knob face,
 * three orbiting LED choices, labels, and a corner jack indicator. The wrapper
 * cells provide section content; this component owns the shared SVG machinery.
 */
export default function KnobCell({
  sectionId,
  label,
  links,
  glow,
}: KnobCellProps) {
  const { activePage, knobNavTo, knobFaceClick } = useNavbarContext();

  const dotRef = useRef<SVGCircleElement>(null);
  const isActive = activePage?.section === sectionId;
  const activeIdx = isActive ? activePage.idx : -1;
  const offsets = CELL_GEOMETRY.knob[sectionId];
  const styleVars = {
    "--glow": glow,
    "--glow-soft": `${glow}66`,
  } as CSSProperties;

  /*
   * The indicator dot moves imperatively because it is a small SVG-only visual
   * detail. React still owns which section/index is active.
   */
  useEffect(() => {
    const dot = dotRef.current;
    if (!dot) return;

    if (isActive) {
      const pt = svgPoint(DOT_DIST, ledToTrig(LED_DEG_FROM_TOP[activeIdx]!));
      dot.setAttribute("cx", String(pt.x));
      dot.setAttribute("cy", String(pt.y));
      dot.setAttribute("fill", "var(--glow)");
      dot.style.filter = "drop-shadow(0 0 4px var(--glow))";
      return;
    }

    const pt = svgPoint(DOT_DIST, DEFAULT_TRIG_DEG);
    dot.setAttribute("cx", String(pt.x));
    dot.setAttribute("cy", String(pt.y));
    dot.setAttribute("fill", "#888");
    dot.style.filter = "none";
  }, [isActive, activeIdx, glow]);

  const ticks = Array.from({ length: 8 }, (_, idx) => {
    const rad = toRad(idx * 45);
    const cosr = Math.cos(rad);
    const sinr = Math.sin(rad);

    return (
      <line
        key={idx}
        x1={CX + (KNOB_R - 4) * cosr}
        y1={CY - (KNOB_R - 4) * sinr}
        x2={CX + (KNOB_R + 1) * cosr}
        y2={CY - (KNOB_R + 1) * sinr}
        stroke="#333"
        strokeWidth="1"
      />
    );
  });

  const positions = LED_DEG_FROM_TOP.map((deg) => {
    const trigDeg = ledToTrig(deg);
    return {
      led: svgPoint(LED_ORBT, trigDeg),
      lbl: svgPoint(LED_ORBT + 16, trigDeg),
    };
  });

  const initDotPt = svgPoint(DOT_DIST, DEFAULT_TRIG_DEG);

  return (
    <div
      className="navbar-cell navbar-cell--start navbar-cell--bordered knob-cell"
      style={styleVars}
    >
      <div className="cell-label">{label}</div>

      <div className="knob-wrap">
        <svg
          viewBox={`0 0 ${KNOB_SVG_W} ${KNOB_CANVAS}`}
          width="100%"
          style={{ display: "block", overflow: "visible" }}
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
            style={{ cursor: "pointer" }}
            tabIndex={0}
            role="button"
            aria-label={`${label} deselect`}
            aria-pressed={isActive}
            onClick={() => knobFaceClick(sectionId)}
            onKeyDown={(event) =>
              activateOnEnterOrSpace(event, () => knobFaceClick(sectionId))
            }
          />

          {ticks}

          <circle
            ref={dotRef}
            cx={initDotPt.x}
            cy={initDotPt.y}
            r={5}
            fill="#888"
            style={{ transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)" }}
            aria-hidden="true"
          />

          <circle cx={CX} cy={CY} r={5} fill="#0a0a0a" aria-hidden="true" />

          {links.map((link, idx) => {
            const on = isActive && idx === activeIdx;
            const ledOff = offsets.led[idx] ?? { x: 0, y: 0 };
            const lblOff = offsets.label[idx] ?? { x: 0, y: 0 };
            const { led, lbl } = positions[idx]!;

            return (
              <g
                key={link}
                onClick={() => knobNavTo(sectionId, idx)}
                onKeyDown={(event) =>
                  activateOnEnterOrSpace(event, () => knobNavTo(sectionId, idx))
                }
                tabIndex={0}
                role="button"
                aria-label={`${label}: ${link}`}
                aria-pressed={on}
                aria-current={on ? "page" : undefined}
                style={{ cursor: "pointer" }}
              >
                <circle
                  cx={led.x + ledOff.x}
                  cy={led.y + ledOff.y}
                  r={5}
                  fill={on ? "var(--glow)" : "#111"}
                  stroke={on ? "var(--glow)" : "#2a2a2a"}
                  style={{
                    filter: on
                      ? "drop-shadow(0 0 4px var(--glow)) drop-shadow(0 0 8px var(--glow-soft))"
                      : "none",
                    transition: "fill 0.25s, stroke 0.25s, filter 0.25s",
                  }}
                />

                <text
                  x={lbl.x + lblOff.x}
                  y={lbl.y + lblOff.y}
                  dominantBaseline="middle"
                  textAnchor="start"
                  fontSize={8}
                  fontFamily="'Courier New', monospace"
                  letterSpacing="0.05em"
                  fill={on ? "var(--glow)" : "#444"}
                  style={{ transition: "fill 0.2s", userSelect: "none" }}
                >
                  {link}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <JackLEDPort active={isActive} />

      <style jsx>{`
        .knob-cell {
          flex: 0.25 1 0;
        }

        .knob-wrap {
          width: 100%;
          max-width: ${KNOB_SVG_W}px;
        }
      `}</style>
    </div>
  );
}
