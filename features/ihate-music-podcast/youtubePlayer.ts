export const YOUTUBE_PLAYING_STATE = 1;
export const YOUTUBE_PAUSED_STATE = 2;
export const YOUTUBE_ENDED_STATE = 0;

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
 */
export async function createYouTubePlayer({
  mountElement,
  onStateChange,
  videoId,
}: CreateYouTubePlayerParams): Promise<YouTubePlayer> {
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

function normalizeYouTubeVideoId(value: string | null | undefined): string | null {
  if (!value) return null;

  const [videoId] = value.split(/[?&#]/);
  return YOUTUBE_ID_PATTERN.test(videoId) ? videoId : null;
}
