export const YOUTUBE_PLAYING_STATE = 1;
export const YOUTUBE_PAUSED_STATE = 2;
export const YOUTUBE_ENDED_STATE = 0;

const YOUTUBE_UNSTARTED_STATE = -1;
const YOUTUBE_ORIGIN = "https://www.youtube.com";
const YOUTUBE_HANDSHAKE_INTERVAL_MS = 250;

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

interface YouTubeOutgoingMessage {
  event?: string;
  func?: string;
  args?: unknown[];
  id?: string;
}

interface YouTubeMessage {
  event?: string;
  id?: string;
  info?: unknown;
}

interface CreateYouTubePlayerParams {
  mountElement: HTMLElement;
  onStateChange: (event: YouTubePlayerEvent) => void;
  signal?: AbortSignal;
  videoId: string;
}

let nextYouTubePlayerId = 0;

/**
 * Own the iframe and its enablejsapi message bridge inside React's mount.
 * Direct messaging avoids the widget wrapper's localhost postMessage warning.
 */
export function createYouTubePlayer({
  mountElement,
  onStateChange,
  signal,
  videoId,
}: CreateYouTubePlayerParams): Promise<YouTubePlayer> {
  const playerId = `earth-in-sound-youtube-${nextYouTubePlayerId++}`;
  const iframe = createYouTubeIframe(videoId, playerId);

  let latestCurrentTime = 0;
  let latestCurrentTimeReceivedAt = performance.now();
  let latestPlayerState = YOUTUBE_UNSTARTED_STATE;
  let playerIsDestroyed = false;
  let readyTimeoutId: number | null = null;
  let listeningHandshakeIntervalId: number | null = null;
  let promiseIsSettled = false;

  let resolveReady: (player: YouTubePlayer) => void = () => {};
  let rejectReady: (error: Error) => void = () => {};

  const readyPromise = new Promise<YouTubePlayer>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  const player: YouTubePlayer = {
    destroy: () => {
      playerIsDestroyed = true;
      if (readyTimeoutId !== null) {
        window.clearTimeout(readyTimeoutId);
        readyTimeoutId = null;
      }
      clearListeningHandshakeInterval();
      signal?.removeEventListener("abort", abortPlayerInitialization);
      window.removeEventListener("message", handleYouTubeMessage);
      iframe.removeEventListener("load", startListeningHandshake);
      iframe.remove();
    },
    getCurrentTime: () => getEstimatedCurrentTime(),
    getPlayerState: () => latestPlayerState,
    pauseVideo: () => sendCommand("pauseVideo"),
    playVideo: () => sendCommand("playVideo"),
    seekTo: (seconds, allowSeekAhead) => {
      const safeSeconds = Math.max(0, seconds);
      latestCurrentTime = safeSeconds;
      latestCurrentTimeReceivedAt = performance.now();
      sendCommand("seekTo", [safeSeconds, allowSeekAhead]);
    },
  };

  function settleReady(): void {
    if (promiseIsSettled || playerIsDestroyed) return;

    promiseIsSettled = true;
    if (readyTimeoutId !== null) {
      window.clearTimeout(readyTimeoutId);
      readyTimeoutId = null;
    }
    clearListeningHandshakeInterval();
    signal?.removeEventListener("abort", abortPlayerInitialization);
    resolveReady(player);
  }

  function failReady(error: Error): void {
    if (promiseIsSettled) return;

    promiseIsSettled = true;
    player.destroy();
    rejectReady(error);
  }

  function abortPlayerInitialization(): void {
    failReady(
      new DOMException(
        "YouTube player initialization was cancelled.",
        "AbortError",
      ),
    );
  }

  function getEstimatedCurrentTime(): number {
    if (latestPlayerState !== YOUTUBE_PLAYING_STATE) {
      return latestCurrentTime;
    }

    return (
      latestCurrentTime +
      (performance.now() - latestCurrentTimeReceivedAt) / 1000
    );
  }

  function sendCommand(func: string, args: unknown[] = []): void {
    postYouTubeMessage({
      event: "command",
      func,
      args,
      id: playerId,
    });
  }

  function sendListeningHandshake(): void {
    postYouTubeMessage({
      event: "listening",
    });

    postYouTubeMessage({
      event: "listening",
      id: playerId,
    });
  }

  function startListeningHandshake(): void {
    if (listeningHandshakeIntervalId === null) {
      listeningHandshakeIntervalId = window.setInterval(
        sendListeningHandshake,
        YOUTUBE_HANDSHAKE_INTERVAL_MS,
      );
    }

    sendListeningHandshake();
  }

  function clearListeningHandshakeInterval(): void {
    if (listeningHandshakeIntervalId === null) return;

    window.clearInterval(listeningHandshakeIntervalId);
    listeningHandshakeIntervalId = null;
  }

  function postYouTubeMessage(message: YouTubeOutgoingMessage): void {
    if (playerIsDestroyed || !iframe.contentWindow) return;

    try {
      iframe.contentWindow.postMessage(JSON.stringify(message), YOUTUBE_ORIGIN);
    } catch {
      /* An about:blank recipient is not ready; retry the handshake after iframe load. */
    }
  }

  function handleYouTubeMessage(event: MessageEvent): void {
    if (
      playerIsDestroyed ||
      event.origin !== YOUTUBE_ORIGIN ||
      event.source !== iframe.contentWindow
    ) {
      return;
    }

    const message = parseYouTubeMessage(event.data);
    if (!message || (message.id && message.id !== playerId)) return;

    if (message.event === "onReady") {
      settleReady();
      return;
    }

    if (
      message.event === "initialDelivery" ||
      message.event === "infoDelivery"
    ) {
      updatePlayerInfo(message.info);
      return;
    }

    if (message.event === "onStateChange") {
      updatePlayerState(readNumber(message.info));
    }
  }

  function updatePlayerInfo(info: unknown): void {
    if (!isRecord(info)) return;

    updatePlayerState(readNumber(info.playerState));

    const progressStateCurrent = isRecord(info.progressState)
      ? readNumber(info.progressState.current)
      : null;
    updateCurrentTime(readNumber(info.currentTime) ?? progressStateCurrent);
  }

  function updateCurrentTime(currentTime: number | null): void {
    if (currentTime === null) return;

    latestCurrentTime = currentTime;
    latestCurrentTimeReceivedAt = performance.now();
  }

  function updatePlayerState(playerState: number | null): void {
    if (playerState === null || latestPlayerState === playerState) return;

    latestPlayerState = playerState;
    onStateChange({ data: playerState });
  }

  if (signal?.aborted) {
    abortPlayerInitialization();
    return readyPromise;
  }

  signal?.addEventListener("abort", abortPlayerInitialization, { once: true });
  window.addEventListener("message", handleYouTubeMessage);
  iframe.addEventListener("load", startListeningHandshake);
  iframe.addEventListener(
    "error",
    () => failReady(new Error("Unable to load YouTube iframe.")),
    { once: true },
  );

  readyTimeoutId = window.setTimeout(() => {
    failReady(new Error("YouTube iframe did not become ready."));
  }, 8000);

  mountElement.replaceChildren(iframe);

  return readyPromise;
}

