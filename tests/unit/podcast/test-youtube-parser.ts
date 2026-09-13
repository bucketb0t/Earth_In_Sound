import assert from "node:assert/strict";

import { parseYouTubeVideoId } from "../../../front-end/features/ihate-music-podcast/youtubePlayer";

const VIDEO_ID = "dQw4w9WgXcQ";

/**
 * Verifies every supported YouTube URL form and rejects malformed or lookalike
 * hosts before an iframe is created.
 */
export function runYouTubeParserTests(): void {
  const validValues = [
    VIDEO_ID,
    `https://youtube.com/watch?v=${VIDEO_ID}`,
    `https://www.youtube.com/watch?v=${VIDEO_ID}&feature=share`,
    `https://m.youtube.com/watch?v=${VIDEO_ID}`,
    `https://youtu.be/${VIDEO_ID}?si=test`,
    `https://youtube.com/embed/${VIDEO_ID}`,
    `https://youtube.com/shorts/${VIDEO_ID}`,
    `https://youtube.com/live/${VIDEO_ID}`,
  ];

  for (const value of validValues) {
    assert.equal(
      parseYouTubeVideoId(`  ${value}  `),
      VIDEO_ID,
      `expected a valid YouTube id from ${value}`,
    );
  }

  const invalidValues = [
    "",
    "not-a-video-id",
    "short123",
    `https://example.com/watch?v=${VIDEO_ID}`,
    `https://evilyoutube.com/watch?v=${VIDEO_ID}`,
    `https://youtube.com.evil.example/watch?v=${VIDEO_ID}`,
    "https://youtube.com/watch?v=too-short",
    "https://youtu.be/too-short",
  ];

  for (const value of invalidValues) {
    assert.equal(
      parseYouTubeVideoId(value),
      null,
      `expected an invalid YouTube value: ${value}`,
    );
  }
}
