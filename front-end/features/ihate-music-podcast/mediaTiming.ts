const MEDIA_HAVE_METADATA = 1;

/** Start Acast audio at the video's timestamp during background handoff. */
export async function playAudioFromTimestamp(
  audioElement: HTMLAudioElement,
  seconds: number,
): Promise<void> {
  if (audioElement.readyState < MEDIA_HAVE_METADATA) {
    await waitForAudioMetadata(audioElement);
  }

  seekAudioToTimestamp(audioElement, seconds);
  await audioElement.play();
}

function waitForAudioMetadata(audioElement: HTMLAudioElement): Promise<void> {
  /* Wait for metadata before seeking. */
  if (audioElement.readyState >= MEDIA_HAVE_METADATA) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    /* Bound metadata waiting so handoff cannot hang. */
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

/** Clamp timestamps and tolerate browsers rejecting early seeks. */
export function seekAudioToTimestamp(
  audioElement: HTMLAudioElement,
  seconds: number,
): void {
  if (!Number.isFinite(seconds)) return;

  try {
    audioElement.currentTime = Math.max(0, seconds);
  } catch {
  }
}
