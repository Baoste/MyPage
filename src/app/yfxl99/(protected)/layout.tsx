import type { ReactNode } from "react";
import { PrivateNavbar } from "@/components/private/PrivateNavbar";
import { requirePrivateSession } from "@/lib/auth/session";

export default async function ProtectedPrivateLayout({ children }: { children: ReactNode }) {
  await requirePrivateSession();

  return (
    <>
      <PrivateNavbar />
      <main>{children}</main>
    </>
  );
}
