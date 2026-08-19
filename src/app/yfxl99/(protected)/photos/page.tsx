import { PhotoExperience } from "@/components/private/photos/PhotoExperience";
import { isServerSupabaseConfigured } from "@/lib/supabase/config";
import { getPhotoPageData } from "@/services/photoService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PhotosPage() {
  const { photos, statistics, schemaReady } = await getPhotoPageData();
  const supabaseConfigured = isServerSupabaseConfigured();
  const uploadEnabled = supabaseConfigured && schemaReady;
  const uploadDisabledReason = !supabaseConfigured
    ? "当前没有可用的 Supabase 数据库配置；画廊仍可浏览，但暂时不能上传。"
    : !schemaReady
      ? "当前仍在使用旧版 Photos 数据结构。请执行 202608190001_photo_local_gallery.sql 后启用上传、修改和删除。"
      : undefined;

  return (
    <PhotoExperience
      photos={photos}
      statistics={statistics}
      uploadEnabled={uploadEnabled}
      mutationsEnabled={uploadEnabled}
      uploadDisabledReason={uploadDisabledReason}
    />
  );
}
