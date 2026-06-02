export const YOUTUBE_PLAYING_STATE = 1;
export const YOUTUBE_PAUSED_STATE = 2;
export const YOUTUBE_ENDED_STATE = 0;

/*
 * YouTube video ids are always 11 characters.
 */
const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export interface YouTubePlayerEvent {
  data: number;
}

export interface YouTubePlayer {
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
  host: "https://www.youtube.com";
  playerVars: {
    modestbranding: 1;
    origin: string;
    playsinline: 1;
    rel: 0;
    widget_referrer: string;
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
  /*
   * YouTube injects YT and calls onYouTubeIframeAPIReady on window.
   */
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YouTubeApi> | null = null;

interface CreateYouTubePlayerParams {
  mountElement: HTMLElement;
  onStateChange: (event: YouTubePlayerEvent) => void;
  videoId: string;
}

/**
 * Creates a YouTube iframe player from a plain DOM mount node.
 * React owns the outer shell; YouTube owns the node passed here.
 *
 * This wrapper keeps the rest of the app away from the raw window.YT global.
 * EpisodeMediaTabs only receives a small YouTubePlayer object with methods it
 * actually needs: play, pause, seek, read state, read time, destroy.
 */
export async function createYouTubePlayer({
  mountElement,
  onStateChange,
  videoId,
}: CreateYouTubePlayerParams): Promise<YouTubePlayer> {
  /*
   * The origin/referrer values reduce cross-origin iframe warnings and keep
   * YouTube messages bound to this local site origin.
   */
  const youTubeApi = await loadYouTubeIframeApi();

  return new youTubeApi.Player(mountElement, {
    host: "https://www.youtube.com",
    videoId,
    playerVars: {
      modestbranding: 1,
      origin: window.location.origin,
      playsinline: 1,
      rel: 0,
      widget_referrer: window.location.href,
    },
    events: {
      onStateChange,
    },
  });
}

/**
 * Accepts raw ids, youtube.com URLs, youtu.be URLs, shorts, live, and embeds.
 *
 * Returning null is not an error by itself; it tells the UI to show a friendly
 * "Paste a valid YouTube video link" message.
 */
export function parseYouTubeVideoId(value: string): string | null {
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

/**
 * Loads the YouTube iframe API once and shares the same promise per page.
 *
 * YouTube exposes a global callback instead of an ES module. This function
 * wraps that callback in a Promise so React code can await the API safely.
 */
function loadYouTubeIframeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve, reject) => {
    /*
     * Preserve an existing global callback in case another component set one.
     */
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

    if (
      !document.querySelector('script[src="https://www.youtube.com/iframe_api"]')
    ) {
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

/**
 * Removes query/hash noise and verifies the final 11-character id.
 */
function normalizeYouTubeVideoId(value: string | null | undefined): string | null {
  if (!value) return null;

  const [videoId] = value.split(/[?&#]/);
  return YOUTUBE_ID_PATTERN.test(videoId) ? videoId : null;
}
