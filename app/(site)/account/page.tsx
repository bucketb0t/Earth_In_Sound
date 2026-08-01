import AccountAuthPanel from "@/front-end/features/account-auth/AccountAuthPanel";

/**
 * Browser metadata for the Account route.
 */
export const metadata = {
  title: "Account | Earth In Sound",
};

/**
 * Account route.
 * Renders the Better Auth login/signup interface.
 */
export default function AccountPage() {
  return <AccountAuthPanel />;
}
