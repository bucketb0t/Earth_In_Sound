"use client";

import { IHM_LINKS, SECTION_GLOWS } from "../config";
import KnobCell from "../shared/KnobCell";

/**
 * I Hate Music podcast section.
 * Thin wrapper that feeds podcast-specific labels/color into the shared knob.
 */
export default function IHateMusicCell() {
  return (
    <KnobCell
      sectionId="ihm"
      label="I Hate Music"
      links={IHM_LINKS}
      glow={SECTION_GLOWS.ihm}
    />
  );
}
