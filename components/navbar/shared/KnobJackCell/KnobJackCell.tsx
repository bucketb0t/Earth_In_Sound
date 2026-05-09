"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  DEFAULT_INDICATOR_TRIG_DEGREES,
  INDICATOR_DOT_DISTANCE,
  KNOB_CANVAS_SIZE,
  KNOB_CENTER_X,
  KNOB_CENTER_Y,
  KNOB_OFFSETS,
  KNOB_RADIUS,
  KNOB_SVG_WIDTH,
  LED_DEGREES_FROM_TOP,
  LED_ORBIT_RADIUS,
  degreesToRadians,
  ledAngleToTrigDegrees,
  svgPoint,
  type KnobSectionId,
} from "../../config";
import { activateOnEnterOrSpace, useNavbarContext } from "../../state";
import styles from "./KnobJackCell.module.css";

export interface KnobJackCellProps {
  sectionId: KnobSectionId;
  label: string;
  links: readonly string[];
  className?: string;
}

/**
 * Shared rotary knob cell with integrated jack port overlay.
 * Renders knob face, LED choices, labels, indicator dot, and corner jack.
 */
export default function KnobJackCell({
  sectionId,
  label,
  links,
  className = "",
}: KnobJackCellProps) {
  const { activePage, knobNavTo, knobFaceClick } = useNavbarContext();

  const dotRef = useRef<SVGCircleElement>(null);
  const isActive = activePage?.section === sectionId;
  const activeLinkIndex = isActive ? activePage.linkIndex : -1;
  const sectionOffsets = KNOB_OFFSETS[sectionId];

  /* Move the small SVG indicator dot when this knob becomes active/inactive. */
  useEffect(() => {
    const indicatorDot = dotRef.current;
    if (!indicatorDot) return;

    if (isActive) {
      const activeDotPoint = svgPoint(
        INDICATOR_DOT_DISTANCE,
        ledAngleToTrigDegrees(LED_DEGREES_FROM_TOP[activeLinkIndex]!),
      );
      indicatorDot.setAttribute("cx", String(activeDotPoint.x));
      indicatorDot.setAttribute("cy", String(activeDotPoint.y));
      return;
    }

    const idleDotPoint = svgPoint(
      INDICATOR_DOT_DISTANCE,
      DEFAULT_INDICATOR_TRIG_DEGREES,
    );
    indicatorDot.setAttribute("cx", String(idleDotPoint.x));
    indicatorDot.setAttribute("cy", String(idleDotPoint.y));
  }, [isActive, activeLinkIndex]);

  /* Static tick marks around the knob face. */
  const tickMarks = useMemo(
    () =>
      Array.from({ length: 8 }, (_, tickIndex) => {
        const angleRadians = degreesToRadians(tickIndex * 45);
        const cosine = Math.cos(angleRadians);
        const sine = Math.sin(angleRadians);

        return (
          <line
            key={tickIndex}
            className={styles.tick}
            x1={KNOB_CENTER_X + (KNOB_RADIUS - 4) * cosine}
            y1={KNOB_CENTER_Y - (KNOB_RADIUS - 4) * sine}
            x2={KNOB_CENTER_X + (KNOB_RADIUS + 1) * cosine}
            y2={KNOB_CENTER_Y - (KNOB_RADIUS + 1) * sine}
          />
        );
      }),
    [],
  );

  /* Static LED/label positions; config offsets nudge the final artwork. */
  const choicePositions = useMemo(
    () =>
      LED_DEGREES_FROM_TOP.map((degreesFromTop) => {
        const trigDegrees = ledAngleToTrigDegrees(degreesFromTop);
        return {
          led: svgPoint(LED_ORBIT_RADIUS, trigDegrees),
          labelPoint: svgPoint(LED_ORBIT_RADIUS + 16, trigDegrees),
        };
      }),
    [],
  );

  const initialDotPoint = svgPoint(
    INDICATOR_DOT_DISTANCE,
    DEFAULT_INDICATOR_TRIG_DEGREES,
  );

  return (
    <div
      className={`navbar-cell navbar-cell--start ${styles.knobCell} ${className}`}
    >
      <div className="cell-label">{label}</div>

      <div className={styles.knobWrap}>
        {/* One SVG keeps knob, LEDs, labels, and active dot scaling together. */}
        <svg
          className={styles.knobSvg}
          viewBox={`0 0 ${KNOB_SVG_WIDTH} ${KNOB_CANVAS_SIZE}`}
          width="100%"
        >
          <defs>
            {/* Unique gradient id avoids collisions between knob instances. */}
            <radialGradient id={`kg-${sectionId}`} cx="40%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#5a5a5a" />
              <stop offset="100%" stopColor="#1a1a1a" />
            </radialGradient>
          </defs>

          <circle
            className={styles.shadowRing}
            cx={KNOB_CENTER_X}
            cy={KNOB_CENTER_Y}
            r={KNOB_RADIUS + 3}
          />

          {/* Knob face: clicking it clears this section's active state. */}
          <circle
            className={styles.knobFace}
            cx={KNOB_CENTER_X}
            cy={KNOB_CENTER_Y}
            r={KNOB_RADIUS}
            fill={`url(#kg-${sectionId})`}
            tabIndex={0}
            role="button"
            aria-label={`${label} deselect`}
            aria-pressed={isActive}
            onClick={() => knobFaceClick(sectionId)}
            onKeyDown={(event) =>
              activateOnEnterOrSpace(event, () => knobFaceClick(sectionId))
            }
          />

          {tickMarks}

          {/* Moving indicator dot: positioned by the effect above. */}
          <circle
            ref={dotRef}
            className={`${styles.indicatorDot} ${
              isActive ? styles.indicatorDotActive : ""
            }`}
            cx={initialDotPoint.x}
            cy={initialDotPoint.y}
            r={5}
            aria-hidden="true"
          />

          <circle
            className={styles.centerCap}
            cx={KNOB_CENTER_X}
            cy={KNOB_CENTER_Y}
            r={5}
            aria-hidden="true"
          />

          {/* Choice groups: each LED + label behaves as one selectable control. */}
          {links.map((link, linkIndex) => {
            const isSelected = isActive && linkIndex === activeLinkIndex;
            const ledOffset = sectionOffsets.led[linkIndex] ?? { x: 0, y: 0 };
            const labelOffset = sectionOffsets.label[linkIndex] ?? {
              x: 0,
              y: 0,
            };
            const { led, labelPoint } = choicePositions[linkIndex]!;

            return (
              <g
                className={styles.choiceGroup}
                key={link}
                onClick={() => knobNavTo(sectionId, linkIndex)}
                onKeyDown={(event) =>
                  activateOnEnterOrSpace(event, () =>
                    knobNavTo(sectionId, linkIndex),
                  )
                }
                tabIndex={0}
                role="button"
                aria-label={`${label}: ${link}`}
                aria-pressed={isSelected}
                aria-current={isSelected ? "page" : undefined}
              >
                <circle
                  className={`${styles.choiceLed} ${
                    isSelected ? styles.choiceLedActive : ""
                  }`}
                  cx={led.x + ledOffset.x}
                  cy={led.y + ledOffset.y}
                  r={5}
                />

                <text
                  className={`${styles.choiceText} ${
                    isSelected ? styles.choiceTextActive : ""
                  }`}
                  x={labelPoint.x + labelOffset.x}
                  y={labelPoint.y + labelOffset.y}
                  dominantBaseline="middle"
                  textAnchor="start"
                >
                  {link}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Jack port overlay; uses parent knob's --glow variable and bitmap assets. */}
      <div className={styles.jackPort}>
        <div
          className={`${styles.port} ${isActive ? styles.portActive : ""}`}
        />
        <div
          className={`${styles.plug} ${isActive ? styles.plugActive : ""}`}
        />
      </div>
    </div>
  );
}
