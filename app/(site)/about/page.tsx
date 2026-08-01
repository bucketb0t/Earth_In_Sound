import SectionPlaceholderPage from "@/front-end/features/section-placeholder/SectionPlaceholderPage";

/**
 * Browser metadata for the About route.
 */
export const metadata = {
  title: "About | Earth In Sound",
};

/**
 * Temporary About page content.
 * Uses the shared placeholder until the full page design is built.
 */
export default function AboutPage() {
  return (
    <SectionPlaceholderPage
      eyebrow="Earth In Sound"
      title="About"
      description="This page will introduce Earth In Sound, its production work, its creative scope, and the connection between the company, artists, and podcast projects."
    />
  );
}
