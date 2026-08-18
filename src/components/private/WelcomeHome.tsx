/**
 * 登录后的 /yfxl99 首页内容。
 *
 * 可以自由修改这个组件的文案和布局；认证判断、Session 与登录表单
 * 都在其他文件中，不需要在这里处理。
 */
export function WelcomeHome() {
  return (
    <main className="container-shell flex min-h-[calc(100vh-4.75rem)] items-center py-16">
      <div className="grid w-full gap-10 border-y border-[#cec5b8] py-16 md:grid-cols-[1fr_2fr] md:py-24">
        <p className="eyebrow text-[#777067]">Kept between us</p>
        <div>
          <h1 className="display-type text-6xl md:text-8xl">Welcome.</h1>
          <p className="mt-6 max-w-md text-base leading-7 text-[#716a62]">
            Some moments are worth keeping.
          </p>
        </div>
      </div>
    </main>
  );
}
