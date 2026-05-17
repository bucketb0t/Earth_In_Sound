const MEDIA_HAVE_METADATA = 1;

/**
 * Starts Acast audio at a known video timestamp.
 * Used only by the Video tab's hidden-screen continuity behavior.
 */
export async function playAudioFromTimestamp(
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
