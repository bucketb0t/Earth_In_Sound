"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type SubmitEvent,
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
 *
 * Ownership split:
 * - React decides which tab is visible and which YouTube URL is loaded;
 * - the native audio element owns Acast playback;
 * - the YouTube iframe API owns video playback;
 * - this component coordinates timestamp handoff only when the user allows it.
 */
export default function EpisodeMediaTabs({
  episodeId,
  audioMimeType,
  audioUrl,
}: EpisodeMediaTabsProps) {
  /*
   * Stable ids connect tab buttons with their matching panels.
   */
  const audioPanelId = useId();
  const videoPanelId = useId();
  const videoInputId = useId();
  const backgroundAudioConsentId = useId();

  /*
   * DOM refs bridge React controls with browser media elements and YouTube.
   */
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoHostRef = useRef<HTMLDivElement | null>(null);
  const youtubePlayerRef = useRef<YouTubePlayer | null>(null);
  const shouldResumeVideoFromAudioRef = useRef(false);

  /*
   * UI state for tabs, user consent, temporary video input, and visible errors.
   */
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

  /*
   * Derived booleans keep render conditions readable.
   */
  const hasVideo = youtubeVideoId !== null;
  const audioTabIsActive = activeMode === "audio";
  const videoTabIsActive = activeMode === "video";
  const videoContinuityIsEnabled =
    backgroundAudioConsentGiven && hasVideo && videoTabIsActive && !!audioUrl;

  const pauseAudio = useCallback((): void => {
    /*
     * Small wrapper used by effects/callbacks so they do not repeat ref checks.
     */
    audioRef.current?.pause();
  }, []);

  const pauseVideo = useCallback((): void => {
    /*
     * YouTube player exists only after the Video tab is opened and a valid URL
     * has been loaded.
     */
    youtubePlayerRef.current?.pauseVideo();
  }, []);

  const logMediaSwitch = useCallback(
    (
      fromMode: MediaMode,
      toMode: MediaMode,
      reason: string,
      timestamp?: number,
    ): void => {
      /*
       * Human-readable media transition log.
       */
      const readableEpisodeId = decodeURIComponent(episodeId)
        .split("/")
        .pop()
        ?.replace(/^episode-?\d*-?/i, "")
        .replace(/-/g, " ")
        .trim();
      const timestampLabel = Number.isFinite(timestamp)
        ? ` at ${Math.max(0, timestamp ?? 0).toFixed(1)}s`
        : "";

      console.info(
        `[Episode media] ${fromMode.toUpperCase()} -> ${toMode.toUpperCase()}${timestampLabel}. Reason: ${reason}. Episode: ${readableEpisodeId || episodeId}`,
      );
    },
    [episodeId],
  );

  const cancelVideoToAudioHandoff = useCallback((): void => {
    /*
     * The flag means "video was playing when the page became hidden; resume it
     * when the page is visible again." Clearing it cancels that future resume.
     */
    shouldResumeVideoFromAudioRef.current = false;
  }, []);

  const selectAudio = useCallback((): void => {
    /*
     * Select the primary Acast audio mode.
     */
    cancelVideoToAudioHandoff();
    logMediaSwitch("video", "audio", "manual tab selection");
    setActiveMode("audio");
    pauseVideo();
  }, [cancelVideoToAudioHandoff, logMediaSwitch, pauseVideo]);

  const selectVideo = useCallback((): void => {
    logMediaSwitch("audio", "video", "manual tab selection");
    setActiveMode("video");
    pauseAudio();

    /*
     * Prepare the audio element for timestamp handoff.
     */
    audioRef.current?.load();
  }, [logMediaSwitch, pauseAudio]);

  /*
   * Background audio consent and media warm-up.
   */
  const changeBackgroundAudioConsent = async (
    consentGiven: boolean,
  ): Promise<void> => {
    /*
     * Browser media rules usually require user interaction before background
     * playback. This muted play/pause warms the audio element so the later
     * hidden-screen handoff can start more reliably.
     */
    cancelVideoToAudioHandoff();
    setBackgroundAudioError("");

    if (!consentGiven) {
      setBackgroundAudioConsentGiven(false);
      audioRef.current?.pause();
      return;
    }

    const audioElement = audioRef.current;
    if (!audioElement || !audioUrl) {
      setBackgroundAudioConsentGiven(false);
      setBackgroundAudioError("This episode does not have background audio.");
      return;
    }

    setBackgroundAudioConsentGiven(true);

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
      setBackgroundAudioConsentGiven(false);
      setBackgroundAudioError(
        "Background audio could not be prepared. Try again after playing the audio once.",
      );
    } finally {
      audioElement.muted = previousMuted;
    }
  };

  const loadVideo = (event: SubmitEvent<HTMLFormElement>): void => {
    /*
     * Manual video attachment for now.
     * Later this can read saved owner-managed video URLs from the database.
     */
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
      /*
       * If the user pauses/stops the visible video, background handoff should
       * not continue secretly after the tab becomes hidden.
       */
      const videoWasStoppedByTheUser =
        !document.hidden &&
        (event.data === YOUTUBE_PAUSED_STATE ||
          event.data === YOUTUBE_ENDED_STATE);

      if (videoWasStoppedByTheUser) {
        /*
         * If the user paused or ended video while the page is visible, the app
         * should not continue audio secretly when the page later becomes hidden.
         */
        cancelVideoToAudioHandoff();
      }
    },
    [cancelVideoToAudioHandoff],
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
     * Deferred YouTube player initialization.
     * The timeout gives React time to reveal the panel so the mount element has
     * real dimensions before YouTube replaces it with an iframe.
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
            pauseAudio();
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
      videoHost.replaceChildren();
    };
  }, [
    pauseAudio,
    stopHiddenHandoffIfVideoStopped,
    videoTabIsActive,
    youtubeVideoId,
  ]);

  /*
   * Visibility-based synchronization between YouTube video and Acast audio.
   */
  useEffect(() => {
    if (!videoContinuityIsEnabled) return;

    const syncMediaOnVisibilityChange = (): void => {
      /*
       * Switching rule:
       * - hidden while YouTube is playing: start Acast audio at video time;
       * - visible again: seek YouTube to Acast time and resume video.
       */
      const audioElement = audioRef.current;
      const youtubePlayer = youtubePlayerRef.current;
      if (!audioElement || !youtubePlayer) {
        return;
      }

      if (document.hidden) {
        /*
         * No background audio starts unless video was actually playing.
         */
        const videoWasPlaying =
          youtubePlayer.getPlayerState() === YOUTUBE_PLAYING_STATE;

        shouldResumeVideoFromAudioRef.current = videoWasPlaying;
        if (!videoWasPlaying) {
          return;
        }

        const videoTimestamp = youtubePlayer.getCurrentTime();
        logMediaSwitch(
          "video",
          "audio",
          "page hidden background handoff",
          videoTimestamp,
        );

        void playAudioFromTimestamp(
          audioElement,
          videoTimestamp,
        )
          .then(() => {
            if (document.hidden && shouldResumeVideoFromAudioRef.current) {
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
        /*
         * If no hidden handoff happened, there is no video resume to perform.
         */
        return;
      }

      cancelVideoToAudioHandoff();
      logMediaSwitch(
        "audio",
        "video",
        "page visible resume handoff",
        audioElement.currentTime,
      );
      youtubePlayer.seekTo(audioElement.currentTime, true);
      audioElement.pause();
      youtubePlayer.playVideo();
    };

    document.addEventListener("visibilitychange", syncMediaOnVisibilityChange);
    return () => {
      document.removeEventListener(
        "visibilitychange",
        syncMediaOnVisibilityChange,
      );
    };
  }, [cancelVideoToAudioHandoff, logMediaSwitch, videoContinuityIsEnabled]);

  const stopHiddenHandoffIfUserPausedAudio = (): void => {
    /*
     * A manual pause while hidden means the user wants media stopped.
     */
    if (document.hidden) {
      cancelVideoToAudioHandoff();
    }
  };

  return (
    <section className={styles.mediaTabs} aria-label="Episode media">
      {/* Audio/Video mode selector. */}
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
        {/* Primary Acast audio player. */}
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
        {/* Manual YouTube URL loader. */}
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

        {/* User consent gate for video-to-audio background handoff. */}
        <label className={styles.backgroundAudioConsent}>
          <input
            id={backgroundAudioConsentId}
            name="allowBackgroundAudioHandoff"
            type="checkbox"
            checked={backgroundAudioConsentGiven}
            onChange={(event) => {
              void changeBackgroundAudioConsent(event.currentTarget.checked);
            }}
          />
          <span>
            I agree to let Acast audio continue in the background when video is
            interrupted.
          </span>
        </label>

        {/* Status messages for video loading and background audio setup. */}
        {backgroundAudioError && (
          <p className={styles.invalidVideoMessage}>{backgroundAudioError}</p>
        )}

        {videoError && <p className={styles.invalidVideoMessage}>{videoError}</p>}

        {!videoError && !hasVideo && (
          <p className={styles.emptyVideoMessage}>
            This episode doesn&apos;t have the video.
          </p>
        )}

        {/* YouTube iframe mount area. */}
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
  /*
   * YouTube mutates the mount node, so React only owns the wrapper.
   */
  const youtubeMount = document.createElement("div");
  youtubeMount.className = styles.youtubePlayerMount;

  videoHost.replaceChildren(youtubeMount);
  return youtubeMount;
}

/**
 * Guards against initializing YouTube inside a collapsed hidden element.
 */
function elementHasRenderableSize(element: HTMLElement): boolean {
  return element.offsetWidth > 0 && element.offsetHeight > 0;
}
