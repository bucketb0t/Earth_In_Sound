"use client";

import { useRef, useState, type SubmitEvent } from "react";
import { useAccountSettings } from "./useAccountSettings";
import styles from "./AccountAuthPanel.module.css";

interface AccountSettingsPanelProps {
  user: { id: string; name: string; email: string };
  currentSessionToken: string;
  isSigningOut: boolean;
  signOutError: string;
  onSignOut: () => Promise<void>;
  refreshSession: () => Promise<unknown>;
  onAccountClosed: () => Promise<void>;
}

function UsernameForm({ username, disabled, save }: {
  username: string;
  disabled: boolean;
  save: (value: string) => Promise<boolean>;
}) {
  const [value, setValue] = useState(username);

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        void save(value);
      }}
    >
      <label className={styles.field}>
        <span>Username</span>
        <input
          name="username"
          autoComplete="username"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          minLength={3}
          maxLength={32}
          required
          disabled={disabled}
        />
      </label>
      <button className={styles.primaryButton} type="submit" disabled={disabled || value === username}>
        Save username
      </button>
    </form>
  );
}

function browserName(userAgent: string | null | undefined) {
  if (!userAgent) return "Browser session";
  if (userAgent.includes("Edg")) return "Microsoft Edge";
  if (userAgent.includes("Firefox") || userAgent.includes("FxiOS")) return "Firefox";
  if (userAgent.includes("Chrome") || userAgent.includes("CriOS")) return "Chrome";
  if (userAgent.includes("Safari")) return "Safari";
  return "Browser session";
}

