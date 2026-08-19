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
    ? "当前没有可用的 Supabase 数据库配置；画廊仍可浏览，但暂时不能上传。"
    : !schemaReady
      ? "当前仍在使用旧版 Food 数据结构。请执行 202608180002_food_groups_and_images.sql 后启用多图上传。"
      : undefined;

  return (
    <FoodExperience
      groups={groups}
      statistics={statistics}
      uploadEnabled={uploadEnabled}
      mutationsEnabled={uploadEnabled}
      uploadDisabledReason={uploadDisabledReason}
    />
  );
}
