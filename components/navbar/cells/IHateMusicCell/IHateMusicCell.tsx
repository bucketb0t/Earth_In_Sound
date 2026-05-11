"use client";

import { IHM_LINKS } from "../../config";
import KnobJackCell from "../../shared/KnobJackCell/KnobJackCell";
import styles from "./IHateMusicCell.module.css";

/**
 * I Hate Music podcast section.
 * Owns IHM-specific plaque/logo artwork and feeds behavior into the knob.
 */
export default function IHateMusicCell() {
  return (
    <div className={`navbar-cell navbar-cell--start ${styles.iHateMusicCell}`}>
      <div
        className={styles.iHateMusicLogo}
        role="img"
        aria-label="I Hate Music"
      />

      <KnobJackCell
        sectionId="ihm"
        sectionLabel="I Hate Music"
        links={IHM_LINKS}
        knobArtworkClassName={styles.iHateMusicKnob}
        showJackPort
      />
    </div>
  );
}
