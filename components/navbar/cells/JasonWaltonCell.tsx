"use client";

import { JW_LINKS, SECTION_GLOWS } from "../config";
import KnobCell from "../shared/KnobCell";

/**
 * Jason Walton section.
 * Thin wrapper that feeds Jason-specific labels/color into the shared knob.
 */
export default function JasonWaltonCell() {
  return (
    <KnobCell
      sectionId="jw"
      label="Jason Walton"
      links={JW_LINKS}
      glow={SECTION_GLOWS.jw}
    />
  );
}
