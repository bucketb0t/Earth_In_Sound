import assert from "node:assert/strict";

import {
  playAudioFromTimestamp,
  seekAudioToTimestamp,
} from "../../../front-end/features/ihate-music-podcast/mediaTiming";

/**
 * Verifies safe timestamp handling without loading real browser media.
 */
export async function runMediaTimingTests(): Promise<void> {
  let playCount = 0;
  const playableAudio = {
    currentTime: 12,
    readyState: 1,
    play: async () => {
      playCount += 1;
    },
  } as unknown as HTMLAudioElement;

  seekAudioToTimestamp(playableAudio, -5);
  assert.equal(playableAudio.currentTime, 0, "negative seeks should clamp to zero");

  seekAudioToTimestamp(playableAudio, Number.NaN);
  assert.equal(playableAudio.currentTime, 0, "non-finite seeks should be ignored");

  await playAudioFromTimestamp(playableAudio, 42.5);
  assert.equal(playableAudio.currentTime, 42.5);
  assert.equal(playCount, 1, "timestamp playback should start the audio once");

  const rejectingAudio = {
    currentTime: 0,
    readyState: 1,
    play: async () => {
      throw new Error("play blocked");
    },
  } as unknown as HTMLAudioElement;
  await assert.rejects(
    () => playAudioFromTimestamp(rejectingAudio, 3),
    /play blocked/,
    "playback errors should reach the controller that displays them",
  );

  const unseekableAudio = { readyState: 1 } as HTMLAudioElement;
  Object.defineProperty(unseekableAudio, "currentTime", {
    set() {
      throw new Error("seek blocked");
    },
  });
  assert.doesNotThrow(
    () => seekAudioToTimestamp(unseekableAudio, 10),
    "browser seek failures should be contained",
  );
}
