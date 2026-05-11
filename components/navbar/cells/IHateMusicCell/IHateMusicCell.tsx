"use client";

import { IHM_LINKS } from "../../config";
import KnobJackCell from "../../shared/KnobJackCell/KnobJackCell";
import styles from "./IHateMusicCell.module.css";

/**
 * I Hate Music podcast section.
 * Thin wrapper that feeds podcast-specific identity and links into the knob.
 */
export default function IHateMusicCell() {
  return (
    <KnobJackCell
      sectionId="ihm"
      label="I Hate Music"
      links={IHM_LINKS}
      className={styles.iHateMusicCell}
      showJackPort
    />
  );
}
