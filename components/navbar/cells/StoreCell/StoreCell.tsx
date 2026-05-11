"use client";

import { useEffect, useRef, useState } from "react";
import { useNavbarContext } from "../../state";
import styles from "./StoreCell.module.css";

// Public media paths keep the navbar assets centralized under /public.
const HOVER_VIDEO_URL = "/NavbarAssets/Animations/StoreHooverNavbar.mp4";
const PRESSED_VIDEO_URL = "/NavbarAssets/Animations/StoreOnNavbar.mp4";

/**
 * Store cell.
 * Shows a static PNG by default, a looping hover video on mouse-over,
 * and a looping active video while Store stays latched as pressed.
 */
export default function StoreCell() {
  const { storeAnimating, isStorePressed, storePress } = useNavbarContext();
  const [isHovered, setIsHovered] = useState(false);

  const hoverVideoRef = useRef<HTMLVideoElement>(null);
  const pressedVideoRef = useRef<HTMLVideoElement>(null);

  /* Play the hover video only while the cursor is over the idle store cell. */
  useEffect(() => {
    const video = hoverVideoRef.current;
    if (!video) return;

    if (isHovered && !storeAnimating && !isStorePressed) {
      video.currentTime = 0;
      void video.play();
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [isHovered, isStorePressed, storeAnimating]);

  /*
   * The pressed video owns the screen while Store is latched.
   * It starts from frame 0 on activation, then loops until navigation clears
   * the pressed state.
   */
  useEffect(() => {
    const video = pressedVideoRef.current;
    if (!video) return;

    if (isStorePressed) {
      if (storeAnimating) {
        video.currentTime = 0;
      }
      void video.play();
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [isStorePressed, storeAnimating]);

  return (
    <button
      type="button"
      className={`navbar-cell navbar-cell--center ${styles.storeCell}`}
      onClick={storePress}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Store"
      aria-busy={storeAnimating}
      aria-pressed={isStorePressed}
    >
      <div className={styles.screenContainer}>
        {/* Default state: static artwork shown when idle and not hovered. */}
        <div
          aria-hidden="true"
          className={`${styles.screenAsset} ${
            styles.screenAssetStatic
          } ${
            !isHovered && !isStorePressed ? styles.screenAssetVisible : ""
          }`}
        />

        {/* Hover state: loops while the cursor is over the idle store cell. */}
        <video
          ref={hoverVideoRef}
          src={HOVER_VIDEO_URL}
          className={`${styles.screenAsset} ${
            isHovered && !isStorePressed ? styles.screenAssetVisible : ""
          }`}
          muted
          playsInline
          loop
          preload="auto"
        />

        {/* Pressed state: loops for as long as Store stays latched. */}
        <video
          ref={pressedVideoRef}
          src={PRESSED_VIDEO_URL}
          className={`${styles.screenAsset} ${
            isStorePressed ? styles.screenAssetVisible : ""
          }`}
          muted
          playsInline
          loop
          preload="auto"
        />
      </div>
    </button>
  );
}
