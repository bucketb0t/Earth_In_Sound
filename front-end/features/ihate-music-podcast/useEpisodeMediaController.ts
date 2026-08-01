"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useVideoAudioContinuity,
  type LogMediaSwitch,
} from "./useVideoAudioContinuity";
import {
  createYouTubePlayer,
  parseYouTubeVideoId,
  type YouTubePlayer,
} from "./youtubePlayer";

export type MediaMode = "audio" | "video";

interface UseEpisodeMediaControllerOptions {
  audioUrl: string | null;
  episodeId: string;
}

/**
 * Owns one episode's media state and connects the rendered controls to the
 * YouTube player and audio-continuity hook.
 */
export function useEpisodeMediaController({
  audioUrl,
  episodeId,
}: UseEpisodeMediaControllerOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoHostRef = useRef<HTMLDivElement | null>(null);
  const youtubePlayerRef = useRef<YouTubePlayer | null>(null);

  const [activeMode, setActiveMode] = useState<MediaMode>("audio");
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [videoError, setVideoError] = useState("");

  const hasVideo = youtubeVideoId !== null;
  const audioTabIsActive = activeMode === "audio";
  const videoTabIsActive = activeMode === "video";

  const pauseAudio = useCallback((): void => {
    audioRef.current?.pause();
  }, []);

  const pauseVideo = useCallback((): void => {
    youtubePlayerRef.current?.pauseVideo();
  }, []);

  const logMediaSwitch = useCallback<LogMediaSwitch>(
    (fromMode, toMode, reason, timestamp): void => {
      if (process.env.NODE_ENV === "production") return;
      const readableEpisodeId = decodeURIComponent(episodeId)
        .split("/")
        .pop()
        ?.replace(/^episode-?\d*-?/i, "")
        .replace(/-/g, " ")
        .trim();
      const timestampLabel =
        typeof timestamp === "number" && Number.isFinite(timestamp)
          ? ` at ${Math.max(0, timestamp).toFixed(1)}s`
          : "";

      console.info(
        `[Episode media] ${fromMode.toUpperCase()} -> ${toMode.toUpperCase()}${timestampLabel}. Reason: ${reason}. Episode: ${readableEpisodeId || episodeId}`,
      );
    },
    [episodeId],
  );

  const {
    backgroundAudioConsentGiven,
    backgroundAudioError,
    changeBackgroundAudioConsent,
    handleYouTubeStateChange,
    resetVideoContinuityState,
    stopBackgroundAudioStandby,
    stopHiddenHandoffIfUserPausedAudio,
  } = useVideoAudioContinuity({
    audioRef,
    audioUrl,
    hasVideo,
    logMediaSwitch,
    videoTabIsActive,
    youtubePlayerRef,
  });

  const selectAudio = useCallback((): void => {
    resetVideoContinuityState();
    logMediaSwitch("video", "audio", "manual tab selection");
    setActiveMode("audio");
    pauseVideo();
  }, [logMediaSwitch, pauseVideo, resetVideoContinuityState]);

  const selectVideo = useCallback((): void => {
    logMediaSwitch("audio", "video", "manual tab selection");
    setActiveMode("video");
    stopBackgroundAudioStandby();
    pauseAudio();
    audioRef.current?.load();
  }, [logMediaSwitch, pauseAudio, stopBackgroundAudioStandby]);

  const loadVideoUrl = useCallback(
    (videoUrl: string): void => {
      const nextVideoUrl = videoUrl.trim();
      if (!nextVideoUrl) {
        resetVideoContinuityState();
        setYoutubeVideoId(null);
        setVideoError("");
        return;
      }

      const nextVideoId = parseYouTubeVideoId(nextVideoUrl);
      if (!nextVideoId) {
        resetVideoContinuityState();
        setYoutubeVideoId(null);
        setVideoError("Paste a valid YouTube video link.");
        return;
      }

      if (nextVideoId !== youtubeVideoId) {
        resetVideoContinuityState();
      }

      setYoutubeVideoId(nextVideoId);
      setVideoError("");
    },
    [resetVideoContinuityState, youtubeVideoId],
  );

  useEffect(() => {
    const videoHost = videoHostRef.current;
    if (!videoHost || !youtubeVideoId || !videoTabIsActive) return;

    let componentIsMounted = true;
    let playerInitTimer: number | null = null;

    playerInitTimer = window.setTimeout(() => {
      const currentVideoHost = videoHostRef.current;
      if (!componentIsMounted || !currentVideoHost) return;

      if (!elementHasRenderableSize(currentVideoHost)) {
        setVideoError("The YouTube player area is not ready yet.");
        return;
      }

      createYouTubePlayer({
        mountElement: currentVideoHost,
        videoId: youtubeVideoId,
        onStateChange: handleYouTubeStateChange,
      })
        .then((youTubePlayer) => {
          if (!componentIsMounted || !videoHostRef.current) {
            youTubePlayer.destroy();
            return;
          }

          youtubePlayerRef.current?.destroy();
          youtubePlayerRef.current = youTubePlayer;
        })
        .catch(() => setVideoError("The YouTube player could not be loaded."));
    }, 0);

    return () => {
      componentIsMounted = false;
      if (playerInitTimer !== null) {
        window.clearTimeout(playerInitTimer);
      }
      youtubePlayerRef.current?.destroy();
      youtubePlayerRef.current = null;
      videoHost.replaceChildren();
    };
  }, [handleYouTubeStateChange, videoTabIsActive, youtubeVideoId]);

  return {
    audioRef,
    audioTabIsActive,
    backgroundAudioConsentGiven,
    backgroundAudioError,
    changeBackgroundAudioConsent,
    hasVideo,
    loadVideoUrl,
    selectAudio,
    selectVideo,
    stopHiddenHandoffIfUserPausedAudio,
    videoError,
    videoHostRef,
    videoTabIsActive,
  };
}

/** Guards against initializing YouTube inside a collapsed hidden element. */
function elementHasRenderableSize(element: HTMLElement): boolean {
  return element.offsetWidth > 0 && element.offsetHeight > 0;
}
