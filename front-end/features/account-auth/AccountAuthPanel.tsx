"use client";

import { useState, type SubmitEvent } from "react";
import { authClient } from "@/front-end/authentication/auth-client";
import styles from "./AccountAuthPanel.module.css";

type AuthMode = "sign-in" | "sign-up";

/**
 * Account auth surface.
 * Lets visitors create normal accounts, sign in, and sign out.
 *
 * This component is browser UI only. It collects form input, calls authClient,
 * and displays the current Better Auth session. Password hashing, session
 * cookie writing, and database writes happen on the server through
 * app/api/auth/[...all]/route.ts and backend/authentication/auth.ts.
 */
export default function AccountAuthPanel() {
  /*
   * Better Auth session hook gives current user data and a refetch function.
   */
  const session = authClient.useSession();

  /*
   * Local form state only.
   * Passwords are sent to Better Auth and are not stored in React state longer
   * than the user keeps them in the input.
   */
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Submits the selected auth action through Better Auth.
   *
   * The same HTML form handles two modes:
   * - sign-up sends email, password, and username as Better Auth's name field;
   * - sign-in sends email and password only.
   *
   * Better Auth receives the request through the API route. On successful
   * signup, the server-side hook creates a matching normal user row.
   */
  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const result =
        mode === "sign-up"
          ? await authClient.signUp.email({
              email,
              password,
              name: username,
            })
          : await authClient.signIn.email({
              email,
              password,
            });

      if (result.error) {
        throw new Error(result.error.message ?? "Authentication failed.");
      }

      setMessage(mode === "sign-up" ? "Account created." : "Signed in.");
      setPassword("");
      /*
       * Refetch moves the UI immediately into the logged-in branch after
       * Better Auth creates or restores the browser session.
       */
      await session.refetch();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Authentication failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Ends the current Better Auth session.
   *
   * This clears the active browser session. It does not delete or disable the
   * project's users table row; account lifecycle is handled by database
   * functions such as disableUser and deleteUser.
   */
  const handleSignOut = async () => {
    setIsSubmitting(true);
    setMessage("");

    try {
      const result = await authClient.signOut();

      if (result.error) {
        throw new Error(result.error.message ?? "Sign out failed.");
      }

      setMessage("Signed out.");
      /*
       * Refetch returns the UI to the login/signup form after sign out.
       */
      await session.refetch();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign out failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (session.isPending) {
    /*
     * Loading branch while Better Auth checks the current browser session.
     */
    return (
      <main className={styles.page}>
        <section className={styles.panel}>
          <p className={styles.eyebrow}>Account</p>
          <h1>Loading</h1>
        </section>
      </main>
    );
  }

  if (session.data?.user) {
    /*
     * Authenticated branch.
     * The project profile/role row is created by the server-side auth hook.
     */
    return (
      <main className={styles.page}>
        <section className={styles.panel}>
          <p className={styles.eyebrow}>Account</p>
          <h1>{session.data.user.name}</h1>
          <p className={styles.copy}>{session.data.user.email}</p>

          <button
            className={styles.primaryButton}
            type="button"
            onClick={handleSignOut}
            disabled={isSubmitting}
          >
            Log Out
          </button>

          {message ? <p className={styles.message}>{message}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <p className={styles.eyebrow}>Earth In Sound</p>
        <h1>{mode === "sign-up" ? "Sign Up" : "Log In"}</h1>

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Username exists only for signup; login uses email + password. */}
          {mode === "sign-up" ? (
            <label className={styles.field}>
              <span>Username</span>
              <input
                id="account-username"
                name="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                required
              />
            </label>
          ) : null}

          {/* Email is validated by the browser and again on the server. */}
          <label className={styles.field}>
            <span>Email</span>
            <input
              id="account-email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          {/* Better Auth hashes the password server-side before storage. */}
          <label className={styles.field}>
            <span>Password</span>
            <input
              id="account-password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={
                mode === "sign-up" ? "new-password" : "current-password"
              }
              minLength={8}
              maxLength={128}
              required
            />
          </label>

          {/* Main auth action follows the current form mode. */}
          <button
            className={styles.primaryButton}
            type="submit"
            disabled={isSubmitting}
          >
            {mode === "sign-up" ? "Create Account" : "Log In"}
          </button>
        </form>

        {/* Switch between login and signup without leaving the route. */}
        <button
          className={styles.modeButton}
          type="button"
          onClick={() =>
            setMode((currentMode) =>
              currentMode === "sign-in" ? "sign-up" : "sign-in",
            )
          }
        >
          {mode === "sign-in" ? "Need an account?" : "Already have an account?"}
        </button>

        {message ? <p className={styles.message}>{message}</p> : null}
      </section>
    </main>
  );
}
