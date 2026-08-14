"use client";

import { useEffect, useRef, useState } from "react";
import { useNavbarContext } from "../../state";
import styles from "./StoreCell.module.css";

// Store media asset paths selected by the shared navbar layout state.
const DESKTOP_HOVER_VIDEO_URL =
  "/NavbarAssets/DesktopAssets/Animations/StoreHoverNavbar.mp4";
const DESKTOP_PRESSED_VIDEO_URL =
  "/NavbarAssets/DesktopAssets/Animations/StoreOnNavbar.mp4";
const MOBILE_HOVER_VIDEO_URL =
  "/NavbarAssets/MobileAssets/MP4/StoreHoverMobileNavbar.mp4";
const MOBILE_PRESSED_VIDEO_URL =
  "/NavbarAssets/MobileAssets/MP4/StoreOnMobileNavbar.mp4";
/**
 * Pauses a video and rewinds it to its first frame.
 */
function resetVideo(video: HTMLVideoElement): void {
  video.pause();
  video.currentTime = 0;
}

/**
 * Starts a video from the beginning.
 */
function playVideoFromStart(video: HTMLVideoElement): void {
  video.currentTime = 0;

  void video.play().catch((error: unknown) => {
    /*
     * Changing between compact and wide Store assets can cancel an unfinished
     * play request. That AbortError is expected because a new source is loading.
     */
    if (error instanceof DOMException && error.name === "AbortError") return;

    if (process.env.NODE_ENV !== "production") {
      console.warn("[Store media] Video playback failed.", error);
    }
  });
}
/**
 * Store cell.
 *
 * The button has three visual layers: static image, hover video, and pressed
 * video. React state only decides which layer is visible; CSS owns the layout.
 */
export default function StoreCell() {
  /*
   * isStorePressed is route/navbar state; isHovered is local pointer state.
   */
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

  /* Hover-state video controller. */
  useEffect(() => {
    /*
     * Hover video runs only while the pointer is over Store and Store is not
     * already latched as the active route.
     */
    const video = hoverVideoRef.current;
    if (!video) return;

    if (isHovered && !isStorePressed) {
      playVideoFromStart(video);
      return;
    }

    resetVideo(video);
  }, [isCompactLayout, isHovered, isStorePressed]);

  /*
   * Pressed-state video controller.
   */
  useEffect(() => {
    /*
     * Pressed video loops while /store is the active route. Navigating away
     * resets isStorePressed in navbar state, which rewinds this video.
     */
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
          src={hoverVideoUrl}
          className={`${styles.screenAsset} ${
            isHovered && !isStorePressed ? styles.screenAssetVisible : ""
          }`}
          onCanPlay={(event) => {
            /*
             * A layout change can replace the video source while playback is starting.
             * Retry once the replacement source is ready, but only if hover is active.
             */
            if (isHovered && !isStorePressed && event.currentTarget.paused) {
              playVideoFromStart(event.currentTarget);
            }
          }}
          muted
          playsInline
          preload={isScaleReady ? "auto" : "none"}
        />

        {/* Pressed video layer. */}
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
