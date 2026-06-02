import SectionPlaceholderPage from "@/features/section-placeholder/SectionPlaceholderPage";

/**
 * Browser metadata for the Jason W. Walton Discography route.
 */
export const metadata = {
  title: "Jason W. Walton Discography | Earth In Sound",
};

/**
 * Temporary Discography page content.
 * Uses the shared placeholder until release data is implemented.
 */
export default function JasonWaltonDiscographyPage() {
  return (
    <SectionPlaceholderPage
      eyebrow="Jason W. Walton"
      title="Discography"
      description="This page will organize Jason W. Walton's releases, credits, projects, dates, and related listening links in a clean archive."
    />
  );
}
