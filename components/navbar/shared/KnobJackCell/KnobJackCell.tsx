"use client";

import { useCallback, useMemo, useRef } from "react";
import type { CSSProperties, PointerEvent } from "react";
import {
  KNOB_CANVAS_SIZE as SVG_HEIGHT,
  KNOB_CENTER_X,
  KNOB_CENTER_Y,
  KNOB_LAYOUT,
  KNOB_OFFSETS,
  KNOB_RADIUS,
  KNOB_SVG_WIDTH as SVG_WIDTH,
  LED_DEGREES_FROM_TOP as CHOICE_ANGLES,
  LED_ORBIT_RADIUS as CHOICE_ORBIT_RADIUS,
  ledAngleToTrigDegrees as clockAngleToMathAngle,
  svgPoint as polarToCartesian,
  type KnobSectionId,
} from "../../config";
import { activateOnEnterOrSpace, useNavbarContext } from "../../state";
import styles from "./KnobJackCell.module.css";

function scaledPx(value: number): string {
  return `calc(${value}px * var(--artwork-cell-scale))`;
}

/*
 * CSS variable handoff for the shared knob/jack layout.
 * config.ts stays the tuning source; CSS modules still own visuals and assets.
 */
const knobJackLayoutVars = {
  "--knob-max-width": scaledPx(KNOB_LAYOUT.module.maxWidth),
  "--knob-module-offset-x": scaledPx(KNOB_LAYOUT.module.offset.x),
  "--knob-module-offset-y": scaledPx(KNOB_LAYOUT.module.offset.y),
  "--knob-artwork-size": scaledPx(KNOB_LAYOUT.artwork.size),
  "--knob-artwork-left": `${KNOB_LAYOUT.artwork.leftPercent}%`,
  "--knob-artwork-top": `${KNOB_LAYOUT.artwork.topPercent}%`,
  "--knob-press-scale-active": KNOB_LAYOUT.artwork.pressedScale,
  "--knob-rotation-idle": `${KNOB_LAYOUT.artwork.rotation.idle}deg`,
  "--knob-rotation-top": `${KNOB_LAYOUT.artwork.rotation.top}deg`,
  "--knob-rotation-middle": `${KNOB_LAYOUT.artwork.rotation.middle}deg`,
  "--knob-rotation-bottom": `${KNOB_LAYOUT.artwork.rotation.bottom}deg`,
  "--jack-socket-width": scaledPx(KNOB_LAYOUT.jack.socketWidth),
  "--jack-plug-width": scaledPx(KNOB_LAYOUT.jack.plugWidth),
  "--jack-plug-height": scaledPx(KNOB_LAYOUT.jack.plugHeight),
  "--jack-anchor-top": scaledPx(KNOB_LAYOUT.jack.anchor.top),
  "--jack-anchor-right": scaledPx(KNOB_LAYOUT.jack.anchor.right),
  "--jack-plug-tip-x": KNOB_LAYOUT.jack.plugTipCorrection.x,
  "--jack-plug-tip-y": KNOB_LAYOUT.jack.plugTipCorrection.y,
} as CSSProperties;

interface KnobDragState {
  active: boolean;
  pointerId: number;
  startY: number;
  startLinkIndex: number;
}

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
  const { activePage, knobNavTo, knobFacePress } = useNavbarContext();
  const dragState = useRef<KnobDragState>({
    active: false,
    pointerId: -1,
    startY: 0,
    startLinkIndex: 0,
  });
  const suppressNextClick = useRef(false);

  const isActive = activePage?.section === sectionId;
  const activeLinkIndex = isActive ? activePage.linkIndex : -1;
  const sectionOffsets = KNOB_OFFSETS[sectionId];

  /* Geometry for each choice: dot position and label position. */
  const choiceGeometry = useMemo(
    () =>
      CHOICE_ANGLES.map((clockAngle) => {
        const mathAngle = clockAngleToMathAngle(clockAngle);
        return {
          dotPosition: polarToCartesian(CHOICE_ORBIT_RADIUS, mathAngle),
          labelPosition: polarToCartesian(
            CHOICE_ORBIT_RADIUS + KNOB_LAYOUT.labelOrbitGap,
            mathAngle,
          ),
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

  const moveKnobToLink = useCallback(
    (linkIndex: number): void => {
      const lastLinkIndex = links.length - 1;
      const clampedLinkIndex = Math.max(0, Math.min(lastLinkIndex, linkIndex));
      knobNavTo(sectionId, clampedLinkIndex);
    },
    [knobNavTo, links.length, sectionId],
  );

  const onKnobPointerDown = (
    event: PointerEvent<SVGCircleElement>,
  ): void => {
    dragState.current = {
      active: true,
      pointerId: event.pointerId,
      startY: event.clientY,
      startLinkIndex: isActive ? activeLinkIndex : 0,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const onKnobPointerMove = (
    event: PointerEvent<SVGCircleElement>,
  ): void => {
    const drag = dragState.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;

    const deltaY = event.clientY - drag.startY;
    if (Math.abs(deltaY) <= 4) return;

    const stepOffset = Math.round(deltaY / KNOB_LAYOUT.dragStepPx);

    suppressNextClick.current = true;
    moveKnobToLink(drag.startLinkIndex + stepOffset);
  };

  const finishKnobDrag = (event: PointerEvent<SVGCircleElement>): void => {
    const drag = dragState.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;

    dragState.current = { ...drag, active: false };

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onKnobClick = (): void => {
    if (suppressNextClick.current) {
      suppressNextClick.current = false;
      return;
    }

    knobFacePress(sectionId);
  };

  return (
    <div className={styles.knobJackModule} style={knobJackLayoutVars}>
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
          {/* Knob face: click cycles stops; vertical drag selects by physical position. */}
          <circle
            className={styles.knobFace}
            cx={KNOB_CENTER_X}
            cy={KNOB_CENTER_Y}
            r={KNOB_RADIUS}
            tabIndex={0}
            role="button"
            aria-label={`${sectionLabel} knob`}
            aria-pressed={isActive}
            onClick={onKnobClick}
            onPointerDown={onKnobPointerDown}
            onPointerMove={onKnobPointerMove}
            onPointerUp={finishKnobDrag}
            onPointerCancel={finishKnobDrag}
            onKeyDown={(event) =>
              activateOnEnterOrSpace(event, () => knobFacePress(sectionId))
            }
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
                <foreignObject
                  className={styles.choiceLightObject}
                  x={
                    dotPosition.x +
                    dotOffset.x -
                    KNOB_LAYOUT.choiceLightSize / 2
                  }
                  y={
                    dotPosition.y +
                    dotOffset.y -
                    KNOB_LAYOUT.choiceLightSize / 2
                  }
                  width={KNOB_LAYOUT.choiceLightSize}
                  height={KNOB_LAYOUT.choiceLightSize}
                  aria-hidden="true"
                >
                  <div
                    className={`${styles.choiceLight} ${
                      isSelected ? styles.choiceLightOn : ""
                    }`}
                  />
                </foreignObject>

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
          {/* One anchor keeps the socket and cable mirrored between JWW and IHM. */}
          <div className={styles.jackAnchor}>
            <div className={styles.jackSocket} />
            {isActive ? <div className={styles.jackPlug} /> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
