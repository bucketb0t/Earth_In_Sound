import { createAcastPodcastLoader } from "./acast";

export const PODCAST_FEED_REVALIDATE_SECONDS = 3600;

/** Project-specific podcast configuration for the reusable Acast loader. */
export const getIHateMusicShow = createAcastPodcastLoader({
  feedUrl: "https://feeds.acast.com/public/shows/i-hate-music",
  episodesUrl: "https://shows.acast.com/i-hate-music/episodes",
  fallbackTitle: "I Hate Music",
  revalidateSeconds: PODCAST_FEED_REVALIDATE_SECONDS,
});
