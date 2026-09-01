"use client";

import { useRef, useState } from "react";

export function ToolsWorkspace({ initiallyAvailable }: { initiallyAvailable: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [available, setAvailable] = useState(initiallyAvailable);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  function openDeleteDialog() {
    setPassword("");
    setMessage("");
    dialogRef.current?.showModal();
  }

  async function deleteModule() {
    if (!password || isDeleting) return;
    setIsDeleting(true);
    setMessage("");
    try {
      const response = await fetch("/api/tools/modules/story-editor/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json() as {
        ok?: boolean;
        message?: string;
        sourceDeleted?: boolean;
      };
      if (!response.ok || result.ok !== true) {
        throw new Error(result.message || "删除失败，请稍后重试。");
      }
      setAvailable(false);
      dialogRef.current?.close();
      setMessage(result.sourceDeleted
        ? "编辑器代码与数据已全部删除。"
        : "编辑器数据已清空，模块已停用；当前部署环境不允许删除构建文件。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除失败，请稍后重试。");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="container-shell py-8 md:py-12">
      <header className="mb-5 flex flex-col gap-5 border-b border-[#cfcbc0] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Tools · Story workspace</p>
          <h1 className="display-type mt-2 text-4xl leading-none md:text-5xl">剧情卡工作台</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#696a62]">
            世界观、角色、事件与时间轴统一保存在本站服务器，不再连接 Firebase。
          </p>
        </div>
        {available ? (
          <button
            type="button"
            onClick={openDeleteDialog}
            className="focus-ring shrink-0 border border-[#bd9a8d] px-4 py-2.5 text-xs font-semibold tracking-[0.08em] text-[#8f4025] transition-colors duration-[90ms] hover:border-[#8f4025] hover:bg-[#efe5dc] motion-reduce:transition-none"
          >
            删除模块
          </button>
        ) : null}
      </header>

      {available ? (
        <div className="overflow-hidden rounded-[1.5rem] border border-[#c9c4b9] bg-white shadow-[0_18px_55px_rgba(57,50,41,0.1)]">
          <iframe
            src="/tools/modules/story-editor"
            title="剧情卡工作台"
            className="block h-[max(42rem,calc(100svh-11rem))] w-full border-0"
          />
        </div>
      ) : (
        <section className="grid min-h-[32rem] place-items-center border border-dashed border-[#c8c1b5] px-6 text-center">
          <div>
            <span aria-hidden="true" className="mx-auto block size-3 rotate-45 bg-[#a64b2a]" />
            <h2 className="display-type mt-6 text-3xl">模块已删除</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-[#696a62]">
              故事编辑器已经停用，相关数据已从独立存储目录清理。
            </p>
          </div>
        </section>
      )}

      {message ? <p className="mt-4 text-xs leading-5 text-[#8f4025]" role="status">{message}</p> : null}

      <dialog
        ref={dialogRef}
        aria-labelledby="delete-tool-title"
        className="m-auto w-[min(92vw,28rem)] border border-[#c7bfb3] bg-[#f4f1e9] p-0 text-[#20221e] shadow-[0_24px_80px_rgba(32,34,30,0.22)] backdrop:bg-[#20221e]/45"
        onCancel={() => !isDeleting && dialogRef.current?.close()}
      >
        <form
          className="p-6 sm:p-8"
          onSubmit={(event) => {
            event.preventDefault();
            void deleteModule();
          }}
        >
          <p className="eyebrow text-[#8f4025]">Irreversible action</p>
          <h2 id="delete-tool-title" className="display-type mt-3 text-3xl">删除故事编辑器？</h2>
          <p className="mt-4 text-sm leading-6 text-[#65665f]">
            这会清空全部故事数据、停用模块，并在服务器允许时删除编辑器代码目录。此操作无法撤销。
          </p>
          <label className="mt-6 block text-xs font-semibold tracking-[0.06em] text-[#555750]">
            删除口令
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="off"
              disabled={isDeleting}
              className="mt-2 w-full border border-[#bdb8ac] bg-[#fbf8f1] px-3 py-3 text-base tracking-[0.12em] outline-none focus:border-[#a64b2a]"
            />
          </label>
          {message ? <p className="mt-3 text-xs text-[#9f3826]" role="alert">{message}</p> : null}
          <div className="mt-7 flex justify-end gap-3">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => dialogRef.current?.close()}
              className="border border-[#bdb8ac] px-4 py-2.5 text-xs font-semibold disabled:opacity-40"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!password || isDeleting}
              className="bg-[#9f3826] px-4 py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isDeleting ? "正在删除…" : "永久删除"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
