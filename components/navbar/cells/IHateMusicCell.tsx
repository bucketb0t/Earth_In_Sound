"use client";

import { IHM_LINKS, SECTION_GLOWS } from "../config";
import KnobCell from "../shared/KnobCell";

/**
 * I Hate Music podcast section.
 *
 * The podcast keeps its labels and glow color here while sharing the rotary
 * knob behavior with other artist/section cells.
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
