"use client";

import { IHM_LINKS } from "../../config";
import KnobJackCell from "../../shared/KnobJackCell/KnobJackCell";
import { useNavbarContext } from "../../state";
import styles from "./IHateMusicCell.module.css";

/**
 * I Hate Music podcast section.
 * Owns IHM-specific plaque/logo artwork and feeds behavior into the knob.
 *
 * The IHM logo click sends users to the first IHM route. The shared knob then
 * handles podcast/community/patreon selection and active jack cable display.
 */
export default function IHateMusicCell() {
  const { knobNavTo } = useNavbarContext();

  return (
    <div className={`navbar-cell navbar-cell--start ${styles.iHateMusicCell}`}>
      <button
        type="button"
        className={styles.iHateMusicLogo}
        aria-label="I Hate Music, go to Podcast"
        onClick={() => knobNavTo("ihm", 0)}
      >
        <span className={styles.iHateMusicLogoFrame} aria-hidden="true">
          <span
            className={`${styles.iHateMusicLogoImage} ${styles.iHateMusicLogoImageOff}`}
          />
          <span
            className={`${styles.iHateMusicLogoImage} ${styles.iHateMusicLogoImageOn}`}
          />
        </span>
      </button>

      <KnobJackCell
        sectionId="ihm"
        sectionLabel="I Hate Music"
        sectionLinks={IHM_LINKS}
        knobArtworkClassName={styles.iHateMusicKnob}
        showJackPort
      />
    </div>
  );
}
