import SectionPlaceholderPage from "@/features/section-placeholder/SectionPlaceholderPage";

export const metadata = {
  title: "About | Earth In Sound",
};

export default function AboutPage() {
  return (
    <SectionPlaceholderPage
      eyebrow="Earth In Sound"
      title="About"
      description="This page will introduce Earth In Sound, its production work, its creative scope, and the connection between the company, artists, and podcast projects."
    />
  );
}
