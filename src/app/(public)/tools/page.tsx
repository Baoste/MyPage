import type { Metadata } from "next";
import { ToolsCatalog } from "@/components/tools/ToolsCatalog";
import { listToolModules } from "@/lib/tools/module-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tools",
  description: "本站独立工具模块目录。",
};

export default function ToolsPage() {
  return <ToolsCatalog modules={listToolModules()} />;
}
