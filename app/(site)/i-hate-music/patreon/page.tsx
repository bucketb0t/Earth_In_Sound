import SectionPlaceholderPage from "@/features/section-placeholder/SectionPlaceholderPage";

/**
 * Browser metadata for the I Hate Music Patreon route.
 */
export const metadata = {
  title: "I Hate Music Patreon | Earth In Sound",
};

/**
 * Temporary Patreon page content.
 * Uses the shared placeholder until external support links are implemented.
 */
export default function IHateMusicPatreonPage() {
  return (
    <SectionPlaceholderPage
      eyebrow="I Hate Music"
      title="Patreon"
      description="This page will explain support options, Patreon benefits, and the connection between listener support and future podcast production."
    />
  );
}
