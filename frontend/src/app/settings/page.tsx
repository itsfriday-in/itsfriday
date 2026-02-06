import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { DashboardLayout } from "@/components/dashboard";
import { SettingsPage } from "@/components/settings";

export const metadata = {
  title: "Settings | APILens",
  description: "Manage your settings and preferences",
};

export default async function Settings() {
  const session = await auth0.getSession();

  if (!session) {
    redirect("/auth/login");
  }

  return (
    <DashboardLayout>
      <SettingsPage />
    </DashboardLayout>
  );
}