/** Accept supported YouTube URLs or raw IDs; invalid input returns null. */
export function parseYouTubeVideoId(value: string): string | null {
  const trimmedValue = value.trim();
  if (YOUTUBE_ID_PATTERN.test(trimmedValue)) return trimmedValue;

  try {
    const url = new URL(trimmedValue);
    const hostname = url.hostname.replace(/^www\./, "");

    if (hostname === "youtu.be") {
      return normalizeYouTubeVideoId(url.pathname.split("/")[1]);
    }

    const isYouTubeHostname =
      hostname === "youtube.com" || hostname.endsWith(".youtube.com");
    if (!isYouTubeHostname) return null;

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

function createYouTubeIframe(
  videoId: string,
  playerId: string,
): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  const iframeUrl = new URL(`${YOUTUBE_ORIGIN}/embed/${videoId}`);
  iframeUrl.searchParams.set("enablejsapi", "1");
  iframeUrl.searchParams.set("modestbranding", "1");
  iframeUrl.searchParams.set("origin", window.location.origin);
  iframeUrl.searchParams.set("playsinline", "1");
  iframeUrl.searchParams.set("rel", "0");

  iframe.id = playerId;
  iframe.src = iframeUrl.toString();
  iframe.title = "YouTube video player";
  iframe.allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.setAttribute("frameborder", "0");

  return iframe;
}

function parseYouTubeMessage(data: unknown): YouTubeMessage | null {
  const parsedData = typeof data === "string" ? parseJson(data) : data;
  if (!isRecord(parsedData)) return null;

  return {
    event: typeof parsedData.event === "string" ? parsedData.event : undefined,
    id: typeof parsedData.id === "string" ? parsedData.id : undefined,
    info: parsedData.info,
  };
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
