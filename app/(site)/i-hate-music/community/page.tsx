import SectionPlaceholderPage from "@/front-end/features/section-placeholder/SectionPlaceholderPage";

/**
 * Browser metadata for the I Hate Music Community route.
 */
export const metadata = {
  title: "I Hate Music Community | Earth In Sound",
};

/**
 * Temporary Community page content.
 * Uses the shared placeholder until this podcast section is designed.
 */
export default function IHateMusicCommunityPage() {
  return (
    <SectionPlaceholderPage
      eyebrow="I Hate Music"
      title="Community"
      description="This page will gather listener links, social paths, announcements, and ways for the I Hate Music audience to connect."
    />
  );
}
