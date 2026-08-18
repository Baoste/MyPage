import { PhotoGallery } from "@/components/private/PhotoGallery";
import { getPhotoEntries } from "@/services/photoService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PhotosPage() {
  const photos = await getPhotoEntries();

  return (
    <div className="container-shell py-14 md:py-20">
      <header className="mb-12 grid gap-5 border-b border-[#cec5b8] pb-10 md:grid-cols-[1fr_2fr]">
        <p className="eyebrow text-[#777067]">Private archive</p>
        <div>
          <h1 className="display-type text-5xl md:text-7xl">Photos</h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-[#716a62]">Ordinary days, kept with care.</p>
        </div>
      </header>
      <PhotoGallery photos={photos} />
    </div>
  );
}
