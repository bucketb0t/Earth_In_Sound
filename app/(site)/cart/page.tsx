import SectionPlaceholderPage from "@/front-end/features/section-placeholder/SectionPlaceholderPage";

export const metadata = {
  title: "Cart | Earth In Sound",
};

/** Placeholder pending cart and checkout. */
export default function CartPage() {
  return (
    <SectionPlaceholderPage
      eyebrow="Earth In Sound Store"
      title="Cart"
      description="This page will show cart items, totals, and checkout preparation once store products are connected."
    />
  );
}
