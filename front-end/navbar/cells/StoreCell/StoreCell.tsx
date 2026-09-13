"use client";

import { useEffect, useRef, useState } from "react";
import { useNavbarContext } from "../../state";
import styles from "./StoreCell.module.css";

const DESKTOP_HOVER_VIDEO_URL =
  "/NavbarAssets/DesktopAssets/Animations/StoreHoverNavbar.mp4";
const DESKTOP_PRESSED_VIDEO_URL =
  "/NavbarAssets/DesktopAssets/Animations/StoreOnNavbar.mp4";
const MOBILE_HOVER_VIDEO_URL =
  "/NavbarAssets/MobileAssets/MP4/StoreHoverMobileNavbar.mp4";
const MOBILE_PRESSED_VIDEO_URL =
  "/NavbarAssets/MobileAssets/MP4/StoreOnMobileNavbar.mp4";

function resetVideo(video: HTMLVideoElement): void {
  video.pause();
  video.currentTime = 0;
}

function playVideoFromStart(video: HTMLVideoElement): void {
  video.currentTime = 0;

  void video.play().catch((error: unknown) => {
    /* Asset changes can cancel pending playback; source-change AbortErrors are expected. */
    if (error instanceof DOMException && error.name === "AbortError") return;

    if (process.env.NODE_ENV !== "production") {
      console.warn("[Store media] Video playback failed.", error);
    }
  });
}

/** Layer static, hover, and pressed artwork within one CSS-sized button. */
export default function StoreCell() {
  const { isStorePressed, storePress, isCompactLayout, isScaleReady } =
    useNavbarContext();
  const [isHovered, setIsHovered] = useState(false);
  const hoverVideoUrl = isScaleReady
    ? isCompactLayout
      ? MOBILE_HOVER_VIDEO_URL
      : DESKTOP_HOVER_VIDEO_URL
    : undefined;
  const pressedVideoUrl = isScaleReady
    ? isCompactLayout
      ? MOBILE_PRESSED_VIDEO_URL
      : DESKTOP_PRESSED_VIDEO_URL
    : undefined;

  const hoverVideoRef = useRef<HTMLVideoElement>(null);
  const pressedVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    /* Play hover artwork only while hovered and not selected. */
    const video = hoverVideoRef.current;
    if (!video) return;

    if (isHovered && !isStorePressed) {
      playVideoFromStart(video);
      return;
    }

    resetVideo(video);
  }, [isCompactLayout, isHovered, isStorePressed]);

  useEffect(() => {
    /* Play pressed artwork while Store is active; rewind when selection clears. */
    const video = pressedVideoRef.current;
    if (!video) return;

    if (isStorePressed) {
      playVideoFromStart(video);
      return;
    }

    resetVideo(video);
  }, [isCompactLayout, isStorePressed]);

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
        <div
          aria-hidden="true"
          className={`${styles.screenAsset} ${styles.screenAssetStatic} ${
            !isHovered && !isStorePressed ? styles.screenAssetVisible : ""
          }`}
        />

        <video
          ref={hoverVideoRef}
          src={hoverVideoUrl}
          className={`${styles.screenAsset} ${
            isHovered && !isStorePressed ? styles.screenAssetVisible : ""
          }`}
          onCanPlay={(event) => {
            /* Retry source-change playback only while hover remains active. */
            if (isHovered && !isStorePressed && event.currentTarget.paused) {
              playVideoFromStart(event.currentTarget);
            }
          }}
          muted
          playsInline
          preload={isScaleReady ? "auto" : "none"}
        />

        <video
          ref={pressedVideoRef}
          src={pressedVideoUrl}
          className={`${styles.screenAsset} ${
            isStorePressed ? styles.screenAssetVisible : ""
          }`}
          muted
          playsInline
          loop
          preload={isScaleReady ? "auto" : "none"}
        />
      </button>
    </div>
  );
}
