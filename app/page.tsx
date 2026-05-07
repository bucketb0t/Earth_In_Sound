import Navbar from "@/components/navbar/shared/Navbar/Navbar";
import styles from "./page.module.css";

/**
 * Home route.
 * Stays server-rendered; Navbar owns the only current client interactivity.
 */
export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className={styles.main} />
    </>
  );
}
