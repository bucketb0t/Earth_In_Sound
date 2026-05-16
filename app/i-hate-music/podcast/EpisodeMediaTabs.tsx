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
import styles from "./EpisodeMediaTabs.module.css";

const YOUTUBE_PLAYING_STATE = 1;
const YOUTUBE_PAUSED_STATE = 2;
const YOUTUBE_ENDED_STATE = 0;
const MEDIA_HAVE_METADATA = 1;
const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

type MediaMode = "audio" | "video";

interface EpisodeMediaTabsProps {
  episodeId: string;
  audioMimeType: string | null;
  audioUrl: string | null;
}

interface YouTubePlayerEvent {
  data: number;
}

interface YouTubePlayer {
  destroy: () => void;
  getCurrentTime: () => number;
  getPlayerState: () => number;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
}

interface YouTubePlayerOptions {
  events: {
    onStateChange: (event: YouTubePlayerEvent) => void;
  };
  playerVars: {
    modestbranding: 1;
    origin: string;
    playsinline: 1;
    rel: 0;
  };
  videoId: string;
}

interface YouTubeApi {
  Player: new (
    element: HTMLElement,
    options: YouTubePlayerOptions,
  ) => YouTubePlayer;
}

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YouTubeApi> | null = null;

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoHostRef = useRef<HTMLDivElement | null>(null);
  const youtubePlayerRef = useRef<YouTubePlayer | null>(null);
  const shouldResumeVideoFromAudioRef = useRef(false);

  const [activeMode, setActiveMode] = useState<MediaMode>("audio");
  const [youtubeUrlInput, setYoutubeUrlInput] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoError, setVideoError] = useState("");

  const youtubeVideoId = useMemo(
    () => parseYouTubeVideoId(youtubeUrl),
    [youtubeUrl],
  );

  const hasVideo = youtubeVideoId !== null;
  const audioTabIsActive = activeMode === "audio";
  const videoTabIsActive = activeMode === "video";
  const videoContinuityIsEnabled = hasVideo && videoTabIsActive;

  const pauseAudio = useCallback((): void => {
    audioRef.current?.pause();
  }, []);

  const pauseVideo = useCallback((): void => {
    youtubePlayerRef.current?.pauseVideo();
  }, []);

  const selectAudio = useCallback((): void => {
    /*
     * Audio is the primary podcast mode. When selected, it behaves like normal
     * browser audio: it may continue while the tab is hidden, minimized, or the
     * phone screen is off, and it does not trigger any YouTube handoff logic.
     */
    shouldResumeVideoFromAudioRef.current = false;
    setActiveMode("audio");
    pauseVideo();
  }, [pauseVideo]);

  const selectVideo = useCallback((): void => {
    setActiveMode("video");
    pauseAudio();

    /*
     * Loading metadata early makes a later screen-off handoff more accurate
     * without starting playback or changing normal Audio-tab behavior.
     */
    audioRef.current?.load();
  }, [pauseAudio]);

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

  const stopHiddenHandoffIfVideoStopped = (
    event: YouTubePlayerEvent,
  ): void => {
    const videoWasStoppedByTheUser =
      !document.hidden &&
      (event.data === YOUTUBE_PAUSED_STATE ||
        event.data === YOUTUBE_ENDED_STATE);

    if (videoWasStoppedByTheUser) {
      shouldResumeVideoFromAudioRef.current = false;
    }
  };

  /*
   * The YouTube iframe API is loaded only when this card has a saved video link
   * and the user opens the Video tab. This keeps the episode archive light.
   */
  useEffect(() => {
    const videoHost = videoHostRef.current;
    if (!videoHost || !youtubeVideoId || !videoTabIsActive) return;

    let componentIsMounted = true;

    loadYouTubeIframeApi()
      .then((youTubeApi) => {
        if (!componentIsMounted || !videoHostRef.current) return;

        youtubePlayerRef.current?.destroy();
        videoHostRef.current.replaceChildren();
        youtubePlayerRef.current = new youTubeApi.Player(videoHostRef.current, {
          videoId: youtubeVideoId,
          playerVars: {
            modestbranding: 1,
            origin: window.location.origin,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onStateChange: (event) => {
              stopHiddenHandoffIfVideoStopped(event);
              if (event.data === YOUTUBE_PLAYING_STATE && !document.hidden) {
                pauseAudio();
              }
            },
          },
        });
      })
      .catch(() => setVideoError("The YouTube player could not be loaded."));

    return () => {
      componentIsMounted = false;
      youtubePlayerRef.current?.destroy();
      youtubePlayerRef.current = null;
      videoHost.replaceChildren();
    };
  }, [pauseAudio, videoTabIsActive, youtubeVideoId]);

  /*
   * Video-only screen-off handoff:
   * - If the YouTube video is actively playing and the page becomes hidden,
   *   Acast audio takes over from the same timestamp.
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
        const videoWasPlaying =
          youtubePlayer.getPlayerState() === YOUTUBE_PLAYING_STATE;

        shouldResumeVideoFromAudioRef.current = videoWasPlaying;
        if (!videoWasPlaying) return;

        youtubePlayer.pauseVideo();
        void playAudioFromTimestamp(
          audioElement,
          youtubePlayer.getCurrentTime(),
        ).catch(() => {
          shouldResumeVideoFromAudioRef.current = false;
        });
        return;
      }

      if (!shouldResumeVideoFromAudioRef.current) return;

      shouldResumeVideoFromAudioRef.current = false;
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
  }, [videoContinuityIsEnabled]);

  const stopHiddenHandoffIfUserPausedAudio = (): void => {
    if (document.hidden) {
      shouldResumeVideoFromAudioRef.current = false;
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

function loadYouTubeIframeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve, reject) => {
    const existingCallback = window.onYouTubeIframeAPIReady;
    const rejectAndReset = (error: Error): void => {
      youtubeApiPromise = null;
      reject(error);
    };

    window.onYouTubeIframeAPIReady = () => {
      existingCallback?.();
      if (window.YT?.Player) {
        resolve(window.YT);
      } else {
        rejectAndReset(new Error("YouTube iframe API loaded without Player."));
      }
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () =>
        rejectAndReset(new Error("Unable to load YouTube API."));
      document.head.append(script);
    }
  });

  return youtubeApiPromise;
}

function parseYouTubeVideoId(value: string): string | null {
  const trimmedValue = value.trim();
  if (YOUTUBE_ID_PATTERN.test(trimmedValue)) return trimmedValue;

  try {
    const url = new URL(trimmedValue);
    const hostname = url.hostname.replace(/^www\./, "");

    if (hostname === "youtu.be") {
      return normalizeYouTubeVideoId(url.pathname.split("/")[1]);
    }

    if (!hostname.endsWith("youtube.com")) return null;

    const watchVideoId = normalizeYouTubeVideoId(url.searchParams.get("v"));
    if (watchVideoId) return watchVideoId;

    const [, route, routeVideoId] = url.pathname.split("/");
    if (route === "embed" || route === "shorts" || route === "live") {
      return normalizeYouTubeVideoId(routeVideoId);
    }
  } catch {
    return null;
  }

  return null;
}

function normalizeYouTubeVideoId(value: string | null | undefined): string | null {
  if (!value) return null;
  const [videoId] = value.split(/[?&#]/);
  return YOUTUBE_ID_PATTERN.test(videoId) ? videoId : null;
}

async function playAudioFromTimestamp(
  audioElement: HTMLAudioElement,
  seconds: number,
): Promise<void> {
  if (audioElement.readyState < MEDIA_HAVE_METADATA) {
    await waitForAudioMetadata(audioElement);
  }

  seekAudioTo(audioElement, seconds);
  await audioElement.play();
}

function waitForAudioMetadata(audioElement: HTMLAudioElement): Promise<void> {
  if (audioElement.readyState >= MEDIA_HAVE_METADATA) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(resolveMetadataWait, 2000);

    function cleanup(): void {
      window.clearTimeout(timeoutId);
      audioElement.removeEventListener("loadedmetadata", resolveMetadataWait);
      audioElement.removeEventListener("error", rejectMetadataWait);
    }

    function resolveMetadataWait(): void {
      cleanup();
      resolve();
    }

    function rejectMetadataWait(): void {
      cleanup();
      reject(new Error("Audio metadata could not be loaded."));
    }

    audioElement.addEventListener("loadedmetadata", resolveMetadataWait);
    audioElement.addEventListener("error", rejectMetadataWait);
    audioElement.load();
  });
}

function seekAudioTo(audioElement: HTMLAudioElement, seconds: number): void {
  if (!Number.isFinite(seconds)) return;

  try {
    audioElement.currentTime = Math.max(0, seconds);
  } catch {
    /*
     * Some browsers reject seeking before metadata exists. In that case the
     * audio handoff simply starts from the browser's current playable point.
     */
  }
}
