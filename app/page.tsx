import Navbar from "@/components/navbar/Navbar";

/**
 * Home page.
 *
 * The page can stay a Server Component because the interactivity is isolated
 * inside the client-side Navbar boundary.
 */
export default function HomePage() {
  return (
    <>
      <Navbar />
      <main style={{ padding: "40px 24px" }} />
    </>
  );
}
