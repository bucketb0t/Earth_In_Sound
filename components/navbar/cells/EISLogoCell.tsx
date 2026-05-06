"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";

import { CELL_GEOMETRY, EIS_LINKS, SECTION_GLOWS } from "../config";
import { useNavbarContext } from "../state";

import earthInSoundLogoHover from "../NavbarAssets/SVG/EarthInSoundLogoHooverNavbar.svg";
import earthInSoundLogoOff from "../NavbarAssets/SVG/EarthInSoundLogoOffNavbar.svg";
import earthInSoundPlaque from "../NavbarAssets/SVG/EarthInSoundPlaqueNavbar.svg";
import earthInSoundSliderBar from "../NavbarAssets/SVG/EarthInSoundSliderBarNavbar.svg";
import earthInSoundSliderThumb from "../NavbarAssets/SVG/EarthInSoundSliderThumbNavbar.svg";

const GLOW = SECTION_GLOWS.eis;
const LAST_EIS_INDEX = EIS_LINKS.length - 1;

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
  const { activePage, eisSliderPos, eisNavTo, goHome } = useNavbarContext();
  const { logoCellWidth, logoWidth, trackWidth, thumbSize, rowGap } =
    CELL_GEOMETRY.eis;

  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState>({ active: false, startY: 0, startTop: 0 });

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

  const idxToTop = useCallback((idx: number): number => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return 0;

    const step = (track.offsetHeight - thumb.offsetHeight) / LAST_EIS_INDEX;
    return idx * step;
  }, []);

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

  useEffect(() => {
    const raf = requestAnimationFrame(() => snapThumb(eisSliderPos));
    return () => cancelAnimationFrame(raf);
  }, [eisSliderPos, snapThumb]);

  const moveThumbToPointer = (clientY: number): void => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return;

    const rawTop = drag.current.startTop + (clientY - drag.current.startY);
    const maxTop = track.offsetHeight - thumb.offsetHeight;

    thumb.style.top = `${Math.max(0, Math.min(maxTop, rawTop))}px`;
  };

  const finishDrag = (thumb: HTMLDivElement, pointerId: number): void => {
    if (!drag.current.active) return;

    drag.current.active = false;

    if (thumb.hasPointerCapture(pointerId)) {
      thumb.releasePointerCapture(pointerId);
    }

    const top = parseInt(thumb.style.top || "0", 10) || 0;
    eisNavTo(topToIdx(top));
  };

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
      <div className="eis-logo-content">
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

        <div className="navbar-cell navbar-cell--center eis-controls">
          <div className="slider-row">
            <div
              className="eis-track"
              ref={trackRef}
              style={{ width: trackWidth }}
            >
              <div
                className={`eis-thumb ${isActive ? "active" : ""}`}
                ref={thumbRef}
                style={{ width: thumbSize, height: thumbSize }}
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

            <div className="eis-links">
              {EIS_LINKS.map((link, idx) => {
                const on = isActive && eisSliderPos === idx;

                return (
                  <button
                    key={link}
                    type="button"
                    className="eis-link-row"
                    style={{ gap: rowGap }}
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
          position: relative;
          z-index: 1;
          display: flex;
          align-items: stretch;
          min-width: 0;
        }

        .logo-button {
          appearance: none;
          background: transparent;
          border: 0;
          color: inherit;
          flex: 0 0 var(--eis-logo-cell-width);
          font: inherit;
          cursor: pointer;
          padding: clamp(4px, 0.5vw, 8px) 0 0;
          display: flex;
          align-items: center;
          justify-content: center;
          outline-offset: -2px;
        }

        .logo-button:focus-visible {
          outline: 2px solid var(--glow);
        }

        .logo-frame {
          position: relative;
          display: block;
          width: var(--eis-logo-width);
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
          flex: 0.1 1 auto;
        }

        .slider-row {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;
          width: 100%;
          justify-content: center;
          min-width: 0;
          --eis-slider-height: clamp(36px, 7vw, 72px);
        }

        .eis-track {
          height: var(--eis-slider-height);
          background-image: var(--eis-slider-bar);
          background-repeat: no-repeat;
          background-position: center;
          background-size: 100% 100%;
          position: relative;
          flex-shrink: 0;
        }

        .eis-thumb {
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
          touch-action: none;
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
          display: grid;
          grid-template-rows: var(--eis-thumb-size) 1fr var(--eis-thumb-size);
          height: var(--eis-slider-height);
          flex: 1;
        }

        .eis-link-row {
          appearance: none;
          background: transparent;
          border: 0;
          color: inherit;
          font: inherit;
          display: flex;
          align-items: center;
          cursor: pointer;
          padding: 0;
          text-align: left;
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
