import styles from "./SectionPlaceholderPage.module.css";

interface SectionPlaceholderPageProps {
  eyebrow: string;
  title: string;
  description: string;
}

/**
 * Shared content shell for undeveloped route pages.
 * Individual routes provide the text; this component provides structure.
 */
export default function SectionPlaceholderPage({
  eyebrow,
  title,
  description,
}: SectionPlaceholderPageProps) {
  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </section>
    </main>
  );
}
