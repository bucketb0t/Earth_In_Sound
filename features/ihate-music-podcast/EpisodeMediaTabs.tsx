"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { playAudioFromTimestamp } from "./mediaTiming";
import styles from "./EpisodeMediaTabs.module.css";
import {
  createYouTubePlayer,
  parseYouTubeVideoId,
  YOUTUBE_ENDED_STATE,
  YOUTUBE_PAUSED_STATE,
  YOUTUBE_PLAYING_STATE,
  type YouTubePlayer,
  type YouTubePlayerEvent,
} from "./youtubePlayer";

type MediaMode = "audio" | "video";

interface EpisodeMediaTabsProps {
  episodeId: string;
  audioMimeType: string | null;
  audioUrl: string | null;
}

/**
 * Episode-local media controls.
 * Acast audio stays the reliable timeline; YouTube is an optional visual tab.
 */
export default function EpisodeMediaTabs({
  episodeId,
  audioMimeType,
  audioUrl,
}: EpisodeMediaTabsProps) {
  const audioPanelId = useId();
  const videoPanelId = useId();
  const videoInputId = useId();
  const backgroundAudioConsentId = useId();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoHostRef = useRef<HTMLDivElement | null>(null);
  const youtubePlayerRef = useRef<YouTubePlayer | null>(null);
  const backgroundAudioConsentRef = useRef(false);
  const shouldResumeVideoFromAudioRef = useRef(false);

  const [activeMode, setActiveMode] = useState<MediaMode>("audio");
  const [backgroundAudioConsentGiven, setBackgroundAudioConsentGiven] =
    useState(false);
  const [youtubeUrlInput, setYoutubeUrlInput] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoError, setVideoError] = useState("");
  const [backgroundAudioError, setBackgroundAudioError] = useState("");

  const youtubeVideoId = useMemo(
    () => parseYouTubeVideoId(youtubeUrl),
    [youtubeUrl],
  );

  const hasVideo = youtubeVideoId !== null;
  const audioTabIsActive = activeMode === "audio";
  const videoTabIsActive = activeMode === "video";
  const videoContinuityIsEnabled =
    backgroundAudioConsentGiven && hasVideo && videoTabIsActive && !!audioUrl;

  const pauseAudio = useCallback((): void => {
    audioRef.current?.pause();
  }, []);

  const pauseVideo = useCallback((): void => {
    youtubePlayerRef.current?.pauseVideo();
  }, []);

  const cancelVideoToAudioHandoff = useCallback((): void => {
    shouldResumeVideoFromAudioRef.current = false;
  }, []);

  const stopAcastShadowAudio = useCallback((): void => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    audioElement.pause();
    audioElement.muted = false;
  }, []);

  useEffect(() => {
    backgroundAudioConsentRef.current = backgroundAudioConsentGiven;
  }, [backgroundAudioConsentGiven]);

  const selectAudio = useCallback((): void => {
    /*
     * Audio is the primary podcast mode. When selected, it behaves like normal
     * browser audio: it may continue while the tab is hidden, minimized, or the
     * phone screen is off, and it does not trigger any YouTube handoff logic.
     */
    cancelVideoToAudioHandoff();
    if (audioRef.current) {
      audioRef.current.muted = false;
    }
    setActiveMode("audio");
    pauseVideo();
  }, [cancelVideoToAudioHandoff, pauseVideo]);

  const selectVideo = useCallback((): void => {
    setActiveMode("video");
    pauseAudio();

    /*
     * Loading metadata early makes a later screen-off handoff more accurate
     * without starting playback or changing normal Audio-tab behavior.
     */
    audioRef.current?.load();
  }, [pauseAudio]);

  const getYouTubePlayerState = useCallback((): number | null => {
    try {
      return youtubePlayerRef.current?.getPlayerState() ?? null;
    } catch {
      return null;
    }
  }, []);

  const videoIsPlaying = useCallback(
    () => getYouTubePlayerState() === YOUTUBE_PLAYING_STATE,
    [getYouTubePlayerState],
  );

  const startMutedAcastShadowFromVideo = useCallback(async (): Promise<void> => {
    const audioElement = audioRef.current;
    const youtubePlayer = youtubePlayerRef.current;
    if (!audioElement || !youtubePlayer || !audioUrl) return;

    audioElement.muted = true;
    await playAudioFromTimestamp(audioElement, youtubePlayer.getCurrentTime());
  }, [audioUrl]);

  /*
   * Consent is explicit because the Video tab can start Acast audio while the
   * page is hidden. Preparation is best-effort: browsers differ here, so a
   * failed warm-up should not disable the user's choice before the real handoff.
   */
  const changeBackgroundAudioConsent = (consentGiven: boolean): void => {
    cancelVideoToAudioHandoff();
    setBackgroundAudioError("");

    if (!consentGiven) {
      setBackgroundAudioConsentGiven(false);
      stopAcastShadowAudio();
      return;
    }

    const audioElement = audioRef.current;
    if (!audioElement || !audioUrl) {
      setBackgroundAudioConsentGiven(false);
      setBackgroundAudioError("This episode does not have background audio.");
      return;
    }

    setBackgroundAudioConsentGiven(true);

    const preparation = videoIsPlaying()
      ? startMutedAcastShadowFromVideo()
      : prepareAudioForBackgroundHandoff(audioElement);

    preparation.catch(() => {
      setBackgroundAudioError(
        "Background audio is allowed, but this browser may require the audio player to be started once first.",
      );
    });
  };

  const prepareAudioForBackgroundHandoff = async (
    audioElement: HTMLAudioElement,
  ): Promise<void> => {
    const previousMuted = audioElement.muted;
    const previousTime = audioElement.currentTime;

    try {
      audioElement.muted = true;
      audioElement.load();
      await audioElement.play();
      audioElement.pause();

      if (Number.isFinite(previousTime)) {
        audioElement.currentTime = previousTime;
      }
    } catch {
      throw new Error("Background audio warm-up was blocked.");
    } finally {
      audioElement.muted = previousMuted;
    }
  };

  const loadVideo = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    const nextVideoUrl = youtubeUrlInput.trim();
    if (!nextVideoUrl) {
      setYoutubeUrl("");
      setVideoError("");
      return;
    }

    if (!parseYouTubeVideoId(nextVideoUrl)) {
      setYoutubeUrl("");
      setVideoError("Paste a valid YouTube video link.");
      return;
    }

    setYoutubeUrl(nextVideoUrl);
    setVideoError("");
  };

  const stopHiddenHandoffIfVideoStopped = useCallback(
    (event: YouTubePlayerEvent): void => {
      const videoWasStoppedByTheUser =
        !document.hidden &&
        (event.data === YOUTUBE_PAUSED_STATE ||
          event.data === YOUTUBE_ENDED_STATE);

      if (videoWasStoppedByTheUser) {
        cancelVideoToAudioHandoff();
        stopAcastShadowAudio();
      }
    },
    [cancelVideoToAudioHandoff, stopAcastShadowAudio],
  );

  /*
   * The YouTube iframe API is loaded only when this card has a saved video link
   * and the user opens the Video tab. This keeps the episode archive light.
   */
  useEffect(() => {
    const videoHost = videoHostRef.current;
    if (!videoHost || !youtubeVideoId || !videoTabIsActive) return;

    let componentIsMounted = true;
    let playerInitTimer: number | null = null;

    /*
     * Next/React dev mode can run effects twice to detect unsafe side effects.
     * Deferring one tick lets that cleanup cancel before YouTube starts its
     * internal postMessage polling, which avoids the localhost-origin warning.
     */
    playerInitTimer = window.setTimeout(() => {
      const currentVideoHost = videoHostRef.current;
      if (!componentIsMounted || !currentVideoHost) return;

      if (!elementHasRenderableSize(currentVideoHost)) {
        setVideoError("The YouTube player area is not ready yet.");
        return;
      }

      const youtubeMount = createYouTubePlayerMount(currentVideoHost);

      createYouTubePlayer({
        mountElement: youtubeMount,
        videoId: youtubeVideoId,
        onStateChange: (event) => {
          stopHiddenHandoffIfVideoStopped(event);
          if (event.data === YOUTUBE_PLAYING_STATE && !document.hidden) {
            if (backgroundAudioConsentRef.current) {
              void startMutedAcastShadowFromVideo().catch(() => {
                setBackgroundAudioError(
                  "Background audio could not be prepared while the video played.",
                );
              });
            } else {
              pauseAudio();
            }
          }
        },
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
      stopAcastShadowAudio();
      videoHost.replaceChildren();
    };
  }, [
    pauseAudio,
    startMutedAcastShadowFromVideo,
    stopAcastShadowAudio,
    stopHiddenHandoffIfVideoStopped,
    videoTabIsActive,
    youtubeVideoId,
  ]);

  /*
   * Video-only screen-off handoff:
   * - With consent, Acast can run muted while the YouTube video is visible.
   * - If the page becomes hidden, that prepared audio is unmuted and takes over.
   * - When the page becomes visible again, YouTube seeks to the audio time.
   *
   * Direct Audio-tab playback intentionally bypasses this effect and is left to
   * the browser's native <audio> background behavior.
   */
  useEffect(() => {
    if (!videoContinuityIsEnabled) return;

    const syncMediaOnVisibilityChange = (): void => {
      const audioElement = audioRef.current;
      const youtubePlayer = youtubePlayerRef.current;
      if (!audioElement || !youtubePlayer) {
        return;
      }

      if (document.hidden) {
        const videoWasPlaying = videoIsPlaying();

        shouldResumeVideoFromAudioRef.current = videoWasPlaying;
        if (!videoWasPlaying) {
          return;
        }

        const audioStart = audioElement.paused
          ? startMutedAcastShadowFromVideo()
          : Promise.resolve();

        void audioStart
          .then(() => {
            if (document.hidden && shouldResumeVideoFromAudioRef.current) {
              audioElement.muted = false;
              youtubePlayer.pauseVideo();
            }
          })
          .catch(() => {
            cancelVideoToAudioHandoff();
            setBackgroundAudioError(
              "Background audio could not start, so the video was not switched.",
            );
          });
        return;
      }

      if (!shouldResumeVideoFromAudioRef.current) {
        return;
      }

      cancelVideoToAudioHandoff();
      youtubePlayer.seekTo(audioElement.currentTime, true);
      audioElement.pause();
      audioElement.muted = false;
      youtubePlayer.playVideo();
    };

    document.addEventListener("visibilitychange", syncMediaOnVisibilityChange);
    return () => {
      document.removeEventListener(
        "visibilitychange",
        syncMediaOnVisibilityChange,
      );
    };
  }, [
    cancelVideoToAudioHandoff,
    startMutedAcastShadowFromVideo,
    videoContinuityIsEnabled,
    videoIsPlaying,
  ]);

  const stopHiddenHandoffIfUserPausedAudio = (): void => {
    if (document.hidden) {
      cancelVideoToAudioHandoff();
    }
  };

  return (
    <section className={styles.mediaTabs} aria-label="Episode media">
      <div className={styles.tabList} role="tablist">
        <button
          type="button"
          className={`${styles.tabButton} ${
            audioTabIsActive ? styles.tabButtonActive : ""
          }`}
          role="tab"
          aria-controls={audioPanelId}
          aria-selected={audioTabIsActive}
          onClick={selectAudio}
        >
          Audio
        </button>

        <button
          type="button"
          className={`${styles.tabButton} ${
            videoTabIsActive ? styles.tabButtonActive : ""
          }`}
          role="tab"
          aria-controls={videoPanelId}
          aria-selected={videoTabIsActive}
          onClick={selectVideo}
        >
          Video
        </button>
      </div>

      <div
        id={audioPanelId}
        className={styles.mediaPanel}
        role="tabpanel"
        hidden={!audioTabIsActive}
      >
        {audioUrl ? (
          <audio
            ref={audioRef}
            className={styles.audioPlayer}
            controls
            preload="none"
            onPause={stopHiddenHandoffIfUserPausedAudio}
          >
            <source src={audioUrl} type={audioMimeType ?? undefined} />
          </audio>
        ) : (
          <p className={styles.audioUnavailableMessage}>
            This episode does not have an audio source.
          </p>
        )}
      </div>

      <div
        id={videoPanelId}
        className={styles.mediaPanel}
        role="tabpanel"
        hidden={!videoTabIsActive}
      >
        <form className={styles.videoSetup} onSubmit={loadVideo}>
          <input
            id={videoInputId}
            name="youtubeVideoUrl"
            className={styles.videoInput}
            value={youtubeUrlInput}
            onChange={(event) => setYoutubeUrlInput(event.target.value)}
            placeholder="Paste YouTube video link"
            aria-label="YouTube video link for this episode"
          />
          <button className={styles.videoLoadButton} type="submit">
            Load Video
          </button>
        </form>

        <label className={styles.backgroundAudioConsent}>
          <input
            id={backgroundAudioConsentId}
            name="allowBackgroundAudioHandoff"
            type="checkbox"
            checked={backgroundAudioConsentGiven}
            onChange={(event) => {
              changeBackgroundAudioConsent(event.currentTarget.checked);
            }}
          />
          <span>
            I agree to let Acast audio continue in the background when video is
            interrupted.
          </span>
        </label>

        {backgroundAudioError && (
          <p className={styles.invalidVideoMessage}>{backgroundAudioError}</p>
        )}

        {videoError && <p className={styles.invalidVideoMessage}>{videoError}</p>}

        {!videoError && !hasVideo && (
          <p className={styles.emptyVideoMessage}>
            This episode doesn&apos;t have the video.
          </p>
        )}

        {hasVideo && (
          <div className={styles.videoFrame}>
            <div
              ref={videoHostRef}
              className={styles.videoHost}
              data-episode-id={episodeId}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function createYouTubePlayerMount(videoHost: HTMLDivElement): HTMLDivElement {
  const youtubeMount = document.createElement("div");
  youtubeMount.className = styles.youtubePlayerMount;

  videoHost.replaceChildren(youtubeMount);
  return youtubeMount;
}

function elementHasRenderableSize(element: HTMLElement): boolean {
  return element.offsetWidth > 0 && element.offsetHeight > 0;
}
