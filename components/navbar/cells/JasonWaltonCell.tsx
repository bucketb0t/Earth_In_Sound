"use client";

import { JW_LINKS, SECTION_GLOWS } from "../config";
import KnobCell from "../shared/KnobCell";

/**
 * Jason Walton section.
 *
 * This wrapper keeps section-specific content separate from the reusable knob
 * machinery, which makes future custom artwork for this cell easy to isolate.
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
