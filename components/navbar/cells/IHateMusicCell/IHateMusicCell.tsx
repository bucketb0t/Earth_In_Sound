"use client";

import { IHM_LINKS } from "../../config";
import KnobCell from "../../shared/KnobCell/KnobCell";

/**
 * I Hate Music podcast section.
 * Thin wrapper that feeds podcast-specific identity and links into the knob.
 */
export default function IHateMusicCell() {
  return (
    <KnobCell
      sectionId="ihm"
      label="I Hate Music"
      links={IHM_LINKS}
    />
  );
}
