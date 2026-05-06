"use client";

import type { CSSProperties } from "react";
import jackPlugNavbar from "../NavbarAssets/PNG/JackPlugNavbar.png";
import jackPortNavbar from "../NavbarAssets/PNG/JackPortNavbar.png";

interface JackLEDPortProps {
  active: boolean;
}

/**
 * Corner jack indicator for knob cells.
 *
 * The parent KnobCell provides --glow, so this component can share the active
 * section color. The port and plug are bitmap assets stored with the navbar.
 */
export default function JackLEDPort({ active }: JackLEDPortProps) {
  const jackPlugUrl =
    typeof jackPlugNavbar === "string" ? jackPlugNavbar : jackPlugNavbar.src;

  const jackPortUrl =
    typeof jackPortNavbar === "string" ? jackPortNavbar : jackPortNavbar.src;

  /*
   * Visibility is applied inline, not only through styled-jsx, to prevent a
   * first-paint flash where inactive plugs can appear before scoped CSS lands.
   */
  const plugStyle = {
    opacity: active ? 1 : 0,
    visibility: active ? "visible" : "hidden",
    transform: active ? "translateY(0)" : "translateY(20px)",
  } satisfies CSSProperties;

  const assetStyle = {
    "--jack-plug": `url(${jackPlugUrl})`,
    "--jack-port": `url(${jackPortUrl})`,
  } as CSSProperties;

  return (
    <div className="jack-led-port" style={assetStyle}>
      <div className={`led-indicator ${active ? "active" : ""}`} />
      <div className={`port ${active ? "active" : ""}`} />
      <div className="plug" style={plugStyle} />

      <style jsx>{`
        .jack-led-port {
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
          transition: all 0.25s ease;
          pointer-events: none;
        }

        .led-indicator.active {
          background: var(--glow);
          box-shadow: 0 0 8px var(--glow);
        }

        .port {
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
