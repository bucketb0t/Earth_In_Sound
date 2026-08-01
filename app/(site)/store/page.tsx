import SectionPlaceholderPage from "@/front-end/features/section-placeholder/SectionPlaceholderPage";

/**
 * Browser metadata for the Store route.
 */
export const metadata = {
  title: "Store | Earth In Sound",
};

/**
 * Temporary Store page content.
 * Uses the shared placeholder until product data and merch UI are implemented.
 */
export default function StorePage() {
  return (
    <SectionPlaceholderPage
      eyebrow="Earth In Sound"
      title="Store"
      description="This page will become the product grid for releases, merchandise, digital items, and future checkout flows."
    />
  );
}
