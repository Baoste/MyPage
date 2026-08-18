import { FoodGrid } from "@/components/private/FoodGrid";
import { getFoodEntries } from "@/services/foodService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FoodPage() {
  const entries = await getFoodEntries();

  return (
    <div className="container-shell py-14 md:py-20">
      <header className="mb-12 grid gap-5 border-b border-[#cec5b8] pb-10 md:grid-cols-[1fr_2fr]">
        <p className="eyebrow text-[#777067]">Shared table</p>
        <div>
          <h1 className="display-type text-5xl md:text-7xl">Food</h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-[#716a62]">Things we tried, places we found, and meals worth remembering.</p>
        </div>
      </header>
      <FoodGrid entries={entries} />
    </div>
  );
}
