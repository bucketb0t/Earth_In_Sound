import SectionPlaceholderPage from "@/features/section-placeholder/SectionPlaceholderPage";

/**
 * Browser metadata for the Jason W. Walton Production route.
 */
export const metadata = {
  title: "Jason W. Walton Production | Earth In Sound",
};

/**
 * Temporary Production page content.
 * Uses the shared placeholder until production services are implemented.
 */
export default function JasonWaltonProductionPage() {
  return (
    <SectionPlaceholderPage
      eyebrow="Jason W. Walton"
      title="Production"
      description="This page will present production work, credits, studio-related information, and future inquiry paths."
    />
  );
}
