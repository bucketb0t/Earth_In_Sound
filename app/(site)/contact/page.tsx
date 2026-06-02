import SectionPlaceholderPage from "@/features/section-placeholder/SectionPlaceholderPage";

/**
 * Browser metadata for the Contact route.
 */
export const metadata = {
  title: "Contact | Earth In Sound",
};

/**
 * Temporary Contact page content.
 * Uses the shared placeholder until the contact experience is designed.
 */
export default function ContactPage() {
  return (
    <SectionPlaceholderPage
      eyebrow="Earth In Sound"
      title="Contact"
      description="This page will collect the proper contact paths for production inquiries, podcast communication, store support, and general Earth In Sound messages."
    />
  );
}
