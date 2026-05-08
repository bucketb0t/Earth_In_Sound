"use client";

import { JW_LINKS } from "../../config";
import KnobCell from "../../shared/KnobCell/KnobCell";
import styles from "./JasonWaltonCell.module.css";

/**
 * Jason Walton section.
 * Thin wrapper that feeds Jason-specific identity and links into the knob.
 */
export default function JasonWaltonCell() {
  return (
    <KnobCell
      sectionId="jw"
      label="Jason Walton"
      links={JW_LINKS}
      className={styles.jasonWaltonCell}
    />
  );
}
