"use client";

import { JW_LINKS } from "../../../config";
import KnobJackCell from "../../shared/KnobJackCell/KnobJackCell";
import { useNavbarContext } from "../../../state";
import styles from "./JasonWaltonCell.module.css";

/**
 * Jason Walton section.
 * Owns Jason-specific plaque/logo artwork and feeds behavior into the knob.
 *
 * The cell wrapper is responsible for artwork and page identity. The shared
 * KnobJackCell is responsible for actual knob/LED interaction.
 */
export default function JasonWaltonCell() {
  const { knobNavTo } = useNavbarContext();

  return (
    <div className={`navbar-cell navbar-cell--start ${styles.jasonWaltonCell}`}>
      <button
        type="button"
        className={styles.jasonWaltonLogo}
        aria-label="Jason Walton, go to Biography"
        onClick={() => knobNavTo("jw", 0)}
      >
        <span className={styles.jasonWaltonLogoFrame} aria-hidden="true">
          <span
            className={`${styles.jasonWaltonLogoImage} ${styles.jasonWaltonLogoImageOff}`}
          />
          <span
            className={`${styles.jasonWaltonLogoImage} ${styles.jasonWaltonLogoImageOn}`}
          />
        </span>
      </button>

      <KnobJackCell
        sectionId="jw"
        sectionLabel="Jason Walton"
        sectionLinks={JW_LINKS}
        knobArtworkClassName={styles.jasonWaltonKnob}
        showJackPort
      />
    </div>
  );
}
