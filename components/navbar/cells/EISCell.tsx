"use client";

import { useCallback, useEffect, useRef } from "react";
import type { CSSProperties, PointerEvent } from "react";
import { CELL_GEOMETRY, EIS_LINKS, SECTION_GLOWS } from "../config";
import { activateOnEnterOrSpace, useNavbarContext } from "../state";

const GLOW = SECTION_GLOWS.eis;

interface DragState {
  active: boolean;
  startY: number;
  startTop: number;
}

/**
 * Earth In Sound slider cell.
 *
 * Pointer Events handle mouse, touch, and stylus through one path. Choosing a
 * link row or releasing the dragged thumb snaps to the nearest valid index.
 */
export default function EISCell() {
  const { activePage, eisSliderPos, eisNavTo } = useNavbarContext();
  const { trackWidth, thumbSize, rowGap } = CELL_GEOMETRY.eis;

  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState>({ active: false, startY: 0, startTop: 0 });

  const isActive = activePage?.section === "eis";
  const styleVars = {
    "--glow": GLOW,
    "--glow-soft": `${GLOW}66`,
    "--glow-dim": `${GLOW}88`,
  } as CSSProperties;

  const idxToTop = useCallback((idx: number): number => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return 0;

    const step =
      (track.offsetHeight - thumb.offsetHeight) / (EIS_LINKS.length - 1);
    return idx * step;
  }, []);

  const topToIdx = useCallback((top: number): number => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return 0;

    const step =
      (track.offsetHeight - thumb.offsetHeight) / (EIS_LINKS.length - 1);
    return Math.max(0, Math.min(EIS_LINKS.length - 1, Math.round(top / step)));
  }, []);

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

  return (
    <div
      className="navbar-cell navbar-cell--center eis-cell"
      style={styleVars}
    >
      <div className="slider-row">
        <div className="eis-track" ref={trackRef} style={{ width: trackWidth }}>
          <div
            className={`eis-thumb ${isActive ? "active" : ""}`}
            ref={thumbRef}
            style={{ width: thumbSize, height: thumbSize }}
            onPointerDown={onThumbPointerDown}
            onPointerMove={onThumbPointerMove}
            onPointerUp={(event) =>
              finishDrag(event.currentTarget, event.pointerId)
            }
            onPointerCancel={(event) =>
              finishDrag(event.currentTarget, event.pointerId)
            }
            aria-label="EIS section slider"
          />
        </div>

        <div className="eis-links">
          {EIS_LINKS.map((link, idx) => {
            const on = isActive && eisSliderPos === idx;

            return (
              <div
                key={link}
                className="eis-link-row"
                style={{ gap: rowGap }}
                onClick={() => eisNavTo(idx)}
                role="button"
                tabIndex={0}
                aria-label={`Navigate to ${link}`}
                aria-pressed={on}
                aria-current={on ? "page" : undefined}
                onKeyDown={(event) =>
                  activateOnEnterOrSpace(event, () => eisNavTo(idx))
                }
              >
                <div className={`led ${on ? "on" : ""}`} />
                <span className={`link-label ${on ? "on" : ""}`}>{link}</span>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .eis-cell {
          flex: 0.1 1 auto;
        }

        .slider-row {
          display: flex;
          align-items: stretch;
          gap: 16px;
          flex: 1;
          width: 100%;
          justify-content: center;
          min-width: 0;
        }

        .eis-track {
          background: #0d0d0d;
          border: 1px solid #2a2a2a;
          border-radius: 4px;
          position: relative;
          flex-shrink: 0;
        }

        .eis-thumb {
          border-radius: 3px;
          background: linear-gradient(145deg, #4a4a4a, #1a1a1a);
          border: 1px solid #555;
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          cursor: grab;
          touch-action: none;
          transition:
            box-shadow 0.2s,
            border-color 0.2s;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
          z-index: 2;
          top: 0;
        }

        .eis-thumb:active {
          cursor: grabbing;
        }

        .eis-thumb.active {
          background: linear-gradient(145deg, #3a6a3a, #1a2e1a);
          border-color: var(--glow);
          box-shadow: 0 0 8px var(--glow-dim);
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
          cursor: pointer;
          padding: 2px 0;
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
