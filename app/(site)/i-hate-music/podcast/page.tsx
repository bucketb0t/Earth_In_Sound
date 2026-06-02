import IHateMusicPodcastPage from "@/features/ihate-music-podcast/IHateMusicPodcastPage";
import { getIHateMusicShow, type PodcastShow } from "@/lib/podcast/acast";

/**
 * Next route cache setting.
 * Keeps the Acast RSS data fresh hourly without fetching on every request.
 */
export const revalidate = 3600;

/**
 * Browser metadata for the podcast route.
 */
export const metadata = {
  title: "I Hate Music Podcast | Earth In Sound",
  description: "Latest I Hate Music podcast episodes from Acast.",
};

/**
 * Route entry for /i-hate-music/podcast.
 * Keeps Next route metadata/data loading here and delegates rendering.
 */
export default async function PodcastPage() {
  const show = await loadPodcastShowSafely();
  return <IHateMusicPodcastPage show={show} />;
}

async function loadPodcastShowSafely(): Promise<PodcastShow | null> {
  try {
    return await getIHateMusicShow();
  } catch (error) {
    /* Route fallback keeps the page renderable when Acast is unavailable. */
    console.error(error);
    return null;
  }
}
