"use client";

import { useCallback, useEffect, useRef } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

import { EIS_LINKS } from "../../config";
import { useNavbarContext } from "../../state";
import styles from "./EISLogoCell.module.css";

const LAST_EIS_INDEX = EIS_LINKS.length - 1;

/* Keep pointer movement in refs; commit the snapped index on release. */
interface DragState {
  active: boolean;
  startY: number;
  startTop: number;
}

/** EIS artwork and slider controls share navigation state through navbar context. */
export default function EISLogoCell() {
  const { activePage, eisSliderPos, eisNavTo, goHome } = useNavbarContext();

  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState>({
    active: false,
    startY: 0,
    startTop: 0,
  });

  const isActive = activePage?.section === "eis";
  const activeLabel = EIS_LINKS[eisSliderPos] ?? EIS_LINKS[0];

  const linkIndexToThumbTop = useCallback((linkIndex: number): number => {
    /* Rendered sizes keep slider stops aligned after scaling and zoom. */
    const trackElement = trackRef.current;
    const thumbElement = thumbRef.current;
    if (!trackElement || !thumbElement) return 0;

    const step =
      (trackElement.offsetHeight - thumbElement.offsetHeight) / LAST_EIS_INDEX;
    return linkIndex * step;
  }, []);

  const thumbTopToLinkIndex = useCallback((thumbTop: number): number => {
    const trackElement = trackRef.current;
    const thumbElement = thumbRef.current;
    if (!trackElement || !thumbElement) return 0;

    const step =
      (trackElement.offsetHeight - thumbElement.offsetHeight) / LAST_EIS_INDEX;
    return Math.max(0, Math.min(LAST_EIS_INDEX, Math.round(thumbTop / step)));
  }, []);

  /* Update the thumb directly for smooth movement between React renders. */
  const snapThumb = useCallback(
    (linkIndex: number): void => {
      const thumbElement = thumbRef.current;
      if (!thumbElement) return;

      thumbElement.style.transition = "top 0.2s ease";
      thumbElement.style.top = `${linkIndexToThumbTop(linkIndex)}px`;
    },
    [linkIndexToThumbTop],
  );

  /* Re-snap when the track or thumb size changes. */
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

  /* Capture the pointer so dragging continues outside the thumb. */
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

  const onThumbKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    /* Match native slider keyboard behavior. */
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

        <div className={`navbar-fit ${styles.eisControls}`}>
          <div className={`navbar-fit ${styles.sliderRow}`}>
            <div className={styles.eisTrack} ref={trackRef}>
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
