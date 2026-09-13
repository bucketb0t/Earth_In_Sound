import IHateMusicPodcastPage from "@/front-end/features/ihate-music-podcast/IHateMusicPodcastPage";
import { getIHateMusicShow, type PodcastShow } from "@/backend/podcast/acast";

/** Refresh cached podcast data hourly. */
export const revalidate = 3600;

export const metadata = {
  title: "I Hate Music Podcast | Earth In Sound",
  description: "Latest I Hate Music podcast episodes from Acast.",
};

export default async function PodcastPage() {
  const show = await loadPodcastShowSafely();
  return <IHateMusicPodcastPage show={show} />;
}

async function loadPodcastShowSafely(): Promise<PodcastShow | null> {
  try {
    return await getIHateMusicShow();
  } catch {
    /* Use the fallback when Acast is unavailable, including offline builds. */
    return null;
  }
}
