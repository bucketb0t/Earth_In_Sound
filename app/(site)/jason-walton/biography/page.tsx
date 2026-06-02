import SectionPlaceholderPage from "@/features/section-placeholder/SectionPlaceholderPage";

/**
 * Browser metadata for the Jason W. Walton Biography route.
 */
export const metadata = {
  title: "Jason W. Walton Biography | Earth In Sound",
};

/**
 * Temporary Biography page content.
 * Uses the shared placeholder until artist biography content is built.
 */
export default function JasonWaltonBiographyPage() {
  return (
    <SectionPlaceholderPage
      eyebrow="Jason W. Walton"
      title="Biography"
      description="This page will hold Jason W. Walton's biography, selected background, artistic history, and a focused introduction for press and listeners."
    />
  );
}
