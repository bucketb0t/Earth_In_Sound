"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  playAudioFromTimestamp,
  seekAudioToTimestamp,
} from "./mediaTiming";
import {
  YOUTUBE_ENDED_STATE,
  YOUTUBE_PAUSED_STATE,
  YOUTUBE_PLAYING_STATE,
  type YouTubePlayer,
  type YouTubePlayerEvent,
} from "./youtubePlayer";

const BACKGROUND_AUDIO_SYNC_INTERVAL_MS = 5000;
const BACKGROUND_AUDIO_MAX_DRIFT_SECONDS = 1.5;
const AUDIO_TO_VIDEO_OVERLAP_MS = 300;
const AUDIO_TO_VIDEO_RESUME_TIMEOUT_MS = 2500;

export type LogMediaSwitch = (
  fromMode: "audio" | "video",
  toMode: "audio" | "video",
  reason: string,
  timestamp?: number,
) => void;

interface UseVideoAudioContinuityOptions {
  audioRef: RefObject<HTMLAudioElement | null>;
  audioUrl: string | null;
  hasVideo: boolean;
  logMediaSwitch: LogMediaSwitch;
  videoTabIsActive: boolean;
  youtubePlayerRef: RefObject<YouTubePlayer | null>;
}

interface VideoAudioContinuity {
  backgroundAudioConsentGiven: boolean;
  backgroundAudioError: string;
  changeBackgroundAudioConsent: (consentGiven: boolean) => Promise<void>;
  handleYouTubeStateChange: (event: YouTubePlayerEvent) => void;
  resetVideoContinuityState: () => void;
  stopBackgroundAudioStandby: () => void;
  stopHiddenHandoffIfUserPausedAudio: () => void;
}

/**
 * Coordinates playback continuity between the YouTube video and Acast audio.
 * The hook owns consent, standby playback, lifecycle events, and handoff timers;
 * it does not own tabs, URL input, or rendered controls.
 */
