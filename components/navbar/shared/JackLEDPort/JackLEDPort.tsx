"use client";

import styles from "./JackLEDPort.module.css";

interface JackLEDPortProps {
  isActive: boolean;
}

/**
 * Corner jack indicator for knob cells.
 * Uses KnobCell's --glow variable and local bitmap port/plug assets.
 */
export default function JackLEDPort({ isActive }: JackLEDPortProps) {
  return (
    <div className={styles.jackLedPort}>
      {/* LED and port glow through the parent knob's --glow color. */}
      <div
        className={`${styles.ledIndicator} ${
          isActive ? styles.ledIndicatorActive : ""
        }`}
      />
      <div className={`${styles.port} ${isActive ? styles.portActive : ""}`} />
      <div className={`${styles.plug} ${isActive ? styles.plugActive : ""}`} />
    </div>
  );
}
