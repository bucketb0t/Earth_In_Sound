'use client';

/**
 * EisCell.tsx
 * ─────────────────────────────────────────────────────────────────
 * "Earth In Sound" section cell — 3-state vertical slider.
 *
 * Behaviour:
 *   · Slider has 3 snap positions: top (Home), middle (About),
 *     bottom (Contact).
 *   · Dragging the thumb (mouse & touch) snaps to the nearest
 *     stop position on release.
 *   · Clicking a LED row directly also snaps the thumb.
 *   · Slider thumb glows green (#22c55e) when the section is active.
 *   · Slider position PERSISTS when the user switches to another
 *     section; only the LED glow and jack go dark.
 *   · Jack port glows green when EIS is the active section.
 * ─────────────────────────────────────────────────────────────────
 */

import { useRef, useEffect, useCallback } from 'react';
import type { MouseEvent, TouchEvent, KeyboardEvent } from 'react';
import { useNavbarContext } from '../../lib/NavbarContext';
import { EIS_LINKS } from '../../lib/navbarConfig';
import JackPort from './JackPort';

const GLOW = '#22c55e';

interface DragState {
  active: boolean;
  startY: number;
  startTop: number;
}

export default function EisCell() {
  const { activePage, eisSliderPos, eisNavTo } = useNavbarContext();

  const isActive = activePage?.section === 'eis';

  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState>({ active: false, startY: 0, startTop: 0 });

  // ── Geometry helpers ──────────────────────────────────────────

  const idxToTop = useCallback((idx: number): number => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return 0;
    const trackH = track.offsetHeight;
    const thumbH = thumb.offsetHeight;
    const step = (trackH - thumbH) / (EIS_LINKS.length - 1);
    return idx * step;
  }, []);

  const topToIdx = useCallback((top: number): number => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return 0;
    const trackH = track.offsetHeight;
    const thumbH = thumb.offsetHeight;
    const step = (trackH - thumbH) / (EIS_LINKS.length - 1);
    return Math.max(0, Math.min(EIS_LINKS.length - 1, Math.round(top / step)));
  }, []);

  const snapThumb = useCallback(
    (idx: number): void => {
      const thumb = thumbRef.current;
      if (!thumb) return;
      thumb.style.transition = 'top 0.2s ease';
      thumb.style.top = idxToTop(idx) + 'px';
    },
    [idxToTop]
  );

  // ── Sync thumb to eisSliderPos ─────────────────────────────────

  useEffect(() => {
    const raf = requestAnimationFrame(() => snapThumb(eisSliderPos));
    return () => cancelAnimationFrame(raf);
  }, [eisSliderPos, snapThumb]);

  // ── Drag handlers ─────────────────────────────────────────────

  const onThumbMouseDown = (e: MouseEvent<HTMLDivElement>): void => {
    drag.current = {
      active: true,
      startY: e.clientY,
      startTop: parseInt(thumbRef.current?.style.top ?? '0') || 0,
    };
    if (thumbRef.current) thumbRef.current.style.transition = 'none';
    e.preventDefault();
  };

  useEffect(() => {
    const onMouseMove = (e: globalThis.MouseEvent): void => {
      if (!drag.current.active) return;
      const track = trackRef.current;
      const thumb = thumbRef.current;
      if (!track || !thumb) return;
      const trackH = track.offsetHeight;
      const thumbH = thumb.offsetHeight;
      const rawTop = drag.current.startTop + (e.clientY - drag.current.startY);
      thumb.style.top = Math.max(0, Math.min(trackH - thumbH, rawTop)) + 'px';
    };

    const onMouseUp = (): void => {
      if (!drag.current.active) return;
      drag.current.active = false;
      const top = parseInt(thumbRef.current?.style.top ?? '0') || 0;
      eisNavTo(topToIdx(top));
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [eisNavTo, topToIdx]);

  const onThumbTouchStart = (e: TouchEvent<HTMLDivElement>): void => {
    drag.current = {
      active: true,
      startY: e.touches[0]!.clientY,
      startTop: parseInt(thumbRef.current?.style.top ?? '0') || 0,
    };
    if (thumbRef.current) thumbRef.current.style.transition = 'none';
  };

  useEffect(() => {
    const onTouchMove = (e: globalThis.TouchEvent): void => {
      if (!drag.current.active) return;
      const track = trackRef.current;
      const thumb = thumbRef.current;
      if (!track || !thumb) return;
      const trackH = track.offsetHeight;
      const thumbH = thumb.offsetHeight;
      const rawTop = drag.current.startTop + (e.touches[0]!.clientY - drag.current.startY);
      thumb.style.top = Math.max(0, Math.min(trackH - thumbH, rawTop)) + 'px';
    };

    const onTouchEnd = (): void => {
      if (!drag.current.active) return;
      drag.current.active = false;
      const top = parseInt(thumbRef.current?.style.top ?? '0') || 0;
      eisNavTo(topToIdx(top));
    };

    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [eisNavTo, topToIdx]);

  return (
    <div className="cell" style={{ '--glow': GLOW } as React.CSSProperties}>
      <div className="cell-label">Earth In Sound</div>

      <div className="slider-row">
        <div className="eis-track" ref={trackRef}>
          <div
            className={`eis-thumb ${isActive ? 'active' : ''}`}
            ref={thumbRef}
            onMouseDown={onThumbMouseDown}
            onTouchStart={onThumbTouchStart}
            aria-label="EIS section slider"
          />
        </div>

        <div className="eis-links">
          {EIS_LINKS.map((link, i) => {
            const on = isActive && eisSliderPos === i;
            return (
              <div
                key={link}
                className="eis-link-row"
                onClick={() => eisNavTo(i)}
                role="button"
                tabIndex={0}
                onKeyDown={(e: KeyboardEvent<HTMLDivElement>) =>
                  e.key === 'Enter' && eisNavTo(i)
                }
                aria-label={`Navigate to ${link}`}
              >
                <div className={`led ${on ? 'on' : ''}`} id={`led-eis-${i}`} />
                <span
                  className={`link-label ${on ? 'on' : ''}`}
                  id={`lbl-eis-${i}`}
                >
                  {link}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <JackPort active={isActive} glow={GLOW} />

      <style jsx>{`
        .cell {
          flex: 1 1 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 10px 8px;
          position: relative;
          min-width: 0;
          border-left: 1px solid #2a2a2a;
        }

        .cell-label {
          font-size: 8px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #555;
          margin-bottom: 6px;
          text-align: center;
          white-space: nowrap;
        }

        .slider-row {
          display: flex;
          align-items: stretch;
          gap: 8px;
          flex: 1;
          width: 100%;
          justify-content: center;
        }

        .eis-track {
          width: 8px;
          background: #0d0d0d;
          border: 1px solid #2a2a2a;
          border-radius: 4px;
          position: relative;
          flex-shrink: 0;
        }

        .eis-thumb {
          width: 16px;
          height: 16px;
          border-radius: 3px;
          background: linear-gradient(145deg, #4a4a4a, #1a1a1a);
          border: 1px solid #555;
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          cursor: grab;
          transition: box-shadow 0.2s, border-color 0.2s;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
          z-index: 2;
          top: 0;
        }
        .eis-thumb:active {
          cursor: grabbing;
        }
        .eis-thumb.active {
          background: linear-gradient(145deg, #3a6a3a, #1a2e1a);
          border-color: #22c55e;
          box-shadow: 0 0 8px #22c55e88;
        }

        .eis-links {
          display: flex;
          flex-direction: column;
          justify-content: space-around;
          flex: 1;
        }

        .eis-link-row {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          padding: 2px 0;
        }

        .led {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #111;
          border: 1px solid #2a2a2a;
          flex-shrink: 0;
          transition: background 0.25s, border-color 0.25s, box-shadow 0.25s;
          cursor: pointer;
        }
        .led.on {
          background: ${GLOW};
          border-color: ${GLOW};
          box-shadow: 0 0 6px ${GLOW}, 0 0 12px ${GLOW}66;
        }

        .link-label {
          font-size: 9px;
          letter-spacing: 0.05em;
          color: #444;
          transition: color 0.2s;
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
        }
        .link-label.on {
          color: ${GLOW};
        }
      `}</style>
    </div>
  );
}
