"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";

import { CELL_GEOMETRY, EIS_LINKS, SECTION_GLOWS } from "../config";
import { useNavbarContext } from "../state";

/*
 * EIS artwork assets.
 *
 * These assets belong to this cell, so they stay imported here instead of in
 * Navbar.tsx. That keeps the parent navbar structural and the cell visual.
 */
import earthInSoundLogoHover from "../NavbarAssets/SVG/EarthInSoundLogoHooverNavbar.svg";
import earthInSoundLogoOff from "../NavbarAssets/SVG/EarthInSoundLogoOffNavbar.svg";
import earthInSoundPlaque from "../NavbarAssets/SVG/EarthInSoundPlaqueNavbar.svg";
import earthInSoundSliderBar from "../NavbarAssets/SVG/EarthInSoundSliderBarNavbar.svg";
import earthInSoundSliderThumb from "../NavbarAssets/SVG/EarthInSoundSliderThumbNavbar.svg";

/*
 * Section constants.
 *
 * GLOW gives this cell its active color. LAST_EIS_INDEX is used by the slider
 * math so the code keeps working if the EIS link list changes length.
 */
const GLOW = SECTION_GLOWS.eis;
const LAST_EIS_INDEX = EIS_LINKS.length - 1;

/*
 * Asset URL conversion.
 *
 * Next can expose imported SVGs either as strings or objects with a `src`
 * field depending on build handling. The CSS background-image values need
 * plain URLs, so each imported artwork is normalized here.
 */
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

/*
 * Pointer drag session state.
 *
 * This is stored in a ref instead of React state because drag movement is
 * high-frequency visual work. React only needs the final selected link index.
 */
interface DragState {
  active: boolean;
  startY: number;
  startTop: number;
}

/**
 * Combined Earth In Sound logo + navigation cell.
 *
 * This is the pattern to repeat for future artwork-heavy cells:
 * the cell owns its plaque, local controls, and tuning values, while
 * Navbar.tsx only decides where the cell sits in the full navbar.
 */
