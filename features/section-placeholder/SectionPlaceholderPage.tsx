import styles from "./SectionPlaceholderPage.module.css";

interface SectionPlaceholderPageProps {
  eyebrow: string;
  title: string;
  description: string;
}

/**
 * Temporary content shell for navbar destinations that exist before final art.
 * Keeps route behavior correct without pretending the page design is finished.
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
