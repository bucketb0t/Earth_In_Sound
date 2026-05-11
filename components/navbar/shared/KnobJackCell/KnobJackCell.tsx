"use client";

import { useMemo } from "react";
import {
  KNOB_CANVAS_SIZE as SVG_HEIGHT,
  KNOB_CENTER_X,
  KNOB_CENTER_Y,
  KNOB_OFFSETS,
  KNOB_RADIUS,
  KNOB_SVG_WIDTH as SVG_WIDTH,
  LED_DEGREES_FROM_TOP as CHOICE_ANGLES,
  LED_ORBIT_RADIUS as CHOICE_ORBIT_RADIUS,
  degreesToRadians,
  ledAngleToTrigDegrees as clockAngleToMathAngle,
  svgPoint as polarToCartesian,
  type KnobSectionId,
} from "../../config";
import { activateOnEnterOrSpace, useNavbarContext } from "../../state";
import styles from "./KnobJackCell.module.css";

export interface KnobJackCellProps {
  sectionId: KnobSectionId;
  sectionLabel: string;
  links: readonly string[];
  knobArtworkClassName: string;
  showJackPort?: boolean;
}

/**
 * Shared rotary knob and jack module.
 * Section wrappers own plaque artwork and logo/title placement.
 */
export default function KnobJackCell({
  sectionId,
  sectionLabel,
  links,
  knobArtworkClassName,
  showJackPort = false,
}: KnobJackCellProps) {
  const { activePage, knobNavTo, knobFaceClick } = useNavbarContext();

  const isActive = activePage?.section === sectionId;
  const activeLinkIndex = isActive ? activePage.linkIndex : -1;
  const sectionOffsets = KNOB_OFFSETS[sectionId];

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

  /* Geometry for each choice: dot position and label position. */
  const choiceGeometry = useMemo(
    () =>
      CHOICE_ANGLES.map((clockAngle) => {
        const mathAngle = clockAngleToMathAngle(clockAngle);
        return {
          dotPosition: polarToCartesian(CHOICE_ORBIT_RADIUS, mathAngle),
          labelPosition: polarToCartesian(CHOICE_ORBIT_RADIUS + 16, mathAngle),
        };
      }),
    [],
  );

  const knobTurnClass =
    isActive && activeLinkIndex === 0
      ? styles.knobArtworkTurnTop
      : isActive && activeLinkIndex === 1
        ? styles.knobArtworkTurnMiddle
        : isActive && activeLinkIndex === 2
          ? styles.knobArtworkTurnBottom
          : styles.knobArtworkIdle;

  return (
    <div className={styles.knobJackModule}>
      <div className={styles.knobWrap}>
        {/* Section-specific artwork is visible; the SVG circle below remains the hit target. */}
        <div
          className={`${styles.knobArtwork} ${knobTurnClass} ${knobArtworkClassName}`}
          aria-hidden="true"
        />

        {/* One SVG keeps the hit target, choice dots, and labels scaling together. */}
        <svg
          className={styles.knobSvg}
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          width="100%"
        >
          <defs>
            {/* Per-instance gradient id prevents collisions between knob instances. */}
            <radialGradient
              id={`knob-gradient-${sectionId}`}
              cx="40%"
              cy="35%"
              r="60%"
            >
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

          {/* Knob face: clicking it deselects the active link in this section. */}
          <circle
            className={styles.knobFace}
            cx={KNOB_CENTER_X}
            cy={KNOB_CENTER_Y}
            r={KNOB_RADIUS}
            fill={`url(#knob-gradient-${sectionId})`}
            tabIndex={0}
            role="button"
            aria-label={`${sectionLabel} deselect`}
            aria-pressed={isActive}
            onClick={() => knobFaceClick(sectionId)}
            onKeyDown={(event) =>
              activateOnEnterOrSpace(event, () => knobFaceClick(sectionId))
            }
          />

          {tickMarks}

          <circle
            className={styles.centerCap}
            cx={KNOB_CENTER_X}
            cy={KNOB_CENTER_Y}
            r={5}
            aria-hidden="true"
          />

          {/* Choice groups: each dot + label is one selectable navigation target. */}
          {links.map((link, linkIndex) => {
            const isSelected = isActive && linkIndex === activeLinkIndex;
            const dotOffset = sectionOffsets.led[linkIndex] ?? { x: 0, y: 0 };
            const labelOffset = sectionOffsets.label[linkIndex] ?? {
              x: 0,
              y: 0,
            };
            const { dotPosition, labelPosition } = choiceGeometry[linkIndex]!;

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
                aria-label={`${sectionLabel}: ${link}`}
                aria-pressed={isSelected}
                aria-current={isSelected ? "page" : undefined}
              >
                <circle
                  className={`${styles.choiceDot} ${isSelected ? styles.choiceDotActive : ""}`}
                  cx={dotPosition.x + dotOffset.x}
                  cy={dotPosition.y + dotOffset.y}
                  r={3.5}
                />

                <text
                  className={`${styles.choiceText} ${isSelected ? styles.choiceTextActive : ""}`}
                  x={labelPosition.x + labelOffset.x}
                  y={labelPosition.y + labelOffset.y}
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

      {showJackPort ? (
        <div className={styles.jackPort} aria-hidden="true">
          <div className={styles.jackSocket} />
        </div>
      ) : null}
    </div>
  );
}
