"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";

import { CELL_GEOMETRY, EIS_LINKS, SECTION_GLOWS } from "../config";
import { useNavbarContext } from "../state";

/* Cell-owned artwork; Navbar.tsx stays structural. */
import earthInSoundLogoHover from "../NavbarAssets/SVG/EarthInSoundLogoHooverNavbar.svg";
import earthInSoundLogoOff from "../NavbarAssets/SVG/EarthInSoundLogoOffNavbar.svg";
import earthInSoundPlaque from "../NavbarAssets/SVG/EarthInSoundPlaqueNavbar.svg";
import earthInSoundSliderBar from "../NavbarAssets/SVG/EarthInSoundSliderBarNavbar.svg";
import earthInSoundSliderThumb from "../NavbarAssets/SVG/EarthInSoundSliderThumbNavbar.svg";

/* Local section constants used by active styles and slider math. */
const GLOW = SECTION_GLOWS.eis;
const LAST_EIS_INDEX = EIS_LINKS.length - 1;

/* Normalize imported SVG assets into URLs for CSS background-image. */
const earthInSoundPlaqueUrl =
  typeof earthInSoundPlaque === "string"
    ? earthInSoundPlaque
    : earthInSoundPlaque.src;

const earthInSoundSliderBarUrl =
  typeof earthInSoundSliderBar === "string"
    ? earthInSoundSliderBar
    : earthInSoundSliderBar.src;

