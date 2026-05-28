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

function artworkScaledPixelValue(sourcePixelValue: number): string {
  return `calc(${sourcePixelValue}px * var(--artwork-cell-scale))`;
}

/*
 * CSS variable handoff for the shared knob/jack layout.
 */
const knobJackLayoutVars = {
  "--knob-max-width": artworkScaledPixelValue(KNOB_LAYOUT.module.maxWidth),
  "--knob-module-offset-x": artworkScaledPixelValue(KNOB_LAYOUT.module.offset.x),
  "--knob-module-offset-y": artworkScaledPixelValue(KNOB_LAYOUT.module.offset.y),
  "--knob-artwork-size": artworkScaledPixelValue(KNOB_LAYOUT.artwork.size),
  "--knob-artwork-left": `${KNOB_LAYOUT.artwork.leftPercent}%`,
  "--knob-artwork-top": `${KNOB_LAYOUT.artwork.topPercent}%`,
  "--knob-press-scale-active": KNOB_LAYOUT.artwork.pressedScale,
  "--knob-rotation-idle": `${KNOB_LAYOUT.artwork.rotation.idle}deg`,
  "--knob-rotation-top": `${KNOB_LAYOUT.artwork.rotation.top}deg`,
  "--knob-rotation-middle": `${KNOB_LAYOUT.artwork.rotation.middle}deg`,
  "--knob-rotation-bottom": `${KNOB_LAYOUT.artwork.rotation.bottom}deg`,
  "--jack-socket-width": artworkScaledPixelValue(KNOB_LAYOUT.jack.socketWidth),
  "--jack-plug-width": artworkScaledPixelValue(KNOB_LAYOUT.jack.plugWidth),
  "--jack-plug-height": artworkScaledPixelValue(KNOB_LAYOUT.jack.plugHeight),
  "--jack-anchor-top": artworkScaledPixelValue(KNOB_LAYOUT.jack.anchor.top),
  "--jack-anchor-right": artworkScaledPixelValue(KNOB_LAYOUT.jack.anchor.right),
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
  sectionLinks: readonly string[];
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
  sectionLinks,
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

  const sectionIsActive = activePage?.section === sectionId;
  const activeLinkIndex = sectionIsActive ? activePage.linkIndex : -1;
  const sectionOffsets = KNOB_OFFSETS[sectionId];

  /* Geometry for each choice: dot position and label position. */
  const choiceGeometry = useMemo(
    () =>
      CHOICE_ANGLES.map((clockwiseDegreesFromTop) => {
        const trigDegrees = clockAngleToMathAngle(clockwiseDegreesFromTop);
        return {
          dotPosition: polarToCartesian(CHOICE_ORBIT_RADIUS, trigDegrees),
          labelPosition: polarToCartesian(
            CHOICE_ORBIT_RADIUS + KNOB_LAYOUT.labelOrbitGap,
            trigDegrees,
          ),
        };
      }),
    [],
  );

  const knobTurnClass =
    sectionIsActive && activeLinkIndex === 0
      ? styles.knobArtworkTurnTop
      : sectionIsActive && activeLinkIndex === 1
        ? styles.knobArtworkTurnMiddle
        : sectionIsActive && activeLinkIndex === 2
          ? styles.knobArtworkTurnBottom
          : styles.knobArtworkIdle;

  const moveKnobToLink = useCallback(
    (linkIndex: number): void => {
      const lastLinkIndex = sectionLinks.length - 1;
      const clampedLinkIndex = Math.max(0, Math.min(lastLinkIndex, linkIndex));
      knobNavTo(sectionId, clampedLinkIndex);
    },
    [knobNavTo, sectionId, sectionLinks.length],
  );

  const onKnobPointerDown = (
    event: PointerEvent<SVGCircleElement>,
  ): void => {
    dragState.current = {
      active: true,
      pointerId: event.pointerId,
      startY: event.clientY,
      startLinkIndex: sectionIsActive ? activeLinkIndex : 0,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const onKnobPointerMove = (
    event: PointerEvent<SVGCircleElement>,
  ): void => {
    const activeDragState = dragState.current;
    if (!activeDragState.active || activeDragState.pointerId !== event.pointerId) {
      return;
    }

    const pointerDeltaY = event.clientY - activeDragState.startY;
    if (Math.abs(pointerDeltaY) <= 4) return;

    const linkStepOffset = Math.round(pointerDeltaY / KNOB_LAYOUT.dragStepPx);

    suppressNextClick.current = true;
    moveKnobToLink(activeDragState.startLinkIndex + linkStepOffset);
  };

  const finishKnobDrag = (event: PointerEvent<SVGCircleElement>): void => {
    const activeDragState = dragState.current;
    if (!activeDragState.active || activeDragState.pointerId !== event.pointerId) {
      return;
    }

    dragState.current = { ...activeDragState, active: false };

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
        {/* Section-specific knob artwork. */}
        <div
          className={`${styles.knobArtwork} ${knobTurnClass} ${knobArtworkClassName}`}
          aria-hidden="true"
        />

        {/* SVG interaction layer for knob face, LEDs, and labels. */}
        <svg
          className={styles.knobSvg}
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          width="100%"
        >
          {/* Knob face hit target. */}
          <circle
            className={styles.knobFace}
            cx={KNOB_CENTER_X}
            cy={KNOB_CENTER_Y}
            r={KNOB_RADIUS}
            tabIndex={0}
            role="button"
            aria-label={`${sectionLabel} knob`}
            aria-pressed={sectionIsActive}
            onClick={onKnobClick}
            onPointerDown={onKnobPointerDown}
            onPointerMove={onKnobPointerMove}
            onPointerUp={finishKnobDrag}
            onPointerCancel={finishKnobDrag}
            onKeyDown={(event) =>
              activateOnEnterOrSpace(event, () => knobFacePress(sectionId))
            }
          />

          {/* Menu choice hit targets. */}
          {sectionLinks.map((link, linkIndex) => {
            const linkIsSelected =
              sectionIsActive && linkIndex === activeLinkIndex;
            const choiceLightOffset = sectionOffsets.led[linkIndex] ?? {
              x: 0,
              y: 0,
            };
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
                aria-pressed={linkIsSelected}
                aria-current={linkIsSelected ? "page" : undefined}
              >
                <foreignObject
                  className={styles.choiceLightObject}
                  x={
                    dotPosition.x +
                    choiceLightOffset.x -
                    KNOB_LAYOUT.choiceLightSize / 2
                  }
                  y={
                    dotPosition.y +
                    choiceLightOffset.y -
                    KNOB_LAYOUT.choiceLightSize / 2
                  }
                  width={KNOB_LAYOUT.choiceLightSize}
                  height={KNOB_LAYOUT.choiceLightSize}
                  aria-hidden="true"
                >
                  <div
                    className={`${styles.choiceLight} ${
                      linkIsSelected ? styles.choiceLightOn : ""
                    }`}
                  />
                </foreignObject>

                <text
                  className={`${styles.choiceText} ${
                    linkIsSelected ? styles.choiceTextActive : ""
                  }`}
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
          {/* Jack socket and cable anchor. */}
          <div className={styles.jackAnchor}>
            <div className={styles.jackSocket} />
            {sectionIsActive ? <div className={styles.jackPlug} /> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
