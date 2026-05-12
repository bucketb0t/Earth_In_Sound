"use client";

import { useEffect, useRef, useState } from "react";
import { useNavbarContext } from "../../state";
import styles from "./StoreCell.module.css";

// Public media paths keep the navbar assets centralized under /public.
const HOVER_VIDEO_URL = "/NavbarAssets/Animations/StoreHoverNavbar.mp4";
const PRESSED_VIDEO_URL = "/NavbarAssets/Animations/StoreOnNavbar.mp4";

function resetVideo(video: HTMLVideoElement): void {
  video.pause();
  video.currentTime = 0;
}

function playVideoFromStart(video: HTMLVideoElement): void {
  video.currentTime = 0;
  void video.play();
}

/**
 * Store cell.
 * Shows a static PNG by default, a one-shot hover video on mouse-over,
 * and a looping active video while Store stays latched as pressed.
 */
export default function StoreCell() {
  const { isStorePressed, storePress } = useNavbarContext();
  const [isHovered, setIsHovered] = useState(false);

  const hoverVideoRef = useRef<HTMLVideoElement>(null);
  const pressedVideoRef = useRef<HTMLVideoElement>(null);

  /* Play the hover video only while the cursor is over the idle store cell. */
  useEffect(() => {
    const video = hoverVideoRef.current;
    if (!video) return;

    if (isHovered && !isStorePressed) {
      playVideoFromStart(video);
      return;
    }

    resetVideo(video);
  }, [isHovered, isStorePressed]);

  /*
   * The pressed video owns the screen while Store is latched.
   * It starts from frame 0 when pressed, then loops until navigation clears it.
   */
  useEffect(() => {
    const video = pressedVideoRef.current;
    if (!video) return;

    if (isStorePressed) {
      playVideoFromStart(video);
      return;
    }

    resetVideo(video);
  }, [isStorePressed]);

  return (
    <button
      type="button"
      className={`navbar-cell navbar-cell--center ${styles.storeCell}`}
      onClick={storePress}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Store"
      aria-pressed={isStorePressed}
    >
      <div className={styles.screenContainer}>
        {/* Default state: static artwork shown when idle and not hovered. */}
        <div
          aria-hidden="true"
          className={`${styles.screenAsset} ${styles.screenAssetStatic} ${
            !isHovered && !isStorePressed ? styles.screenAssetVisible : ""
          }`}
        />

        {/* Hover state: plays once while the cursor is over the idle store cell. */}
        <video
          ref={hoverVideoRef}
          src={HOVER_VIDEO_URL}
          className={`${styles.screenAsset} ${
            isHovered && !isStorePressed ? styles.screenAssetVisible : ""
          }`}
          muted
          playsInline
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
