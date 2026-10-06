import { headers } from "next/headers";
import { auth } from "@/backend/authentication/auth";
import AccountAuthPanel from "@/front-end/features/account-auth/AccountAuthPanel";

export const metadata = {
  title: "Account | Earth In Sound",
};

export default async function AccountPage() {
  const initialSession = await auth.api.getSession({
    headers: await headers(),
  });

  return <AccountAuthPanel initialSession={initialSession} />;
}
