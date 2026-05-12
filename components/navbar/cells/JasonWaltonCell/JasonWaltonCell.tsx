"use client";

import { JW_LINKS } from "../../config";
import KnobCell from "../../shared/KnobJackCell/KnobJackCell";
import { useNavbarContext } from "../../state";
import styles from "./JasonWaltonCell.module.css";

/**
 * Jason Walton section.
 * Owns Jason-specific plaque/logo artwork and feeds behavior into the knob.
 */
export default function JasonWaltonCell() {
  const { knobNavTo } = useNavbarContext();

  return (
    <div
      className={`navbar-cell navbar-cell--start ${styles.jasonWaltonCell}`}
    >
      <button
        type="button"
        className={styles.jasonWaltonLogo}
        aria-label="Jason Walton, go to Biography"
        onClick={() => knobNavTo("jw", 0)}
      />

      <KnobCell
        sectionId="jw"
        sectionLabel="Jason Walton"
        links={JW_LINKS}
        knobArtworkClassName={styles.jasonWaltonKnob}
        showJackPort
      />
    </div>
  );
}
