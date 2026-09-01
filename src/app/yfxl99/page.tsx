import { LoginForm } from "@/components/private/LoginForm";
import { PrivateNavbar } from "@/components/private/PrivateNavbar";
import { WelcomeHome } from "@/components/private/WelcomeHome";
import { getPrivateSession } from "@/lib/auth/session";
import { getPhotoActivityStats } from "@/services/photoService";

export default async function PrivateHomePage() {
  const session = await getPrivateSession();

  if (!session) {
    return (
      <main className="container-shell flex min-h-screen items-center py-16">
        <div className="grid w-full gap-14 border-y border-[#cec5b8] py-14 md:grid-cols-[1fr_1.2fr] md:py-20">
          <div>
            <p className="eyebrow text-[#777067]">Private · Personal</p>
            <p className="mt-5 max-w-xs text-sm leading-6 text-[#716a62]">
              使用账号和密码登录。第一次来，请用邀请码注册一个只属于你的账号。
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

  const activity = await getPhotoActivityStats();

  return (
    <div className="flex min-h-svh flex-col">
      <PrivateNavbar username={session.username} />
      <WelcomeHome activity={activity} />
    </div>
  );
}
