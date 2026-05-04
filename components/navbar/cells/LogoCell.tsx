"use client";

import Image from "next/image";
import { activateOnEnterOrSpace, useNavbarContext } from "../state";

/**
 * Logo cell.
 *
 * Clicking or keyboard-activating the logo routes the navbar back to the EIS
 * Home state. The image dimensions are fixed so the header does not flash at
 * the wrong size while Next Image resolves layout.
 */
export default function LogoCell() {
  const { goHome } = useNavbarContext();

  return (
    <div
      className="logo-cell"
      onClick={goHome}
      role="button"
      tabIndex={0}
      aria-label="Earth In Sound, go to home"
      onKeyDown={(event) => activateOnEnterOrSpace(event, goHome)}
    >
      <Image
        src="/EarthInSound.webp"
        alt="Earth In Sound logo"
        width={130}
        height={90}
        style={{ objectFit: "contain", width: "100%", height: "auto" }}
        priority
      />

      <style jsx>{`
        .logo-cell {
          flex: 0 0 200px;
          cursor: pointer;
          padding: 6px 16px 6px 0;
          display: flex;
          align-items: center;
          justify-content: center;
          outline-offset: -2px;
        }

        .logo-cell:focus-visible {
          outline: 2px solid #22c55e;
        }
      `}</style>
    </div>
  );
}
