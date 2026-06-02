import SectionPlaceholderPage from "@/features/section-placeholder/SectionPlaceholderPage";

/**
 * Browser metadata for the Cart route.
 */
export const metadata = {
  title: "Cart | Earth In Sound",
};

/**
 * Temporary Cart page content.
 * Uses the shared placeholder until cart data and checkout are implemented.
 */
export default function CartPage() {
  return (
    <SectionPlaceholderPage
      eyebrow="Earth In Sound Store"
      title="Cart"
      description="This page will show cart items, totals, and checkout preparation once store products are connected."
    />
  );
}
