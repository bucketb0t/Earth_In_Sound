"use client";

import { useEffect, useRef, useState } from "react";
import { authClient } from "@/front-end/authentication/auth-client";
import type { Session } from "better-auth";
import type { AccountProfile } from "@/backend/authentication/account-management";

type AccountSessions = Session[];
type Notice = { kind: "success" | "error"; text: string };

/** Load account data and serialize settings mutations against the signed-in session. */
export function useAccountSettings(
  userId: string,
  refreshSession: () => Promise<unknown>,
) {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [sessions, setSessions] = useState<AccountSessions>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [sessionsError, setSessionsError] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const operationInFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function loadSettings() {
      const results = await Promise.allSettled([
        authClient.account.profile(),
        authClient.listSessions(),
      ]);
      if (cancelled) return;

      const [account, devices] = results;
      if (account.status === "fulfilled" && account.value.data) {
        setProfile(account.value.data);
        setLoadError("");
      } else {
        setLoadError("Could not load your profile. Please try again.");
      }
      if (devices.status === "fulfilled" && devices.value.data) {
        setSessions(devices.value.data);
        setSessionsError("");
      } else {
        setSessionsError(
          devices.status === "fulfilled"
            ? devices.value.error?.message ?? "Could not load sessions."
            : "Could not load sessions. Please try again.",
        );
      }
      setIsLoading(false);
    }
    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  async function reloadSessions() {
    try {
      const result = await authClient.listSessions();
      if (result.error) {
        throw new Error(result.error.message ?? "Could not load sessions.");
      }
      setSessions(result.data ?? []);
      setSessionsError("");
    } catch (error) {
      setSessionsError(
        error instanceof Error ? error.message : "Could not load sessions.",
      );
    }
  }

  async function runAction(
    name: string,
    success: string,
    action: () => Promise<void>,
  ) {
    if (operationInFlight.current) return false;
    operationInFlight.current = true;
    setBusyAction(name);
    setNotice(null);
    try {
      await action();
      setNotice({ kind: "success", text: success });
      return true;
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof Error ? error.message : "Please try again.",
      });
      return false;
    } finally {
      operationInFlight.current = false;
      setBusyAction(null);
    }
  }

  function updateUsername(username: string) {
    return runAction("username", "Username updated.", async () => {
      const result = await authClient.account.updateUsername({ username });
      if (result.error) {
        throw new Error(result.error.message ?? "Could not update username.");
      }
      if (!result.data) throw new Error("Could not update username.");
      const updatedUsername = result.data.username;
      setProfile((current) =>
        current ? { ...current, username: updatedUsername } : current,
      );
      await refreshSession();
    });
  }

  function changePassword(
    currentPassword: string,
    newPassword: string,
    revokeOtherSessions: boolean,
  ) {
    return runAction("password", "Password changed.", async () => {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions,
      });
      if (result.error) {
        throw new Error(result.error.message ?? "Could not change password.");
      }
      await refreshSession();
      await reloadSessions();
    });
  }

  function revokeSession(token?: string) {
    return runAction(
      "sessions",
      token ? "Session signed out." : "Other sessions signed out.",
      async () => {
        const result = token
          ? await authClient.revokeSession({ token })
          : await authClient.revokeOtherSessions();
        if (result.error) {
          throw new Error(result.error.message ?? "Could not sign out sessions.");
        }
        await reloadSessions();
      },
    );
  }

  function closeAccount(currentPassword: string, confirmation: "DELETE") {
    return runAction("close", "Account closed.", async () => {
      const result = await authClient.account.close({ currentPassword, confirmation });
      if (result.error) {
        throw new Error(result.error.message ?? "Could not close account.");
      }
    });
  }

  return {
    profile,
    sessions,
    isLoading,
    loadError,
    sessionsError,
    busyAction,
    notice,
    updateUsername,
    changePassword,
    revokeSession,
    closeAccount,
    retry: () => {
      setIsLoading(true);
      setReloadKey((key) => key + 1);
    },
    clearNotice: () => setNotice(null),
    reportError: (text: string) => setNotice({ kind: "error", text }),
  };
}