/** Render profile, password, session, and confirmed account-closure controls. */
export default function AccountSettingsPanel({
  user,
  currentSessionToken,
  isSigningOut,
  signOutError,
  onSignOut,
  refreshSession,
  onAccountClosed,
}: AccountSettingsPanelProps) {
  const settings = useAccountSettings(user.id, refreshSession);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signOutOthers, setSignOutOthers] = useState(true);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const disabled = settings.busyAction !== null || isSigningOut;

  async function handlePasswordChange(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      settings.reportError("New passwords do not match.");
      return;
    }
    if (await settings.changePassword(currentPassword, newPassword, signOutOthers)) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  async function handleClosure(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (deleteConfirmation !== "DELETE") return;
    if (await settings.closeAccount(deletePassword, "DELETE")) {
      deleteDialog.current?.close();
      await onAccountClosed();
    }
  }

  return (
    <main className={styles.page}>
      <div className={`${styles.panel} ${styles.settingsPanel}`}>
        <header className={styles.settingsHeader}>
          <div>
            <p className={styles.eyebrow}>Account</p>
            <h1>{user.name}</h1>
            <p className={styles.copy}>{user.email}</p>
          </div>
          <button
            type="button"
            className={styles.modeButton}
            onClick={() => void onSignOut()}
            disabled={disabled}
          >
            Log Out
          </button>
        </header>

        {signOutError && <p className={styles.error} role="alert">{signOutError}</p>}
        {settings.notice && (
          <p
            className={`${styles.message} ${settings.notice.kind === "error" ? styles.error : ""}`}
            role={settings.notice.kind === "error" ? "alert" : "status"}
          >
            {settings.notice.text}
          </p>
        )}
        {settings.isLoading && <p role="status">Loading account settings...</p>}
        {settings.loadError && <p className={styles.error} role="alert">{settings.loadError}</p>}
        {(settings.loadError || settings.sessionsError) && (
          <button className={styles.modeButton} type="button" onClick={settings.retry} disabled={disabled}>Retry</button>
        )}

        {settings.profile && (
          <>
            <section className={styles.settingsSection} aria-labelledby="profile-title">
              <h2 id="profile-title">Profile</h2>
              <UsernameForm
                key={settings.profile.username}
                username={settings.profile.username}
                disabled={disabled}
                save={settings.updateUsername}
              />
            </section>

            <section className={styles.settingsSection} aria-labelledby="password-title">
              <h2 id="password-title">Password</h2>
              <form className={styles.form} onSubmit={handlePasswordChange}>
                <label className={styles.field}>
                  <span>Current password</span>
                  <input
                    type="password"
                    name="currentPassword"
                    autoComplete="current-password"
                    required
                    maxLength={128}
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    disabled={disabled}
                  />
                </label>
                <label className={styles.field}>
                  <span>New password</span>
                  <input
                    type="password"
                    name="newPassword"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={128}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    disabled={disabled}
                  />
                </label>
                <label className={styles.field}>
                  <span>Confirm new password</span>
                  <input
                    type="password"
                    name="confirmPassword"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={128}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    disabled={disabled}
                  />
                </label>
                <label className={styles.checkboxField}>
                  <input
                    type="checkbox"
                    checked={signOutOthers}
                    onChange={(event) => setSignOutOthers(event.target.checked)}
                    disabled={disabled}
                  />
                  <span>Sign out other devices</span>
                </label>
                <button className={styles.primaryButton} type="submit" disabled={disabled}>Change password</button>
              </form>
            </section>

            <section className={styles.settingsSection} aria-labelledby="sessions-title">
              <h2 id="sessions-title">Active sessions</h2>
              {settings.sessionsError && <p className={styles.error} role="alert">{settings.sessionsError}</p>}
              <ul className={styles.sessionList}>
                {settings.sessions.map((session) => (
                  <li key={session.id} className={styles.sessionRow}>
                    <div>
                      <strong>{session.token === currentSessionToken ? "This device" : "Other device"}</strong>
                      <p>{browserName(session.userAgent)}</p>
                      <p>Started {new Date(session.createdAt).toLocaleString()}</p>
                    </div>
                    {session.token !== currentSessionToken && (
                      <button
                        className={styles.modeButton}
                        type="button"
                        disabled={disabled}
                        onClick={() => void settings.revokeSession(session.token)}
                      >
                        Sign out session
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <button
                className={styles.modeButton}
                type="button"
                disabled={disabled || settings.isLoading || settings.sessions.length < 2}
                onClick={() => void settings.revokeSession()}
              >
                Sign out other sessions
              </button>
            </section>

            <section className={styles.settingsSection} aria-labelledby="closure-title">
              <h2 id="closure-title">Close account</h2>
              {settings.profile.role === "owner" ? (
                <p className={styles.copy}>Transfer ownership before deleting this account.</p>
              ) : (
                <button
                  className={styles.dangerButton}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    settings.clearNotice();
                    deleteDialog.current?.showModal();
                  }}
                >
                  Delete account
                </button>
              )}
            </section>
          </>
        )}

        <dialog
          ref={deleteDialog}
          className={styles.deleteDialog}
          aria-labelledby="delete-title"
          onCancel={(event) => {
            if (disabled) event.preventDefault();
          }}
          onClose={() => {
            setDeletePassword("");
            setDeleteConfirmation("");
          }}
        >
          <h2 id="delete-title">Delete account</h2>
          <p>Your account will be closed permanently. Your username stays reserved.</p>
          <form className={styles.form} onSubmit={handleClosure}>
            <label className={styles.field}>
              <span>Confirm current password</span>
              <input
                type="password"
                name="deletePassword"
                autoComplete="current-password"
                required
                maxLength={128}
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                disabled={disabled}
              />
            </label>
            <label className={styles.field}>
              <span>Type DELETE to confirm</span>
              <input
                name="confirmation"
                autoComplete="off"
                required
                pattern="DELETE"
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                disabled={disabled}
              />
            </label>
            {settings.notice?.kind === "error" && <p className={styles.error} role="alert">{settings.notice.text}</p>}
            <div className={styles.dialogActions}>
              <button className={styles.modeButton} type="button" disabled={disabled} onClick={() => deleteDialog.current?.close()}>Cancel</button>
              <button className={styles.dangerButton} type="submit" disabled={disabled || deleteConfirmation !== "DELETE"}>Confirm deletion</button>
            </div>
          </form>
        </dialog>
      </div>
    </main>
  );
}
