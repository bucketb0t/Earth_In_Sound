"use client";

import type { CSSProperties } from "react";

interface LEDPortProps {
  active: boolean;
}

/**
 * Corner jack indicator for knob cells.
 *
 * The parent KnobCell provides --glow CSS variables, so this decorative piece
 * can share the section color without receiving styling props.
 */
export default function JackLEDPort({ active }: LEDPortProps) {
  /*
   * Visibility is applied inline, not only through styled-jsx, to prevent a
   * first-paint flash where inactive cables can appear before scoped CSS lands.
   */
  const cableStyle = {
    opacity: active ? 1 : 0,
    visibility: active ? "visible" : "hidden",
    transform: active ? "translateY(0)" : "translateY(20px)",
  } satisfies CSSProperties;

  return (
    <>
      <div className={`led-indicator ${active ? "active" : ""}`} />
      <div className={`port ${active ? "active" : ""}`}>
        <div className="port-inner" />
      </div>
      <div className="cable" style={cableStyle} />

      <style jsx>{`
        .led-indicator {
          position: absolute;
          top: 5px;
          right: 6px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #736969;
          transition: all 0.25s ease;
          pointer-events: none;
        }

        .led-indicator.active {
          background: var(--glow);
          box-shadow: 0 0 8px var(--glow);
        }

        .port {
          position: absolute;
          bottom: 5px;
          right: 6px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #0d0d0d;
          border: 2px solid #222;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          pointer-events: none;
        }

        .port.active {
          border-color: var(--glow);
          box-shadow: 0 0 6px var(--glow);
        }

        .port-inner {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #2a2a2a;
        }

        .port.active .port-inner {
          background: var(--glow);
        }

        .cable {
          position: absolute;
          bottom: -40px;
          right: 11px;
          width: 3px;
          height: 40px;
          background: #2a2a2a;
          border-radius: 2px;
          transition:
            opacity 0.2s ease,
            visibility 0.2s ease,
            transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }

        .cable::after {
          content: "";
          position: absolute;
          top: -6px;
          left: -2px;
          width: 7px;
          height: 6px;
          background: #ccc;
          border-radius: 2px;
        }

      `}</style>
    </>
  );
}
