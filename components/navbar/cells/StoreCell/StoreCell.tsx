"use client";

import { useEffect, useRef, useState } from "react";
import { useNavbarContext } from "../../state";
import styles from "./StoreCell.module.css";

// Store media asset paths.
const HOVER_VIDEO_URL =
  "/NavbarAssets/DesktopAssets/Animations/StoreHoverNavbar.mp4";
const PRESSED_VIDEO_URL =
  "/NavbarAssets/DesktopAssets/Animations/StoreOnNavbar.mp4";

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
 */
export default function StoreCell() {
  const { isStorePressed, storePress } = useNavbarContext();
  const [isHovered, setIsHovered] = useState(false);

  const hoverVideoRef = useRef<HTMLVideoElement>(null);
  const pressedVideoRef = useRef<HTMLVideoElement>(null);

  /* Hover-state video controller. */
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
   * Pressed-state video controller.
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
    <div className={`navbar-cell navbar-cell--center ${styles.storeCell}`}>
      <button
        type="button"
        className={styles.screenButton}
        onClick={storePress}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Store"
        aria-pressed={isStorePressed}
      >
        {/* Static screen layer. */}
        <div
          aria-hidden="true"
          className={`${styles.screenAsset} ${styles.screenAssetStatic} ${
            !isHovered && !isStorePressed ? styles.screenAssetVisible : ""
          }`}
        />

        {/* Hover video layer. */}
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

        {/* Pressed video layer. */}
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
      </button>
    </div>
  );
}
