import { FoodExperience } from "@/components/private/food/FoodExperience";
import { isServerSupabaseConfigured } from "@/lib/supabase/config";
import { getFoodPageData } from "@/services/foodService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FoodPage() {
  const { groups, statistics, schemaReady } = await getFoodPageData();
  const supabaseConfigured = isServerSupabaseConfigured();
  const uploadEnabled = supabaseConfigured && schemaReady;
  const uploadDisabledReason = !supabaseConfigured
    ? "当前没有可用的 Supabase 私密存储配置；画廊仍可浏览，但暂时不能上传。"
    : !schemaReady
      ? "当前仍在使用旧版 Food 数据结构。请执行 202608180002_food_groups_and_images.sql 后启用多图上传。"
      : undefined;

  return (
    <div>
      <header className="container-shell grid gap-5 border-b border-[#cec5b8] py-10 md:grid-cols-[1fr_2fr] md:py-14">
        <p className="eyebrow text-[#777067]">Shared table</p>
        <div>
          <h1 className="display-type text-5xl md:text-7xl">Food</h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-[#716a62]">
            Things we tried, places we found, and meals worth remembering.
          </p>
        </div>
      </header>
      <FoodExperience
        groups={groups}
        statistics={statistics}
        uploadEnabled={uploadEnabled}
        uploadDisabledReason={uploadDisabledReason}
      />
    </div>
  );
}
