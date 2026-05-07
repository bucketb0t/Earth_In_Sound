import Navbar from "@/components/navbar/Navbar";

/**
 * Home route.
 * Stays server-rendered; Navbar owns the only current client interactivity.
 */
export default function HomePage() {
  return (
    <>
      <Navbar />
      <main style={{ padding: "40px 24px" }} />
    </>
  );
}
