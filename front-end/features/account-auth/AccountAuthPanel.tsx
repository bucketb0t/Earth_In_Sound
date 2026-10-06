"use client";

import { useState, type SubmitEvent } from "react";
import { authClient } from "@/front-end/authentication/auth-client";
import styles from "./AccountAuthPanel.module.css";
import AccountSettingsPanel from "./AccountSettingsPanel";

type AuthMode = "sign-in" | "sign-up";

interface AccountAuthPanelProps {
  initialSession: typeof authClient.$Infer.Session | null;
}

/** Browser login/signup UI; Better Auth handles passwords, sessions, and profile writes server-side. */
export default function AccountAuthPanel({
  initialSession,
}: AccountAuthPanelProps) {
  authClient.hydrateSession(initialSession);
  const session = authClient.useSession();
  const currentSession =
    session.isPending && !session.isRefetching
      ? initialSession
      : session.data;

  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [signOutError, setSignOutError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Send signup username as Better Auth's name; login uses email and password. */
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
      /* Refresh session state after successful authentication. */
      await session.refetch();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Authentication failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /** End the browser session without disabling or deleting the account. */
  const handleSignOut = async () => {
    setIsSubmitting(true);
    setMessage("");
    setSignOutError("");

    try {
      const result = await authClient.signOut();

      if (result.error) {
        throw new Error(result.error.message ?? "Sign out failed.");
      }

      setMessage("Signed out.");
      await session.refetch();
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : "Sign out failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (currentSession?.user) {
    return (
      <AccountSettingsPanel
        key={currentSession.user.id}
        user={currentSession.user}
        currentSessionToken={currentSession.session.token}
        isSigningOut={isSubmitting}
        signOutError={signOutError}
        onSignOut={handleSignOut}
        refreshSession={session.refetch}
        onAccountClosed={async () => {
          setMode("sign-in");
          setPassword("");
          setMessage("Account closed.");
          await session.refetch();
        }}
      />
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <p className={styles.eyebrow}>Earth In Sound</p>
        <h1>{mode === "sign-up" ? "Sign Up" : "Log In"}</h1>

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Username is required only for signup. */}
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

          <button
            className={styles.primaryButton}
            type="submit"
            disabled={isSubmitting}
          >
            {mode === "sign-up" ? "Create Account" : "Log In"}
          </button>
        </form>

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
