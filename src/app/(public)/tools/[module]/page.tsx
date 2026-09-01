import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolsWorkspace } from "@/components/tools/ToolsWorkspace";
import { getToolModuleSummary } from "@/lib/tools/module-store";

export const dynamic = "force-dynamic";

type ToolPageProps = { params: Promise<{ module: string }> };

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const toolModule = getToolModuleSummary((await params).module);
  if (!toolModule) return { title: "工具不存在" };
  return {
    title: toolModule.title,
    description: `${toolModule.description} 作者：${toolModule.author}。`,
  };
}

export default async function ToolModulePage({ params }: ToolPageProps) {
  const toolModule = getToolModuleSummary((await params).module);
  if (!toolModule) notFound();
  return <ToolsWorkspace module={toolModule} />;
}
