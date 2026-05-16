import styles from "./page.module.css";

/**
 * Home route.
 * Navbar is mounted once in the root layout, so pages only render content.
 */
export default function HomePage() {
  return <main className={styles.main} />;
}
