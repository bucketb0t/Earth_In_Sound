"use client";

import { JW_LINKS } from "../../config";
import KnobCell from "../../shared/KnobJackCell/KnobJackCell";
import styles from "./JasonWaltonCell.module.css";

/**
 * Jason Walton section.
 * Owns Jason-specific plaque/logo artwork and feeds behavior into the knob.
 */
export default function JasonWaltonCell() {
  return (
    <div
      className={`navbar-cell navbar-cell--start ${styles.jasonWaltonCell}`}
    >
      <div
        className={styles.jasonWaltonLogo}
        role="img"
        aria-label="Jason Walton"
      />

      <KnobCell
        sectionId="jw"
        sectionLabel="Jason Walton"
        links={JW_LINKS}
        knobArtworkClassName={styles.jasonWaltonKnob}
      />
    </div>
  );
}
