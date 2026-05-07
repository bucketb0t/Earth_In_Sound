"use client";

import type { CSSProperties } from "react";
import jackPlugNavbar from "../NavbarAssets/PNG/JackPlugNavbar.png";
import jackPortNavbar from "../NavbarAssets/PNG/JackPortNavbar.png";

interface JackLEDPortProps {
  active: boolean;
}

/**
 * Corner jack indicator for knob cells.
 * Uses KnobCell's --glow variable and local bitmap port/plug assets.
 */
export default function JackLEDPort({ active }: JackLEDPortProps) {
  const jackPlugUrl =
    typeof jackPlugNavbar === "string" ? jackPlugNavbar : jackPlugNavbar.src;

  const jackPortUrl =
    typeof jackPortNavbar === "string" ? jackPortNavbar : jackPortNavbar.src;

  /* Inline visibility prevents inactive plug flash before scoped CSS loads. */
  const plugStyle = {
    opacity: active ? 1 : 0,
    visibility: active ? "visible" : "hidden",
    transform: active ? "translateY(0)" : "translateY(20px)",
  } satisfies CSSProperties;

  // Asset variables keep bitmap URLs in React and positioning in CSS.
  const assetStyle = {
    "--jack-plug": `url(${jackPlugUrl})`,
    "--jack-port": `url(${jackPortUrl})`,
  } as CSSProperties;

  return (
    <div className="jack-led-port" style={assetStyle}>
      {/* LED and port glow through the parent knob's --glow color. */}
      <div className={`led-indicator ${active ? "active" : ""}`} />
      <div className={`port ${active ? "active" : ""}`} />
      <div className="plug" style={plugStyle} />

      <style jsx>{`
        .jack-led-port {
          /* Full-cell overlay; does not affect knob SVG layout. */
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: visible;
          z-index: 3;
        }

        .led-indicator {
          position: absolute;
          top: 5px;
          right: 6px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #736969;
          transition:
            background 0.25s ease,
            box-shadow 0.25s ease;
          pointer-events: none;
        }

        .led-indicator.active {
          background: var(--glow);
          box-shadow: 0 0 8px var(--glow);
        }

        .port {
          /* Hand-tuned bitmap socket position for the current navbar artwork. */
          position: absolute;
          bottom: -15px;
          right: 4.5px;
          width: 48px;
          height: 48px;
          background-image: var(--jack-port);
          background-repeat: no-repeat;
          background-position: center;
          background-size: contain;
          transition:
            filter 0.25s ease,
            opacity 0.25s ease;
          pointer-events: none;
        }

        .port.active {
          filter: drop-shadow(0 0 6px var(--glow));
        }

        .plug {
          /* Hidden until active; positioned to visually meet the socket. */
          position: absolute;
          bottom: -40px;
          right: 4px;
          width: 48px;
          height: 96px;
          background-image: var(--jack-plug);
          background-repeat: no-repeat;
          background-position: center;
          background-size: contain;
          transition:
            opacity 0.2s ease,
            visibility 0.2s ease,
            transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