export function useVideoAudioContinuity({
  audioRef,
  audioUrl,
  hasVideo,
  logMediaSwitch,
  videoTabIsActive,
  youtubePlayerRef,
}: UseVideoAudioContinuityOptions): VideoAudioContinuity {
  const backgroundAudioStandbyRef = useRef(false);
  const backgroundAudioWasPreparedRef = useRef(false);
  const shouldResumeVideoFromAudioRef = useRef(false);
  const videoWasPlayingRef = useRef(false);
  const videoContinuityIsEnabledRef = useRef(false);
  const startBackgroundAudioStandbyRef = useRef<() => void>(() => {});
  const audioToVideoResumeIsPendingRef = useRef(false);
  const audioToVideoOverlapTimeoutRef = useRef<number | null>(null);
  const audioToVideoResumeTimeoutRef = useRef<number | null>(null);

  const [backgroundAudioConsentGiven, setBackgroundAudioConsentGiven] =
    useState(false);
  const [backgroundAudioError, setBackgroundAudioError] = useState("");

  const videoContinuityIsEnabled =
    backgroundAudioConsentGiven && hasVideo && videoTabIsActive && !!audioUrl;
  const backgroundAudioStandbyIsSupported = useMemo(
    () => canUseConcurrentBackgroundAudioStandby(),
    [],
  );

  const pauseAudio = useCallback((): void => {
    audioRef.current?.pause();
  }, [audioRef]);

  const cancelVideoToAudioHandoff = useCallback((): void => {
    shouldResumeVideoFromAudioRef.current = false;
  }, []);

  const clearAudioToVideoResumeTimers = useCallback((): void => {
    if (audioToVideoOverlapTimeoutRef.current !== null) {
      window.clearTimeout(audioToVideoOverlapTimeoutRef.current);
      audioToVideoOverlapTimeoutRef.current = null;
    }

    if (audioToVideoResumeTimeoutRef.current !== null) {
      window.clearTimeout(audioToVideoResumeTimeoutRef.current);
      audioToVideoResumeTimeoutRef.current = null;
    }
  }, []);

  const cancelAudioToVideoResume = useCallback((): void => {
    /* Leave Acast audible if YouTube never confirms resumed playback. */
    audioToVideoResumeIsPendingRef.current = false;
    clearAudioToVideoResumeTimers();
  }, [clearAudioToVideoResumeTimers]);

  const finishAudioToVideoResume = useCallback((): void => {
    if (!audioToVideoResumeIsPendingRef.current) return;

    audioToVideoResumeIsPendingRef.current = false;
    clearAudioToVideoResumeTimers();

    audioToVideoOverlapTimeoutRef.current = window.setTimeout(() => {
      const audioElement = audioRef.current;
      if (!audioElement || document.hidden) return;

      audioElement.pause();
      audioElement.muted = false;
      audioToVideoOverlapTimeoutRef.current = null;
    }, AUDIO_TO_VIDEO_OVERLAP_MS);
  }, [audioRef, clearAudioToVideoResumeTimers]);

  const stopBackgroundAudioStandby = useCallback((): void => {
    cancelAudioToVideoResume();
    backgroundAudioStandbyRef.current = false;

    const audioElement = audioRef.current;
    if (!audioElement) return;

    audioElement.pause();
    audioElement.muted = false;
  }, [audioRef, cancelAudioToVideoResume]);

  const resetVideoContinuityState = useCallback((): void => {
    cancelVideoToAudioHandoff();
    videoWasPlayingRef.current = false;
    stopBackgroundAudioStandby();
  }, [cancelVideoToAudioHandoff, stopBackgroundAudioStandby]);

  const prepareBackgroundAudioForHandoff = useCallback(
    async (): Promise<boolean> => {
      const audioElement = audioRef.current;
      if (!audioElement || !audioUrl) {
        setBackgroundAudioError("This episode does not have background audio.");
        return false;
      }

      const previousMuted = audioElement.muted;
      const previousTime = audioElement.currentTime;

      try {
        audioElement.preload = "auto";
        audioElement.muted = true;
        if (audioElement.readyState === HTMLMediaElement.HAVE_NOTHING) {
          audioElement.load();
        }

        await audioElement.play();
        audioElement.pause();

        if (Number.isFinite(previousTime)) {
          seekAudioToTimestamp(audioElement, previousTime);
        }

        backgroundAudioWasPreparedRef.current = true;
        setBackgroundAudioError("");
        return true;
      } catch {
        backgroundAudioWasPreparedRef.current = false;
        setBackgroundAudioError(
          "Background audio could not be prepared. Play the audio once, then allow handoff again.",
        );
        return false;
      } finally {
        audioElement.muted = previousMuted;
      }
    },
    [audioRef, audioUrl],
  );

  const startBackgroundAudioStandby = useCallback(
    async (
      consentIsAvailable = backgroundAudioConsentGiven,
    ): Promise<void> => {
      if (
        !backgroundAudioStandbyIsSupported ||
        !consentIsAvailable ||
        !hasVideo ||
        !videoTabIsActive ||
        !audioUrl ||
        document.hidden
      ) {
        return;
      }

      const audioElement = audioRef.current;
      const youtubePlayer = youtubePlayerRef.current;
      if (!audioElement || !youtubePlayer) return;

      const videoTimestamp = youtubePlayer.getCurrentTime();

      try {
        audioElement.preload = "auto";
        audioElement.muted = true;
        seekAudioToTimestamp(audioElement, videoTimestamp);
        await audioElement.play();

        backgroundAudioStandbyRef.current = true;
        backgroundAudioWasPreparedRef.current = true;
        setBackgroundAudioError("");
      } catch {
        backgroundAudioStandbyRef.current = false;
        setBackgroundAudioError(
          "Background audio could not stay ready. It will still try to switch when the page is hidden.",
        );
      }
    },
    [
      audioRef,
      audioUrl,
      backgroundAudioConsentGiven,
      backgroundAudioStandbyIsSupported,
      hasVideo,
      videoTabIsActive,
      youtubePlayerRef,
    ],
  );

  const syncBackgroundAudioStandby = useCallback((): void => {
    if (!backgroundAudioStandbyRef.current || document.hidden) return;

    const audioElement = audioRef.current;
    const youtubePlayer = youtubePlayerRef.current;
    if (!audioElement || !youtubePlayer) return;
    if (youtubePlayer.getPlayerState() !== YOUTUBE_PLAYING_STATE) return;

    const videoTimestamp = youtubePlayer.getCurrentTime();
    const audioDrift = Math.abs(audioElement.currentTime - videoTimestamp);
    if (audioDrift > BACKGROUND_AUDIO_MAX_DRIFT_SECONDS) {
      seekAudioToTimestamp(audioElement, videoTimestamp);
    }
  }, [audioRef, youtubePlayerRef]);

  useEffect(() => {
    videoContinuityIsEnabledRef.current = videoContinuityIsEnabled;
    startBackgroundAudioStandbyRef.current = () => {
      void startBackgroundAudioStandby();
    };
  }, [startBackgroundAudioStandby, videoContinuityIsEnabled]);

  const changeBackgroundAudioConsent = useCallback(
    async (consentGiven: boolean): Promise<void> => {
      cancelVideoToAudioHandoff();
      setBackgroundAudioError("");

      if (!consentGiven) {
        setBackgroundAudioConsentGiven(false);
        backgroundAudioWasPreparedRef.current = false;
        stopBackgroundAudioStandby();
        return;
      }

      setBackgroundAudioConsentGiven(true);
      const audioWasPrepared = await prepareBackgroundAudioForHandoff();

      if (!audioWasPrepared) {
        setBackgroundAudioConsentGiven(false);
        return;
      }

      if (videoWasPlayingRef.current) {
        void startBackgroundAudioStandby(true);
      }
    },
    [
      cancelVideoToAudioHandoff,
      prepareBackgroundAudioForHandoff,
      startBackgroundAudioStandby,
      stopBackgroundAudioStandby,
    ],
  );

  const handleYouTubeStateChange = useCallback(
    (event: YouTubePlayerEvent): void => {
      const videoWasStoppedByTheUser =
        !document.hidden &&
        (event.data === YOUTUBE_PAUSED_STATE ||
          event.data === YOUTUBE_ENDED_STATE);

      if (videoWasStoppedByTheUser) {
        cancelVideoToAudioHandoff();
        videoWasPlayingRef.current = false;
        stopBackgroundAudioStandby();
        return;
      }

      if (event.data !== YOUTUBE_PLAYING_STATE || document.hidden) return;

      videoWasPlayingRef.current = true;

      if (audioToVideoResumeIsPendingRef.current) {
        finishAudioToVideoResume();
        return;
      }

      if (videoContinuityIsEnabledRef.current) {
        startBackgroundAudioStandbyRef.current();
      } else {
        pauseAudio();
      }
    },
    [
      cancelVideoToAudioHandoff,
      finishAudioToVideoResume,
      pauseAudio,
      stopBackgroundAudioStandby,
    ],
  );

  useEffect(() => {
    if (!videoContinuityIsEnabled || !backgroundAudioStandbyIsSupported) return;

    const syncIntervalId = window.setInterval(
      syncBackgroundAudioStandby,
      BACKGROUND_AUDIO_SYNC_INTERVAL_MS,
    );

    return () => window.clearInterval(syncIntervalId);
  }, [
    backgroundAudioStandbyIsSupported,
    syncBackgroundAudioStandby,
    videoContinuityIsEnabled,
  ]);

  useEffect(() => {
    if (!videoContinuityIsEnabled) return;

    const switchVideoToBackgroundAudio = (): void => {
      const audioElement = audioRef.current;
      const youtubePlayer = youtubePlayerRef.current;
      if (!audioElement || !youtubePlayer) return;

      /* visibilitychange and pagehide may report the same transition. */
      if (shouldResumeVideoFromAudioRef.current && !audioElement.paused) return;

      const videoWasPlaying =
        videoWasPlayingRef.current ||
        youtubePlayer.getPlayerState() === YOUTUBE_PLAYING_STATE;

      shouldResumeVideoFromAudioRef.current = videoWasPlaying;
      if (!videoWasPlaying) return;

      const videoTimestamp = youtubePlayer.getCurrentTime();
      logMediaSwitch(
        "video",
        "audio",
        "page hidden background handoff",
        videoTimestamp,
      );

      const standbyWasRunning =
        backgroundAudioStandbyRef.current && !audioElement.paused;
      backgroundAudioStandbyRef.current = false;
      audioElement.preload = "auto";
      audioElement.muted = false;

      if (standbyWasRunning) {
        const audioDrift = Math.abs(audioElement.currentTime - videoTimestamp);
        if (audioDrift > BACKGROUND_AUDIO_MAX_DRIFT_SECONDS) {
          seekAudioToTimestamp(audioElement, videoTimestamp);
        }

        youtubePlayer.pauseVideo();
        return;
      }

      void playAudioFromTimestamp(audioElement, videoTimestamp)
        .then(() => {
          if (shouldResumeVideoFromAudioRef.current) {
            youtubePlayer.pauseVideo();
          }
        })
        .catch(() => {
          cancelVideoToAudioHandoff();
          setBackgroundAudioError(
            backgroundAudioWasPreparedRef.current
              ? "Background audio was prepared but the browser blocked the hidden switch."
              : "Background audio was not prepared before the page became hidden.",
          );
        });
    };

    const resumeVideoFromBackgroundAudio = (): void => {
      if (!shouldResumeVideoFromAudioRef.current) return;

      const audioElement = audioRef.current;
      const youtubePlayer = youtubePlayerRef.current;
      if (!audioElement || !youtubePlayer) {
        cancelVideoToAudioHandoff();
        return;
      }

      cancelVideoToAudioHandoff();
      audioToVideoResumeIsPendingRef.current = true;
      clearAudioToVideoResumeTimers();
      logMediaSwitch(
        "audio",
        "video",
        "page visible resume handoff",
        audioElement.currentTime,
      );
      youtubePlayer.seekTo(audioElement.currentTime, true);
      audioElement.muted = false;
      youtubePlayer.playVideo();
      videoWasPlayingRef.current = true;

      audioToVideoResumeTimeoutRef.current = window.setTimeout(() => {
        cancelAudioToVideoResume();
      }, AUDIO_TO_VIDEO_RESUME_TIMEOUT_MS);
    };

    const syncMediaOnVisibilityChange = (): void => {
      if (document.hidden) {
        switchVideoToBackgroundAudio();
      } else {
        resumeVideoFromBackgroundAudio();
      }
    };

    document.addEventListener("visibilitychange", syncMediaOnVisibilityChange);
    window.addEventListener("pagehide", switchVideoToBackgroundAudio);
    window.addEventListener("pageshow", resumeVideoFromBackgroundAudio);

    return () => {
      document.removeEventListener(
        "visibilitychange",
        syncMediaOnVisibilityChange,
      );
      window.removeEventListener("pagehide", switchVideoToBackgroundAudio);
      window.removeEventListener("pageshow", resumeVideoFromBackgroundAudio);
    };
  }, [
    audioRef,
    cancelAudioToVideoResume,
    cancelVideoToAudioHandoff,
    clearAudioToVideoResumeTimers,
    logMediaSwitch,
    videoContinuityIsEnabled,
    youtubePlayerRef,
  ]);

  useEffect(
    () => () => {
      clearAudioToVideoResumeTimers();
    },
    [clearAudioToVideoResumeTimers],
  );

  const stopHiddenHandoffIfUserPausedAudio = useCallback((): void => {
    if (!document.hidden) return;

    cancelVideoToAudioHandoff();
    backgroundAudioStandbyRef.current = false;
    videoWasPlayingRef.current = false;
  }, [cancelVideoToAudioHandoff]);

  return {
    backgroundAudioConsentGiven,
    backgroundAudioError,
    changeBackgroundAudioConsent,
    handleYouTubeStateChange,
    resetVideoContinuityState,
    stopBackgroundAudioStandby,
    stopHiddenHandoffIfUserPausedAudio,
  };
}

function canUseConcurrentBackgroundAudioStandby(): boolean {
  if (typeof navigator === "undefined") return false;

  const platform = navigator.platform;
  const userAgent = navigator.userAgent;
  const maxTouchPoints = navigator.maxTouchPoints ?? 0;

  const isClassicIos = /iPad|iPhone|iPod/.test(platform);
  const isTouchIpadReportingAsMac =
    platform === "MacIntel" && maxTouchPoints > 1;
  const isIosUserAgent = /iPad|iPhone|iPod/.test(userAgent);

  return !(isClassicIos || isTouchIpadReportingAsMac || isIosUserAgent);
}