const earthInSoundSliderThumbUrl =
  typeof earthInSoundSliderThumb === "string"
    ? earthInSoundSliderThumb
    : earthInSoundSliderThumb.src;

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
  const { logoCellWidth, logoWidth, trackWidth, thumbSize } = CELL_GEOMETRY.eis;

  /* Slider refs provide rendered sizes after zoom and responsive resizing. */
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState>({ active: false, startY: 0, startTop: 0 });

  /* Derived render state for active visuals and slider accessibility text. */
  const isActive = activePage?.section === "eis";
  const activeLabel = EIS_LINKS[eisSliderPos] ?? EIS_LINKS[0];

  /* React passes dynamic colors, sizes, and asset URLs into scoped CSS. */
  const styleVars = {
    "--glow": GLOW,
    "--glow-soft": `${GLOW}66`,
    "--glow-dim": `${GLOW}88`,
    "--eis-plaque": `url(${earthInSoundPlaqueUrl})`,
    "--eis-logo-cell-width": `${logoCellWidth}px`,
    "--eis-logo-width": `${logoWidth}px`,
    "--eis-thumb-size": `${thumbSize}px`,
    "--eis-slider-bar": `url(${earthInSoundSliderBarUrl})`,
    "--eis-slider-thumb": `url(${earthInSoundSliderThumbUrl})`,
  } as CSSProperties;

  /* Convert selected link index into the thumb's current pixel top. */
  const idxToTop = useCallback((idx: number): number => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return 0;

    const step = (track.offsetHeight - thumb.offsetHeight) / LAST_EIS_INDEX;
    return idx * step;
  }, []);

  /* Convert a dragged thumb top into the nearest valid link index. */
  const topToIdx = useCallback((top: number): number => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return 0;

    const step = (track.offsetHeight - thumb.offsetHeight) / LAST_EIS_INDEX;
    return Math.max(0, Math.min(LAST_EIS_INDEX, Math.round(top / step)));
  }, []);

  /* Imperative thumb write keeps drag/snap visuals smooth between state updates. */
  const snapThumb = useCallback(
    (idx: number): void => {
      const thumb = thumbRef.current;
      if (!thumb) return;

      thumb.style.transition = "top 0.2s ease";
      thumb.style.top = `${idxToTop(idx)}px`;
    },
    [idxToTop],
  );

  /* Re-snap when the track or thumb size changes under zoom/resizing. */
  useEffect(() => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    let raf: number | null = null;

    const resnap = () => {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => snapThumb(eisSliderPos));
    };

    resnap();

    if (!track || !thumb) {
      return () => {
        if (raf !== null) cancelAnimationFrame(raf);
      };
    }

    const observer = new ResizeObserver(resnap);
    observer.observe(track);
    observer.observe(thumb);

    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [eisSliderPos, snapThumb]);

  /* Follow the pointer visually, clamped inside the current track height. */
  const moveThumbToPointer = (clientY: number): void => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return;

    const rawTop = drag.current.startTop + (clientY - drag.current.startY);
    const maxTop = track.offsetHeight - thumb.offsetHeight;

    thumb.style.top = `${Math.max(0, Math.min(maxTop, rawTop))}px`;
  };

  /* End drag, release pointer capture, and commit the nearest link index. */
  const finishDrag = (thumb: HTMLDivElement, pointerId: number): void => {
    if (!drag.current.active) return;

    drag.current.active = false;

    if (thumb.hasPointerCapture(pointerId)) {
      thumb.releasePointerCapture(pointerId);
    }

    const top = parseInt(thumb.style.top || "0", 10) || 0;
    eisNavTo(topToIdx(top));
  };

  /* Start drag by saving pointer Y and the thumb's current top offset. */
  const onThumbPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    drag.current = {
      active: true,
      startY: event.clientY,
      startTop: parseInt(event.currentTarget.style.top || "0", 10) || 0,
    };

    event.currentTarget.style.transition = "none";
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const onThumbPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (!drag.current.active) return;
    moveThumbToPointer(event.clientY);
  };

  /* Keyboard support mirrors normal slider expectations. */
  const onThumbKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const keyToIndex: Partial<Record<string, number>> = {
      ArrowDown: eisSliderPos + 1,
      ArrowRight: eisSliderPos + 1,
      ArrowUp: eisSliderPos - 1,
      ArrowLeft: eisSliderPos - 1,
      Home: 0,
      End: LAST_EIS_INDEX,
    };

    const nextIdx = keyToIndex[event.key];
    if (nextIdx === undefined) return;

    event.preventDefault();
    eisNavTo(nextIdx);
  };

  return (
    <div className="eis-logo-cell" style={styleVars}>
      <div className="navbar-fit eis-logo-content">
        {/* Logo button: returns EIS to Home while preserving custom artwork. */}
        <button
          type="button"
          className="logo-button"
          onClick={goHome}
          aria-label="Earth In Sound, go to home"
        >
          <span className="logo-frame" aria-hidden="true">
            <Image
              className="logo-image logo-image--off"
              src={earthInSoundLogoOff}
              alt=""
              fill
              sizes={`${logoWidth}px`}
              unoptimized
              priority
            />

            <Image
              className="logo-image logo-image--hover"
              src={earthInSoundLogoHover}
              alt=""
              fill
              sizes={`${logoWidth}px`}
              unoptimized
              priority
            />
          </span>
        </button>

        {/* Slider area: custom rail/thumb plus the three EIS link buttons. */}
        <div className="navbar-fit eis-controls">
          <div className="navbar-fit slider-row">
            {/* Track element is both visible artwork and measured drag rail. */}
            <div
              className="eis-track"
              ref={trackRef}
              style={{ width: trackWidth }}
            >
              {/* Thumb supports pointer drag, keyboard navigation, and resize snaps. */}
              <div
                className={`eis-thumb ${isActive ? "active" : ""}`}
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
            <div className="navbar-fit eis-links">
              {EIS_LINKS.map((link, idx) => {
                const on = isActive && eisSliderPos === idx;

                return (
                  <button
                    key={link}
                    type="button"
                    className="eis-link-row"
                    onClick={() => eisNavTo(idx)}
                    aria-label={`Navigate to ${link}`}
                    aria-pressed={on}
                    aria-current={on ? "page" : undefined}
                  >
                    <span className={`led ${on ? "on" : ""}`} />
                    <span className={`link-label ${on ? "on" : ""}`}>
                      {link}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .eis-logo-cell {
          /* Cell-width variables keep logo, slider, LEDs, and text scaling together. */
          --eis-logo-rendered-width: clamp(72px, 39cqw, var(--eis-logo-width));
          --eis-slider-height: clamp(36px, 26cqw, 72px);
          --eis-slider-gap: clamp(6px, 5cqw, 16px);
          --eis-led-size: clamp(6px, 3.5cqw, 10px);
          --eis-link-font-size: clamp(7px, 3.2cqw, 9px);
          --eis-link-gap: clamp(3px, 2.2cqw, 6px);
          --eis-rendered-thumb-height: clamp(8px, 5cqw, var(--eis-thumb-size));
          --eis-rendered-thumb-width: calc(
            var(--eis-rendered-thumb-height) * 1.82
          );

          container-type: inline-size;
          position: relative;
          display: flex;
          align-items: stretch;
          flex: 0 1 clamp(180px, 36vw, 280px);
          isolation: isolate;
          margin-right: 16px;
        }

        /* Plaque is local background artwork for this cell only. */
        .eis-logo-cell::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: var(--eis-plaque);
          background-repeat: no-repeat;
          background-position: center;
          background-size: contain;
          pointer-events: none;
          z-index: 0;
        }

        .eis-logo-content {
          /* Two-column plaque layout: logo left, slider controls right. */
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(0, 64%) minmax(0, 36%);
          align-items: center;
          width: 100%;
          min-width: 0;
        }

        .logo-button {
          /* Native button behavior with browser chrome removed. */
          appearance: none;
          background: transparent;
          border: 0;
          color: inherit;
          width: 100%;
          min-width: 0;
          font: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          outline-offset: -2px;
          padding: clamp(4px, 0.5vw, 8px) 0 0;
        }

        .logo-frame {
          /* Preserves logo aspect ratio without forcing the grid column wider. */
          position: relative;
          display: block;
          width: min(var(--eis-logo-rendered-width), 88%);
          aspect-ratio: 130 / 90;
        }

        .logo-frame :global(.logo-image) {
          object-fit: contain;
          transition: opacity 0.18s ease;
        }

        .logo-frame :global(.logo-image--off) {
          opacity: 1;
        }

        .logo-frame :global(.logo-image--hover) {
          opacity: 0;
        }

        .logo-button:hover .logo-frame :global(.logo-image--off),
        .logo-button:focus-visible .logo-frame :global(.logo-image--off) {
          opacity: 0;
        }

        .logo-button:hover .logo-frame :global(.logo-image--hover),
        .logo-button:focus-visible .logo-frame :global(.logo-image--hover) {
          opacity: 1;
        }

        .eis-controls {
          /* min-width: 0 lets the slider column shrink instead of overflowing. */
          width: 100%;
          min-width: 0;
          padding-inline: clamp(2px, 1cqw, 8px);
        }

        .slider-row {
          /* Centers rail and labels with a responsive gap. */
          display: flex;
          align-items: center;
          gap: var(--eis-slider-gap);
          flex: 1;
          width: 100%;
          justify-content: center;
          min-width: 0;
        }

        .eis-track {
          /* Custom rail artwork on a real measured element for drag math. */
          height: var(--eis-slider-height);
          background-image: var(--eis-slider-bar);
          background-repeat: no-repeat;
          background-position: center;
          background-size: 100% 100%;
          position: relative;
          flex-shrink: 0;
        }

        .eis-thumb {
          /* Custom thumb artwork; top is controlled by drag/snap logic. */
          width: var(--eis-rendered-thumb-width);
          height: var(--eis-rendered-thumb-height);
          position: absolute;
          left: 50%;
          top: 0;
          transform: translateX(-50%);
          background-image: var(--eis-slider-thumb);
          background-repeat: no-repeat;
          background-position: center;
          background-size: 100% 100%;
          border: 0;
          cursor: grab;
          transition:
            filter 0.2s,
            opacity 0.2s;
          z-index: 2;
        }

        .eis-thumb:active {
          cursor: grabbing;
        }

        .eis-thumb:focus-visible {
          outline: none;
          filter: drop-shadow(0 0 6px var(--glow));
        }

        .eis-links {
          /* Top/bottom rows match thumb height for precise stop alignment. */
          display: grid;
          grid-template-rows:
            var(--eis-rendered-thumb-height)
            1fr
            var(--eis-rendered-thumb-height);
          height: var(--eis-slider-height);
          flex: 1;
        }

        .eis-link-row {
          /* Real buttons styled as hardware LED/label rows. */
          appearance: none;
          background: transparent;
          border: 0;
          color: inherit;
          font: inherit;
          display: flex;
          align-items: center;
          gap: var(--eis-link-gap);
          cursor: pointer;
          padding: 0;
          text-align: left;
        }

        .eis-link-row :global(.led) {
          width: var(--eis-led-size);
          height: var(--eis-led-size);
        }

        .eis-link-row :global(.link-label) {
          font-size: var(--eis-link-font-size);
        }

        .eis-link-row:focus-visible {
          outline: 2px solid var(--glow);
          outline-offset: 2px;
        }

        .led.on {
          background: var(--glow);
          border-color: var(--glow);
          box-shadow:
            0 0 6px var(--glow),
            0 0 12px var(--glow-soft);
        }

        .link-label.on {
          color: var(--glow);
        }
      `}</style>
    </div>
  );
}
