"use client";

import { useCallback, useEffect, useRef } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

import { EIS_LINKS } from "../../config";
import { useNavbarContext } from "../../state";
import styles from "./EISLogoCell.module.css";

/* Local section constants used by active styles and slider math. */
const LAST_EIS_INDEX = EIS_LINKS.length - 1;

/* Mutable drag session; React only receives the final snapped index. */
interface DragState {
  active: boolean;
  startY: number;
  startTop: number;
}

/**
 * EIS logo + local navigation cell.
 * Owns plaque artwork, logo hover state, custom slider, and EIS link rows.
 */
export default function EISLogoCell() {
  /* Shared state keeps this cell synchronized with the rest of the navbar. */
  const { activePage, eisSliderPos, eisNavTo, goHome } = useNavbarContext();

  /* Slider refs provide rendered sizes after zoom and responsive resizing. */
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState>({
    active: false,
    startY: 0,
    startTop: 0,
  });

  /* Derived render state for active visuals and slider accessibility text. */
  const isActive = activePage?.section === "eis";
  const activeLabel = EIS_LINKS[eisSliderPos] ?? EIS_LINKS[0];

  /* Convert selected link index into the thumb's current pixel top. */
  const linkIndexToThumbTop = useCallback((linkIndex: number): number => {
    const trackElement = trackRef.current;
    const thumbElement = thumbRef.current;
    if (!trackElement || !thumbElement) return 0;

    const step =
      (trackElement.offsetHeight - thumbElement.offsetHeight) / LAST_EIS_INDEX;
    return linkIndex * step;
  }, []);

  /* Convert a dragged thumb top into the nearest valid link index. */
  const thumbTopToLinkIndex = useCallback((thumbTop: number): number => {
    const trackElement = trackRef.current;
    const thumbElement = thumbRef.current;
    if (!trackElement || !thumbElement) return 0;

    const step =
      (trackElement.offsetHeight - thumbElement.offsetHeight) / LAST_EIS_INDEX;
    return Math.max(0, Math.min(LAST_EIS_INDEX, Math.round(thumbTop / step)));
  }, []);

  /* Imperative thumb write keeps drag/snap visuals smooth between state updates. */
  const snapThumb = useCallback(
    (linkIndex: number): void => {
      const thumbElement = thumbRef.current;
      if (!thumbElement) return;

      thumbElement.style.transition = "top 0.2s ease";
      thumbElement.style.top = `${linkIndexToThumbTop(linkIndex)}px`;
    },
    [linkIndexToThumbTop],
  );

  /* Re-snap when the track or thumb size changes under zoom/resizing. */
  useEffect(() => {
    const trackElement = trackRef.current;
    const thumbElement = thumbRef.current;
    let animationFrameId: number | null = null;

    const resnapThumb = () => {
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => snapThumb(eisSliderPos));
    };

    resnapThumb();

    if (!trackElement || !thumbElement) {
      return () => {
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
        }
      };
    }

    const observer = new ResizeObserver(resnapThumb);
    observer.observe(trackElement);
    observer.observe(thumbElement);

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      observer.disconnect();
    };
  }, [eisSliderPos, snapThumb]);

  /* Follow the pointer visually, clamped inside the current track height. */
  const moveThumbToPointer = (clientY: number): void => {
    const trackElement = trackRef.current;
    const thumbElement = thumbRef.current;
    if (!trackElement || !thumbElement) return;

    const nextThumbTop =
      dragStateRef.current.startTop + (clientY - dragStateRef.current.startY);
    const maxThumbTop = trackElement.offsetHeight - thumbElement.offsetHeight;

    thumbElement.style.top = `${Math.max(
      0,
      Math.min(maxThumbTop, nextThumbTop),
    )}px`;
  };

  /* End drag, release pointer capture, and commit the nearest link index. */
  const finishDrag = (
    thumbElement: HTMLDivElement,
    pointerId: number,
  ): void => {
    if (!dragStateRef.current.active) return;

    dragStateRef.current.active = false;

    if (thumbElement.hasPointerCapture(pointerId)) {
      thumbElement.releasePointerCapture(pointerId);
    }

    const thumbTop = parseInt(thumbElement.style.top || "0", 10) || 0;
    eisNavTo(thumbTopToLinkIndex(thumbTop));
  };

  /* Start drag by saving pointer Y and the thumb's current top offset. */
  const onThumbPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    dragStateRef.current = {
      active: true,
      startY: event.clientY,
      startTop: parseInt(event.currentTarget.style.top || "0", 10) || 0,
    };

    event.currentTarget.style.transition = "none";
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const onThumbPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (!dragStateRef.current.active) return;
    moveThumbToPointer(event.clientY);
  };

  /* Keyboard support mirrors normal slider expectations. */
  const onThumbKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const keyToLinkIndex: Partial<Record<string, number>> = {
      ArrowDown: eisSliderPos + 1,
      ArrowRight: eisSliderPos + 1,
      ArrowUp: eisSliderPos - 1,
      ArrowLeft: eisSliderPos - 1,
      Home: 0,
      End: LAST_EIS_INDEX,
    };

    const nextLinkIndex = keyToLinkIndex[event.key];
    if (nextLinkIndex === undefined) return;

    event.preventDefault();
    eisNavTo(nextLinkIndex);
  };

  return (
    <div className={styles.eisLogoCell}>
      <div className={`navbar-fit ${styles.eisLogoContent}`}>
        {/* Logo button: returns EIS to Home while preserving custom artwork. */}
        <button
          type="button"
          className={styles.eisLogoButton}
          onClick={goHome}
          aria-label="Earth In Sound, go to home"
        >
          <span className={styles.eisLogoFrame} aria-hidden="true">
            <span
              className={`${styles.eisLogoImage} ${styles.eisLogoImageOff}`}
            />
            <span
              className={`${styles.eisLogoImage} ${styles.eisLogoImageHover}`}
            />
          </span>
        </button>

        {/* Slider area: custom rail/thumb plus the three EIS link buttons. */}
        <div className={`navbar-fit ${styles.eisControls}`}>
          <div className={`navbar-fit ${styles.sliderRow}`}>
            {/* Track element is both visible artwork and measured drag rail. */}
            <div className={styles.eisTrack} ref={trackRef}>
              {/* Thumb supports pointer drag, keyboard navigation, and resize snaps. */}
              <div
                className={styles.eisThumb}
                ref={thumbRef}
                role="slider"
                tabIndex={0}
                aria-label="Earth In Sound section slider"
                aria-valuemin={0}
                aria-valuemax={LAST_EIS_INDEX}
                aria-valuenow={eisSliderPos}
                aria-valuetext={activeLabel}
                onPointerDown={onThumbPointerDown}
                onPointerMove={onThumbPointerMove}
                onPointerUp={(event) =>
                  finishDrag(event.currentTarget, event.pointerId)
                }
                onPointerCancel={(event) =>
                  finishDrag(event.currentTarget, event.pointerId)
                }
                onKeyDown={onThumbKeyDown}
              />
            </div>

            {/* Link rows write to the same EIS state as the slider thumb. */}
            <div className={`navbar-fit ${styles.eisLinks}`}>
              {EIS_LINKS.map((link, linkIndex) => {
                const isSelected = isActive && eisSliderPos === linkIndex;

                return (
                  <button
                    key={link}
                    type="button"
                    className={styles.eisLinkRow}
                    onClick={() => eisNavTo(linkIndex)}
                    aria-label={`Navigate to ${link}`}
                    aria-pressed={isSelected}
                    aria-current={isSelected ? "page" : undefined}
                  >
                    <span
                      className={`${styles.eisLed} ${
                        isSelected ? styles.eisLedOn : ""
                      }`}
                    />
                    <span
                      className={`link-label ${styles.eisLinkLabel} ${
                        isSelected ? styles.eisLinkLabelOn : ""
                      }`}
                    >
                      {link}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
