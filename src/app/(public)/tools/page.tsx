import type { Metadata } from "next";
import { ToolsWorkspace } from "@/components/tools/ToolsWorkspace";
import { getToolModuleState } from "@/lib/tools/module-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tools",
  description: "故事创作与剧情编排工具。",
};

export default function ToolsPage() {
  const moduleState = getToolModuleState("story-editor");
  return <ToolsWorkspace initiallyAvailable={moduleState.available} />;
}
