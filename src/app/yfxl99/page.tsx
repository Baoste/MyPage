import { LoginForm } from "@/components/private/LoginForm";
import { PrivateNavbar } from "@/components/private/PrivateNavbar";
import { WelcomeHome } from "@/components/private/WelcomeHome";
import { getPrivateSession } from "@/lib/auth/session";

export default async function PrivateHomePage() {
  const session = await getPrivateSession();

  if (!session) {
    return (
      <main className="container-shell flex min-h-screen items-center py-16">
        <div className="grid w-full gap-14 border-y border-[#cec5b8] py-14 md:grid-cols-[1fr_1.2fr] md:py-20">
          <div>
            <p className="eyebrow text-[#777067]">Private · Personal</p>
            <p className="mt-5 max-w-xs text-sm leading-6 text-[#716a62]">
              A small place for the moments that are not meant for the public site.
            </p>
          </div>
          <div className="max-w-xl">
            <h1 className="display-type text-5xl md:text-7xl">Private Space</h1>
            <LoginForm />
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <PrivateNavbar />
      <WelcomeHome />
    </>
  );
}
