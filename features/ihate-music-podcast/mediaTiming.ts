const MEDIA_HAVE_METADATA = 1;

/**
 * Starts Acast audio at a known video timestamp.
 * Used only by the Video tab's hidden-screen continuity behavior.
 *
 * This works directly with HTMLAudioElement because media timing belongs to the
 * browser media element, not React state.
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
  /*
   * Some browsers need metadata before currentTime can be set reliably.
   * Metadata includes enough information for the browser to allow seeking.
   */
  if (audioElement.readyState >= MEDIA_HAVE_METADATA) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    /*
     * Timeout resolves instead of hanging forever if metadata is slow.
     */
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

/**
 * Moves audio playback to a safe non-negative timestamp.
 *
 * The try/catch protects against browsers that reject seeking before enough
 * audio data is available.
 */
function seekAudioTo(audioElement: HTMLAudioElement, seconds: number): void {
  if (!Number.isFinite(seconds)) return;

  try {
    audioElement.currentTime = Math.max(0, seconds);
  } catch {
    /* Metadata-safe seek guard. */
  }
}