export default function EISLogoCell() {
  /*
   * Shared navbar state.
   *
   * The cell reads the active page and slider position from context, then uses
   * shared actions so every navbar cell stays synchronized.
   */
  const { activePage, eisSliderPos, eisNavTo, goHome } = useNavbarContext();
  const { logoCellWidth, logoWidth, trackWidth, thumbSize } = CELL_GEOMETRY.eis;

  /*
   * DOM refs for slider math.
   *
   * The slider needs real rendered sizes because the bar and thumb scale with
   * the cell. offsetHeight gives the current layout size after zoom/resizing.
   */
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState>({ active: false, startY: 0, startTop: 0 });

  /*
   * Derived render state.
   *
   * `isActive` controls the active EIS visuals. `activeLabel` gives the slider
   * an accessible text value that matches the selected row.
   */
  const isActive = activePage?.section === "eis";
  const activeLabel = EIS_LINKS[eisSliderPos] ?? EIS_LINKS[0];

  /*
   * CSS variables are the handoff point between React and scoped CSS. React
   * supplies dynamic values; CSS handles layering, sizing, and hover visuals.
   */
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

  /*
   * Index -> thumb top position.
   *
   * The slider stores the selected row as an index, while the thumb needs a
   * pixel top value. The calculation uses the current rendered track/thumb
   * heights, so it follows responsive layout changes.
   */
  const idxToTop = useCallback((idx: number): number => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return 0;

    const step = (track.offsetHeight - thumb.offsetHeight) / LAST_EIS_INDEX;
    return idx * step;
  }, []);

  /*
   * Thumb top position -> nearest index.
   *
   * This is the reverse of idxToTop(). It is used when a drag ends so the
   * released thumb snaps to Home, About, or Contact.
   */
  const topToIdx = useCallback((top: number): number => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return 0;

    const step = (track.offsetHeight - thumb.offsetHeight) / LAST_EIS_INDEX;
    return Math.max(0, Math.min(LAST_EIS_INDEX, Math.round(top / step)));
  }, []);

  /*
   * The thumb position is written directly because drag movement is visual and
   * high-frequency. React still owns the final selected index through state.
   */
  const snapThumb = useCallback(
    (idx: number): void => {
      const thumb = thumbRef.current;
      if (!thumb) return;

      thumb.style.transition = "top 0.2s ease";
      thumb.style.top = `${idxToTop(idx)}px`;
    },
    [idxToTop],
  );

  /*
   * Resize-aware thumb correction.
   *
   * When zooming or resizing changes the slider/thumb dimensions, the selected
   * index stays the same but the old pixel top value becomes wrong. The
   * ResizeObserver re-snaps the thumb to the correct stop after size changes.
   */
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

  /*
   * Live drag movement.
   *
   * While dragging, the thumb follows the pointer and is clamped inside the
   * current track. The actual selected link is not committed until release.
   */
  const moveThumbToPointer = (clientY: number): void => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return;

    const rawTop = drag.current.startTop + (clientY - drag.current.startY);
    const maxTop = track.offsetHeight - thumb.offsetHeight;

    thumb.style.top = `${Math.max(0, Math.min(maxTop, rawTop))}px`;
  };

  /*
   * Drag release / cancellation.
   *
   * Pointer capture is released, then the current thumb top is converted into
   * the nearest EIS link index and sent through shared navbar state.
   */
  const finishDrag = (thumb: HTMLDivElement, pointerId: number): void => {
    if (!drag.current.active) return;

    drag.current.active = false;

    if (thumb.hasPointerCapture(pointerId)) {
      thumb.releasePointerCapture(pointerId);
    }

    const top = parseInt(thumb.style.top || "0", 10) || 0;
    eisNavTo(topToIdx(top));
  };

  /*
   * Drag start.
   *
   * The first pointer position and the thumb's starting top are saved so later
   * pointer movement can be converted into a relative thumb movement.
   */
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

  /*
   * The visual slider is now keyboard-operable too. This keeps the custom
   * hardware control aligned with normal web expectations for sliders.
   */
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
        {/* Logo area: returns the EIS navigation state to Home. */}
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

        {/* Slider area: custom bar/thumb plus the three EIS navigation rows. */}
        <div className="navbar-fit eis-controls">
          <div className="navbar-fit slider-row">
            {/* Slider track: provides the measured rail used by drag math. */}
            <div
              className="eis-track"
              ref={trackRef}
              style={{ width: trackWidth }}
            >
              {/* Slider thumb: draggable, keyboard-operable, and resnapped on resize. */}
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

            {/* Link rows: clicking text/LEDs updates the same slider state. */}
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
          /*
           * Cell-level responsive variables.
           *
           * cqw units respond to this cell's own width because the element is
           * marked as an inline-size container below. This lets the logo,
           * slider, LEDs, and text resize together.
           */
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

        /*
         * The plaque is cell-local artwork. Keeping it here prevents Navbar.tsx
         * from becoming a catalogue of every individual cell background.
         */
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
          /*
           * Two-column cell layout.
           *
           * The logo and slider share the available plaque space by percentage,
           * so the slider does not get crushed by a fixed-width logo.
           */
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(0, 64%) minmax(0, 36%);
          align-items: center;
          width: 100%;
          min-width: 0;
        }

        .logo-button {
          /*
           * Native button reset.
           *
           * The button keeps accessible click/keyboard behavior while removing
           * default browser button styling that would fight the artwork.
           */
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
          /*
           * Responsive logo frame.
           *
           * The frame preserves the logo proportion while capping the logo so
           * it cannot force the grid column wider than available.
           */
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
          /*
           * Slider column shell.
           *
           * min-width: 0 is important in CSS grid/flex layouts; it allows the
           * slider column to shrink instead of overflowing the cell.
           */
          width: 100%;
          min-width: 0;
          padding-inline: clamp(2px, 1cqw, 8px);
        }

        .slider-row {
          /*
           * Slider horizontal layout.
           *
           * This row keeps the bar and label stack centered while the gap
           * follows the cell's responsive sizing variables.
           */
          display: flex;
          align-items: center;
          gap: var(--eis-slider-gap);
          flex: 1;
          width: 100%;
          justify-content: center;
          min-width: 0;
        }

        .eis-track {
          /*
           * Custom slider bar artwork.
           *
           * The track is still a real measured element so drag math can use
           * its rendered height even though the visible bar is an SVG asset.
           */
          height: var(--eis-slider-height);
          background-image: var(--eis-slider-bar);
          background-repeat: no-repeat;
          background-position: center;
          background-size: 100% 100%;
          position: relative;
          flex-shrink: 0;
        }

        .eis-thumb {
          /*
           * Custom slider thumb artwork.
           *
           * Width is derived from height to preserve the SVG's wide aspect
           * ratio. The top value is controlled by the drag/snap logic above.
           */
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
          /*
           * Label alignment grid.
           *
           * The top and bottom rows match the rendered thumb height, which
           * aligns Home/Contact LED centers with the thumb's stop centers.
           */
          display: grid;
          grid-template-rows:
            var(--eis-rendered-thumb-height)
            1fr
            var(--eis-rendered-thumb-height);
          height: var(--eis-slider-height);
          flex: 1;
        }

        .eis-link-row {
          /*
           * Link row button reset.
           *
           * Each row is a real button for accessibility, but visually behaves
           * like the hardware label/LED pair in the design.
           */
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
