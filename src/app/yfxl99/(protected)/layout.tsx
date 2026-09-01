import type { ReactNode } from "react";
import { PrivateNavbar } from "@/components/private/PrivateNavbar";
import { requirePrivateSession } from "@/lib/auth/session";

export default async function ProtectedPrivateLayout({ children }: { children: ReactNode }) {
  const session = await requirePrivateSession();

  return (
    <>
      <PrivateNavbar username={session.username} />
      <main>{children}</main>
    </>
  );
}
